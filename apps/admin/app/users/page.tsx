'use client';

import { AdminLayout } from '../../src/components/AdminLayout';
import { A03UsersScreen } from '../../src/components/A03UsersScreen';

export default function UsersPage() {
  return (
    <AdminLayout activeScreenId="A03">
      <A03UsersScreen
        onReturnToDashboard={() => {
          window.location.href = '/';
        }}
      />
    </AdminLayout>
  );
}
