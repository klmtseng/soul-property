#!/usr/bin/env python3
"""M1 佔位圖產線 (spec 6.3)。

純色色塊 + 中文文字標籤，輸出符合 6.1 規格的去背 PNG：
  - 立繪 3 種表情：{residentId}_{calm|uneasy|broken}.png
  - 背景：白天 / 夜晚
目的只在「驗證呈現層接圖路徑可通」，與最終畫風無關。M3 會用 Blender 取代立繪。

用法：  python3 tools/gen_placeholders.py
輸出：  assets/portraits/  assets/backgrounds/
"""
from __future__ import annotations

import glob
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PORTRAITS = ROOT / "assets" / "portraits"
BACKGROUNDS = ROOT / "assets" / "backgrounds"

# 表情 → (色塊 RGBA, 中文標籤)
PORTRAITS_SPEC = {
    "chen_calm.png": ((120, 140, 170, 255), "陳秀英・平靜"),
    "chen_uneasy.png": ((150, 120, 110, 255), "陳秀英・不安"),
    "chen_broken.png": ((90, 60, 80, 255), "陳秀英・崩潰"),
    "clerk_neutral.png": ((70, 78, 92, 255), "老職員"),
}
BACKGROUNDS_SPEC = {
    "day.png": ((230, 224, 210, 255), "白天 / 溫情層"),
    "night.png": ((18, 18, 28, 255), "夜晚 / 恐怖層"),
}

PORTRAIT_SIZE = (512, 768)
BG_SIZE = (720, 1280)  # 手機直式


def find_cjk_font() -> str | None:
    candidates = [
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
        "/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc",
    ]
    candidates += glob.glob("/usr/share/fonts/**/NotoSansCJK*.ttc", recursive=True)
    candidates += glob.glob("/usr/share/fonts/**/*CJK*.ttc", recursive=True)
    for path in candidates:
        if Path(path).exists():
            return path
    return None


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    path = find_cjk_font()
    if path:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            pass
    return ImageFont.load_default()


def draw_label(img: Image.Image, text: str, fg=(255, 255, 255, 230)) -> None:
    draw = ImageDraw.Draw(img)
    font = load_font(max(28, img.width // 12))
    box = draw.textbbox((0, 0), text, font=font)
    w, h = box[2] - box[0], box[3] - box[1]
    pos = ((img.width - w) // 2 - box[0], (img.height - h) // 2 - box[1])
    # 描邊增加可讀性
    for dx, dy in [(-2, 0), (2, 0), (0, -2), (0, 2)]:
        draw.text((pos[0] + dx, pos[1] + dy), text, font=font, fill=(0, 0, 0, 200))
    draw.text(pos, text, font=font, fill=fg)


def make(out: Path, size, color, text) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGBA", size, color)
    draw_label(img, text)
    img.save(out)
    print(f"  wrote {out.relative_to(ROOT)}")


def main() -> None:
    print("產生立繪佔位圖：")
    for name, (color, text) in PORTRAITS_SPEC.items():
        make(PORTRAITS / name, PORTRAIT_SIZE, color, text)
    print("產生背景佔位圖：")
    for name, (color, text) in BACKGROUNDS_SPEC.items():
        make(BACKGROUNDS / name, BG_SIZE, color, text)
    print("完成。")


if __name__ == "__main__":
    main()
