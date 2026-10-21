"""Local educational server. No dependencies, storage, or third-party requests."""
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent
MAX_BODY = 8192
TYPES = {".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
         ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml",
         ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
         ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8"}


def decide(data):
    """Transparent demonstration rules, NOT authentication or device attestation."""
    if not isinstance(data, dict):
        raise ValueError("Expected a JSON object.")
    if set(data) != {"userAgent", "platform", "language", "maxTouchPoints"}:
        raise ValueError("Supply only userAgent, platform, language, maxTouchPoints.")
    for name in ("userAgent", "platform", "language"):
        if not isinstance(data[name], str) or len(data[name]) > 1024:
            raise ValueError("Invalid " + name)
    touch = data["maxTouchPoints"]
    if type(touch) is not int or not 0 <= touch <= 100:
        raise ValueError("Invalid maxTouchPoints.")
    ua = data["userAgent"]
    checks = [
        {"rule": "Reports an iPhone", "passed": "iPhone" in ua},
        {"rule": "Reports Safari, not a named alternative iOS browser",
         "passed": "Safari/" in ua and "Version/" in ua and not any(
             marker in ua for marker in ("CriOS/", "FxiOS/", "EdgiOS/", "OPiOS/"))},
        {"rule": "Reports touch support", "passed": touch > 0},
    ]
    matched = all(check["passed"] for check in checks)
    return {"status": "ok", "matched": matched, "checks": checks,
            "link": "/routing-demo/iphone.html" if matched else "/routing-demo/other.html",
            "note": "Browser-reported values can be spoofed. This is not a security filter."}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass  # Do not log visitor addresses, request bodies, or fingerprints.

    def respond(self, status, body, content_type="application/json; charset=utf-8"):
        if isinstance(body, dict):
            body = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Robots-Tag", "noindex")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = unquote(urlsplit(self.path).path)
        if "\\" in path or any(part.startswith(".") for part in path.split("/") if part):
            return self.respond(404, {"error": "Not found"})
        target = (ROOT / path.lstrip("/")).resolve()
        if not target.is_relative_to(ROOT):
            return self.respond(404, {"error": "Not found"})
        if target.is_dir():
            target = (target / "index.html").resolve()
        if not target.is_relative_to(ROOT) or not target.is_file() or target.suffix not in TYPES:
            return self.respond(404, {"error": "Not found"})
        self.respond(200, target.read_bytes(), TYPES[target.suffix])

    def do_POST(self):
        if urlsplit(self.path).path != "/api/routing-demo":
            return self.respond(404, {"error": "Not found"})
        origin = self.headers.get("Origin")
        if origin and urlsplit(origin).netloc != self.headers.get("Host"):
            return self.respond(403, {"error": "Same-origin requests only."})
        if self.headers.get_content_type() != "application/json":
            return self.respond(415, {"error": "Use application/json."})
        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return self.respond(400, {"error": "Invalid body length."})
        if size <= 0 or size > MAX_BODY:
            return self.respond(413, {"error": "Body must be 1–8192 bytes."})
        self.connection.settimeout(10)
        try:
            data = json.loads(self.rfile.read(size))
            result = decide(data)
        except (ValueError, UnicodeError):
            return self.respond(400, {"error": "Invalid browser details. Expected four documented fields."})
        except (TimeoutError, OSError):
            return self.respond(408, {"error": "Request timed out."})
        self.respond(200, result)


if __name__ == "__main__":
    # Local-only by default. Explicitly opt in to exposing a development preview.
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8000"))
    print(f"Routing demo: http://{host}:{port}/routing-demo/", flush=True)
    ThreadingHTTPServer((host, port), Handler).serve_forever()
