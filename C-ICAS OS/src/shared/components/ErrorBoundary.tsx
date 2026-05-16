import React from 'react';
import { logEvent, getAnalytics } from 'firebase/analytics';
import { getApp } from 'firebase/app';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    try {
      const analytics = getAnalytics(getApp());
      logEvent(analytics, 'app_error', {
        error_message: error.message.slice(0, 100),
        component_stack: info.componentStack?.slice(0, 200),
      });
    } catch { /* analytics may not be initialized */ }
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-rose-500 text-4xl font-black mb-3">!</div>
          <h2 className="text-lg font-black text-white uppercase italic tracking-tight mb-2">Wystąpił błąd</h2>
          <p className="text-[11px] text-zinc-500 font-mono mb-6 break-all">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Odśwież aplikację →
          </button>
        </div>
      </div>
    );
  }
}
