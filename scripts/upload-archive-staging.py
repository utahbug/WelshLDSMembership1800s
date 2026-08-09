import concurrent.futures
import argparse
import threading
import time
from pathlib import Path

import internetarchive


ROOT = Path(__file__).resolve().parents[1]
STAGING = ROOT / "tmp" / "internet-archive-upload-staging"
IDENTIFIER = "ldswelshmembership"
thread_state = threading.local()


def item_for_thread():
    if not hasattr(thread_state, "item"):
        session = internetarchive.get_session()
        thread_state.item = session.get_item(IDENTIFIER)
    return thread_state.item


def upload(path: Path, delay: float, checksum_skip: bool):
    if delay:
        time.sleep(delay)
    remote = path.relative_to(STAGING).as_posix()
    response = item_for_thread().upload_file(
        path,
        key=remote,
        checksum=checksum_skip,
        verify=True,
        queue_derive=False,
        retries=10,
        retries_sleep=5,
    )
    if response.status_code is not None and not response.ok:
        raise RuntimeError(f"{remote}: HTTP {response.status_code} {response.text[:300]}")
    return remote


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--delay", type=float, default=0)
    parser.add_argument("--force-exact-path", action="store_true")
    args = parser.parse_args()
    files = sorted(path for path in STAGING.rglob("*") if path.is_file())
    print(f"Uploading {len(files)} files with {args.workers} workers", flush=True)
    completed = 0
    failures = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {
            executor.submit(upload, path, args.delay, not args.force_exact_path): path
            for path in files
        }
        for future in concurrent.futures.as_completed(futures):
            path = futures[future]
            try:
                future.result()
                completed += 1
                if completed % 50 == 0 or completed == len(files):
                    print(f"Completed {completed}/{len(files)}", flush=True)
            except Exception as error:
                failures.append((str(path), repr(error)))
                print(f"FAILED: {path}: {error}", flush=True)
    if failures:
        raise SystemExit(f"{len(failures)} uploads failed")
    print("All staged uploads completed and verified", flush=True)


if __name__ == "__main__":
    main()
