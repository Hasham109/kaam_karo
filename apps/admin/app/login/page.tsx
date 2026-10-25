'use client';

import { A01LoginScreen } from '../../src/components/A01LoginScreen';

export default function LoginPage() {
  return (
    <A01LoginScreen
      onLoginSuccess={() => {
        window.location.href = '/fees';
      }}
    />
  );
}
