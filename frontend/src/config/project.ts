// Static facts taken from the repository's own scripts.
//
//   Addresses : src/scripts/00_topology.sh   (link() calls)
//   SIDs      : src/scripts/20_m1_sids.sh
//   P1 / P2   : src/scripts/30_m1_p1.sh, 31_m1_p2.sh
//   Detection : src/scripts/40_m2_failover.sh (3 consecutive failed probes)
//
// Nothing in this file is invented. If the scripts change, update it to match.

export type NodeId = 'S' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'D';
export type PathId = 'P1' | 'P2';
export type ModeId = 'M0' | 'M1' | 'M2';

export interface NodeAddress {
  iface: string;
  address: string;
}

export interface NodeDef {
  id: NodeId;
  name: string;
  kind: 'endpoint' | 'router';
  /** Linux network namespace name */
  namespace: string;
  role: string;
  addresses: NodeAddress[];
  sid?: { address: string; behavior: 'End' | 'End.DT6' };
}

export interface LinkDef {
  id: string;
  a: NodeId;
  b: NodeId;
  subnet: string;
  /** Link used as the failure link in M0/M2 tests (README §2) */
  failureLink?: boolean;
}

export interface PathDef {
  id: PathId;
  name: string;
  role: 'primary' | 'backup';
  nodes: NodeId[];
  /** Segment list installed at R1 (`segs ...` in 30_m1_p1.sh / 31_m1_p2.sh) */
  segments: string[];
  /** `encap seg6 mode encap` */
  encapMode: string;
  /** Interface at R1 carrying the encapsulated route */
  r1Interface: string;
}

export const PROJECT = {
  name: 'AIORI-3 SRv6',
  code: 'A3-PS020-TC172',
  team: 'NetNova',
  title: 'Local SRv6 Path Steering and Measured Failure Recovery',
  destination: 'fc00:b::1',
  failureDetectionThreshold: 3,
} as const;

export const NODES: NodeDef[] = [
  {
    id: 'S',
    name: 'Source',
    kind: 'endpoint',
    namespace: 's',
    role: 'Traffic source (default route via fc00:a::2)',
    addresses: [{ iface: 's-r1', address: 'fc00:a::1' }],
  },
  {
    id: 'R1',
    name: 'Router R1',
    kind: 'router',
    namespace: 'r1',
    role: 'Ingress — installs the SRv6 encapsulation route',
    addresses: [
      { iface: 'r1-s', address: 'fc00:a::2' },
      { iface: 'r1-r2', address: 'fc00:12::1' },
      { iface: 'r1-r3', address: 'fc00:13::1' },
    ],
  },
  {
    id: 'R2',
    name: 'Router R2',
    kind: 'router',
    namespace: 'r2',
    role: 'P1 transit — SRv6 End',
    addresses: [
      { iface: 'r2-r1', address: 'fc00:12::2' },
      { iface: 'r2-r5', address: 'fc00:25::2' },
    ],
    sid: { address: 'fc00:0:2::1', behavior: 'End' },
  },
  {
    id: 'R3',
    name: 'Router R3',
    kind: 'router',
    namespace: 'r3',
    role: 'P2 transit — SRv6 End',
    addresses: [
      { iface: 'r3-r1', address: 'fc00:13::3' },
      { iface: 'r3-r4', address: 'fc00:34::3' },
    ],
    sid: { address: 'fc00:0:3::1', behavior: 'End' },
  },
  {
    id: 'R4',
    name: 'Router R4',
    kind: 'router',
    namespace: 'r4',
    role: 'P2 transit — SRv6 End',
    addresses: [
      { iface: 'r4-r3', address: 'fc00:34::4' },
      { iface: 'r4-r5', address: 'fc00:45::4' },
    ],
    sid: { address: 'fc00:0:4::1', behavior: 'End' },
  },
  {
    id: 'R5',
    name: 'Router R5',
    kind: 'router',
    namespace: 'r5',
    role: 'Egress — SRv6 End.DT6 toward D',
    addresses: [
      { iface: 'r5-r2', address: 'fc00:25::5' },
      { iface: 'r5-r4', address: 'fc00:45::5' },
      { iface: 'r5-d', address: 'fc00:b::2' },
    ],
    sid: { address: 'fc00:0:5::d6', behavior: 'End.DT6' },
  },
  {
    id: 'D',
    name: 'Destination',
    kind: 'endpoint',
    namespace: 'd',
    role: 'Traffic destination (default route via fc00:b::2)',
    addresses: [{ iface: 'd-r5', address: 'fc00:b::1' }],
  },
];

export const LINKS: LinkDef[] = [
  { id: 's-r1', a: 'S', b: 'R1', subnet: 'fc00:a::/64' },
  { id: 'r1-r2', a: 'R1', b: 'R2', subnet: 'fc00:12::/64' },
  { id: 'r2-r5', a: 'R2', b: 'R5', subnet: 'fc00:25::/64', failureLink: true },
  { id: 'r1-r3', a: 'R1', b: 'R3', subnet: 'fc00:13::/64' },
  { id: 'r3-r4', a: 'R3', b: 'R4', subnet: 'fc00:34::/64' },
  { id: 'r4-r5', a: 'R4', b: 'R5', subnet: 'fc00:45::/64' },
  { id: 'r5-d', a: 'R5', b: 'D', subnet: 'fc00:b::/64' },
];

export const PATHS: Record<PathId, PathDef> = {
  P1: {
    id: 'P1',
    name: 'Primary path',
    role: 'primary',
    nodes: ['S', 'R1', 'R2', 'R5', 'D'],
    segments: ['fc00:0:2::1', 'fc00:0:5::d6'],
    encapMode: 'encap',
    r1Interface: 'r1-r2',
  },
  P2: {
    id: 'P2',
    name: 'Backup path',
    role: 'backup',
    nodes: ['S', 'R1', 'R3', 'R4', 'R5', 'D'],
    segments: ['fc00:0:3::1', 'fc00:0:4::1', 'fc00:0:5::d6'],
    encapMode: 'encap',
    r1Interface: 'r1-r3',
  },
};

export const ROUTERS = NODES.filter((n) => n.kind === 'router');

export function getNode(id: NodeId): NodeDef {
  const n = NODES.find((x) => x.id === id);
  if (!n) throw new Error(`Unknown node ${id}`);
  return n;
}

/** Link ids traversed by a path, derived from its node sequence. */
export function linksOfPath(path: PathDef): string[] {
  const ids: string[] = [];
  for (let i = 0; i < path.nodes.length - 1; i++) {
    const a = path.nodes[i];
    const b = path.nodes[i + 1];
    const link = LINKS.find((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));
    if (link) ids.push(link.id);
  }
  return ids;
}

export function pathLabel(path: PathDef): string {
  return path.nodes.join(' → ');
}
