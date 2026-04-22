"use client";

import { Component } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("[ErrorBoundary]", error, errorInfo.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[300px] gap-6 p-8">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <div className="text-center max-w-md">
                        <h3 className="text-lg font-bold text-red-400 mb-2">Something went wrong</h3>
                        <p className="text-sm text-white/40 leading-relaxed">
                            {this.state.error?.message || "An unexpected error occurred in this component."}
                        </p>
                    </div>
                    <button
                        onClick={this.handleReset}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-bold hover:bg-white/10 hover:text-white transition-all"
                    >
                        <RotateCcw className="w-4 h-4" /> Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
