import { Hammer } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';

interface Props {
  title: string;
  description: string;
  stage: 2 | 3 | 4;
  planned: string[];
}

/** Route is wired and navigable; the full page lands in a later stage. */
export default function PlaceholderPage({ title, description, stage, planned }: Props) {
  return (
    <>
      <PageHeader title={title} description={description} actions={<StatusBadge tone="info">Planned · Stage {stage}</StatusBadge>} />
      <Card>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Hammer className="h-6 w-6 text-slate-600" />
          <p className="text-sm font-medium text-slate-300">This page is built in Stage {stage}.</p>
          <ul className="max-w-md space-y-1 text-left text-xs text-slate-500">
            {planned.map((p) => (
              <li key={p} className="flex gap-2">
                <span className="text-slate-600">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </>
  );
}
