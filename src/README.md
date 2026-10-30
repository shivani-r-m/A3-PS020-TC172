# PS-020: Local SRv6 Path Steering and Measured Failure Recovery

**Team:** NetNova  
**Team Code:** A3-PS020-TC172  
**Hackathon:** AIORI-3

## 1. Project Overview

This project demonstrates local Segment Routing over IPv6 (SRv6) path steering and measured failure recovery using a five-router Linux network topology.

The implementation explores three stages:

- **M0 – Baseline:** Establish IPv6 connectivity and OSPFv3 routing.
- **M1 – SRv6 Path Steering:** Configure Segment Identifiers (SIDs) and steer traffic through explicitly selected primary and backup paths.
- **M2 – Failure Recovery:** Detect connectivity failure and switch traffic to the backup SRv6 path.

## 2. Network Topology

The emulated network contains five routers (R1–R5), a source namespace (S), and a destination namespace (D).

Two paths are configured:

| Path | Route |
|---|---|
| Primary (P1) | S → R1 → R2 → R5 → D |
| Backup (P2) | S → R1 → R3 → R4 → R5 → D |

The R2–R5 link is used as the failure link for recovery testing.

## 3. Implementation Stages

### M0 – Baseline OSPFv3

- Creates the Linux network namespaces and virtual links.
- Configures IPv6 addressing and forwarding.
- Starts OSPFv3 using FRRouting.
- Tests baseline connectivity and observes routing recovery following a link failure.

### M1 – SRv6 Path Steering

- Configures SRv6 SIDs on the routers.
- Uses `End` behavior on intermediate routers.
- Uses `End.DT6` at the destination-side router R5.
- Installs an SRv6 encapsulation route for P1 or P2 at R1.

The primary path uses R2 and R5 SIDs. The backup path uses R3, R4, and R5 SIDs.

### M2 – Failure Detection and Recovery

- Monitors destination reachability using periodic probes.
- Triggers a backup-path installation after three consecutive failed probes.
- Verifies recovery using connectivity probes.
- Records timestamps and failover events for measurement.

The current controller performs a one-way switch to P2; automatic failback is not implemented.

## 4. Repository Structure

```text
src/
├── configs/
│   └── m0/
│       ├── r1/
│       ├── r2/
│       ├── r3/
│       ├── r4/
│       └── r5/
├── scripts/
│   ├── 00_topology.sh
│   ├── 10_m0_ospf.sh
│   ├── 20_m1_sids.sh
│   ├── 30_m1_p1.sh
│   ├── 31_m1_p2.sh
│   ├── 40_m2_failover.sh
│   ├── 50_benchmark_ping.sh
│   └── 99_teardown.sh
└── results/
    ├── benchmark/
    ├── m1/
    └── m2/
```

The results directory also contains the M0 connectivity and routing test logs.

## 5. Requirements

The implementation uses:

- Linux with network namespace support
- IPv6 and SRv6 kernel support
- `iproute2`
- FRRouting (FRR), including `zebra` and `ospf6d`
- `ping` and `tcpdump`
- Bash and Python 3 for scripts and analysis

The scripts are designed for the project's Ubuntu Linux environment and require appropriate administrative privileges.

## 6. Execution Order

Run the scripts from the repository's `src` directory.

```bash
cd ~/A3-PS020-TC172/src

# Create the network topology
sudo bash scripts/00_topology.sh

# Configure baseline OSPFv3
sudo bash scripts/10_m0_ospf.sh

# Configure SRv6 SIDs
sudo bash scripts/20_m1_sids.sh

# Install the primary path
sudo bash scripts/30_m1_p1.sh

# Install the backup path when required
sudo bash scripts/31_m1_p2.sh

# Run the failure-recovery controller
sudo bash scripts/40_m2_failover.sh
```

The benchmark script accepts a path name and number of trials:

```bash
sudo bash scripts/50_benchmark_ping.sh P1 30
sudo bash scripts/50_benchmark_ping.sh P2 30
```

The benchmark sends 1,000 packets per trial with a requested 1 ms interval.

**Important:** Run the benchmark only after the corresponding path has been configured and verified. Run the teardown script only when you intend to remove the emulated topology.

```bash
sudo bash scripts/99_teardown.sh
```

## 7. Experimental Results

### P1 and P2 benchmark comparison

Each path was evaluated over 30 trials, with 1,000 packets per trial.

| Metric | Primary P1 | Backup P2 |
|---|---:|---:|
| Trials | 30 | 30 |
| Packets transmitted | 30,000 | 30,000 |
| Packets received | 30,000 | 30,000 |
| Packet loss | 0% | 0% |
| Mean trial average RTT | 0.0204 ms | 0.0209 ms |
| Median trial average RTT | 0.0125 ms | 0.016 ms |
| Mean trial duration | 1025.43 ms | 1017.30 ms |
| Aggregate observed rate | 975.2 pps | 983.0 pps |
| Highest observed RTT | 3.174 ms | 44.914 ms |

Both paths delivered all 30,000 packets in the recorded benchmark runs. P2 had one notably high maximum RTT measurement of 44.914 ms, which is retained in the results rather than discarded.

The benchmark uses a requested 1 ms packet interval. Actual observed throughput is calculated from measured trial durations and is therefore not assumed to be exactly 1,000 packets per second.

### M2 recovery measurement

The recorded M2 test measured:

- First failed probe to P2 installation: approximately 5.516 seconds.
- First failed probe to recovery verification: approximately 8.652 seconds.
- P2 installation to recovery verification: approximately 3.136 seconds.

These measurements are based on the recorded controller log timestamps. The first failed probe is not the exact physical link-down timestamp.

## 8. Result Files

- `results/benchmark/p1_benchmark.csv` – Primary-path benchmark data.
- `results/benchmark/p2_benchmark.csv` – Backup-path benchmark data.
- `results/benchmark/comparison_summary.csv` – Benchmark comparison.
- `results/benchmark/README.txt` – Benchmark methodology and summary.
- `results/m0_summary.txt` – Baseline experiment summary.
- `results/m1/path_validation.txt` – SRv6 path validation.
- `results/m2/failover_summary.txt` – Failure-recovery summary.
- `results/m2/failover_test_20261030.log` – Recorded M2 controller test.

## 9. Limitations

- The experiments use Linux network namespaces and virtual Ethernet links rather than a physical multi-router deployment.
- The M2 controller currently performs a one-way switch to the backup path and does not implement automatic failback.
- OSPFv3 convergence measurements depend on the configured routing timers and the emulated environment.
- The reported benchmark values describe this test environment and should not be interpreted as production-network performance.

## 10. References

- RFC 8754 – IPv6 Segment Routing Header (SRH)
- RFC 8402 – Segment Routing Architecture
- RFC 8986 – Segment Routing over IPv6 (SRv6) Network Programming
- RFC 9256 – Segment Routing Policy Architecture
- RFC 5340 – OSPF for IPv6
- RFC 5880 – Bidirectional Forwarding Detection (BFD)
- RFC 5286 – Basic Specification for IP Fast Reroute

---

**Team NetNova | AIORI-3 | A3-PS020-TC172**
