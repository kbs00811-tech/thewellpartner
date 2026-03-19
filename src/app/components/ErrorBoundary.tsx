import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[60vh] flex items-center justify-center px-5">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={28} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-[var(--brand-heading)] mb-2">
              문제가 발생했습니다
            </h2>
            <p className="text-sm text-[var(--brand-body-light)] mb-6 leading-relaxed">
              페이지를 불러오는 중 오류가 발생했습니다.
              <br />
              아래 버튼을 눌러 다시 시도해주세요.
            </p>
            {process.env.NODE_ENV !== "production" && this.state.error && (
              <div className="mb-6 p-3 rounded-xl bg-red-50 text-left text-xs text-red-600 font-mono break-all">
                {this.state.error.message}
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--brand-cta)] text-white font-semibold rounded-full text-sm hover:shadow-lg transition-all"
              >
                <RefreshCw size={15} />
                다시 시도
              </button>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 border border-gray-200 text-[var(--brand-heading)] font-medium rounded-full text-sm hover:bg-gray-50 transition-all"
              >
                <Home size={15} />
                홈으로
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
