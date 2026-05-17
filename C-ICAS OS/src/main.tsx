import {StrictMode, Component, ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './app/App.tsx';
import { Providers } from './app/Providers.tsx';
import './index.css';
import './app/i18n';

// After a new deployment, chunk hashes change. The old SW may still try to
// serve stale URLs. When a dynamic import fails, reload once so the new SW
// takes over and serves the correct chunks.
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

function isChunkError(e: Error) {
  return (
    e.message.includes('Failed to fetch dynamically imported module') ||
    e.message.includes('Importing a module script failed') ||
    e.message.includes('error loading dynamically imported module') ||
    e.name === 'ChunkLoadError'
  );
}

class RootErrorBoundary extends Component<{children: ReactNode}, {error: Error | null}> {
  state = { error: null };

  static getDerivedStateFromError(e: Error) {
    if (isChunkError(e)) {
      // Reload once — new deployment, stale chunk URLs
      window.location.reload();
      return { error: null };
    }
    return { error: e };
  }

  render() {
    if (this.state.error) {
      const e = this.state.error as Error;
      return (
        <div style={{fontFamily:'monospace',padding:'2rem',background:'#111',color:'#f88',minHeight:'100vh'}}>
          <h2 style={{color:'#f44'}}>Błąd inicjalizacji aplikacji</h2>
          <pre style={{whiteSpace:'pre-wrap',wordBreak:'break-all'}}>{e.message}</pre>
          <pre style={{color:'#888',fontSize:'0.75em'}}>{e.stack}</pre>
          <button
            onClick={() => window.location.reload()}
            style={{marginTop:'1rem',padding:'0.5rem 1.5rem',background:'#4f46e5',color:'#fff',border:'none',borderRadius:'8px',cursor:'pointer',fontFamily:'inherit'}}>
            Odśwież stronę
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <Providers>
        <App />
      </Providers>
    </RootErrorBoundary>
  </StrictMode>,
);
