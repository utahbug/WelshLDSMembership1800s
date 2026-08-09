import csv
import hashlib
import json
from pathlib import Path

from pypdf import PdfReader, PdfWriter


ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / "outputs" / "internet-archive-split-plan" / "proposed-splits.csv"
SOURCE_DIR = ROOT / "records" / "transcriptions"
OUTPUT_DIR = ROOT / "output" / "pdf" / "internet-archive-transcriptions"
MANIFEST = ROOT / "outputs" / "internet-archive-split-plan" / "approved-split-manifest.csv"


def parse_pages(spec: str) -> list[int]:
    pages = []
    for part in spec.split(","):
        part = part.strip()
        if "-" in part:
            first, last = (int(value) for value in part.split("-", 1))
            pages.extend(range(first, last + 1))
        else:
            pages.append(int(part))
    return pages


def content_hash(page) -> str:
    contents = page.get_contents()
    data = b"" if contents is None else contents.get_data()
    return hashlib.sha256(data).hexdigest()


def file_hash(path: Path, algorithm: str) -> str:
    digest = hashlib.new(algorithm)
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    rows = list(csv.DictReader(PLAN.open(encoding="utf-8-sig", newline="")))
    approved = [row for row in rows if row["status"].startswith("ready")]
    manifest = []

    for row in approved:
        source = SOURCE_DIR / row["source_pdf"]
        pages = parse_pages(row["pdf_pages"])
        reader = PdfReader(source)
        if max(pages) > len(reader.pages):
            raise ValueError(f"Page range exceeds {source.name}: {row['pdf_pages']}")

        destination = OUTPUT_DIR / row["proposed_output_filename"]
        writer = PdfWriter()
        source_hashes = []
        for number in pages:
            page = reader.pages[number - 1]
            source_hashes.append(content_hash(page))
            writer.add_page(page)
        with destination.open("wb") as stream:
            writer.write(stream)

        reopened = PdfReader(destination)
        output_hashes = [content_hash(page) for page in reopened.pages]
        if len(reopened.pages) != len(pages) or output_hashes != source_hashes:
            raise RuntimeError(f"Lossless page-content verification failed: {destination.name}")

        manifest.append({
            "source_pdf": source.name,
            "source_pages": row["pdf_pages"],
            "destination_record_group": row["destination_record_group"],
            "local_output_path": destination.relative_to(ROOT).as_posix(),
            "remote_path": f"{row['proposed_archive_folder']}/{destination.name}",
            "page_count": len(reopened.pages),
            "size": destination.stat().st_size,
            "md5": file_hash(destination, "md5"),
            "sha1": file_hash(destination, "sha1"),
            "page_content_sha256_verified": "true",
            "status": "approved-ready",
        })

    fields = list(manifest[0])
    with MANIFEST.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        writer.writerows(manifest)

    print(json.dumps({"outputs": len(manifest), "manifest": str(MANIFEST)}, indent=2))


if __name__ == "__main__":
    main()
