# The Sunday Table — Static Site

This repository contains the upload-ready static recipe website. Upload all files to the bucket's website root, preserving folders such as `recipes/`, `css/`, and `js/`; `index.html` should be at the root.

Each HTML page now embeds the stylesheet so the layout still renders if an object-storage upload misses the CSS object or serves it with the wrong content type. Keep the JavaScript and other assets for full site functionality.
