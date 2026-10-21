# The Sunday Table — Static Site

This repository contains the upload-ready static recipe website. Place the repository contents at the document root of a static web host. Page and asset paths are host-relative, so no domain is required before upload.

The build includes relative canonical links. An absolute sitemap is omitted until the live host URL is known.

## Optional browser-routing experiment

See [routing-demo/README.md](routing-demo/README.md) for an opt-in demonstration
of browser details → server-side rules → a user-confirmed local destination.
It runs with `python demo_server.py`; static hosting alone cannot run its API.
The experiment is separate and does not change the recipe pages.
