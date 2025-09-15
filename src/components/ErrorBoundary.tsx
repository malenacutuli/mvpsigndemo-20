import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo?: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Global ErrorBoundary caught an error:', error, info);
    this.setState({ errorInfo: info.componentStack });
  }

  handleReset = () => {
    // Try soft reset first
    this.setState({ hasError: false, errorInfo: undefined });
    // As a fallback, reload the page (preserves Supabase data)
    setTimeout(() => {
      if (this.state.hasError) {
        window.location.reload();
      }
    }, 50);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-lg border bg-background shadow-sm p-6 text-center">
            <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mb-4">
              The interface hit an unexpected error. Your videos and data are safe.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm font-medium shadow transition-colors hover:opacity-90"
              >
                Reload interface
              </button>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm"
              >
                Continue
              </button>
            </div>
            {this.state.errorInfo && (
              <pre className="mt-4 text-left whitespace-pre-wrap text-xs opacity-60 overflow-auto max-h-40">
                {this.state.errorInfo}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
