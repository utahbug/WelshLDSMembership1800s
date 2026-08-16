#!/usr/bin/env python3
"""Create a page-preserving, rasterized PDF derivative for web delivery."""

from __future__ import annotations

import argparse
import subprocess
import tempfile
from pathlib import Path

from PIL import Image
from pypdf import PdfReader
from reportlab.pdfgen import canvas


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--pdftoppm", type=Path, required=True)
    parser.add_argument("--dpi", type=int, default=105)
    parser.add_argument("--quality", type=int, default=58)
    args = parser.parse_args()

    reader = PdfReader(args.source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="welsh-pdf-web-") as temp_name:
        prefix = Path(temp_name) / "page"
        subprocess.run(
            [
                str(args.pdftoppm), "-jpeg", "-r", str(args.dpi),
                "-jpegopt", f"quality={args.quality},optimize=y,progressive=y",
                str(args.source), str(prefix),
            ],
            check=True,
        )
        images = sorted(prefix.parent.glob("page-*.jpg"))
        if len(images) != len(reader.pages):
            raise RuntimeError(f"Rendered {len(images)} pages; expected {len(reader.pages)}")

        pdf = canvas.Canvas(str(args.output), pageCompression=1)
        for number, (page, image_path) in enumerate(zip(reader.pages, images), start=1):
            width = float(page.mediabox.width)
            height = float(page.mediabox.height)
            pdf.setPageSize((width, height))
            with Image.open(image_path) as image:
                image_width, image_height = image.size
            scale = min(width / image_width, height / image_height)
            draw_width = image_width * scale
            draw_height = image_height * scale
            pdf.drawImage(
                str(image_path),
                (width - draw_width) / 2,
                (height - draw_height) / 2,
                width=draw_width,
                height=draw_height,
                preserveAspectRatio=True,
                anchor="c",
            )
            pdf.showPage()
            if number % 100 == 0:
                print(f"{args.source.name}: {number}/{len(images)} pages")
        pdf.save()

    written = PdfReader(args.output)
    if len(written.pages) != len(reader.pages):
        raise RuntimeError("Output page count changed")
    print(f"{args.output}: {len(written.pages)} pages, {args.output.stat().st_size} bytes")


if __name__ == "__main__":
    main()
