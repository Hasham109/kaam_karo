'use client';

import { AdminLayout } from '../../src/components/AdminLayout';
import { A19SystemHealthScreen } from '../../src/components/A19SystemHealthScreen';

export default function SystemHealthPage() {
  return (
    <AdminLayout activeScreenId="A19">
      <A19SystemHealthScreen
        onReturnToDashboard={() => {
          window.location.href = '/';
        }}
      />
    </AdminLayout>
  );
}
