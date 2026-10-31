"""Topology parsed from the repository's own scripts (read only, never executed)."""
from __future__ import annotations

import re

from ..config import Settings
from ..schemas import Interface, TopologyLink, TopologyNode, TopologyPath, TopologyResponse
from .data_reader import SourceTracker, utc_now
from . import failover as failover_service

_LINK = re.compile(r"^\s*link\s+(\w+)\s+(\w+)\s+(\S+)\s+(\S+)\s*$", re.M)
_NS_LOOP = re.compile(r"for\s+n\s+in\s+([\w\s]+?);\s*do")
_DEFAULT = re.compile(r"ip\s+-n\s+(\w+)\s+route\s+add\s+default\s+via\s+(\S+)")
_SID = re.compile(r"ip\s+-n\s+(\w+)\s+-6\s+route\s+replace\s+(\S+?)/128\s+table\s+\d+\s+encap\s+seg6local\s+action\s+(End\.DT6|End)\b")
_SEGS = re.compile(r"segs\s+([0-9a-fA-F:,]+)")
DESTINATION = re.compile(r'DESTINATION="?([0-9a-fA-F:]+)"?')


def _subnet(addr: str) -> str:
    # fc00:12::1 -> fc00:12::/64 (the scripts use /64 on every link)
    return re.sub(r"::[0-9a-fA-F]*$", "::/64", addr)


def build(settings: Settings) -> TopologyResponse:
    tr = SourceTracker(settings.scripts_dir, "src/scripts")
    topo = tr.text("00_topology.sh")
    sids_txt = tr.text("20_m1_sids.sh")
    p1_txt = tr.text("30_m1_p1.sh")
    p2_txt = tr.text("31_m1_p2.sh")
    bench_txt = tr.text("50_benchmark_ping.sh", required=False)

    note = ("Link and node status is 'unknown': the backend only reads recorded files and does not query "
            "the running namespaces. Live telemetry is not part of this stage.")
    if not topo:
        return TopologyResponse(
            data_source=tr.info("repo_config", "Parsed from src/scripts."), generated_at=utc_now(), warnings=tr.warnings,
            nodes=[], links=[], paths=[], failure_link=None, destination=None, live_status_note=note,
        )

    ns_order = ["s", "r1", "r2", "r3", "r4", "r5", "d"]
    if (m := _NS_LOOP.search(topo)):
        listed = m.group(1).split()
        ns_order = ["s"] + [n for n in listed if n.startswith("r")] + ["d"]

    ifaces: dict[str, list[Interface]] = {n: [] for n in ns_order}
    links: list[TopologyLink] = []
    for a, b, addr_a, addr_b in _LINK.findall(topo):
        ifaces.setdefault(a, []).append(Interface(name=f"{a}-{b}", address=addr_a))
        ifaces.setdefault(b, []).append(Interface(name=f"{b}-{a}", address=addr_b))
        links.append(TopologyLink(id=f"{a}-{b}", a=a.upper(), b=b.upper(), subnet=_subnet(addr_a)))

    sids: dict[str, tuple[str, str]] = {}
    flat = re.sub(r"\\\s*\n\s*", " ", sids_txt or "")  # join shell line continuations
    for ns, addr, behavior in _SID.findall(flat):
        sids[ns] = (addr, behavior)

    nodes = [
        TopologyNode(
            id=n.upper(), namespace=n, kind="router" if n.startswith("r") else "endpoint",
            interfaces=ifaces.get(n, []),
            sid=sids[n][0] if n in sids else None, sid_behavior=sids[n][1] if n in sids else None,
        )
        for n in ns_order
    ]

    owner = {addr: ns.upper() for ns, (addr, _) in sids.items()}
    link_ids = {frozenset((l.a, l.b)): l.id for l in links}
    paths: list[TopologyPath] = []
    for pid, role, txt in (("P1", "primary", p1_txt), ("P2", "backup", p2_txt)):
        m = _SEGS.search(txt or "")
        if not m:
            continue
        segs = m.group(1).split(",")
        hops = [owner.get(s) for s in segs]
        if any(h is None for h in hops):
            tr.warnings.append(f"{pid}: a segment is not an installed SID; path nodes not derived.")
            continue
        seq = ["S", "R1", *hops, "D"]  # R1 is the encapsulating ingress router (scripts: `ip -n r1 ... encap seg6`)
        ids = [link_ids.get(frozenset((a, b)), f"{a}-{b}".lower()) for a, b in zip(seq, seq[1:])]
        paths.append(TopologyPath(id=pid, role=role, nodes=seq, segments=segs, link_ids=ids))  # type: ignore[arg-type]

    # Failure link is documented in the result summaries, not in the topology script.
    dtr = SourceTracker(settings.data_dir)
    fl = failover_service._failure_link(dtr)
    tr.warnings.extend(dtr.warnings)
    if fl:
        fid = fl.lower()
        for l in links:
            if l.id == fid:
                l.failure_link = True
    else:
        tr.warnings.append("Failure link could not be read from the result summaries.")
    tr.used.extend(dtr.used)

    dest = None
    if bench_txt and (m := DESTINATION.search(bench_txt)):
        dest = m.group(1)
    return TopologyResponse(
        data_source=tr.info("repo_config", "Parsed from src/scripts (topology, SIDs, P1/P2 policies); failure link from result summaries."),
        generated_at=utc_now(), warnings=tr.warnings, nodes=nodes, links=links, paths=paths,
        failure_link=fl, destination=dest, live_status_note=note,
    )
