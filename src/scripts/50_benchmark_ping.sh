#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

PATH_NAME="${1:-P1}"
COUNT="${2:-30}"
PACKETS=1000
INTERVAL="0.001"
DESTINATION="fc00:b::1"

case "$PATH_NAME" in
    P1|P2) ;;
    *)
        echo "Usage: $0 P1|P2 [number_of_trials]"
        exit 1
        ;;
esac

if ! [[ "$COUNT" =~ ^[1-9][0-9]*$ ]]; then
    echo "ERROR: Trial count must be a positive integer."
    exit 1
fi

OUTPUT="results/benchmark/${PATH_NAME,,}_benchmark.csv"
mkdir -p results/benchmark

echo "trial,requested_pps,transmitted,received,packet_loss,duration_ms,min_ms,avg_ms,max_ms,mdev_ms" > "$OUTPUT"

echo "Starting $PATH_NAME benchmark"
echo "Trials: $COUNT | Packets per trial: $PACKETS | Requested rate: 1000 pps"

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
            printf "%s,1000,%s,%s,%s,%s,%s,%s,%s",
                tx,rx,loss,duration,min,avg,max,mdev
        }
    ')

    echo "$i,$STATS" | tee -a "$OUTPUT"
    sleep 1
done

echo
echo "Benchmark completed."
echo "Results saved to: $OUTPUT"
