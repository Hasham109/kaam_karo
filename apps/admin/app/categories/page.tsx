'use client';

import { AdminLayout } from '../../src/components/AdminLayout';
import { A05CategoriesScreen } from '../../src/components/A05CategoriesScreen';

export default function CategoriesPage() {
  return (
    <AdminLayout activeScreenId="A05">
      <A05CategoriesScreen
        onReturnToDashboard={() => {
          window.location.href = '/';
        }}
      />
    </AdminLayout>
  );
}
