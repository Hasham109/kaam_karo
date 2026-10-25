'use client';

import { AdminLayout } from '../../src/components/AdminLayout';
import { A06ServicesScreen } from '../../src/components/A06ServicesScreen';

export default function ServicesPage() {
  return (
    <AdminLayout activeScreenId="A06">
      <A06ServicesScreen
        onReturnToDashboard={() => {
          window.location.href = '/';
        }}
      />
    </AdminLayout>
  );
}
