"use client"

import * as React from "react"

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  componentStack?: string
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error?.message)
    console.error("Component stack:", errorInfo.componentStack)
    fetch("/api/client-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "ErrorBoundary",
        errorName: error?.name,
        errorMessage: error?.message,
        componentStack: errorInfo?.componentStack,
        path: typeof window !== "undefined" ? window.location.pathname : undefined,
        href: typeof window !== "undefined" ? window.location.href : undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #region agent log
    fetch('http://127.0.0.1:7408/ingest/6854f240-86f3-4121-a956-6e67bba27392',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2075ac'},body:JSON.stringify({sessionId:'2075ac',runId:'baseline',hypothesisId:'H1',location:'components/error-boundary.tsx:componentDidCatch',message:'Root error boundary captured runtime error',data:{errorMessage:error?.message,errorName:error?.name,componentStack:errorInfo?.componentStack?.slice(0,800)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    this.setState((s) => ({ ...s, componentStack: errorInfo.componentStack }))
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="p-6 text-sm text-red-600">
          <p className="font-medium">Something went wrong.</p>
          {process.env.NODE_ENV === "development" && this.state.componentStack && (
            <pre className="mt-2 overflow-auto text-xs">{this.state.componentStack}</pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
