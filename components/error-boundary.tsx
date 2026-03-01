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
