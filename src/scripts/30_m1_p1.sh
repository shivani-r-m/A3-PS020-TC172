#!/bin/bash
set -euo pipefail

echo "Configuring P1 SRv6 primary policy..."

get_nh() {
    local ns="$1"
    local iface="$2"

    sudo ip -n "$ns" -6 neigh show dev "$iface" |
        awk '$1 ~ /^fe80:/ && $NF != "FAILED" && $NF != "INCOMPLETE" {
            print $1
            exit
        }'
}

R1_R2=$(get_nh r1 r1-r2)
R2_R5=$(get_nh r2 r2-r5)

if [[ -z "$R1_R2" || -z "$R2_R5" ]]; then
    echo "ERROR: Could not discover P1 link-local next hops."
    exit 1
fi

echo "R1 -> R2: $R1_R2"
echo "R2 -> R5: $R2_R5"

sudo ip -n r1 -6 route replace fc00:0:2::1/128 \
    via "$R1_R2" dev r1-r2

sudo ip -n r2 -6 route replace fc00:0:5::d6/128 \
    via "$R2_R5" dev r2-r5

sudo ip -n r1 -6 route replace fc00:b::1/128 \
    encap seg6 mode encap \
    segs fc00:0:2::1,fc00:0:5::d6 \
    via "$R1_R2" dev r1-r2

echo "P1 SRv6 primary policy installed successfully."
