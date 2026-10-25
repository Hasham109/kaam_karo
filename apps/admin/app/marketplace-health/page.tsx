'use client';

import { AdminLayout } from '../../src/components/AdminLayout';
import { A25MarketplaceHealthScreen } from '../../src/components/A25MarketplaceHealthScreen';

export default function MarketplaceHealthPage() {
  return (
    <AdminLayout activeScreenId="A25">
      <A25MarketplaceHealthScreen
        onReturnToDashboard={() => {
          window.location.href = '/';
        }}
      />
    </AdminLayout>
  );
}
