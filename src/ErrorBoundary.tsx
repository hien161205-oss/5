import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Lỗi hệ thống:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 text-red-800 p-8 text-center">
          <h1 className="text-3xl font-bold mb-4">Ối! Đã xảy ra lỗi.</h1>
          <p className="text-lg mb-4">Trang web gặp sự cố không mong muốn.</p>
          {this.state.error && (
            <details className="text-left bg-red-100 p-4 rounded-lg mt-4 max-w-lg overflow-auto mx-auto">
              <summary className="font-semibold cursor-pointer">Chi tiết kỹ thuật</summary>
              <pre className="mt-2 text-sm whitespace-pre-wrap break-words">
                {this.state.error.toString()}
              </pre>
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-8 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Tải lại trang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;