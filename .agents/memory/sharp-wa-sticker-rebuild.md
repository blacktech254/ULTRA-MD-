---
name: sharp rebuild for wa-sticker-formatter
description: wa-sticker-formatter bundles its own sharp dependency that must be rebuilt after fresh npm installs on linux-x64
---

After `npm install`, the nested sharp inside `wa-sticker-formatter` needs a manual rebuild or the app crashes at startup:

```
cd node_modules/wa-sticker-formatter && npm rebuild sharp --platform=linux --arch=x64
```

**Why:** wa-sticker-formatter ships its own copy of sharp (not the top-level one), and the prebuilt binary is not compatible with the Replit linux-x64 environment without rebuilding.

**How to apply:** Run this after any fresh `npm install` in this project. Also requires `python3` and `pkg-config` system dependencies to be installed (via installSystemDependencies).
