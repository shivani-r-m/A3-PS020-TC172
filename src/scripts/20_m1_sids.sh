#!/bin/bash
set -euo pipefail

echo "Installing R2 End SID..."

sudo ip -n r2 -6 route replace fc00:0:2::1/128 \
    table 90 encap seg6local action End dev r2-r5

sudo ip -n r2 -6 rule del \
    to fc00:0:2::1/128 lookup 90 priority 999 2>/dev/null || true

sudo ip -n r2 -6 rule add \
    to fc00:0:2::1/128 lookup 90 priority 999

echo "Installing R3 End SID..."

sudo ip -n r3 -6 route replace fc00:0:3::1/128 \
    table 90 encap seg6local action End count dev r3-r4

sudo ip -n r3 -6 rule del \
    to fc00:0:3::1/128 lookup 90 priority 999 2>/dev/null || true

sudo ip -n r3 -6 rule add \
    to fc00:0:3::1/128 lookup 90 priority 999

echo "Installing R4 End SID..."

sudo ip -n r4 -6 route replace fc00:0:4::1/128 \
    table 90 encap seg6local action End count dev r4-r5

sudo ip -n r4 -6 rule del \
    to fc00:0:4::1/128 lookup 90 priority 999 2>/dev/null || true

sudo ip -n r4 -6 rule add \
    to fc00:0:4::1/128 lookup 90 priority 999

echo "Installing R5 End.DT6 SID..."

sudo ip -n r5 -6 route replace fc00:0:5::d6/128 \
    table 90 encap seg6local action End.DT6 table main count dev r5-d

sudo ip -n r5 -6 rule del \
    to fc00:0:5::d6/128 lookup 90 priority 999 2>/dev/null || true

sudo ip -n r5 -6 rule add \
    to fc00:0:5::d6/128 lookup 90 priority 999

echo "All four SRv6 SID behaviors installed."
