'use client';

import { AdminLayout } from '../../src/components/AdminLayout';
import { A24AiGuidanceScreen } from '../../src/components/A24AiGuidanceScreen';

export default function AiGuidancePage() {
  return (
    <AdminLayout activeScreenId="A24">
      <A24AiGuidanceScreen
        onReturnToDashboard={() => {
          window.location.href = '/';
        }}
      />
    </AdminLayout>
  );
}
