import { Component, ReactNode, ErrorInfo } from "react";
import { AlertTriangle, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-4">
            Something went wrong
          </h1>
          <p className="text-muted-foreground max-w-md mb-8">
            An unexpected error occurred. We've been notified and are looking into it.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-8 py-3 rounded-full font-medium hover:scale-105 transition-all glow-gold"
          >
            <Home className="w-4 h-4" />
            Return Home
          </a>
        </div>
      );
    }

    return this.props.children;
  }
}
