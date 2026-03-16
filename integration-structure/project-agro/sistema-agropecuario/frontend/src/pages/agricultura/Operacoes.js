import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import OperacoesList from '../../components/agricultura/OperacoesList';
import OperacaoWizard from '../../components/agricultura/OperacaoWizard';
import ModalForm from '../../components/common/ModalForm';
import operacoesService, {} from '../../services/operacoes';
import { useQuery, useQueryClient } from '@tanstack/react-query';
const OperacoesPage = () => {
    const [showWizard, setShowWizard] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const queryClient = useQueryClient();
    const { data: operacoes = [] } = useQuery({
        queryKey: ['operacoes'],
        queryFn: operacoesService.listar,
    });
    const stats = React.useMemo(() => ({
        planejadas: (operacoes || []).filter((op) => op.status === 'planejada').length,
        em_andamento: (operacoes || []).filter((op) => op.status === 'em_andamento').length,
        finalizadas: (operacoes || []).filter((op) => op.status === 'concluida').length,
    }), [operacoes]);
    const handleWizardSuccess = () => {
        setShowWizard(false);
        // Invalidate operacoes query so stats and list refresh
        queryClient.invalidateQueries({ queryKey: ['operacoes'] });
        setRefreshKey(prev => prev + 1);
    };
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsx("div", { className: "mb-4", children: _jsxs("div", { className: "d-flex justify-content-between align-items-center", children: [_jsxs("div", { children: [_jsxs("h2", { children: [_jsx("i", { className: "bi bi-list-check me-2" }), "Opera\u00E7\u00F5es Agr\u00EDcolas"] }), _jsx("p", { className: "text-muted mb-0", children: "Gest\u00E3o unificada de manejos, ordens de servi\u00E7o e opera\u00E7\u00F5es" })] }), _jsxs("button", { onClick: () => setShowWizard(true), className: "btn btn-success", children: [_jsx("i", { className: "bi bi-plus-lg me-2" }), "Nova Opera\u00E7\u00E3o"] })] }) }), _jsxs("ul", { className: "nav nav-tabs mb-4", role: "tablist", children: [_jsx("li", { className: "nav-item", role: "presentation", children: _jsxs("button", { className: `nav-link ${!showWizard ? 'active' : ''}`, onClick: () => setShowWizard(false), type: "button", children: [_jsx("i", { className: "bi bi-table me-2" }), "Listagem"] }) }), _jsx("li", { className: "nav-item", role: "presentation", children: _jsxs("button", { className: `nav-link ${showWizard ? 'active' : ''}`, onClick: () => setShowWizard(true), type: "button", children: [_jsx("i", { className: "bi bi-magic me-2" }), "Novo Wizard"] }) })] }), _jsxs("div", { className: "tab-content", children: [!showWizard && (_jsx("div", { className: "tab-pane fade show active", children: _jsx(OperacoesList, {}, refreshKey) })), showWizard && (_jsx(ModalForm, { isOpen: showWizard, onClose: () => setShowWizard(false), title: "Nova Opera\u00E7\u00E3o Agr\u00EDcola", size: "xl", children: _jsx(OperacaoWizard, { onSuccess: handleWizardSuccess }) }))] }), _jsxs("div", { className: "row mt-5", children: [_jsx("div", { className: "col-12", children: _jsxs("h5", { className: "mb-3", children: [_jsx("i", { className: "bi bi-graph-up me-2" }), "Resumo de Opera\u00E7\u00F5es"] }) }), _jsx("div", { className: "col-md-4", children: _jsx("div", { className: "card", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-center", children: [_jsxs("div", { children: [_jsx("p", { className: "text-muted mb-1 small", children: "Opera\u00E7\u00F5es Planejadas" }), _jsx("h4", { className: "mb-0 text-primary", children: stats.planejadas })] }), _jsx("i", { className: "bi bi-calendar-event text-primary fs-2" })] }) }) }) }), _jsx("div", { className: "col-md-4", children: _jsx("div", { className: "card", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-center", children: [_jsxs("div", { children: [_jsx("p", { className: "text-muted mb-1 small", children: "Em Andamento" }), _jsx("h4", { className: "mb-0 text-warning", children: stats.em_andamento })] }), _jsx("i", { className: "bi bi-hourglass-split text-warning fs-2" })] }) }) }) }), _jsx("div", { className: "col-md-4", children: _jsx("div", { className: "card", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-center", children: [_jsxs("div", { children: [_jsx("p", { className: "text-muted mb-1 small", children: "Finalizadas" }), _jsx("h4", { className: "mb-0 text-success", children: stats.finalizadas })] }), _jsx("i", { className: "bi bi-check-circle text-success fs-2" })] }) }) }) })] })] }));
};
export default OperacoesPage;
