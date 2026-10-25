import type { ReactNode } from 'react';
import { AdminAuthProvider } from '../src/auth/admin-auth-context';
import '../src/admin.css';

// Admin Portal is English only (D-026), so the document language is fixed to `en`.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, boxSizing: 'border-box' }}>
        <AdminAuthProvider>{children}</AdminAuthProvider>
      </body>
    </html>
  );
}
