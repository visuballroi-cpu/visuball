import { Component, type ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface Props {
  children: ReactNode
  title?: string
  hint?: string
  retryLabel?: string
}
interface State {
  error: Error | null
}

/** Catches WebGL / model-loading failures so the editor shows a friendly message instead of a white screen. */
export default class SceneErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error("[VisuBall] 3D scene failed:", error)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-950 p-8 text-center">
        <AlertTriangle size={36} className="text-amber-400" />
        <p className="text-base font-semibold text-slate-100">
          {this.props.title ?? "The 3D pitch couldn't start"}
        </p>
        <p className="max-w-sm text-sm text-slate-400">
          {this.props.hint ??
            "Your browser or graphics driver may have WebGL disabled. Your drill data is safe."}
        </p>
        <p className="max-w-md truncate font-mono text-xs text-slate-600">{this.state.error.message}</p>
        <button
          onClick={() => this.setState({ error: null })}
          className="mt-1 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
        >
          <RefreshCw size={14} /> {this.props.retryLabel ?? "Try again"}
        </button>
      </div>
    )
  }
}
