import React from 'react';
import { AuthProvider } from '../core/auth/AuthContext';
import { TenantProvider } from '../core/auth/TenantContext';
import { CompanyProvider } from '../core/auth/CompanyContext';
import { BrowserRouter } from 'react-router-dom';
import { I18nProvider } from '../shared/i18n/i18nProvider';
import { ThemeProvider } from '../core/theme/ThemeContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <I18nProvider>
          <AuthProvider>
            <TenantProvider>
              <CompanyProvider>
                {children}
              </CompanyProvider>
            </TenantProvider>
          </AuthProvider>
        </I18nProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
