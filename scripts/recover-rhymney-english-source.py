"""Recover Rhymney English direct-FHC microfilm frames losslessly from one-page PDFs."""

from pathlib import Path
from pypdf import PdfReader

SOURCE = Path(r"C:\Users\kenro\Desktop\CDs - KEN\PDF Files - Welsh Membership\Microfilm\Films copied Aug 3, 2019\Archive\0,104,171")
DESTINATION = Path(r"C:\Users\kenro\Documents\Codex\LDSWelshMembers\resources\source-cds\Rhymney English,1851-1887,LIB1602-direct-FHC\Images")


def selected(path: Path) -> bool:
    stem = path.stem.lower()
    if stem.startswith("229 rhymney english") or stem.startswith("230 historian") or stem.startswith("230 record"):
        return True
    return stem.isdigit() and 232 <= int(stem) <= 285


def order_key(path: Path):
    stem = path.stem.lower()
    if stem.startswith("229 "):
        return (229, 0)
    if stem.startswith("230 historian"):
        return (230, 0)
    if stem.startswith("230 record"):
        return (230, 1)
    return (int(stem), 0)


def main():
    files = sorted((path for path in SOURCE.glob("*.pdf") if selected(path)), key=order_key)
    if len(files) != 57:
        raise RuntimeError(f"Expected 57 source frames, found {len(files)}")
    DESTINATION.mkdir(parents=True, exist_ok=True)
    for old in DESTINATION.glob("*.jpg"):
        old.unlink()
    manifest = []
    for sequence, pdf_path in enumerate(files, 1):
        reader = PdfReader(pdf_path)
        if len(reader.pages) != 1 or len(reader.pages[0].images) != 1:
            raise RuntimeError(f"Expected one page and one embedded image: {pdf_path}")
        image = reader.pages[0].images[0]
        frame = pdf_path.stem.split(" ", 1)[0]
        target = DESTINATION / f"FHC104171_{sequence:03d}_frame-{frame}.jpg"
        target.write_bytes(image.data)
        manifest.append(f"{sequence:03d}\t{pdf_path.name}\t{target.name}\t{len(image.data)}")
    provenance = DESTINATION.parent / "SOURCE_PROVENANCE.txt"
    provenance.write_text(
        "Rhymney English Branch direct-FHC-microfilm fallback source\n"
        "Film folder: 0,104,171\n"
        "Photographed source heading: Rhymney English Branch (Wales), British Mission\n"
        "Record title: Record of Members, 1851-1887\n"
        "Photographed library identifier: 1602\n"
        "Recovery: embedded JPEGs extracted losslessly from 57 one-frame PDFs created from the user's direct FHC microfilm captures.\n"
        "The ordinary Rhymney CD 20 / LR124517 collection is a separate source and was not used.\n\n"
        "Sequence\tOriginal PDF\tRecovered image\tBytes\n" + "\n".join(manifest) + "\n",
        encoding="utf-8",
    )
    print(f"Recovered {len(files)} lossless images to {DESTINATION}")


if __name__ == "__main__":
    main()
