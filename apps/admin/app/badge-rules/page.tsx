'use client';

import { AdminLayout } from '../../src/components/AdminLayout';
import { A22BadgeRulesScreen } from '../../src/components/A22BadgeRulesScreen';

export default function BadgeRulesPage() {
  return (
    <AdminLayout activeScreenId="A22">
      <A22BadgeRulesScreen
        onReturnToDashboard={() => {
          window.location.href = '/';
        }}
      />
    </AdminLayout>
  );
}
