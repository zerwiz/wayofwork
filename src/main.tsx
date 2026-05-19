import { Component, StrictMode, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import App from "./App";
import { LoginPage, WelcomePage } from "./pages";
import "./index.css";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#1e1e1e] p-8 text-[#cccccc]">
          <div className="max-w-md text-center">
            <h1 className="mb-4 text-2xl font-black text-[#ea580c] uppercase tracking-tighter">Something went wrong</h1>
            <pre className="mb-6 max-h-48 overflow-auto rounded border border-[#3c3c3c] bg-[#0d0d0d] p-4 text-left text-xs text-red-400 font-mono">
              {this.state.error.message}
            </pre>
            <p className="mb-6 text-sm text-[#858585]">
              Try restarting the app. If the problem persists, check the developer console (Ctrl+Shift+I) for details.
            </p>
            <button
              onClick={() => { window.location.reload(); }}
              className="rounded-md bg-[#ea580c] px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-[#c2410c] active:scale-[0.98] transition-all"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function RootRedirect() {
  const hasToken = !!localStorage.getItem("wop_token");
  return <Navigate to={hasToken ? "/docs" : "/welcome"} replace />;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const hasToken = !!localStorage.getItem("wop_token");
  if (!hasToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

const el = document.getElementById("root");
if (!el) throw new Error("Missing #root");

let root = (window as any)._reactRoot;
if (!root) {
  root = createRoot(el);
  (window as any)._reactRoot = root;
}

root.render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RootRedirect />} />
          <Route path="/*" element={<RequireAuth><App /></RequireAuth>} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);
