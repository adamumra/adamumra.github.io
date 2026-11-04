#!/usr/bin/env python3
"""Export display-sized portrait assets from the untouched original photograph."""
import io
from pathlib import Path

from PIL import Image, ImageCms, ImageOps

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'images/profile.jpg'
output = ROOT / 'images/portrait'
output.mkdir(exist_ok=True)
with Image.open(source) as image:
    profile = image.info.get('icc_profile')
    image = ImageOps.exif_transpose(image)
    if profile:
        image = ImageCms.profileToProfile(
            image, ImageCms.ImageCmsProfile(io.BytesIO(profile)),
            ImageCms.createProfile('sRGB'), outputMode='RGB')
    else:
        image = image.convert('RGB')
    # Head and shoulders from the source's 8256 x 5504 framing. Fractional
    # bounds preserve the composition if the source is re-exported larger.
    width, height = image.size
    box = (round(width * 2900 / 8256), round(height * 400 / 5504),
           round(width * 6200 / 8256), round(height * 3920 / 5504))
    portrait = image.crop(box)
    for scale in (1, 2, 3):
        size = (300 * scale, 320 * scale)
        resized = portrait.resize(size, Image.Resampling.LANCZOS, reducing_gap=3)
        # Lossless output avoids adding JPEG artifacts to the small display.
        resized.save(output / f'profile-{size[0]}.png', optimize=True)
        print(f'Exported profile-{size[0]}.png ({size[0]} x {size[1]})')
