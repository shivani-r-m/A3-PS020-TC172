"""Safe, read-only file access. Nothing here writes, executes or shells out.

Every reader returns ``None`` (plus a warning) instead of raising for missing, unreadable
or malformed input, so a bad file can never crash an endpoint.
"""
from __future__ import annotations

import csv
import re
from datetime import datetime, timezone
from pathlib import Path

from ..schemas import DataSourceInfo, SourceKind

MAX_BYTES = 20 * 1024 * 1024


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def num(value: object) -> float | None:
    """Parse '0.017', '0%', ' 12 ' ... -> float, or None if it is not a finite number."""
    if value is None:
        return None
    text = str(value).strip().rstrip("%").strip()
    if not text:
        return None
    try:
        out = float(text)
    except ValueError:
        return None
    return out if out == out and out not in (float("inf"), float("-inf")) else None


class SourceTracker:
    """Reads files under a root directory and remembers what was found / missing / odd."""

    def __init__(self, root: Path, label: str = "src/results"):
        self.root = root
        self.label = label.rstrip("/")
        self.used: list[str] = []
        self.missing: list[str] = []
        self.warnings: list[str] = []
        self._mtimes: list[float] = []

    # -- paths ---------------------------------------------------------------
    def display(self, rel: str) -> str:
        return f"{self.label}/{rel}"

    def _resolve(self, rel: str) -> Path | None:
        """Resolve ``rel`` under root, refusing anything that escapes it."""
        try:
            root = self.root.resolve()
            path = (root / rel).resolve()
            path.relative_to(root)
        except (ValueError, OSError):
            self.warnings.append(f"Refused unsafe path: {rel}")
            return None
        return path

    def exists(self, rel: str) -> bool:
        p = self._resolve(rel)
        return bool(p and p.is_file())

    def list_dir(self, rel: str = ".") -> list[str]:
        p = self._resolve(rel)
        try:
            return sorted(c.name for c in p.iterdir() if c.is_file()) if p and p.is_dir() else []
        except OSError:
            return []

    # -- readers -------------------------------------------------------------
    def text(self, rel: str, *, required: bool = True) -> str | None:
        p = self._resolve(rel)
        if p is None:
            return None
        try:
            if not p.is_file():
                raise FileNotFoundError
            if p.stat().st_size > MAX_BYTES:
                self.warnings.append(f"{self.display(rel)} is larger than {MAX_BYTES // 1024 // 1024} MB; skipped.")
                return None
            raw = p.read_bytes()
            self._mtimes.append(p.stat().st_mtime)
        except FileNotFoundError:
            if required:
                self.missing.append(self.display(rel))
                self.warnings.append(f"Missing file: {self.display(rel)}")
            return None
        except OSError as exc:
            self.warnings.append(f"Could not read {self.display(rel)} ({exc.__class__.__name__}).")
            return None
        self.used.append(self.display(rel))
        # Result logs may contain NUL padding (seen in the M2 log); drop it, never crash on bad UTF-8.
        return raw.replace(b"\x00", b"").decode("utf-8", errors="replace")

    def csv_rows(self, rel: str, *, required: bool = True) -> tuple[list[dict[str, str]], int] | None:
        """Return (rows, malformed_row_count) or None if the file is unavailable/empty."""
        text = self.text(rel, required=required)
        if text is None:
            return None
        try:
            reader = csv.DictReader(text.splitlines())
            header = [h.strip() for h in (reader.fieldnames or [])]
            if not header:
                self.warnings.append(f"{self.display(rel)} has no CSV header.")
                return None
            reader.fieldnames = header
            rows: list[dict[str, str]] = []
            bad = 0
            for raw in reader:
                if None in raw or any(v is None for v in raw.values()):
                    bad += 1  # wrong number of cells
                    continue
                rows.append({k: (v or "").strip() for k, v in raw.items()})
        except csv.Error as exc:
            self.warnings.append(f"{self.display(rel)} is not valid CSV ({exc}).")
            return None
        if bad:
            self.warnings.append(f"{self.display(rel)}: {bad} malformed row(s) skipped.")
        return rows, bad

    # -- reporting -----------------------------------------------------------
    def last_modified(self) -> str | None:
        if not self._mtimes:
            return None
        return datetime.fromtimestamp(max(self._mtimes), timezone.utc).isoformat(timespec="seconds")

    def info(self, kind: SourceKind, description: str) -> DataSourceInfo:
        return DataSourceInfo(
            kind=kind if self.used else ("unavailable" if kind == "historical" else kind),
            live_telemetry=False,
            description=description,
            files=list(dict.fromkeys(self.used)),
            missing_files=list(dict.fromkeys(self.missing)),
            last_modified=self.last_modified(),
        )


# ---- timestamp helpers ------------------------------------------------------
_TS = re.compile(r"^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?")


def ts_ns(ts: str) -> int | None:
    """'2026-10-30 23:10:15.324123456' -> integer nanoseconds (naive clock, used only for differences)."""
    m = _TS.match(ts)
    if not m:
        return None
    y, mo, d, h, mi, s = (int(m.group(i)) for i in range(1, 7))
    try:
        whole = int(datetime(y, mo, d, h, mi, s, tzinfo=timezone.utc).timestamp())
    except ValueError:
        return None
    frac = (m.group(7) or "").ljust(9, "0")
    return whole * 1_000_000_000 + int(frac)


def seconds_between(a: str | None, b: str | None) -> float | None:
    if not a or not b:
        return None
    na, nb = ts_ns(a), ts_ns(b)
    if na is None or nb is None:
        return None
    return round((nb - na) / 1e9, 3)


def short_ts(ts: str | None) -> str | None:
    """Keep millisecond precision for display ('2026-10-30 23:10:15.324')."""
    return ts[:23] if ts else None
