'use client';

import { AdminLayout } from '../../src/components/AdminLayout';
import { A26AiInteractionViewerScreen } from '../../src/components/A26AiInteractionViewerScreen';

export default function AiViewerPage() {
  return (
    <AdminLayout activeScreenId="A26">
      <A26AiInteractionViewerScreen
        onReturnToDashboard={() => {
          window.location.href = '/';
        }}
      />
    </AdminLayout>
  );
}
