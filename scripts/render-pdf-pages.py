import sys
from pathlib import Path

import pypdfium2 as pdfium


source = Path(sys.argv[1])
output = Path(sys.argv[2])
pages = [int(value) for value in sys.argv[3:]]
output.mkdir(parents=True, exist_ok=True)
document = pdfium.PdfDocument(source)
for page_number in pages:
    page = document[page_number - 1]
    image = page.render(scale=1.5).to_pil()
    image.save(output / f"page-{page_number:03d}.png")
