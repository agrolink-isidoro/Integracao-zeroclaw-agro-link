import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useApiQuery, useApiCreate } from '../../hooks/useApi';
const Abastecimentos = () => {
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ equipamento: 0, quantidade_litros: 0, valor_unitario: 0, data_abastecimento: '', horimetro_km: '', produto_estoque: null });
    const { data: abastecimentos = [], isLoading } = useApiQuery(['abastecimentos'], '/maquinas/abastecimentos/');
    const { data: equipamentos = [] } = useApiQuery(['equipamentos'], '/maquinas/equipamentos/');
    // Dashboard & per-equipamento stats
    const { data: dashboard } = useApiQuery(['abastecimentos-dashboard'], '/maquinas/abastecimentos/dashboard/');
    const { data: consumoPorEquipamento = [] } = useApiQuery(['abastecimentos-por-equipamento'], '/maquinas/abastecimentos/por_equipamento/?dias=30');
    // Buscar último preço do diesel no estoque (primeira página)
    const { data: movimentacoesDieselRaw = null } = useApiQuery(['movimentacoes-diesel'], '/estoque/movimentacoes/?tipo=entrada&search=diesel&ordering=-data_movimentacao&page_size=1&page=1', { enabled: showForm });
    // Normalize para sempre termos um array simples em movimentacoesDiesel
    const movimentacoesDiesel = Array.isArray(movimentacoesDieselRaw)
        ? movimentacoesDieselRaw
        : (movimentacoesDieselRaw && movimentacoesDieselRaw.results) ? movimentacoesDieselRaw.results : [];
    const createMutation = useApiCreate('/maquinas/abastecimentos/', [['abastecimentos']]);
    // Preencher automaticamente o preço do diesel quando abrir o formulário
    useEffect(() => {
        if (!showForm)
            return;
        async function fillPrice() {
            // 1) Prefer usar movimentacoesDiesel (busca por 'diesel')
            if (movimentacoesDiesel.length > 0 && movimentacoesDiesel[0].valor_unitario) {
                setForm((prev) => ({ ...prev, valor_unitario: Number(movimentacoesDiesel[0].valor_unitario), produto_estoque: movimentacoesDiesel[0].produto || prev.produto_estoque }));
                return;
            }
            // 2) Fallback: buscar produto Diesel e pedir ultimo_preco endpoint
            try {
                const resp = await fetch('/api/estoque/produtos/?search=diesel&page_size=1');
                const data = await resp.json();
                const first = Array.isArray(data) ? data[0] : data.results?.[0];
                if (first && first.id) {
                    const p = await fetch(`/api/estoque/produto-ultimo-preco/?produto_id=${first.id}`);
                    const pr = await p.json();
                    if (pr && pr.valor_unitario) {
                        setForm((prev) => ({ ...prev, valor_unitario: Number(pr.valor_unitario), produto_estoque: first.id }));
                    }
                    else {
                        // Even if there's no price, we set produto_estoque so the Abastecimento explicitly links the product
                        setForm((prev) => ({ ...prev, produto_estoque: first.id }));
                    }
                }
            }
            catch (e) {
                // não bloquear o formulário em caso de erro
                // console.debug('Erro ao buscar preço automático do diesel', e)
            }
        }
        fillPrice();
    }, [showForm, movimentacoesDiesel]);
    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'quantidade_litros' || name === 'valor_unitario' || name === 'horimetro_km') {
            setForm((prev) => ({ ...prev, [name]: Number(value) }));
        }
        else if (name === 'produto_estoque') {
            // produto_estoque is numeric id
            setForm((prev) => ({ ...prev, produto_estoque: value ? Number(value) : null }));
        }
        else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    };
    const computedTotal = Number((form.quantidade_litros * form.valor_unitario).toFixed(2));
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Ensure data_abastecimento is sent as full ISO string with timezone (server expects timezone-aware datetime)
            const payload = { ...form };
            if (form.data_abastecimento) {
                try {
                    payload.data_abastecimento = new Date(form.data_abastecimento).toISOString();
                }
                catch (e) {
                    // fallback: send raw value
                    payload.data_abastecimento = form.data_abastecimento;
                }
            }
            await createMutation.mutateAsync(payload);
            setShowForm(false);
            setForm({ equipamento: 0, quantidade_litros: 0, valor_unitario: 0, data_abastecimento: '', horimetro_km: '', produto_estoque: null });
        }
        catch (err) {
            console.error(err);
            alert('Erro ao criar abastecimento');
        }
    };
    return (_jsxs("div", { className: "p-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-4", children: [_jsx("h1", { className: "h2", children: "Abastecimentos" }), _jsx("button", { className: "btn btn-success", onClick: () => setShowForm(true), children: "Novo Abastecimento" })] }), showForm && (_jsx("div", { className: "card mb-4 p-3", children: _jsxs("form", { onSubmit: handleSubmit, className: "row g-3", children: [_jsxs("div", { className: "col-md-4 col-12", children: [_jsx("label", { className: "form-label", htmlFor: "equipamento", children: "Equipamento" }), _jsxs("select", { id: "equipamento", name: "equipamento", value: form.equipamento, onChange: handleChange, className: "form-select", children: [_jsx("option", { value: 0, children: "Selecione" }), equipamentos.map(eq => (_jsx("option", { value: eq.id, children: eq.nome }, eq.id)))] })] }), _jsxs("div", { className: "col-md-2 col-6", children: [_jsx("label", { className: "form-label", htmlFor: "quantidade_litros", children: "Quantidade (L)" }), _jsx("input", { id: "quantidade_litros", name: "quantidade_litros", type: "number", step: "0.01", value: form.quantidade_litros, onChange: handleChange, className: "form-control" })] }), _jsxs("div", { className: "col-md-2 col-6", children: [_jsxs("label", { className: "form-label", htmlFor: "valor_unitario", children: ["Valor Unit.", movimentacoesDiesel.length > 0 && movimentacoesDiesel[0].valor_unitario && (_jsxs("span", { className: "badge bg-success ms-2", title: "Preenchido automaticamente com o \u00FAltimo pre\u00E7o de entrada do diesel no estoque", children: [_jsx("i", { className: "bi bi-check-circle me-1" }), "Auto"] }))] }), _jsx("input", { id: "valor_unitario", name: "valor_unitario", type: "number", step: "0.01", value: form.valor_unitario, onChange: handleChange, className: "form-control", placeholder: "R$/L" }), movimentacoesDiesel.length > 0 && movimentacoesDiesel[0].valor_unitario && (_jsxs("small", { className: "text-muted", children: ["\u00DAltimo pre\u00E7o: R$ ", Number(movimentacoesDiesel[0].valor_unitario).toFixed(2), "/L"] })), _jsxs("select", { name: "produto_estoque", value: form.produto_estoque ?? '', onChange: handleChange, style: { display: 'none' }, children: [_jsx("option", { value: "", children: "\u2014" }), movimentacoesDiesel.map(m => (_jsx("option", { value: m.produto, children: m.produto_nome }, m.id)))] })] }), _jsxs("div", { className: "col-md-2 col-6", children: [_jsx("label", { className: "form-label", htmlFor: "horimetro_km", children: "Hor\u00EDmetro/Km" }), _jsx("input", { id: "horimetro_km", name: "horimetro_km", type: "number", step: "0.1", value: form.horimetro_km, onChange: handleChange, className: "form-control", placeholder: "Opcional" })] }), _jsxs("div", { className: "col-md-3 col-12", children: [_jsx("label", { className: "form-label", htmlFor: "data_abastecimento", children: "Data" }), _jsx("input", { id: "data_abastecimento", name: "data_abastecimento", type: "datetime-local", value: form.data_abastecimento, onChange: handleChange, className: "form-control" })] }), _jsxs("div", { className: "col-md-3 col-12", children: [_jsx("label", { className: "form-label", children: "Total (R$)" }), _jsx("input", { readOnly: true, value: computedTotal.toFixed(2), className: "form-control" })] }), _jsxs("div", { className: "col-12 d-flex justify-content-end", children: [_jsx("button", { type: "button", className: "btn btn-secondary me-2", onClick: () => setShowForm(false), children: "Cancelar" }), _jsx("button", { type: "submit", className: "btn btn-primary", children: "Salvar" })] })] }) })), _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-header", children: "Resumo" }), _jsx("div", { className: "card-body", children: _jsxs("div", { className: "row mb-3", children: [_jsx("div", { className: "col-sm-6 col-md-3 mb-2", children: _jsxs("div", { className: "card p-2 h-100", children: [_jsx("div", { className: "small text-muted", children: "Abastecimentos no m\u00EAs" }), _jsx("div", { className: "h4", children: dashboard?.total_abastecimentos_mes ?? 0 })] }) }), _jsx("div", { className: "col-sm-6 col-md-3 mb-2", children: _jsxs("div", { className: "card p-2 h-100", children: [_jsx("div", { className: "small text-muted", children: "Custo total (m\u00EAs)" }), _jsxs("div", { className: "h4", children: ["R$ ", Number(dashboard?.custo_total_abastecimentos_mes ?? 0).toFixed(2)] })] }) }), _jsx("div", { className: "col-sm-6 col-md-3 mb-2", children: _jsxs("div", { className: "card p-2 h-100", children: [_jsx("div", { className: "small text-muted", children: "Consumo m\u00E9dio (L/dia)" }), _jsx("div", { className: "h4", children: Number(dashboard?.consumo_medio_litros_dia ?? 0).toFixed(2) })] }) }), _jsx("div", { className: "col-sm-6 col-md-3 mb-2", children: _jsxs("div", { className: "card p-2 h-100", children: [_jsx("div", { className: "small text-muted", children: "Top m\u00E1quina (L)" }), _jsx("div", { className: "h5", children: consumoPorEquipamento?.[0]?.equipamento__nome ?? '—' }), _jsxs("div", { className: "small text-muted", children: [consumoPorEquipamento?.[0]?.total_litros ?? 0, " L"] })] }) })] }) })] }), _jsxs("div", { className: "card mt-3", children: [_jsx("div", { className: "card-header", children: "Lista de Abastecimentos" }), _jsx("div", { className: "card-body p-0", children: isLoading ? (_jsx("div", { className: "p-4 text-center", children: "Carregando..." })) : (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table mb-0", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Equipamento" }), _jsx("th", { children: "Quantidade (L)" }), _jsx("th", { children: "Valor Unit." }), _jsx("th", { children: "Total (R$)" }), _jsx("th", { children: "Data" })] }) }), _jsx("tbody", { children: abastecimentos.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "text-center py-4", children: "Nenhum abastecimento encontrado" }) })) : (abastecimentos.map(a => (_jsxs("tr", { children: [_jsx("td", { children: a.equipamento_detail?.nome || a.equipamento }), _jsx("td", { children: a.quantidade_litros }), _jsxs("td", { children: ["R$ ", Number(a.valor_unitario).toFixed(2)] }), _jsxs("td", { children: ["R$ ", Number(a.valor_total ?? (a.quantidade_litros * a.valor_unitario)).toFixed(2)] }), _jsx("td", { children: new Date(a.data_abastecimento).toLocaleString() })] }, a.id)))) })] }) })) })] })] }));
};
export default Abastecimentos;
