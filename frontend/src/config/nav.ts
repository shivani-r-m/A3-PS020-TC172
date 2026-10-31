import { Activity, BarChart3, Layers, LayoutDashboard, Network, Route, ScrollText, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/topology', label: 'Network Topology', icon: Network },
  { to: '/routing', label: 'Routing Modes', icon: Layers },
  { to: '/steering', label: 'SRv6 Path Steering', icon: Route },
  { to: '/failover', label: 'Failover Monitoring', icon: Activity },
  { to: '/benchmarks', label: 'Benchmark Analytics', icon: BarChart3 },
  { to: '/logs', label: 'Experiment Logs', icon: ScrollText },
  { to: '/settings', label: 'Settings', icon: Settings },
];
