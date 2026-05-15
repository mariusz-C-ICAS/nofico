import React from 'react';
import { AuthProvider } from '../core/auth/AuthContext';
import { TenantProvider } from '../core/auth/TenantContext';
import { BrowserRouter } from 'react-router-dom';
import { I18nProvider } from '../shared/i18n/i18nProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <TenantProvider>
            {children}
          </TenantProvider>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}
