import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

REPO_SRC = Path(__file__).resolve().parents[2] / "src"


@pytest.fixture()
def src(tmp_path, monkeypatch) -> Path:
    """A private copy of the repo's real src/ so tests can damage it freely."""
    if not (REPO_SRC / "results").is_dir():
        pytest.skip("repository src/ not found next to backend/")
    dst = tmp_path / "src"
    shutil.copytree(REPO_SRC, dst)
    monkeypatch.setenv("AIORI_DATA_DIR", str(dst / "results"))
    monkeypatch.setenv("AIORI_SCRIPTS_DIR", str(dst / "scripts"))
    return dst


@pytest.fixture()
def client(src) -> TestClient:
    from app.main import app
    return TestClient(app, raise_server_exceptions=False)
