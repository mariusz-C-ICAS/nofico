import {StrictMode, Component, ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './app/App.tsx';
import { Providers } from './app/Providers.tsx';
import './index.css';
import './app/i18n';

class RootErrorBoundary extends Component<{children: ReactNode}, {error: Error | null}> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  render() {
    if (this.state.error) {
      const e = this.state.error as Error;
      return (
        <div style={{fontFamily:'monospace',padding:'2rem',background:'#111',color:'#f88',minHeight:'100vh'}}>
          <h2 style={{color:'#f44'}}>Błąd inicjalizacji aplikacji</h2>
          <pre style={{whiteSpace:'pre-wrap',wordBreak:'break-all'}}>{e.message}</pre>
          <pre style={{color:'#888',fontSize:'0.75em'}}>{e.stack}</pre>
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
