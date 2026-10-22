import type { ReactNode } from 'react';

// Admin Portal is English only (D-026), so the document language is fixed to `en`.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
