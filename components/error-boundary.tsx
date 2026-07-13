'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Component error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center" style={{ background: 'var(--os-surface)' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--os-error)', opacity: 0.15 }}>
            <span className="text-2xl" style={{ color: 'var(--os-error)' }}>!</span>
          </div>
          <h3 className="font-display font-semibold text-sm" style={{ color: 'var(--os-text)' }}>Something went wrong</h3>
          <p className="text-xs max-w-xs" style={{ color: 'var(--os-text-muted)' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: 'var(--os-hover)', color: 'var(--os-text)' }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
