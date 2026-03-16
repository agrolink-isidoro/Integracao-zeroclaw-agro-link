import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import useApi from '@/hooks/useApi';
import { useApiDelete } from '@/hooks/useApi';
const InstituicaoFormLazy = React.lazy(() => import('@/components/financeiro/InstituicaoForm'));
const InstituicoesList = () => {
    // Fetch all institutions without pagination (backend returns all ~280 institutions)
    const api = useApi();
    const del = useApiDelete('/comercial/instituicoes-financeiras/', [['instituicoes']]);
    const [showForm, setShowForm] = React.useState(false);
    const [editing, setEditing] = React.useState(null);
    const [insts, setInsts] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isError, setIsError] = React.useState(false);
    const [error, setError] = React.useState(null);
    React.useEffect(() => {
        // Load all institutions at once (no pagination)
        const loadInstitutions = async () => {
            try {
                const resp = await api.client.get('/comercial/instituicoes-financeiras/');
                const data = resp.data;
                // Handle both paginated and non-paginated responses
                const institutions = Array.isArray(data) ? data : (data?.results || []);
                setInsts(institutions);
            }
            catch (e) {
                setIsError(true);
                setError(e);
            }
            finally {
                setIsLoading(false);
            }
        };
        loadInstitutions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const handleDelete = async (id) => {
        if (!window.confirm('Confirma exclusão da instituição?'))
            return;
        try {
            await del.mutateAsync(id);
        }
        catch (e) {
            console.error('Erro ao excluir instituição', e);
            alert('Falha ao excluir instituição');
        }
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsx("h5", { className: "mb-0", children: "Institui\u00E7\u00F5es Financeiras (BACEN)" }), _jsx("div", { children: _jsx("button", { className: "btn btn-sm btn-primary", onClick: () => { setEditing(null); setShowForm(true); }, children: "Nova Institui\u00E7\u00E3o" }) })] }), _jsx("div", { className: "card", children: _jsx("div", { className: "card-body", children: isError ? (_jsxs("div", { className: "alert alert-danger", children: ["Erro ao carregar institui\u00E7\u00F5es: ", error?.message || 'Erro desconhecido'] })) : isLoading ? (_jsx("div", { children: "Carregando institui\u00E7\u00F5es..." })) : insts.length === 0 ? (_jsx("div", { className: "text-muted", children: "Nenhuma institui\u00E7\u00E3o encontrada." })) : (_jsx(_Fragment, { children: _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover table-sm", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "C\u00F3digo BACEN" }), _jsx("th", { children: "Nome" }), _jsx("th", { children: "Segmento" }), _jsx("th", { children: "Cidade" }), _jsx("th", { children: "UF" }), _jsx("th", {})] }) }), _jsx("tbody", { children: insts.map((i) => (_jsxs("tr", { children: [_jsx("td", { children: i.codigo_bacen }), _jsx("td", { children: i.nome }), _jsx("td", { children: i.segmento }), _jsx("td", { children: i.municipio || '-' }), _jsx("td", { children: i.uf || '-' }), _jsxs("td", { children: [_jsx("button", { className: "btn btn-sm btn-outline-secondary me-2", onClick: () => { setEditing(i); setShowForm(true); }, children: "Editar" }), _jsx("button", { className: "btn btn-sm btn-outline-danger", onClick: () => handleDelete(i.id), children: "Excluir" })] })] }, i.id))) })] }) }) })) }) }), showForm && (_jsx("div", { className: "modal d-block", tabIndex: -1, role: "dialog", children: _jsx("div", { className: "modal-dialog modal-lg", role: "document", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: editing ? 'Editar Instituição' : 'Nova Instituição' }), _jsx("button", { type: "button", className: "btn-close", "aria-label": "Close", onClick: () => setShowForm(false) })] }), _jsx("div", { className: "modal-body", children: _jsx(React.Suspense, { fallback: _jsx("div", { children: "Carregando formul\u00E1rio..." }), children: _jsx(InstituicaoFormLazy, { initialData: editing, onClose: () => setShowForm(false), onSaved: () => setShowForm(false) }) }) })] }) }) }))] }));
};
export default InstituicoesList;
