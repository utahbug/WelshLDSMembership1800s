from __future__ import annotations

import argparse
import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "resources" / "books" / "1852WelchHymnal.pdf"
DEFAULT_OUTPUT = ROOT / "output" / "pdf" / "1852-welsh-hymnal-cleaned.pdf"
DEFAULT_MAP = ROOT / "output" / "pdf" / "1852-welsh-hymnal-page-map.json"
PDFTOPPM = Path.home() / ".cache" / "codex-runtimes" / "codex-primary-runtime" / "dependencies" / "native" / "poppler" / "Library" / "bin" / "pdftoppm.exe"
RENDER_DPI = 140
VIEWER_MARGIN_POINTS = 18


def contiguous_segments(values: np.ndarray) -> list[tuple[int, int]]:
    indexes = np.flatnonzero(values)
    if not indexes.size:
        return []
    starts = np.r_[indexes[0], indexes[1:][np.diff(indexes) > 1]]
    ends = np.r_[indexes[:-1][np.diff(indexes) > 1], indexes[-1]]
    return [(int(start), int(end) + 1) for start, end in zip(starts, ends)]


def content_crop(image: Image.Image) -> tuple[tuple[int, int, int, int], str | None]:
    gray = ImageOps.grayscale(image)
    scale = min(1.0, 520 / gray.width)
    sample = gray.resize((round(gray.width * scale), round(gray.height * scale)), Image.Resampling.BILINEAR)
    pixels = np.asarray(sample)
    mask = pixels < 205
    edge_x = max(3, round(sample.width * 0.012))
    edge_y = max(3, round(sample.height * 0.012))
    mask[:edge_y, :] = False
    mask[-edge_y:, :] = False
    mask[:, :edge_x] = False
    mask[:, -edge_x:] = False

    row_counts = mask.sum(axis=1)
    row_segments = contiguous_segments(row_counts > max(5, sample.width * 0.008))
    candidates = []
    for top, bottom in row_segments:
        height = bottom - top
        if height < max(8, sample.height * 0.025):
            continue
        score = float(row_counts[top:bottom].sum()) * (height ** 0.55)
        candidates.append((score, top, bottom))
    if not candidates:
        return (0, 0, image.width, image.height), "No stable photographed-content boundary detected; full page preserved."

    _, top, bottom = max(candidates)
    region = mask[top:bottom]
    ys, xs = np.nonzero(region)
    if len(xs) < 100:
        return (0, 0, image.width, image.height), "Insufficient content pixels for a stable crop; full page preserved."

    left = int(np.quantile(xs, 0.002))
    right = int(np.quantile(xs, 0.998)) + 1
    content_top = top + int(np.quantile(ys, 0.002))
    content_bottom = top + int(np.quantile(ys, 0.998)) + 1
    pad_x = max(12, round((right - left) * 0.045))
    pad_y = max(12, round((content_bottom - content_top) * 0.055))
    left = max(0, left - pad_x)
    right = min(sample.width, right + pad_x)
    content_top = max(0, content_top - pad_y)
    content_bottom = min(sample.height, content_bottom + pad_y)

    inverse = 1 / scale
    crop = (
        round(left * inverse),
        round(content_top * inverse),
        round(right * inverse),
        round(content_bottom * inverse),
    )
    if (crop[2] - crop[0]) < image.width * 0.2 or (crop[3] - crop[1]) < image.height * 0.15:
        return (0, 0, image.width, image.height), "Detected crop was too small to be historically safe; full page preserved."
    return crop, None


