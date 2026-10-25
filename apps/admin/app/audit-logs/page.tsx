'use client';

import { AdminLayout } from '../../src/components/AdminLayout';
import { A17AuditLogsScreen } from '../../src/components/A17AuditLogsScreen';

export default function AuditLogsPage() {
  return (
    <AdminLayout activeScreenId="A17">
      <A17AuditLogsScreen
        onReturnToDashboard={() => {
          window.location.href = '/';
        }}
      />
    </AdminLayout>
  );
}
