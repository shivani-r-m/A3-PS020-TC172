# AIORI-3 HACKATHON PROJECTS

# NetNova – Local SRv6 Path Steering and Measured Failure Recovery

**Team Code:** A3-PS020-TC172  
**Problem Statement:** PS-020  
**Category:** 6G & Future Networks  
**Institution:** RV College of Engineering  
**Hackathon:** AIORI-3

---

## 👥 Team Members

- **Shivani R M**
- **Divya Sree N**

### Project Mentor

**Dr. Shweta Babu Prasad**

---

## 🎥 Team Introduction Video

**Team:** NetNova  
**Team Code:** A3-PS020-TC172  
**Problem Statement:** PS-020 — Local SRv6 Path Steering and Measured Failure Recovery

**YouTube Video:**  
https://youtube.com/shorts/kKTfiE7RIRU

---

## 🚀 Project Overview

Our project focuses on implementing and evaluating Segment Routing over IPv6 (SRv6) for programmable network path steering and measured failure recovery.

We compare conventional IPv6 routing with SRv6-based routing approaches to study network behaviour during link failures.

### Project Objectives

- Implement an SRv6-enabled virtual network using Linux.
- Configure IPv6 connectivity between five routers.
- Demonstrate SID-based programmable path steering.
- Implement backup path switching.
- Test network link failure and recovery.
- Measure packet loss, interruption time, failure detection delay, repair delay and SRv6 header overhead.
- Develop a web-based dashboard to visualize network operations and performance.

---

## 🐧 Linux Implementation

The core network implementation was developed in an Ubuntu Linux environment.

### Tools and Technologies

| Technology | Purpose |
|---|---|
| Ubuntu Linux | Implementation environment |
| Linux Network Namespaces | Simulating five routers |
| IPv6 | Network addressing |
| SRv6 | Programmable packet forwarding |
| iproute2 | Network and SRv6 configuration |
| FRRouting (FRR) | Dynamic routing and OSPFv3 |
| tcpdump | Packet capture and inspection |
| Python | Automation and performance analysis |
| Shell Scripting | Network setup and execution |

### Network Topology

The virtual network consists of five routers:

**R1, R2, R3, R4 and R5**

The implementation establishes IPv6 connectivity and demonstrates routing through explicit SRv6 paths.

### Implementation Workflow

1. Ubuntu Linux environment setup.
2. Creation of Linux network namespaces for five routers.
3. IPv6 address assignment and connectivity configuration.
4. Baseline routing configuration using OSPFv3.
5. SRv6 Segment Identifier (SID) configuration.
6. SRv6 policy-based path steering.
7. Link failure simulation and backup path switching.
8. Packet capture, recovery measurement and performance analysis.

---

## ⚙️ SRv6 Implementation and Optimization

Three network modes are considered:

- **M0 – Baseline:** Plain IPv6 routing using OSPFv3.
- **M1 – Scripted Backup Switching:** SRv6 with a scripted backup path switch after failure detection.
- **M2 – Pre-installed Backup:** SRv6 with a backup path installed in advance.

### Optimization Techniques

- Atomic IPv6 route replacement to reduce forwarding interruption.
- Pre-installed backup path using a binding SID.
- Link-event-based failure detection and probing.
- High-resolution packet probing for interruption measurement.
- Packet captures to verify SID-based forwarding.
- Repeated failure experiments for more reliable comparisons.

---

## 📊 Performance Analysis

The project evaluates the following metrics:

- Packet loss.
- Traffic interruption time.
- Failure detection delay.
- Repair delay.
- Total recovery time.
- SRv6 Segment Routing Header overhead.

**Recovery time model:**

`T_recovery = T_detect + T_decide + T_repair + T_propagate`

The experiment design includes at least 30 repeated failure trials and statistical analysis using 95% confidence intervals.

---

## 🖥️ SRv6 Network Operations Dashboard

The project includes a web-based dashboard for visualizing and presenting the SRv6 network implementation.

**Live Application:**  
https://a3-ps020-tc172-5.onrender.com/

### Dashboard Features

- Network topology visualization.
- Router operational status.
- SRv6 path information.
- Network monitoring interface.
- Failure recovery information.
- Performance and benchmark visualization.

---

## 🎬 Project Live Demonstration

Watch our complete AIORI-3 SRv6 implementation and live demo.

**YouTube Video:**  
https://youtu.be/PvIQ_SrlY2A

### Demo Highlights

- Linux-based network implementation.
- Five-router network topology.
- IPv6 and SRv6 configuration.
- SID-based path steering.
- Network Operations Dashboard.
- Failure recovery and performance analysis.

---

## 🛠️ Technology Stack

- Ubuntu Linux
- Python
- Shell Scripting
- IPv6
- Segment Routing over IPv6 (SRv6)
- Linux Network Namespaces
- iproute2
- FRRouting (FRR)
- OSPFv3
- tcpdump
- React
- Vite

---

## 🎯 Project Outcome

The project demonstrates a Linux-based SRv6 implementation for programmable path steering and measured network failure recovery.

It combines network configuration, SRv6 routing policies, failure simulation, performance benchmarking and a web-based dashboard into an integrated experimental platform.

---

## 🔗 Project Resources

| Resource | Link |
|---|---|
| Live Dashboard | https://a3-ps020-tc172-5.onrender.com/ |
| Team Introduction Video | https://youtube.com/shorts/kKTfiE7RIRU |
| Complete Live Demo | https://youtu.be/PvIQ_SrlY2A |

---

**Team NetNova**  
**A3-PS020-TC172 | AIORI-3 Hackathon**  
**RV College of Engineering**
