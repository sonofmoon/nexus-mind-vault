import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, ShieldAlert, Home } from 'lucide-react';

export interface ErrorBoundaryProps {
  children: ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[Vault Fatal Error Intercepted]', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetSession = () => {
    sessionStorage.clear();
    window.location.href = '/';
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0b0f17',
            color: '#f8fafc',
            padding: '24px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              width: '100%',
              background: '#1e293b',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '20px',
              padding: '32px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <ShieldAlert className="w-8 h-8" />
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0', color: '#f8fafc' }}>
              Vault Enclave Exception Intercepted
            </h2>

            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              An unexpected runtime anomaly occurred. Your encrypted cryptographic data remains sealed and protected in client storage.
            </p>

            {this.state.error && (
              <div
                style={{
                  background: '#0f172a',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: '#fca5a5',
                  textAlign: 'left',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  marginBottom: '24px',
                }}
              >
                {this.state.error.toString()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#334155',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
                onClick={this.handleResetSession}
              >
                <Home className="w-4 h-4" />
                Reset Safe Session
              </button>

              <button
                type="button"
                className="btn btn-primary"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
                onClick={this.handleReload}
              >
                <RefreshCw className="w-4 h-4" />
                Reload Enclave
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