def clean_page(image: Image.Image, page_number: int) -> tuple[Image.Image, tuple[int, int, int, int], str | None]:
    if 5 <= page_number <= 26:
        # These landscape copier captures use a consistent setup: the opened
        # volume occupies the upper-left portion while a large blank platen
        # fills the rest of the frame. A documented range override is safer
        # than letting the pale platen edge dominate the generic detector.
        crop = (
            round(image.width * 0.035),
            round(image.height * 0.10),
            round(image.width * 0.66),
            round(image.height * 0.80),
        )
        note = "Consistent early landscape copier setup; fixed proportional crop removes the blank platen while preserving the complete photographed spread."
    else:
        crop, note = content_crop(image)
    cleaned = ImageOps.grayscale(image.crop(crop))
    cleaned = ImageOps.autocontrast(cleaned, cutoff=(0.35, 0.35), preserve_tone=True)
    cleaned = ImageEnhance.Contrast(cleaned).enhance(1.06)
    cleaned = cleaned.filter(ImageFilter.UnsharpMask(radius=0.7, percent=55, threshold=4))
    return cleaned, crop, note


def build(source: Path, output: Path, mapping_output: Path) -> dict:
    if not PDFTOPPM.exists():
        raise FileNotFoundError(f"Poppler pdftoppm was not found: {PDFTOPPM}")
    output.parent.mkdir(parents=True, exist_ok=True)
    mapping_output.parent.mkdir(parents=True, exist_ok=True)
    page_map = []
    with tempfile.TemporaryDirectory(prefix="welsh-hymnal-") as temporary:
        render_prefix = Path(temporary) / "source"
        subprocess.run([
            str(PDFTOPPM), "-r", str(RENDER_DPI), "-jpeg", "-jpegopt", "quality=92,progressive=n",
            str(source), str(render_prefix),
        ], check=True)
        rendered = sorted(Path(temporary).glob("source-*.jpg"))
        if not rendered:
            raise RuntimeError("The source PDF did not render any pages.")
        document = canvas.Canvas(str(output), pageCompression=1)
        for page_number, rendered_page in enumerate(rendered, 1):
            with Image.open(rendered_page) as source_image:
                source_image.load()
                cleaned, crop, note = clean_page(source_image, page_number)
            cleaned_path = Path(temporary) / f"cleaned-{page_number:04d}.jpg"
            cleaned.save(cleaned_path, "JPEG", quality=90, optimize=True, progressive=False, dpi=(RENDER_DPI, RENDER_DPI))
            width_points = cleaned.width * 72 / RENDER_DPI + VIEWER_MARGIN_POINTS * 2
            height_points = cleaned.height * 72 / RENDER_DPI + VIEWER_MARGIN_POINTS * 2
            document.setPageSize((width_points, height_points))
            document.drawImage(
                str(cleaned_path), VIEWER_MARGIN_POINTS, VIEWER_MARGIN_POINTS,
                width=width_points - VIEWER_MARGIN_POINTS * 2,
                height=height_points - VIEWER_MARGIN_POINTS * 2,
                preserveAspectRatio=True,
                mask="auto",
            )
            document.showPage()
            page_map.append({
                "originalPdfPage": page_number,
                "cleanedViewerPage": page_number,
                "renderDpi": RENDER_DPI,
                "sourcePixelSize": [source_image.width, source_image.height],
                "cropPixels": list(crop),
                "deskewDegrees": 0,
                "note": note,
            })
        document.save()

    mapping = {
        "schemaVersion": 1,
        "source": source.name,
        "cleanedDerivative": output.name,
        "pageCount": len(page_map),
        "mapping": "One cleaned viewer page for each original PDF page; page numbers are identical.",
        "cleanup": {
            "method": "Deterministic photographed-content crop, grayscale conversion, conservative autocontrast, and mild unsharp masking.",
            "deskew": "No automatic rotation was applied where a safe angle could not be established; original photographic geometry is preserved.",
        },
        "pages": page_map,
    }
    mapping_output.write_text(json.dumps(mapping, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {
        "source": str(source),
        "output": str(output),
        "mapping": str(mapping_output),
        "pages": len(page_map),
        "pagesWithFallbackCrop": sum(bool(page["note"]) for page in page_map),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--mapping", type=Path, default=DEFAULT_MAP)
    args = parser.parse_args()
    print(json.dumps(build(args.source.resolve(), args.output.resolve(), args.mapping.resolve()), indent=2))
