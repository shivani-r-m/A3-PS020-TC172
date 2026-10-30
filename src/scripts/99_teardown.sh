#!/bin/bash
pkill -f ospf6d 2>/dev/null
pkill -f zebra 2>/dev/null
for n in r1 r2 r3 r4 r5 s d; do ip netns del $n 2>/dev/null; done
echo "Topology removed."
