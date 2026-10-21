import http.client
import json
import threading
import unittest
from http.server import ThreadingHTTPServer
from demo_server import Handler, decide

IPHONE = {"userAgent": "Mozilla/5.0 (iPhone) Version/18.0 Mobile/15E148 Safari/604.1",
          "platform": "iPhone", "language": "en-US", "maxTouchPoints": 5}


class Decisions(unittest.TestCase):
    def test_iphone_matches(self):
        self.assertEqual(decide(IPHONE)["link"], "/routing-demo/iphone.html")

    def test_desktop_and_non_safari_fall_back(self):
        for ua in ("Mozilla/5.0 Safari/604.1", "iPhone CriOS/130 Version/18 Safari/604",
                   "iPhone FxiOS/130 Version/18 Safari/604", "iPhone EdgiOS/130 Version/18 Safari/604"):
            with self.subTest(ua=ua):
                self.assertFalse(decide(dict(IPHONE, userAgent=ua))["matched"])

    def test_no_touch_falls_back(self):
        self.assertFalse(decide(dict(IPHONE, maxTouchPoints=0))["matched"])

    def test_invalid_inputs(self):
        for value in ([], {}, dict(IPHONE, maxTouchPoints=True), dict(IPHONE, maxTouchPoints=-1),
                      dict(IPHONE, userAgent=None), dict(IPHONE, userAgent="x" * 1025),
                      dict(IPHONE, link="https://example.com")):
            with self.subTest(value=type(value)):
                with self.assertRaises(ValueError):
                    decide(value)


class HTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def request(self, method, path, body=None, headers=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=5)
        conn.request(method, path, body, headers or {})
        r = conn.getresponse()
        result = r.status, r.read(), dict(r.getheaders())
        conn.close()
        return result

    def test_post_and_destinations(self):
        status, body, headers = self.request("POST", "/api/routing-demo",
                                            json.dumps(IPHONE), {"Content-Type": "application/json"})
        self.assertEqual(status, 200)
        self.assertEqual(headers["Cache-Control"], "no-store")
        self.assertNotIn("Set-Cookie", headers)
        self.assertEqual(json.loads(body)["link"], "/routing-demo/iphone.html")
        for path in ("/", "/routing-demo/", "/routing-demo/iphone.html",
                     "/routing-demo/other.html", "/routing-demo/demo.js", "/routing-demo/demo.css"):
            self.assertEqual(self.request("GET", path)[0], 200, path)

    def test_invalid_requests(self):
        self.assertEqual(self.request("POST", "/api/routing-demo", "bad",
                                      {"Content-Type": "application/json"})[0], 400)
        self.assertEqual(self.request("POST", "/api/routing-demo", "x")[0], 415)
        self.assertEqual(self.request("POST", "/api/routing-demo", "x" * 8193,
                                      {"Content-Type": "application/json"})[0], 413)
        self.assertEqual(self.request("POST", "/api/routing-demo", "{}",
                                      {"Content-Type": "application/json", "Origin": "https://example.com"})[0], 403)
        self.assertEqual(self.request("POST", "/not-an-api", "{}")[0], 404)

    def test_source_and_traversal_not_served(self):
        for path in ("/.git/config", "/%2e%2e/demo_server.py", "/demo_server.py", "/js/"):
            self.assertEqual(self.request("GET", path)[0], 404, path)


if __name__ == "__main__":
    unittest.main()
