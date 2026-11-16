#!/usr/bin/env python3
"""Build self-hosted images: grain, favicons, and 1200x675 share cards."""

import json
import subprocess
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
BG = (16, 14, 12)
INK = (247, 241, 230)
GOLD = (232, 197, 106)
BLOOD = (142, 30, 36)


def as_ttf(woff: Path) -> Path:
    dest = Path("/tmp") / (woff.stem + ".ttf")
    font = TTFont(woff)
    font.flavor = None
    font.save(dest)
    return dest


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


def fit(draw, text, face_path, start, max_width):
    size = start
    while size > 18:
        face = font(face_path, size)
        box = draw.textbbox((0, 0), text, font=face)
        if box[2] - box[0] <= max_width:
            return face
        size -= 2
    return font(face_path, 18)


def poster(path, label, left, right, word, date, alt, display, text_face, show_vs=True):
    image = Image.new("RGB", (1200, 675), BG)
    draw = ImageDraw.Draw(image)
    draw.rectangle((28, 28, 1171, 646), outline=GOLD, width=3)
    draw.rectangle((40, 40, 1159, 634), outline=BLOOD, width=2)
    lines = [
        ("BATTLE CALLS", font(display, 28), GOLD, 16),
        (label, font(display, 22), INK, 36),
        (left, fit(draw, left, display, 68, 1040), INK, 10),
    ]
    if show_vs:
        lines.append(("vs.", font(display, 32), GOLD, 10))
    lines.extend(
        [
            (right, fit(draw, right, display, 68, 1040), INK, 28),
            (word.upper(), font(display, 40), GOLD, 8) if word else None,
            (date, font(text_face, 28), INK, 28),
            (alt, fit(draw, alt, text_face, 26, 1040), INK, 0),
        ]
    )
    lines = [line for line in lines if line]
    heights = []
    for text, face, _fill, gap in lines:
        box = draw.textbbox((0, 0), text, font=face)
        heights.append((box[3] - box[1], box[0], gap))
    total = sum(h + g for h, _x, g in heights)
    y = max(64, (675 - total) / 2)
    for (text, face, fill, _gap), (height, origin, gap) in zip(lines, heights):
        box = draw.textbbox((0, 0), text, font=face)
        x = (1200 - (box[2] - box[0])) / 2 - origin
        draw.text((x, y), text, font=face, fill=fill)
        y += height + gap
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "PNG", optimize=True)


def grain(path: Path):
    import random

    random.seed(16)
    image = Image.new("RGB", (128, 128), BG)
    px = image.load()
    for y in range(128):
        for x in range(128):
            j = random.randint(0, 10)
            px[x, y] = (16 + j, 14 + j, 12 + j)
    image.save(path, "PNG", optimize=True)


def icon(path: Path, size: int):
    image = Image.new("RGB", (size, size), BG)
    draw = ImageDraw.Draw(image)
    m = max(2, size // 16)
    draw.rectangle((m, m, size - m - 1, size - m - 1), outline=GOLD, width=max(1, size // 24))
    gap = size // 10
    bar_w = size // 5
    left = size // 4 - bar_w // 2
    top = size // 4
    bottom = size - top
    draw.rectangle((left, top, left + bar_w, bottom), fill=BLOOD)
    right = size - left - bar_w
    draw.rectangle((right, top, right + bar_w, bottom), fill=GOLD)
    image.save(path, "PNG", optimize=True)


def main():
    display = as_ttf(ROOT / "assets/fonts/oswald-latin-700.woff2")
    text = as_ttf(ROOT / "assets/fonts/source-sans-3-latin-600.woff2")
    data = json.loads((ROOT / "data/fights.json").read_text())
    poster(
        ROOT / "assets/og/site.png",
        "THE UNAUTHORIZED FIGHT CARD",
        "TWO CALLS ENTER.",
        "ONE WALKS OUT.",
        "",
        "Scored weekly against the chart.",
        "Battle Calls. Two calls enter. One walks out.",
        display,
        text,
        False,
    )
    for fight in data["fights"]:
        names = [("@" + c["handle"]) if c.get("handle") else c["name"] for c in fight["corners"]]
        poster(
            ROOT / "assets/og" / f"{fight['id']}.png",
            fight["label"],
            names[0],
            names[1],
            fight["posterWord"],
            fight["ogDate"],
            fight["ogAlt"],
            display,
            text,
        )
    grain(ROOT / "assets/grain.png")
    icon(ROOT / "assets/favicon-32.png", 32)
    icon(ROOT / "assets/apple-touch.png", 180)
    pngs = list((ROOT / "assets").rglob("*.png"))
    subprocess.run(["exiftool", "-all=", "-overwrite_original", *[str(p) for p in pngs]], check=True)
    for path in pngs:
        if path.parent.name == "og" or path.name == "site.png":
            with Image.open(path) as image:
                if image.size != (1200, 675):
                    raise SystemExit(f"{path} is {image.size}")
    print(f"wrote {len(pngs)} images")


if __name__ == "__main__":
    main()
