'use client';

import { AdminLayout } from '../../src/components/AdminLayout';
import { A21WeightsScreen } from '../../src/components/A21WeightsScreen';

export default function MatchingWeightsPage() {
  return (
    <AdminLayout activeScreenId="A21">
      <A21WeightsScreen
        onReturnToDashboard={() => {
          window.location.href = '/';
        }}
      />
    </AdminLayout>
  );
}
