import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useGlobalShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Ostateczny Przycisk Paniki (Emergency Brake) - Esc
      if (e.key === 'Escape') {
        // Aktywne pole tekstowe? Blur.
        const activeEl = document.activeElement as HTMLElement | null;
        if (activeEl && typeof activeEl.blur === 'function' && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
           activeEl.blur();
        }
      }

      // 2. Nawigacja modułowa (Alt + Cyfry)
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        switch (e.key) {
          case '1': e.preventDefault(); navigate('/dashboard'); break; // Pulpit
          case '2': e.preventDefault(); navigate('/crm'); break; // CRM
          case '3': e.preventDefault(); navigate('/finance'); break; // Finanse
          case '4': e.preventDefault(); navigate('/hr'); break; // HR
          case '5': e.preventDefault(); navigate('/dms'); break; // DMS (Skarbiec)
          case 'admin':
            // we do not have single keys for admin, but it's ok.
            break;
        }
      }

      // 3. Globalny Zapis (Ctrl+S / Cmd+S)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('app-save'));
      }
      
      // 4. Globalne wysłanie (Ctrl+Enter / Cmd+Enter)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          // If we are in textarea, do not prevent default unless needed, actually Ctrl+Enter is safe to prevent default
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('app-submit'));
      }
    };

    // Use capture phase to intercept before React synthetic events if needed, but standard bubble is fine too
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [navigate]);
}
