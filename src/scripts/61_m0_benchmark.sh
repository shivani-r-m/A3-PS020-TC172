#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

COUNT="${1:-30}"
PACKETS=1000
INTERVAL="0.001"
DESTINATION="fc00:b::1"

if ! [[ "$COUNT" =~ ^[1-9][0-9]*$ ]]; then
    echo "ERROR: Trial count must be a positive integer."
    exit 1
fi

# Confirm that the destination network is learned through OSPF.
OSPF_ROUTE=$(sudo ip -n r1 -6 route show fc00:b::/64)
if [[ "$OSPF_ROUTE" != *"proto ospf"* ]]; then
    echo "ERROR: OSPF route not found on R1."
    echo "Actual route: $OSPF_ROUTE"
    exit 1
fi

# Confirm that the active destination route is NOT SRv6-encapsulated.
ACTIVE_ROUTE=$(sudo ip -n r1 -6 route get "$DESTINATION")
if [[ "$ACTIVE_ROUTE" == *"encap seg6"* ]]; then
    echo "ERROR: SRv6 encapsulation is active. M0 requires OSPF routing."
    echo "Actual route: $ACTIVE_ROUTE"
    exit 1
fi

OUTPUT="results/final/m0_benchmark_20261031.csv"
mkdir -p results/final

if [[ -e "$OUTPUT" ]]; then
    echo "ERROR: $OUTPUT already exists. Refusing to overwrite."
    exit 1
fi

echo "trial,requested_pps,transmitted,received,packet_loss,duration_ms,min_ms,avg_ms,max_ms,mdev_ms" > "$OUTPUT"

echo "Starting final M0 OSPFv3 benchmark"
echo "Trials: $COUNT | Packets/trial: $PACKETS | Requested rate: 1000 pps"
echo "OSPF route: $OSPF_ROUTE"
echo "Active route: $ACTIVE_ROUTE"
echo "Output: $OUTPUT"

for i in $(seq 1 "$COUNT"); do
    echo "Running trial $i/$COUNT..."

    PING_OUTPUT=$(sudo ip netns exec s ping -6 -n -q \
        -c "$PACKETS" -i "$INTERVAL" -W 2 "$DESTINATION" 2>&1 || true)

    STATS=$(printf '%s\n' "$PING_OUTPUT" | awk '
        /packets transmitted/ {
            tx=$1
            rx=$4
            loss=$6
            duration=$10
            sub(/ms$/, "", duration)
        }
        /rtt min\/avg\/max\/mdev/ {
            split($4,a,"/")
            min=a[1]
            avg=a[2]
            max=a[3]
            mdev=a[4]
        }
        END {
            if (tx == "") tx=0
            if (rx == "") rx=0
            if (loss == "") loss="100%"
            if (duration == "") duration="NA"
            if (min == "") min="NA"
            if (avg == "") avg="NA"
            if (max == "") max="NA"
            if (mdev == "") mdev="NA"

            printf "1000,%s,%s,%s,%s,%s,%s,%s,%s",
                tx,rx,loss,duration,min,avg,max,mdev
        }
    ')

    echo "$i,$STATS" | tee -a "$OUTPUT"
    sleep 1
done

echo
echo "M0 benchmark completed."
echo "Results saved to: $OUTPUT"
