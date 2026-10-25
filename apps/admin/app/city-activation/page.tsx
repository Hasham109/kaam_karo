'use client';

import { AdminLayout } from '../../src/components/AdminLayout';
import { A23CityActivationScreen } from '../../src/components/A23CityActivationScreen';

export default function CityActivationPage() {
  return (
    <AdminLayout activeScreenId="A23">
      <A23CityActivationScreen
        onReturnToDashboard={() => {
          window.location.href = '/';
        }}
      />
    </AdminLayout>
  );
}
