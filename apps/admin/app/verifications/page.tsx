'use client';

import { AdminLayout } from '../../src/components/AdminLayout';
import { A04VerificationScreen } from '../../src/components/A04VerificationScreen';

export default function VerificationsPage() {
  return (
    <AdminLayout activeScreenId="A04">
      <A04VerificationScreen
        onReturnToDashboard={() => {
          window.location.href = '/';
        }}
      />
    </AdminLayout>
  );
}
