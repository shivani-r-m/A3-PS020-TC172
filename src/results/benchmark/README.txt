SRv6 PATH BENCHMARK RESULTS
===========================

Test configuration:
- Destination: fc00:b::1
- Requested packet interval: 1 ms
- Requested packet rate: 1000 packets/second
- Trials per path: 30
- Packets per trial: 1000
- Total packets per path: 30000

P1 - PRIMARY PATH
-----------------
Trials: 30
Transmitted: 30000
Received: 30000
Packet loss: 0%
Mean trial average RTT: 0.02037 ms
Median trial average RTT: 0.0125 ms
Mean trial duration: 1025.43 ms
Observed aggregate rate: approximately 975.2 pps
Highest observed RTT: 3.174 ms

P2 - BACKUP PATH
----------------
Trials: 30
Transmitted: 30000
Received: 30000
Packet loss: 0%
Mean trial average RTT: 0.02093 ms
Median trial average RTT: 0.016 ms
Mean trial duration: 1017.30 ms
Observed aggregate rate: approximately 983.0 pps
Highest observed RTT: 44.914 ms

NOTES
-----
The 1000 pps value is the requested sending rate.
The observed aggregate rate is calculated using total
packets divided by total measured duration.

These results were collected in a Linux network namespace
emulation environment. They should not be interpreted as
physical-network hardware performance.

Files:
- p1_benchmark.csv
- p2_benchmark.csv
- comparison_summary.csv
