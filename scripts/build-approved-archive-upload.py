import csv
import hashlib
import json
import os
import shutil
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "outputs" / "internet-archive-upload-plan"
STAGING = ROOT / "tmp" / "internet-archive-upload-staging"
METADATA = Path(sys.argv[1])


def read_csv(path):
    with Path(path).open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def digest(path, name):
    value = hashlib.new(name)
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest()


def item(kind, local_path, remote_path, source_pdf="", source_pages=""):
    local = ROOT / local_path
    if not local.is_file():
        raise FileNotFoundError(local)
    return {
        "type": kind,
        "local_path": local.relative_to(ROOT).as_posix(),
        "remote_path": remote_path,
        "size": str(local.stat().st_size),
        "md5": digest(local, "md5"),
        "sha1": digest(local, "sha1"),
        "source_pdf": source_pdf,
        "source_pages": source_pages,
    }


def main():
    metadata = json.loads(METADATA.read_text(encoding="utf-8"))
    remote = {entry["name"]: entry for entry in metadata.get("files", [])}
    rows = []

    for row in read_csv(OUTPUT / "missing-images.csv"):
        rows.append(item("membership-image", row["local_path"], row["remote_path"]))

    for row in read_csv(OUTPUT / "pdf-inventory.csv"):
        if row["mapping_status"] == "ready":
            rows.append(item(
                "transcription-pdf", row["local_path"], row["remote_path"],
                Path(row["local_path"]).name, f"1-{row['pages']}",
            ))

    for row in read_csv(ROOT / "outputs" / "internet-archive-split-plan" / "approved-split-manifest.csv"):
        rows.append(item(
            "transcription-pdf", row["local_output_path"], row["remote_path"],
            row["source_pdf"], row["source_pages"],
        ))

    for name in ("README.txt", "INDEX.csv", "DEFERRED_TRANSCRIPTIONS.csv"):
        rows.append(item("archive-index", f"outputs/internet-archive-upload-plan/{name}", name))

    if len({row["remote_path"] for row in rows}) != len(rows):
        raise RuntimeError("Duplicate proposed remote paths found")

    conflicts = []
    for row in rows:
        existing = remote.get(row["remote_path"])
        if existing is None:
            row["preflight_status"] = "upload-new"
        elif existing.get("md5", "").lower() == row["md5"]:
            row["preflight_status"] = "already-present-matching"
        else:
            row["preflight_status"] = "STOP-CONFLICT"
            conflicts.append({"remote_path": row["remote_path"], "remote_md5": existing.get("md5", ""), "local_md5": row["md5"]})
    if conflicts:
        raise RuntimeError(json.dumps(conflicts, indent=2))

    if STAGING.exists():
        shutil.rmtree(STAGING)
    STAGING.mkdir(parents=True)
    staged = 0
    for row in rows:
        if row["preflight_status"] != "upload-new":
            continue
        source = ROOT / row["local_path"]
        destination = STAGING / Path(row["remote_path"])
        destination.parent.mkdir(parents=True, exist_ok=True)
        try:
            os.link(source, destination)
        except OSError:
            shutil.copy2(source, destination)
        staged += 1

    fields = ["type", "local_path", "remote_path", "size", "md5", "sha1", "source_pdf", "source_pages", "preflight_status"]
    with (OUTPUT / "approved-upload-manifest.csv").open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

    summary = {
        "metadata_fetched": metadata.get("d1", "") or metadata.get("metadata", {}).get("date", ""),
        "approved_objects": len(rows),
        "staged_new_objects": staged,
        "images": sum(row["type"] == "membership-image" for row in rows),
        "transcription_pdfs": sum(row["type"] == "transcription-pdf" for row in rows),
        "archive_index_files": sum(row["type"] == "archive-index" for row in rows),
        "existing_matching": sum(row["preflight_status"] == "already-present-matching" for row in rows),
        "conflicts": 0,
        "staging_path": str(STAGING),
    }
    (OUTPUT / "approved-upload-summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
