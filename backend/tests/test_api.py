import json

import pytest

ENDPOINTS = ["health", "overview", "topology", "benchmarks", "failover", "logs"]


@pytest.mark.parametrize("name", ENDPOINTS)
def test_every_endpoint_ok_and_labels_its_source(client, name):
    r = client.get(f"/api/{name}")
    assert r.status_code == 200
    body = r.json()
    if name != "health":
        assert body["data_source"]["live_telemetry"] is False
        assert body["data_source"]["kind"] in ("historical", "repo_config")
        assert body["generated_at"]
    else:
        assert body["status"] == "ok" and body["read_only"] is True and body["version"] and body["timestamp"]


def test_benchmarks_real_values_and_summary_crosscheck(client):
    b = client.get("/api/benchmarks").json()
    modes = {m["id"]: m for m in b["latest"]["modes"]}
    assert set(modes) == {"M0", "P1", "P2"}
    assert all(m["trials"] == 30 and m["transmitted"] == 30000 and m["received"] == 30000 for m in modes.values())
    assert modes["P1"]["max_rtt_ms"] == 97.209 and modes["M0"]["max_rtt_ms"] == 4.685
    assert modes["P2"]["median_trial_avg_rtt_ms"] == pytest.approx(0.0205)
    assert b["latest"]["summary_file_check"]["matches"] is True
    assert b["earlier_run"] and {m["id"] for m in b["earlier_run"]["modes"]} == {"P1", "P2"}
    assert modes["M0"]["trial_rows"] is None
    with_rows = client.get("/api/benchmarks?include_trials=true").json()
    assert len(with_rows["latest"]["modes"][0]["trial_rows"]) == 30


def test_failover_matches_recorded_summary_and_declares_single_trial(client):
    f = client.get("/api/failover").json()
    assert f["measurement_scope"] == "single_trial"
    assert f["runs_in_log"] == 5 and f["recovered_runs"] == 2
    m = f["headline_trial"]["metrics"]
    assert (m["first_fail_to_install_s"], m["first_fail_to_recovery_s"], m["install_to_recovery_s"]) == (6.134, 11.405, 5.271)
    assert m["detection_time_s"] == 5.286 and m["path_installation_time_s"] == 0.849
    v = f["headline_trial"]["verification"]
    assert (v["transmitted"], v["received"], v["rtt_avg_ms"]) == (5, 5, 0.644)
    assert f["summary_file_check"]["matches"] is True
    assert f["failure_link"] == "R2-R5" and f["detection_threshold"] == 3
    assert sum(r["is_headline"] for r in f["runs"]) == 1


def test_topology_parsed_from_scripts(client):
    t = client.get("/api/topology").json()
    assert [n["id"] for n in t["nodes"]] == ["S", "R1", "R2", "R3", "R4", "R5", "D"]
    paths = {p["id"]: p for p in t["paths"]}
    assert paths["P1"]["nodes"] == ["S", "R1", "R2", "R5", "D"]
    assert paths["P2"]["nodes"] == ["S", "R1", "R3", "R4", "R5", "D"]
    assert t["failure_link"] == "R2-R5"
    assert [l["id"] for l in t["links"] if l["failure_link"]] == ["r2-r5"]
    assert {n["id"]: n["sid_behavior"] for n in t["nodes"] if n["sid"]} == {"R2": "End", "R3": "End", "R4": "End", "R5": "End.DT6"}
    assert all(l["status"] == "unknown" for l in t["links"])


def test_overview_has_four_modes_and_source(client):
    o = client.get("/api/overview").json()
    assert [m["id"] for m in o["modes"]] == ["M0", "M1-P1", "M1-P2", "M2"]
    assert o["last_updated"] and o["experiment_dates"]["benchmark_run"] == "2026-10-31"
    assert o["data_source"]["kind"] == "historical"


def test_logs_filters_and_order(client):
    r = client.get("/api/logs?limit=500").json()
    assert r["returned"] == len(r["entries"]) <= 500
    stamps = [e["timestamp"] for e in r["entries"] if e["timestamp"]]
    assert stamps == sorted(stamps, reverse=True)
    assert {e["kind"] for e in r["entries"]} == {"event", "record"}
    err = client.get("/api/logs?severity=error&category=M2").json()
    assert err["entries"] and all(e["severity"] == "error" and e["category"] == "M2" for e in err["entries"])
    assert client.get("/api/logs?limit=0").status_code == 422
    assert client.get("/api/logs?severity=bogus").status_code == 422


