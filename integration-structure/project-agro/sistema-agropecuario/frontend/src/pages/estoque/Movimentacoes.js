import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { movimentacoesService } from '../../services/produtos';
const MovimentacoesPage = () => {
    const [loading, setLoading] = React.useState(false);
    const [statements, setStatements] = React.useState([]);
    const [count, setCount] = React.useState(0);
    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(20);
    const [filters, setFilters] = React.useState({ tipo: '', produto: '', produto_nome: '', data_inicio: '', data_fim: '', origem: '' });
    const [fetchTrigger, setFetchTrigger] = React.useState(0);
    const [productQuery, setProductQuery] = React.useState('');
    const [suggestions, setSuggestions] = React.useState([]);
    const [suggestionsLoading, setSuggestionsLoading] = React.useState(false);
    React.useEffect(() => {
        fetchStatements();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, pageSize, fetchTrigger]);
    // Debounced product suggestions
    React.useEffect(() => {
        if (!productQuery || productQuery.length < 2) {
            setSuggestions([]);
            setSuggestionsLoading(false);
            return;
        }
        let cancelled = false;
        setSuggestionsLoading(true);
        const t = setTimeout(async () => {
            try {
                const mod = await import('../../services/produtos');
                const prods = await mod.produtosService.buscarSimples(productQuery, 10);
                if (!cancelled)
                    setSuggestions(prods);
            }
            catch (err) {
                console.error('Erro buscando produtos:', err);
            }
            finally {
                if (!cancelled)
                    setSuggestionsLoading(false);
            }
        }, 300);
        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [productQuery]);
    const fetchStatements = async () => {
        setLoading(true);
        try {
            const payload = { page, page_size: pageSize };
            if (filters.tipo)
                payload.tipo = filters.tipo;
            if (filters.produto)
                payload.produto = filters.produto ? parseInt(String(filters.produto)) : undefined;
            if (filters.data_inicio)
                payload.data_inicio = filters.data_inicio;
            if (filters.data_fim)
                payload.data_fim = filters.data_fim;
            if (filters.origem)
                payload.movimentacao__origem = filters.origem;
            const res = await movimentacoesService.listarStatements(payload);
            setCount(res.count || 0);
            setStatements(res.results || []);
        }
        catch (err) {
            console.error('Erro ao buscar statements:', err);
            alert('Erro ao carregar histórico de movimentações. Verifique o console.');
        }
        finally {
            setLoading(false);
        }
    };
    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };
    const applyFilters = () => {
        setPage(1);
        fetchStatements();
    };
    const exportCSV = () => {
        // include filters in filename
        const filterPart = [];
        if (filters.tipo)
            filterPart.push(filters.tipo);
        if (filters.produto_nome)
            filterPart.push(`prod-${filters.produto_nome.replace(/\s+/g, '_')}`);
        const suffix = filterPart.length ? `_${filterPart.join('_')}` : '';
        if (!statements || statements.length === 0) {
            alert('Nenhum registro para exportar');
            return;
        }
        const headers = ['Data', 'Produto', 'Tipo', 'Quantidade', 'Unidade', 'Saldo após', 'Documento', 'Motivo', 'Observações'];
        const rows = statements.map(s => ([
            s.data_movimentacao,
            s.produto_nome || '',
            s.tipo,
            s.quantidade,
            s.unidade || '',
            s.saldo_resultante ?? '',
            s.documento_referencia || '',
            s.motivo || '',
            s.observacoes || ''
        ]));
        const csvContent = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `movimentacoes_statements${suffix}_${new Date().toISOString()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-4", children: [_jsxs("div", { children: [_jsxs("h2", { children: [_jsx("i", { className: "bi bi-list-ul me-2" }), "Hist\u00F3rico de Movimenta\u00E7\u00F5es (Statements)"] }), _jsx("p", { className: "text-muted mb-0", children: "Registro audit\u00E1vel e imut\u00E1vel de movimenta\u00E7\u00F5es de estoque." })] }), _jsxs("div", { children: [_jsx("button", { className: "btn btn-outline-secondary me-2", onClick: () => fetchStatements(), disabled: loading, children: "Atualizar" }), _jsx("button", { className: "btn btn-outline-primary", onClick: exportCSV, children: "Exportar CSV" })] })] }), _jsx("div", { className: "card mb-4", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "row g-2 align-items-end", children: [_jsxs("div", { className: "col-md-2", children: [_jsx("label", { className: "form-label", children: "Tipo" }), _jsxs("select", { className: "form-select", value: filters.tipo, onChange: (e) => handleFilterChange('tipo', e.target.value), children: [_jsx("option", { value: "", children: "Todos" }), _jsx("option", { value: "entrada", children: "Entrada" }), _jsx("option", { value: "saida", children: "Sa\u00EDda" }), _jsx("option", { value: "reserva", children: "Reserva" }), _jsx("option", { value: "liberacao", children: "Libera\u00E7\u00E3o" }), _jsx("option", { value: "reversao", children: "Revers\u00E3o" })] })] }), _jsxs("div", { className: "col-md-2", children: [_jsx("label", { className: "form-label", children: "Origem" }), _jsxs("select", { className: "form-select", value: filters.origem, onChange: (e) => handleFilterChange('origem', e.target.value), children: [_jsx("option", { value: "", children: "Todos" }), _jsx("option", { value: "manual", children: "Manual" }), _jsx("option", { value: "nfe", children: "NFe" }), _jsx("option", { value: "ordem_servico", children: "Ordem de Servi\u00E7o" }), _jsx("option", { value: "colheita", children: "Colheita" }), _jsx("option", { value: "abastecimento", children: "Abastecimento" }), _jsx("option", { value: "manutencao", children: "Manuten\u00E7\u00E3o" }), _jsx("option", { value: "agricultura", children: "Opera\u00E7\u00E3o Agr\u00EDcola" }), _jsx("option", { value: "venda", children: "Venda" }), _jsx("option", { value: "ajuste", children: "Ajuste" })] })] }), _jsxs("div", { className: "col-md-3 position-relative", children: [_jsx("label", { className: "form-label", children: "Produto" }), _jsx("input", { className: "form-control", value: productQuery || filters.produto_nome || '', onChange: (e) => { setProductQuery(e.target.value); handleFilterChange('produto', ''); handleFilterChange('produto_nome', e.target.value); }, placeholder: "Digite nome ou ID (min 2 chars)" }), suggestionsLoading && _jsx("div", { className: "position-absolute bg-white border p-2", style: { zIndex: 50, width: '100%' }, children: "Buscando..." }), suggestions.length > 0 && (_jsx("div", { className: "position-absolute bg-white border", style: { zIndex: 50, width: '100%', maxHeight: '220px', overflow: 'auto' }, children: suggestions.map(s => (_jsx("div", { className: "px-3 py-2 hover-shadow", style: { cursor: 'pointer' }, onClick: () => {
                                                handleFilterChange('produto', String(s.id));
                                                handleFilterChange('produto_nome', s.nome);
                                                setProductQuery('');
                                                setSuggestions([]);
                                            }, children: _jsxs("div", { className: "d-flex justify-content-between", children: [_jsxs("div", { children: [_jsx("strong", { children: s.nome }), " ", _jsxs("small", { className: "text-muted", children: ["(", s.codigo, ")"] })] }), _jsxs("div", { className: "text-muted", children: ["ID: ", s.id] })] }) }, s.id))) }))] }), _jsxs("div", { className: "col-md-2", children: [_jsx("label", { className: "form-label", children: "Data In\u00EDcio" }), _jsx("input", { type: "date", className: "form-control", value: filters.data_inicio, onChange: (e) => handleFilterChange('data_inicio', e.target.value) })] }), _jsxs("div", { className: "col-md-2", children: [_jsx("label", { className: "form-label", children: "Data Fim" }), _jsx("input", { type: "date", className: "form-control", value: filters.data_fim, onChange: (e) => handleFilterChange('data_fim', e.target.value) })] }), _jsxs("div", { className: "col-md-3 d-flex gap-2", children: [_jsx("button", { className: "btn btn-primary", onClick: applyFilters, children: "Aplicar" }), _jsx("button", { className: "btn btn-light", onClick: () => { setFilters({ tipo: '', produto: '', produto_nome: '', data_inicio: '', data_fim: '', origem: '' }); setProductQuery(''); setPage(1); setFetchTrigger(t => t + 1); }, children: "Limpar" })] })] }) }) }), _jsx("div", { className: "card", children: _jsxs("div", { className: "card-body", children: [_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-striped", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Quando" }), _jsx("th", { children: "Data Mov." }), _jsx("th", { children: "Produto" }), _jsx("th", { children: "Tipo" }), _jsx("th", { children: "Origem" }), _jsx("th", { className: "text-end", children: "Quantidade" }), _jsx("th", { children: "Unidade" }), _jsx("th", { className: "text-end", children: "Saldo ap\u00F3s" }), _jsx("th", { children: "Documento" }), _jsx("th", { children: "Motivo" }), _jsx("th", { children: "Obs." })] }) }), _jsx("tbody", { children: loading ? (_jsx("tr", { children: _jsx("td", { colSpan: 11, className: "text-center", children: "Carregando..." }) })) : statements.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 11, className: "text-center", children: "Nenhum registro encontrado" }) })) : statements.map(s => (_jsxs("tr", { children: [_jsx("td", { children: s.criado_em ? new Date(s.criado_em).toLocaleString() : '-' }), _jsx("td", { children: s.data_movimentacao ? new Date(s.data_movimentacao).toLocaleDateString() : '-' }), _jsx("td", { children: s.produto_nome || s.produto || '-' }), _jsx("td", { children: _jsx("span", { className: `badge ${s.tipo === 'entrada' ? 'bg-success' : s.tipo === 'saida' ? 'bg-danger' : s.tipo === 'reserva' ? 'bg-warning text-dark' : 'bg-secondary'}`, children: s.tipo === 'saida' ? 'Saída' : s.tipo === 'entrada' ? 'Entrada' : s.tipo === 'reserva' ? 'Reserva' : s.tipo === 'liberacao' ? 'Liberação' : s.tipo === 'reversao' ? 'Reversão' : s.tipo }) }), _jsx("td", { children: s.origem_display || s.origem || s.metadata?.origem_display || s.metadata?.origem || '-' }), _jsx("td", { className: "text-end", children: Number(s.quantidade).toFixed(3) }), _jsx("td", { children: s.unidade }), _jsx("td", { className: "text-end", children: s.saldo_resultante ?? '-' }), _jsx("td", { children: s.documento_referencia }), _jsx("td", { children: s.motivo }), _jsx("td", { children: s.observacoes })] }, s.id))) })] }) }), _jsxs("div", { className: "d-flex justify-content-between align-items-center mt-3", children: [_jsxs("div", { children: ["Registros: ", count] }), _jsxs("div", { className: "d-flex gap-2", children: [_jsx("button", { className: "btn btn-outline-secondary", onClick: () => setPage(Math.max(1, page - 1)), disabled: page === 1, children: "Anterior" }), _jsxs("span", { className: "align-self-center", children: ["P\u00E1gina ", page] }), _jsx("button", { className: "btn btn-outline-secondary", onClick: () => setPage(page + 1), disabled: statements.length < pageSize, children: "Pr\u00F3ximo" }), _jsxs("select", { className: "form-select ms-2", style: { width: '120px' }, value: pageSize, onChange: (e) => { setPageSize(parseInt(e.target.value)); setPage(1); }, children: [_jsx("option", { value: 10, children: "10" }), _jsx("option", { value: 20, children: "20" }), _jsx("option", { value: 50, children: "50" })] })] })] })] }) })] }));
};
export default MovimentacoesPage;
