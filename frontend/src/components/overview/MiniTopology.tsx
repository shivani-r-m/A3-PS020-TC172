import { LINKS, NODES, PATHS, linksOfPath } from '../../config/project';
import type { LinkState } from '../../types';
import type { NodeId, PathId } from '../../config/project';

const COLOR = {
  p1: '#22d3ee',
  p2: '#a78bfa',
  bad: '#f87171',
  idle: '#33466f',
  node: '#111a2e',
  nodeStroke: '#4a5d8a',
  text: '#e2e8f0',
};

const POS: Record<NodeId, { x: number; y: number }> = {
  S: { x: 44, y: 115 },
  R1: { x: 150, y: 115 },
  R2: { x: 300, y: 45 },
  R3: { x: 262, y: 188 },
  R4: { x: 402, y: 188 },
  R5: { x: 522, y: 115 },
  D: { x: 600, y: 115 },
};

const P1_LINKS = new Set(linksOfPath(PATHS.P1));
const P2_LINKS = new Set(linksOfPath(PATHS.P2));

interface Props {
  activePath: PathId | 'OSPF' | null;
  linkStatus: Record<string, LinkState> | null;
}

/** Compact read-only topology. The full interactive view is the Network Topology page. */
export function MiniTopology({ activePath, linkStatus }: Props) {
  const activeSet = activePath === 'P1' ? P1_LINKS : activePath === 'P2' ? P2_LINKS : new Set<string>();
  const activeColor = activePath === 'P2' ? COLOR.p2 : COLOR.p1;

  return (
    <div>
      <svg viewBox="0 0 644 232" className="h-auto w-full" role="img" aria-label="Network topology overview">
        {LINKS.map((l) => {
          const a = POS[l.a];
          const b = POS[l.b];
          const down = linkStatus?.[l.id] === 'down';
          const isActive = activeSet.has(l.id);
          const onP1 = P1_LINKS.has(l.id);
          const onP2 = P2_LINKS.has(l.id);

          let stroke = COLOR.idle;
          let opacity = 0.9;
          if (down) {
            stroke = COLOR.bad;
          } else if (isActive) {
            stroke = activeColor;
          } else if (onP1 && !onP2) {
            stroke = COLOR.p1;
            opacity = 0.35;
          } else if (onP2 && !onP1) {
            stroke = COLOR.p2;
            opacity = 0.35;
          }

          return (
            <g key={l.id}>
              <title>{`${l.a} — ${l.b} (${l.subnet})${down ? ' — DOWN' : ''}`}</title>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={stroke}
                strokeOpacity={opacity}
                strokeWidth={isActive ? 3 : 2}
                strokeLinecap="round"
                strokeDasharray={!isActive && !down && !(onP1 && onP2) ? '3 5' : undefined}
              />
              {isActive && !down && (
                <line
                  className="flow-line"
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="#ffffff"
                  strokeOpacity={0.55}
                  strokeWidth={1.2}
                  strokeLinecap="round"
                />
              )}
            </g>
          );
        })}

        {NODES.map((n) => {
          const p = POS[n.id];
          const isEndpoint = n.kind === 'endpoint';
          return (
            <g key={n.id}>
              <title>{`${n.name}${n.addresses[0] ? ` — ${n.addresses[0].address}` : ''}`}</title>
              {isEndpoint ? (
                <rect x={p.x - 20} y={p.y - 15} width={40} height={30} rx={8} fill={COLOR.node} stroke={COLOR.nodeStroke} strokeWidth={1.5} />
              ) : (
                <circle cx={p.x} cy={p.y} r={19} fill={COLOR.node} stroke={COLOR.nodeStroke} strokeWidth={1.5} />
              )}
              <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={12} fontWeight={600} fill={COLOR.text} fontFamily="Inter, sans-serif">
                {n.id}
              </text>
            </g>
          );
        })}
      </svg>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <li className="flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded" style={{ background: COLOR.p1 }} /> P1 primary
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded" style={{ background: COLOR.p2 }} /> P2 backup
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded" style={{ background: COLOR.bad }} /> Failed link
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded border-t border-dashed border-slate-500" /> Inactive path
        </li>
      </ul>
    </div>
  );
}
