import json
import re
import sys
from pathlib import Path

from pypdf import PdfReader


KEYWORDS = re.compile(
    r"(?i)(conference|district|branch|minutes|record|stepaside|neath|swansea|"
    r"tredegar|ystrad|llansawel|llanelli|georgetown|haverfordwest|gymmer|cymmer|"
    r"pontypool|abersychan|merthyr|glamorgan|pen parren|sutton mountain)"
)


def compact(text: str) -> str:
    return " ".join(text.replace("\x00", " ").split())


def main() -> None:
    rows = []
    for name in sys.argv[1:]:
        pdf = Path(name)
        reader = PdfReader(pdf)
        rows.append({"source": pdf.name, "pages": len(reader.pages), "page_text": []})
        for number, page in enumerate(reader.pages, 1):
            text = compact(page.extract_text() or "")
            rows[-1]["page_text"].append({"page": number, "text": text})
    output = Path("tmp/pdfs/transcription-boundary-text.json")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(output)


if __name__ == "__main__":
    main()
