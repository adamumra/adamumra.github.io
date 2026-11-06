# scripts/

Utility scripts for the Academic Pages template.

## `make-og-image.py`

Generates the default Open Graph / social preview image at
`images/og-image.png` (1200x630 PNG) used by `_includes/seo.html` when a page
does not define its own header image.

```
python3 scripts/make-og-image.py
```

Requirements:

- Python 3 with [Pillow](https://python-pillow.org) (`pip install Pillow`)
- A TrueType font; defaults to DejaVu Sans (`/usr/share/fonts/truetype/dejavu`),
  override with the `FONT_DIR` environment variable
- The site favicon at `images/favicon-512x512.png` (already in the template);
  it is composited as the card logo

The output is byte-reproducible for a given Pillow/font version and is committed
to the repo, so the build itself does not need Pillow.

## `prepare-portrait.py`

Exports lossless sRGB PNG portraits at 300, 600, and 900 pixels wide for the homepage’s responsive image. Converts the embedded source profile before high-quality downsampling and uses a fixed head-and-shoulders crop. The original `images/profile.jpg` is untouched and excluded from the deployed site. The portrait has no enlargement link; social previews use the 600-pixel export.

Run `python scripts/prepare-portrait.py` after replacing the source photograph. Requires Pillow with LittleCMS support (`python -m pip install Pillow`). Generated assets are committed, so Pages builds do not need Pillow.