# ---- missing / malformed input ------------------------------------------------
def test_missing_results_dir_degrades_gracefully(client, src, monkeypatch):
    monkeypatch.setenv("AIORI_DATA_DIR", str(src / "does-not-exist"))
    assert client.get("/api/health").json()["status"] == "degraded"
    b = client.get("/api/benchmarks").json()
    assert b["latest"] is None and b["data_source"]["kind"] == "unavailable" and b["warnings"]
    f = client.get("/api/failover").json()
    assert f["measurement_scope"] == "none" and f["headline_trial"] is None and f["warnings"]
    for name in ("overview", "logs"):
        assert client.get(f"/api/{name}").status_code == 200


def test_missing_scripts_dir_gives_empty_topology(client, src, monkeypatch):
    monkeypatch.setenv("AIORI_SCRIPTS_DIR", str(src / "nope"))
    t = client.get("/api/topology")
    assert t.status_code == 200 and t.json()["nodes"] == [] and t.json()["warnings"]


def test_malformed_csv_rows_are_skipped_not_invented(client, src):
    p = src / "results/final/p1_benchmark_20261031.csv"
    lines = p.read_text().splitlines()
    lines[2] = "2,1000,1000,not-a-number,0%,1164,0.005,0.057,2.462,0.116"  # bad received
    lines[3] = "3,1000"  # too few cells
    p.write_text("\n".join(lines) + "\n")
    b = client.get("/api/benchmarks").json()
    p1 = next(m for m in b["latest"]["modes"] if m["id"] == "P1")
    assert p1["trials"] == 28 and p1["skipped_rows"] >= 1 and p1["transmitted"] == 28000
    assert b["latest"]["summary_file_check"]["matches"] is False  # disagreement is reported, not hidden
    assert any("p1_benchmark_20261031.csv" in w for w in b["warnings"])


def test_empty_and_binary_garbage_files_do_not_crash(client, src):
    (src / "results/final/m0_benchmark_20261031.csv").write_text("")
    (src / "results/m2/failover_success_20261030.log").write_bytes(b"\x00\xff\xfe garbage \x00\n" * 50)
    assert client.get("/api/benchmarks").status_code == 200
    f = client.get("/api/failover").json()
    assert f["measurement_scope"] == "none" and f["warnings"]
    assert client.get("/api/overview").status_code == 200
    assert client.get("/api/logs").status_code == 200


def test_summary_mismatch_is_reported(client, src):
    p = src / "results/m2/failover_summary.txt"
    p.write_text(p.read_text().replace("11.405", "99.999"))
    assert client.get("/api/failover").json()["summary_file_check"]["matches"] is False


def test_log_with_nul_padding_still_parses(client, src):
    p = src / "results/m2/failover_success_20261030.log"
    p.write_bytes(p.read_bytes().replace(b"\n", b"\n\x00\x00", 3))
    assert client.get("/api/failover").json()["headline_trial"]["metrics"]["first_fail_to_recovery_s"] == 11.405


# ---- safety / CORS -------------------------------------------------------------
@pytest.mark.parametrize("method", ["post", "put", "patch", "delete"])
@pytest.mark.parametrize("name", ENDPOINTS)
def test_no_write_methods(client, method, name):
    assert getattr(client, method)(f"/api/{name}").status_code == 405


def test_no_command_or_file_endpoints_exist(client):
    paths = set(client.get("/openapi.json").json()["paths"])
    assert paths == {f"/api/{n}" for n in ENDPOINTS}
    for evil in ("/api/run", "/api/exec", "/api/files?path=../../etc/passwd", "/api/logs/../../etc/passwd"):
        assert client.get(evil).status_code in (404, 405)


def test_cors_allows_dashboard_origin_only(client):
    ok = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert ok.headers["access-control-allow-origin"] == "http://localhost:5173"
    bad = client.get("/api/health", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in bad.headers
    pre = client.options("/api/health", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"})
    assert pre.status_code == 200
    pre_post = client.options("/api/health", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"})
    assert pre_post.status_code == 400


def test_unhandled_error_hides_internals(client, monkeypatch):
    from app.services import overview
    monkeypatch.setattr(overview, "build", lambda s: (_ for _ in ()).throw(RuntimeError("secret /home/user/x")))
    r = client.get("/api/overview")
    assert r.status_code == 500 and "secret" not in r.text and "/home" not in r.text
