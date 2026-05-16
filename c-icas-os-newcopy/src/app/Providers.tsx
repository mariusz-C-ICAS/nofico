/**
 * Data: 2026-05-12
 * Zmiany: Inicjalizacja abstrakcji dostawcy danych dostarczających usługi Providers.
 * Ścieżka: /src/app/Providers.tsx
 */
import React from 'react';

// Placeholder na Global Providers (TanStack Query, I18n Context, Theme, Firebase Auth)
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
    </>
  );
}
