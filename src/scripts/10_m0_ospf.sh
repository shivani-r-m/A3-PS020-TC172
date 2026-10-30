#!/bin/bash
# usage: sudo bash scripts/10_m0_ospf.sh <hello> <dead>   e.g. 1 3  or  10 40
HELLO=${1:-1}; DEAD=${2:-3}
FRR=/usr/lib/frr
CFG=$(cd "$(dirname "$0")/.." && pwd)/configs/m0
[ -x $FRR/zebra ] || { echo "zebra not found"; exit 1; }
rm -rf $CFG; mkdir -p $CFG

declare -A IFS_OF=(
  [r1]="r1-r2 r1-r3 r1-s"
  [r2]="r2-r1 r2-r5"
  [r3]="r3-r1 r3-r4"
  [r4]="r4-r3 r4-r5"
  [r5]="r5-r2 r5-r4 r5-d"
)
declare -A RID=([r1]=1.1.1.1 [r2]=2.2.2.2 [r3]=3.3.3.3 [r4]=4.4.4.4 [r5]=5.5.5.5)

for r in r1 r2 r3 r4 r5; do
  mkdir -p $CFG/$r /run/frr/$r
  echo "hostname $r" > $CFG/$r/zebra.conf
  {
    echo "hostname $r-ospf6"
    for i in ${IFS_OF[$r]}; do
      echo "interface $i"
      echo " ipv6 ospf6 area 0.0.0.0"
      echo " ipv6 ospf6 cost 10"
      echo " ipv6 ospf6 network point-to-point"
      if [[ $i == r1-s || $i == r5-d ]]; then
        echo " ipv6 ospf6 passive"
      else
        echo " ipv6 ospf6 hello-interval $HELLO"
        echo " ipv6 ospf6 dead-interval $DEAD"
      fi
    done
    echo "router ospf6"
    echo " ospf6 router-id ${RID[$r]}"
  } > $CFG/$r/ospf6d.conf

  ip netns exec $r $FRR/zebra -d -u root -g root -N $r \
      -f $CFG/$r/zebra.conf -i /run/frr/$r/zebra.pid
  sleep 0.3
  ip netns exec $r $FRR/ospf6d -d -u root -g root -N $r \
      -f $CFG/$r/ospf6d.conf -i /run/frr/$r/ospf6d.pid
done
echo "M0 started: hello=$HELLO dead=$DEAD. Wait ~15 s for convergence."
