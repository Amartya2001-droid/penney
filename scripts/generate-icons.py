"""Regenerates Penney's app icons into assets/images/.

The PNGs are committed to the repo, so this is only needed to recreate or restyle them.
Requires Pillow:  pip install pillow
Run from the project root:  python3 scripts/generate-icons.py
"""

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "assets" / "images"

BACKGROUND = (246, 243, 236, 255)  # theme background #F6F3EC
RIM = (200, 145, 42, 255)
FACE = (242, 193, 78, 255)
INK = (43, 33, 22, 255)
TRANSPARENT = (0, 0, 0, 0)


def coin(size: int, scale: float, background: tuple) -> Image.Image:
    """Draws a smiling Penney at 4x resolution, then downsamples for smooth edges."""
    s = size * 4
    img = Image.new("RGBA", (s, s), background)
    draw = ImageDraw.Draw(img)
    c = s / 2
    r = s * scale / 2

    draw.ellipse([c - r, c - r, c + r, c + r], fill=RIM)
    ri = r * 0.84
    draw.ellipse([c - ri, c - ri, c + ri, c + ri], fill=FACE, outline=RIM, width=int(r * 0.05))

    # Shine, clipped to the coin face.
    shine = Image.new("RGBA", (s, s), TRANSPARENT)
    ImageDraw.Draw(shine).ellipse(
        [c - ri * 0.70, c - ri * 0.80, c - ri * 0.05, c - ri * 0.50], fill=(255, 255, 255, 110)
    )
    shine = shine.rotate(20, center=(c, c))
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).ellipse([c - ri * 0.95, c - ri * 0.95, c + ri * 0.95, c + ri * 0.95], fill=255)
    shine.putalpha(ImageChops.multiply(shine.getchannel("A"), mask))
    img.alpha_composite(shine)

    stroke = max(4, int(r * 0.07))

    # Happy, closed eyes.
    e = ri * 0.14
    for dx in (-ri * 0.30, ri * 0.30):
        ex, ey = c + dx, c - ri * 0.10
        draw.arc([ex - e, ey - e, ex + e, ey + e], 200, 340, fill=INK, width=stroke)

    # Smile.
    m = ri * 0.34
    draw.arc([c - m, c - ri * 0.10 - m * 0.2, c + m, c + ri * 0.42], 25, 155, fill=INK, width=stroke)

    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    coin(1024, 0.78, BACKGROUND).save(OUT / "icon.png")
    coin(1024, 0.60, TRANSPARENT).save(OUT / "adaptive-icon.png")  # inside Android's safe zone
    coin(512, 0.92, TRANSPARENT).save(OUT / "splash-icon.png")
    coin(48, 0.92, TRANSPARENT).save(OUT / "favicon.png")
    print(f"Wrote icons to {OUT}")


if __name__ == "__main__":
    main()
