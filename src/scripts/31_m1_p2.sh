#!/bin/bash
set -euo pipefail

echo "Configuring P2 SRv6 backup policy..."

get_nh() {
    local ns="$1"
    local iface="$2"

    sudo ip -n "$ns" -6 neigh show dev "$iface" |
        awk '$1 ~ /^fe80:/ && $NF != "FAILED" && $NF != "INCOMPLETE" {
            print $1
            exit
        }'
}

R1_R3=$(get_nh r1 r1-r3)
R3_R4=$(get_nh r3 r3-r4)
R4_R5=$(get_nh r4 r4-r5)

if [[ -z "$R1_R3" || -z "$R3_R4" || -z "$R4_R5" ]]; then
    echo "ERROR: Could not discover P2 link-local next hops."
    exit 1
fi

echo "R1 -> R3: $R1_R3"
echo "R3 -> R4: $R3_R4"
echo "R4 -> R5: $R4_R5"

sudo ip -n r1 -6 route replace fc00:0:3::1/128 \
    via "$R1_R3" dev r1-r3

sudo ip -n r3 -6 route replace fc00:0:4::1/128 \
    via "$R3_R4" dev r3-r4

sudo ip -n r4 -6 route replace fc00:0:5::d6/128 \
    via "$R4_R5" dev r4-r5

sudo ip -n r1 -6 route replace fc00:b::1/128 \
    encap seg6 mode encap \
    segs fc00:0:3::1,fc00:0:4::1,fc00:0:5::d6 \
    via "$R1_R3" dev r1-r3

echo "P2 SRv6 backup policy installed successfully."
