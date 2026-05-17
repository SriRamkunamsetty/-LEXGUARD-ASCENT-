import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center p-8 m-4 max-w-lg mx-auto bg-red-950/20 border border-red-900/50 rounded-xl text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-zinc-100 mb-2">Something went wrong</h2>
          <p className="text-sm text-zinc-400 mb-6">{this.state.error?.message || "An unexpected error occurred in this component."}</p>
          <Button onClick={() => this.setState({ hasError: false })} variant="outline" className="border-red-900 hover:bg-red-900/20 text-red-400">
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
