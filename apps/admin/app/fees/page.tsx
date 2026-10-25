'use client';

import { AdminLayout } from '../../src/components/AdminLayout';
import { A13FeesScreen } from '../../src/components/A13FeesScreen';

export default function FeesPage() {
  return (
    <AdminLayout activeScreenId="A13">
      <A13FeesScreen
        onReturnToDashboard={() => {
          window.location.href = '/';
        }}
      />
    </AdminLayout>
  );
}
