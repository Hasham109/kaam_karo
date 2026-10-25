'use client';

import { AdminLayout } from '../../src/components/AdminLayout';
import { A08QuotesScreen } from '../../src/components/A08QuotesScreen';

export default function QuotesPage() {
  return (
    <AdminLayout activeScreenId="A08">
      <A08QuotesScreen
        onReturnToDashboard={() => {
          window.location.href = '/';
        }}
      />
    </AdminLayout>
  );
}
