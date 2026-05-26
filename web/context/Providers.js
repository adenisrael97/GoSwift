'use client';

import { AuthProvider } from './AuthContext';
import { OrderProvider } from './OrderContext';

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <OrderProvider>{children}</OrderProvider>
    </AuthProvider>
  );
}
