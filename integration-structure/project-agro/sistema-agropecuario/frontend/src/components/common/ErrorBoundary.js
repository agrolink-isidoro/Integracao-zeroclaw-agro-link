import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, info) {
        // Log to console for now; could be sent to telemetry
        console.error('[ErrorBoundary] error', error, info);
    }
    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };
    render() {
        if (this.state.hasError) {
            return (_jsxs("div", { children: [_jsx("div", { className: "alert alert-danger", children: "Ocorreu um erro ao renderizar o modal." }), _jsx("div", { className: "d-flex gap-2", children: _jsx("button", { className: "btn btn-secondary", onClick: this.handleRetry, children: "Tentar novamente" }) })] }));
        }
        return this.props.children;
    }
}
export default ErrorBoundary;
