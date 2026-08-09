import csv
import math
from pathlib import Path

import pypdfium2 as pdfium
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "outputs" / "internet-archive-split-plan" / "approved-split-manifest.csv"
QA_DIR = ROOT / "tmp" / "pdfs" / "approved-split-qa"


QA_DIR.mkdir(parents=True, exist_ok=True)
tiles = []
for row in csv.DictReader(MANIFEST.open(encoding="utf-8-sig", newline="")):
    source = ROOT / row["local_output_path"]
    document = pdfium.PdfDocument(source)
    page_numbers = [1] if len(document) == 1 else [1, len(document)]
    for page_number in page_numbers:
        image = document[page_number - 1].render(scale=0.55).to_pil().convert("RGB")
        image.thumbnail((280, 360))
        tile = Image.new("RGB", (300, 410), "white")
        tile.paste(image, ((300 - image.width) // 2, 8))
        draw = ImageDraw.Draw(tile)
        label = f"{source.name[:38]}\npage {page_number} of {len(document)}"
        draw.multiline_text((8, 370), label, fill="black", spacing=3)
        tiles.append(tile)

columns = 4
rows = math.ceil(len(tiles) / columns)
sheet = Image.new("RGB", (columns * 300, rows * 410), "#d8d4c9")
for index, tile in enumerate(tiles):
    sheet.paste(tile, ((index % columns) * 300, (index // columns) * 410))
sheet.save(QA_DIR / "first-last-pages-contact-sheet.jpg", quality=88)
print(QA_DIR / "first-last-pages-contact-sheet.jpg")
