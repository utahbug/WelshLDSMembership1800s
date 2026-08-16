from __future__ import annotations

import json
import re
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "resources" / "books" / "1852WelchHymnal.pdf"
OUTPUT = ROOT / "local-development" / "data" / "publication-search" / "welsh-hymnal-1852.json"
TITLE = "Casgliad o Hymnau, Caniadau, ac Odlau Ysbrydol, at Wasanaeth Saint y Dyddiau Diweddaf, yn Nghymru"


def compact(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


reader = PdfReader(str(SOURCE))
pages = []
empty_pages = []
weak_pages = []
for page_number, page in enumerate(reader.pages, 1):
    text = compact(page.extract_text() or "")
    if not text:
        empty_pages.append(page_number)
    elif len(text) < 80:
        weak_pages.append(page_number)
    pages.append({"pageNumber": page_number, "text": text})

payload = {
    "schemaVersion": 1,
    "publicationId": "welsh-hymnal-1852",
    "title": TITLE,
    "year": 1852,
    "pageCount": len(reader.pages),
    "textBearingPageCount": sum(bool(page["text"]) for page in pages),
    "searchableCoveragePercent": round(100 * sum(bool(page["text"]) for page in pages) / len(reader.pages), 2),
    "extractionMethod": "Existing embedded OCR text; whitespace normalized without modernizing or translating Welsh wording.",
    "qualityNote": "The inherited OCR is useful for discovery but contains recognition errors and should be checked against the page image.",
    "emptyPages": empty_pages,
    "weakTextPages": weak_pages,
    "pageMapping": "Search page numbers map one-to-one to both original PDF pages and cleaned viewer pages.",
    "pages": pages,
}
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
print(json.dumps({key: payload[key] for key in ("pageCount", "textBearingPageCount", "searchableCoveragePercent", "emptyPages", "weakTextPages")}, indent=2))
