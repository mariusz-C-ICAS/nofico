import React from 'react';
import { AuthProvider } from '../core/auth/AuthContext';
import { TenantProvider } from '../core/auth/TenantContext';
import { CompanyProvider } from '../core/auth/CompanyContext';
import { BrowserRouter } from 'react-router-dom';
import { I18nProvider } from '../shared/i18n/i18nProvider';
import { ThemeProvider } from '../core/theme/ThemeContext';
import { ThemeProvider as ThemeProviderPrimary } from './providers/ThemeProvider';
import { SystemTasksProvider } from '../core/tasks/SystemTasksContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <I18nProvider>
          <AuthProvider>
            <ThemeProviderPrimary>
              <TenantProvider>
                <CompanyProvider>
                  <SystemTasksProvider>
                    {children}
                  </SystemTasksProvider>
                </CompanyProvider>
              </TenantProvider>
            </ThemeProviderPrimary>
          </AuthProvider>
        </I18nProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
