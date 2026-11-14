import { PageHeader } from './common/Ui.jsx';

// Page wrapper used inside the dashboard layout: a header plus vertically spaced content.
export default function DashboardShell({ title, subtitle, actions, children }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      <div className="space-y-6">{children}</div>
    </div>
  );
}

export { StatCard } from './common/Ui.jsx';
