import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import OverviewPage from './pages/OverviewPage';
import { TopologyPage, RoutingPage, SteeringPage, FailoverPage, BenchmarksPage, LogsPage } from './pages/Stage3Pages';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<OverviewPage />} />
        <Route path="topology" element={<TopologyPage />} />
        <Route path="routing" element={<RoutingPage />} />
        <Route path="steering" element={<SteeringPage />} />
        <Route path="failover" element={<FailoverPage />} />
        <Route path="benchmarks" element={<BenchmarksPage />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
