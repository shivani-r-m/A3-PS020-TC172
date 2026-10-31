# NetNova – Local SRv6 Path Steering and Measured Failure Recovery

**AIORI-3 Hackathon | PS-020 | Team Code: A3-PS020-TC172**
**Category:** 6G & Future Networks
**Institution:** RV College of Engineering

| | |
|---|---|
| **Team** | NetNova |
| **Members** | Shivani R M, Divya Sree N |
| **Mentor** | Dr. Shweta Babu Prasad |

**Quick links:** [Live Dashboard](https://a3-ps020-tc172-5.onrender.com/) · [Team Introduction](https://youtube.com/shorts/kKTfiE7RIRU) · [Full Demo Video](https://youtu.be/PvIQ_SrlY2A)

---

## 1. Project Overview

In plain IPv6 routing, every router chooses its own next hop, and after a link failure traffic stays broken until the routing protocol detects the failure and reconverges. Segment Routing over IPv6 (SRv6, RFC 8754 and RFC 8986) lets the first router place a list of Segment Identifiers (SIDs) in the packet header, so the packet follows a path we choose.

This project builds a Linux-based virtual lab and measures what happens to traffic when the same link fails under three routing modes. It does not claim that SRv6 is always better than plain IPv6. Results apply to this topology, this failure and the timers used.

### Objectives

- Build an SRv6-enabled five-router network on Linux.
- Demonstrate SID-based explicit path steering.
- Compare plain IPv6 (OSPFv3) with two SRv6 recovery approaches under the same link failure.
- Measure packet loss, RTT, failure detection delay, repair delay, total recovery time and SRv6 header overhead.
- Present saved results in a web dashboard.

---

## 2. Implementation Status

| Area | Status |
|---|---|
| Five-router Linux namespace testbed with source and destination hosts | Implemented |
| IPv6 addressing and OSPFv3 baseline (FRRouting) | Implemented |
| SRv6 SIDs, End and End.DT6 behaviours, encapsulation routes | Implemented |
| Primary path R1→R2→R5 and backup path R1→R3→R4→R5, forwarding verified | Implemented |
| Probe-based failure detection (3 consecutive failed probes) and backup path installation | Implemented |
| Timestamp logging, packet loss, RTT, detection / repair / total recovery measurement | Implemented |
| Repeated trials with statistical analysis | Implemented |
| React + Vite dashboard (read-only, saved results) | Implemented |
| Automatic failback to the primary path | **Not implemented** |
| Live control of the network from the dashboard | **Not implemented** |
| BFD-based detection, TI-LFA-style repair | **Future work** |

---

## 3. Network Design

### Topology

Five routers run as Linux network namespaces on one Ubuntu host, in a ring: R1–R2–R5–R4–R3–R1. A source host sits behind R1 and a destination host behind R5. The link under test is R2–R5.

```
                 +-----+ ---- +-----+
        S --- R1 |     |      | R2  |
                 +-----+      +-----+
                   |             |   <-- failed link (R2-R5)
                 +-----+      +-----+
                 | R3  | ---- | R4  | --- R5 --- D
                 +-----+      +-----+
```

> Replace the sketch above with your real diagram image if you have one, for example `evidence/topology.png`.

### SRv6 paths

| Path | Route | SID list |
|---|---|---|
| P1 (primary) | R1 → R2 → R5 | `fc00:0:2::1`, `fc00:0:5::d6` |
| P2 (backup) | R1 → R3 → R4 → R5 | `fc00:0:3::1`, `fc00:0:4::1`, `fc00:0:5::d6` |

- Locators: `fc00:0:N::/48` for router N.
- `End` SID on router N: `fc00:0:N::1`.
- `End.DT6` on R5: `fc00:0:5::d6`.
- R1 is the ingress (encapsulates); R5 is the egress (decapsulates).

### Routing modes compared

| Mode | Description |
|---|---|
| **M0** | Plain IPv6 with OSPFv3, hop-by-hop, no SRH |
| **M1** | SRv6 on P1; after failure detection a script installs the backup SRv6 path |
| **M2** | SRv6 with the backup path pre-installed in advance |

All modes use the same topology, link costs, traffic and failure.

---

## 4. Failure Detection and Recovery Controller

1. Send periodic probes towards the destination to monitor reachability.
2. Declare a failure after **three consecutive failed probes** and record the detection timestamp.
3. Install the backup SRv6 path and record the repair timestamp.
4. Verify connectivity over the backup path.
5. Log all timestamps for analysis.

**Limitation:** the controller switches one way only (primary → backup). Automatic failback is not implemented.

### Metrics

- Detection delay = detection time − failure time
- Repair delay = repair time − detection time
- Total recovery time = detection delay + repair delay
- Packet loss, mean RTT and maximum RTT from the probe stream
- SRv6 header overhead

Header size is calculated as SRH = 8 + 16n bytes for n SIDs, plus a 40-byte outer IPv6 header with H.Encaps. For P1 (n = 2) this is 80 bytes and for P2 (n = 3) it is 96 bytes. Confirm against the packet captures in `evidence/`.

<!-- VERIFY BEFORE SUBMISSION: delete any item below that is not in your scripts. -->
### Design techniques used

- Atomic IPv6 route replacement to reduce forwarding interruption.
- Pre-installed backup path using a binding SID (M2).
- High-resolution packet probing for interruption measurement.
- Packet captures to verify SID-based forwarding.
- Repeated failure experiments for more reliable comparisons.

---

## 5. Results

> **Fill this section from the raw logs in `evidence/`. Do not enter estimated values.**

**Experiment setup**

| Parameter | Value |
|---|---|
| Probe interval | `<__ ms>` |
| Trials per mode | `<__>` |
| Failed link | R2–R5 |
| Failure type | `<link down / other>` |
| Result source file | `evidence/<file>` |

**Recovery results** (mean ± 95% CI over trials)

| Mode | Packet loss | Detection delay | Repair delay | Total recovery | Mean RTT | Max RTT |
|---|---|---|---|---|---|---|
| M0 – OSPFv3 | `<>` | `<>` | `<>` | `<>` | `<>` | `<>` |
| M1 – SRv6 scripted | `<>` | `<>` | `<>` | `<>` | `<>` | `<>` |
| M2 – SRv6 pre-installed | `<>` | `<>` | `<>` | `<>` | `<>` | `<>` |

**Header overhead (from packet capture)**

| Path | SIDs | Measured bytes |
|---|---|---|
| P1 | 2 | `<>` |
| P2 | 3 | `<>` |

**Observations:** `<write only what the table shows, including any result that does not favour SRv6>`

---

## 6. How to Reproduce

**Requirements:** Ubuntu `<version>`, Linux kernel with SRv6 (seg6) support, iproute2, FRRouting, tcpdump, Python `<version>`, root access.

```bash
git clone https://github.com/aiori-hackathon/A3-PS020-TC172.git
cd A3-PS020-TC172

# 1. Create the five-router namespace topology  (replace with your script names)
sudo bash src/<setup_script>.sh

# 2. Run the experiments for M0, M1 and M2
sudo bash src/<run_script>.sh

# 3. Analyse the logs
python3 src/<analysis_script>.py
```

Raw logs, packet captures and result files are written to `evidence/`.

---

## 7. Repository Structure

```
src/        Network setup, controller and analysis scripts
backend/    <describe purpose>
frontend/   React + Vite dashboard
evidence/   Raw logs, packet captures and results
```

---

## 8. Dashboard

React + Vite **SRv6 Network Operations Dashboard**, deployed at https://a3-ps020-tc172-5.onrender.com/

Modules: Overview, Network Topology, Routing Modes, SRv6 Path Steering, Failover Monitoring, Benchmark Analytics, Experiment Logs, Settings.

The dashboard displays **saved experiment results** and configuration from `evidence/<file>`. It is a read-only visualisation, not a live network controller.

To run locally:

```bash
cd frontend
npm install
npm run dev
```

---

## 9. Limitations

- The testbed is an emulation on a single Ubuntu host. Absolute timings will differ on real hardware.
- Results apply to this topology, this single-link failure and the probe interval and OSPFv3 timers used.
- The recovery controller switches one way to the backup path; there is no automatic failback.
- The dashboard shows saved results only and cannot control the network.
- BFD, TI-LFA-style repair and SID summarisation are outside the implemented scope.

---

## 10. Technology Stack

Ubuntu Linux · Linux network namespaces · IPv6 · SRv6 (seg6) · iproute2 · FRRouting (OSPFv3) · tcpdump · Python · Bash · React · Vite

---

## 11. Demo and Resources

| Resource | Link |
|---|---|
| Live Dashboard | https://a3-ps020-tc172-5.onrender.com/ |
| Team Introduction Video | https://youtube.com/shorts/kKTfiE7RIRU |
| Full Implementation and Live Demo | https://youtu.be/PvIQ_SrlY2A |

---

**Team NetNova | A3-PS020-TC172 | AIORI-3 Hackathon | RV College of Engineering**
