# Browser routing lab

An opt-in educational example, independent of the recipe site's normal pages.
No third-party fingerprinting script, Canvas/WebGL collection, encryption theatre,
cookies, external destinations, or database. Nothing is collected on page load.
The original website's hidden rules are unknown: this is NOT a replica or bypass.

## Run

Requires Python 3.10+. From the repository root:

```sh
python demo_server.py
```

Open http://127.0.0.1:8000/routing-demo/ (not index.html via file://).
Choose actual browser data or a clearly labeled fixture, show the values, give
consent, then evaluate. The server checks: user-agent reports iPhone; reports
Safari/Version without known alternative-browser markers; touch points > 0.
All three matching chooses page A; otherwise page B. Click Continue to navigate.
The fixtures allow both paths to be tested on a desktop.

For a Replit development preview, use:

```sh
HOST=0.0.0.0 PORT=8000 python demo_server.py
```

This command must run IN the Replit project containing these files; a GitHub PR
does not update an existing Replit preview automatically. Use your editor's
normal Git pull/import flow after merging. No deployment is included.

The Python stdlib server is for local/development learning, not hardened
production hosting. Static hosts (including GitHub Pages) cannot execute the
API: the UI reports an unavailable endpoint rather than pretending the server
evaluated the request. Existing static pages continue to work without Python.

## Privacy and limitations

Only userAgent, platform, language and maxTouchPoints are submitted after consent.
Platform and language are displayed but do not affect this sample decision.
The server evaluates in memory and disables application request logging.
Hosting infrastructure may independently log requests/IP addresses; review it
before inviting others to test. Inputs are untrusted and spoofable; these rules
are deliberately NOT authorization, bot protection or reliable device detection.
No claim that a simulated fixture is a real iPhone. No automatic redirects.
Navigation accepts only two fixed same-origin destination paths.

## Verify

```sh
python -m unittest discover -s tests -v
```

Manual UI check: show actual details without consenting (no POST); consent and
evaluate; inspect the displayed response; continue. Repeat with both fixtures.
Switch input or revoke consent while a request is pending: stale results must
not enable navigation. Stop the server or use static hosting to verify the
explicit error state. No site-wide entry script has been added.
