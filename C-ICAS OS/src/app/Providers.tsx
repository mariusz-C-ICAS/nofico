import React from 'react';
import { AuthProvider } from '../core/auth/AuthContext';
import { TenantProvider } from '../core/auth/TenantContext';
import { BrowserRouter } from 'react-router-dom';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TenantProvider>
          {children}
        </TenantProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
