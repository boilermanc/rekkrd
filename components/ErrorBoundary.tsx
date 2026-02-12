import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component {
  declare props: ErrorBoundaryProps;
  declare state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Uncaught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#050505] px-4">
          <div className="glass-morphism rounded-2xl p-8 max-w-md w-full text-center space-y-6">
            <div className="text-5xl">💿</div>
            <h1 className="font-syncopate text-xl text-emerald-400 tracking-wider">
              SKIP IN THE RECORD
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              Something went wrong. Try reloading — your collection is safe.
            </p>
            {this.state.error && (
              <pre className="text-xs text-red-400/70 bg-black/40 rounded-lg p-3 overflow-auto max-h-32 text-left">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-sm font-medium transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
