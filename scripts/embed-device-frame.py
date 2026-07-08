#!/usr/bin/env python3
"""
Bettet einen Screenshot in ein Geräte-Mockup ein (iPhone, iPad, Monitor).
Ausgabe immer 1920×1080 px.
"""
from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

CANVAS_W, CANVAS_H = 1920, 1080


def _rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def _gradient_bg() -> Image.Image:
    img = Image.new("RGB", (CANVAS_W, CANVAS_H))
    draw = ImageDraw.Draw(img)
    for y in range(CANVAS_H):
        t = y / CANVAS_H
        r = int(30 + 18 * t)
        g = int(34 + 20 * t)
        b = int(42 + 24 * t)
        draw.line([(0, y), (CANVAS_W, y)], fill=(r, g, b))
    return img


def _fit_screen(screenshot: Image.Image, screen_w: int, screen_h: int) -> Image.Image:
    sw, sh = screenshot.size
    scale = min(screen_w / sw, screen_h / sh)
    nw, nh = max(1, int(sw * scale)), max(1, int(sh * scale))
    resized = screenshot.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (screen_w, screen_h), (0, 0, 0))
    canvas.paste(resized, ((screen_w - nw) // 2, (screen_h - nh) // 2))
    return canvas


def _draw_shadow(base: Image.Image, box: tuple[int, int, int, int], radius: int, spread: int = 28) -> None:
    x0, y0, x1, y1 = box
    w, h = x1 - x0 + spread * 2, y1 - y0 + spread * 2
    shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow)
    draw.rounded_rectangle(
        (spread, spread, w - spread - 1, h - spread - 1),
        radius=radius,
        fill=(0, 0, 0, 90),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=18))
    base.paste(shadow, (x0 - spread, y0 - spread), shadow)


def embed_iphone(screenshot: Image.Image) -> Image.Image:
    bezel = 14
    notch_h = 34
    screen_w, screen_h = 390, 844
    frame_w = screen_w + bezel * 2
    frame_h = screen_h + bezel * 2 + 8
    radius = 48

    canvas = _gradient_bg()
    ox = (CANVAS_W - frame_w) // 2
    oy = (CANVAS_H - frame_h) // 2
    _draw_shadow(canvas, (ox, oy, ox + frame_w, oy + frame_h), radius)

    frame = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(frame)
    draw.rounded_rectangle((0, 0, frame_w - 1, frame_h - 1), radius=radius, fill=(18, 18, 20))

    screen = _fit_screen(screenshot, screen_w, screen_h)
    screen_mask = _rounded_mask((screen_w, screen_h), radius - bezel)
    screen.putalpha(screen_mask)
    frame.paste(screen, (bezel, bezel), screen)

    # Notch
    draw = ImageDraw.Draw(frame)
    nw, nh = 126, notch_h
    nx = (frame_w - nw) // 2
    draw.rounded_rectangle((nx, bezel - 2, nx + nw, bezel + nh), radius=18, fill=(18, 18, 20))
    draw.ellipse((nx + nw // 2 - 6, bezel + 10, nx + nw // 2 + 6, bezel + 22), fill=(40, 40, 44))

    # Home indicator
    bar_w, bar_h = 120, 5
    bx = (frame_w - bar_w) // 2
    by = frame_h - bezel - 10
    draw.rounded_rectangle((bx, by, bx + bar_w, by + bar_h), radius=3, fill=(200, 200, 200))

    canvas.paste(frame, (ox, oy), frame)
    return canvas


def embed_ipad(screenshot: Image.Image) -> Image.Image:
    bezel = 22
    screen_w, screen_h = 768, 1024
    frame_w = screen_w + bezel * 2
    frame_h = screen_h + bezel * 2
    radius = 36

    canvas = _gradient_bg()
    scale = min((CANVAS_W - 120) / frame_w, (CANVAS_H - 120) / frame_h)
    frame_w = int(frame_w * scale)
    frame_h = int(frame_h * scale)
    screen_w = int(screen_w * scale)
    screen_h = int(screen_h * scale)
    bezel = int(bezel * scale)
    radius = int(radius * scale)

    ox = (CANVAS_W - frame_w) // 2
    oy = (CANVAS_H - frame_h) // 2
    _draw_shadow(canvas, (ox, oy, ox + frame_w, oy + frame_h), radius)

    frame = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(frame)
    draw.rounded_rectangle((0, 0, frame_w - 1, frame_h - 1), radius=radius, fill=(22, 22, 24))

    screen = _fit_screen(screenshot, screen_w, screen_h)
    screen_mask = _rounded_mask((screen_w, screen_h), max(8, radius - bezel))
    screen.putalpha(screen_mask)
    frame.paste(screen, (bezel, bezel), screen)

    # Kamera
    cam = max(6, int(8 * scale))
    cx, cy = frame_w // 2, bezel // 2 + 2
    draw.ellipse((cx - cam, cy - cam, cx + cam, cy + cam), fill=(50, 50, 54))

    canvas.paste(frame, (ox, oy), frame)
    return canvas


def embed_monitor(screenshot: Image.Image) -> Image.Image:
    bezel_x, bezel_top, bezel_bottom = 18, 18, 52
    screen_w, screen_h = 1280, 720
    frame_w = screen_w + bezel_x * 2
    frame_h = screen_h + bezel_top + bezel_bottom
    radius = 12

    canvas = _gradient_bg()
    ox = (CANVAS_W - frame_w) // 2
    oy = (CANVAS_H - frame_h) // 2 - 40
    _draw_shadow(canvas, (ox, oy, ox + frame_w, oy + frame_h), radius, spread=36)

    frame = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(frame)
    draw.rounded_rectangle((0, 0, frame_w - 1, frame_h - 1), radius=radius, fill=(28, 28, 32))

    screen = _fit_screen(screenshot, screen_w, screen_h)
    frame.paste(screen, (bezel_x, bezel_top))

    # Stand
    neck_w, neck_h = 80, 36
    base_w, base_h = 220, 14
    nx = (frame_w - neck_w) // 2
    ny = frame_h - bezel_bottom + 4
    draw.rounded_rectangle((nx, ny, nx + neck_w, ny + neck_h), radius=4, fill=(40, 40, 44))
    bx = (frame_w - base_w) // 2
    by = ny + neck_h - 4
    draw.rounded_rectangle((bx, by, bx + base_w, by + base_h), radius=6, fill=(50, 50, 54))

    # Power LED
    draw.ellipse((frame_w - bezel_x - 14, frame_h - 20, frame_w - bezel_x - 6, frame_h - 12), fill=(60, 180, 100))

    canvas.paste(frame, (ox, oy), frame)
    return canvas


DEVICES = {
    "iphone": embed_iphone,
    "ipad": embed_ipad,
    "monitor": embed_monitor,
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Screenshot in Geräte-Mockup einbetten (1920×1080)")
    parser.add_argument("input", type=Path, help="Eingabe-Screenshot")
    parser.add_argument("device", choices=DEVICES.keys(), help="Gerätetyp")
    parser.add_argument("output", type=Path, help="Ausgabedatei")
    args = parser.parse_args()

    screenshot = Image.open(args.input).convert("RGB")
    result = DEVICES[args.device](screenshot)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    result.save(args.output, "PNG", optimize=True)
    print(f"✓ {args.output}")


if __name__ == "__main__":
    main()
