import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="fixed inset-0 bg-white z-[9999] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-8">
            <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle className="w-10 h-10 text-rose-500" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Oops! Algo deu errado</h1>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">
                Ocorreu um erro inesperado na interface. Mas não se preocupe, seus dados estão seguros.
              </p>
              {this.state.error && (
                <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left overflow-auto max-h-32">
                  <p className="text-[10px] font-mono text-slate-400 break-words">
                    {this.state.error.message}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-2 py-4 px-6 bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
              >
                <RefreshCw className="w-3 h-3" />
                Recarregar
              </button>
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 py-4 px-6 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
              >
                <Home className="w-3 h-3" />
                Início
              </button>
            </div>
            
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">Equipe de Suporte Comunicada</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
