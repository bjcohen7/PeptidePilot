import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

const CHUNK_RELOAD_KEY = "peptidepilot_chunk_reload_attempted";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function isChunkLoadError(error: Error | null) {
  if (!error) return false;
  const message = `${error.message ?? ""}\n${error.stack ?? ""}`;
  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("ChunkLoadError") ||
    message.includes("Loading chunk") ||
    message.includes("Importing a module script failed")
  );
}

function recoverFromChunkError() {
  if (typeof window === "undefined") return false;
  const alreadyRetried = window.sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1";
  if (alreadyRetried) return false;
  window.sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  window.location.reload();
  return true;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    if (isChunkLoadError(error)) {
      recoverFromChunkError();
    }
  }

  componentDidMount() {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1") {
      window.sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-xl mb-4">An unexpected error occurred.</h2>

            <div className="p-4 w-full rounded bg-muted overflow-auto mb-6">
              <pre className="text-sm text-muted-foreground whitespace-break-spaces">
                {this.state.error?.stack}
              </pre>
            </div>

            <button
              onClick={() => window.location.reload()}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg",
                "bg-primary text-primary-foreground",
                "hover:opacity-90 cursor-pointer"
              )}
            >
              <RotateCcw size={16} />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
