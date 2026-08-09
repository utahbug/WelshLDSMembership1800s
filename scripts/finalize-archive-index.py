import csv
import re
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "outputs" / "internet-archive-upload-plan" / "INDEX.csv"
READY_ORIGINALS = ROOT / "outputs" / "internet-archive-upload-plan" / "pdf-inventory.csv"
SPLITS = ROOT / "outputs" / "internet-archive-split-plan" / "approved-split-manifest.csv"


def read_csv(path: Path):
    with path.open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def infer_folder(folder: str):
    stem = re.sub(r"^\d+-", "", folder)
    years = "; ".join("-".join(match) for match in re.findall(r"(\d{4})[^\d]+(\d{4})", stem))
    lr_match = re.search(r"LR(\d+)", stem, re.I)
    branch = re.split(r",\d{4}|\s*\(\d{4}", stem, maxsplit=1)[0].strip()
    return branch, years, f"LR{lr_match.group(1)}" if lr_match else ""


def main():
    index_rows = [
        row for row in read_csv(INDEX)
        if row.get("transcription_mapping_status") != "needs-review-compound-pdf"
    ]
    additions = []

    for row in read_csv(READY_ORIGINALS):
        if row["mapping_status"] != "ready":
            continue
        additions.append({
            "remote_path": row["remote_path"],
            "source_pdf": Path(row["local_path"]).name,
            "source_pages": f"1-{row['pages']}",
        })

    for row in read_csv(SPLITS):
        additions.append({
            "remote_path": row["remote_path"],
            "source_pdf": row["source_pdf"],
            "source_pages": row["source_pages"],
        })

    grouped = defaultdict(list)
    for item in additions:
        folder = item["remote_path"].split("/Transcriptions/", 1)[0]
        grouped[folder].append(item)

    by_folder = {row["archive_path"].rstrip("/"): row for row in index_rows}
    for folder, items in grouped.items():
        row = by_folder.get(folder)
        if row is None:
            branch, years, lr = infer_folder(folder)
            row = {
                "branch": branch,
                "years": years,
                "lr_reference": lr,
                "intended_image_count": "0",
                "transcription_pdf_count": "0",
                "archive_path": f"{folder}/",
                "transcription_paths": "",
                "transcription_mapping_status": "",
            }
            index_rows.append(row)
            by_folder[folder] = row

        row["transcription_pdf_count"] = str(len(items))
        row["transcription_paths"] = "; ".join(item["remote_path"] for item in items)
        row["transcription_mapping_status"] = "approved"
        row["transcription_source_files"] = "; ".join(item["source_pdf"] for item in items)
        row["transcription_source_pages"] = "; ".join(
            f"{item['source_pdf']}: {item['source_pages']}" for item in items
        )

    for row in index_rows:
        row.setdefault("transcription_source_files", "")
        row.setdefault("transcription_source_pages", "")

    fields = [
        "branch", "years", "lr_reference", "intended_image_count",
        "transcription_pdf_count", "archive_path", "transcription_paths",
        "transcription_mapping_status", "transcription_source_files",
        "transcription_source_pages",
    ]
    with INDEX.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        writer.writerows(index_rows)
    print(f"Indexed {len(additions)} approved transcription PDFs across {len(grouped)} folders")


if __name__ == "__main__":
    main()
