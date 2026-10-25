'use client';

import { AdminLayout } from '../../src/components/AdminLayout';
import { A07BookingsScreen } from '../../src/components/A07BookingsScreen';

export default function BookingsPage() {
  return (
    <AdminLayout activeScreenId="A07">
      <A07BookingsScreen
        onReturnToDashboard={() => {
          window.location.href = '/';
        }}
      />
    </AdminLayout>
  );
}
