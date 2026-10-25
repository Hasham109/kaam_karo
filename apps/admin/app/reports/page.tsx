'use client';

import { AdminLayout } from '../../src/components/AdminLayout';
import { A16ReportsScreen } from '../../src/components/A16ReportsScreen';

export default function ReportsPage() {
  return (
    <AdminLayout activeScreenId="A16">
      <A16ReportsScreen
        onReturnToDashboard={() => {
          window.location.href = '/';
        }}
      />
    </AdminLayout>
  );
}
