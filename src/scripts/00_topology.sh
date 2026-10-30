#!/bin/bash
set -e

for n in r1 r2 r3 r4 r5 s d; do
  ip netns add $n
  ip -n $n link set lo up
  ip netns exec $n sysctl -qw net.ipv6.conf.all.forwarding=1 \
      net.ipv6.conf.all.seg6_enabled=1 \
      net.ipv6.conf.default.seg6_enabled=1 \
      net.ipv6.conf.all.accept_ra=0
done

link() {   # usage: link r1 r2 fc00:12::1 fc00:12::2
  ip link add $1-$2 type veth peer name $2-$1
  ip link set $1-$2 netns $1
  ip link set $2-$1 netns $2
  ip -n $1 addr add $3/64 dev $1-$2 nodad
  ip -n $2 addr add $4/64 dev $2-$1 nodad
  ip -n $1 link set $1-$2 up
  ip -n $2 link set $2-$1 up
  ip netns exec $1 sysctl -qw net.ipv6.conf.$1-$2.seg6_enabled=1
  ip netns exec $2 sysctl -qw net.ipv6.conf.$2-$1.seg6_enabled=1
}

link r1 r2 fc00:12::1 fc00:12::2
link r2 r5 fc00:25::2 fc00:25::5
link r1 r3 fc00:13::1 fc00:13::3
link r3 r4 fc00:34::3 fc00:34::4
link r4 r5 fc00:45::4 fc00:45::5
link s  r1 fc00:a::1  fc00:a::2
link d  r5 fc00:b::1  fc00:b::2

ip -n s route add default via fc00:a::2
ip -n d route add default via fc00:b::2
echo "Topology built."
