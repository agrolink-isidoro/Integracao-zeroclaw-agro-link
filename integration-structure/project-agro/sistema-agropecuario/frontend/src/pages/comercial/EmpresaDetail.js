import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useEmpresa, useEmpresaDespesas, useEmpresaAgregados } from '@/hooks/useEmpresa';
import api from '@/services/api';
function downloadCSV(filename, csv) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
const EmpresaDetail = () => {
    const { id } = useParams();
    const empresaId = Number(id);
    const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const { data: empresa, isLoading: loadingEmpresa } = useEmpresa(empresaId);
    const { data: despesas } = useEmpresaDespesas(empresaId, { periodo });
    const { data: agregados, refetch: refetchAgregados } = useEmpresaAgregados(empresaId, periodo);
    const empresaObj = empresa;
    const despesasArr = Array.isArray(despesas) ? despesas : [];
    const agregadosObj = agregados;
    const handleDownload = async () => {
        try {
            // try to fetch CSV from backend using authenticated api instance
            const resp = await api.get(`/comercial/empresas/${empresaId}/agregados/`, {
                params: { periodo, format: 'csv' },
                responseType: 'text',
            });
            if (typeof resp.data === 'string' && resp.data.includes(',')) {
                downloadCSV(`agregados_empresa_${empresaId}_${periodo}.csv`, resp.data);
                return;
            }
        }
        catch (e) {
            // ignore and fallback to client-side CSV
        }
        // fallback: build CSV from agregados JSON
        if (agregadosObj && agregadosObj.por_categoria) {
            const lines = ['categoria,total'];
            agregadosObj.por_categoria.forEach((r) => lines.push(`${r.categoria},${r.total}`));
            lines.push(`TOTAL,${agregadosObj.total}`);
            downloadCSV(`agregados_empresa_${empresaId}_${periodo}.csv`, lines.join('\n'));
        }
    };
    if (loadingEmpresa)
        return _jsx("div", { children: "Carregando..." });
    if (!empresaObj)
        return _jsx("div", { className: "alert alert-warning", children: "Empresa n\u00E3o encontrada." });
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsxs("div", { children: [_jsx("h2", { children: empresaObj.nome }), _jsxs("small", { className: "text-muted", children: ["CNPJ: ", empresaObj.cnpj] })] }), _jsxs("div", { children: [_jsx("input", { type: "month", value: periodo, onChange: (e) => { setPeriodo(e.target.value); refetchAgregados(); }, className: "form-control d-inline-block me-2", style: { width: 180 } }), _jsx("button", { className: "btn btn-outline-primary", onClick: handleDownload, children: "Baixar Agregados (.csv)" }), _jsx(Link, { to: `/comercial/despesas-prestadoras/new?empresa=${empresaId}`, className: "btn btn-outline-success ms-2", children: "Adicionar Despesa" })] })] }), _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-md-6 mb-4", children: _jsxs("div", { className: "card", children: [_jsxs("div", { className: "card-header", children: ["Agregados (", periodo, ")"] }), _jsx("div", { className: "card-body", children: agregadosObj ? (_jsx("ul", { children: agregadosObj.por_categoria.map((p) => (_jsxs("li", { children: [p.categoria, ": R$ ", Number(p.total).toFixed(2)] }, p.categoria))) })) : (_jsx("p", { className: "text-muted", children: "Nenhum agregado dispon\u00EDvel para o per\u00EDodo." })) })] }) }), _jsx("div", { className: "col-md-6 mb-4", children: _jsxs("div", { className: "card", children: [_jsxs("div", { className: "card-header", children: ["Despesas (", despesasArr.length || 0, ")"] }), _jsx("div", { className: "card-body", children: _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-sm", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Data" }), _jsx("th", { children: "Categoria" }), _jsx("th", { children: "Valor" }), _jsx("th", { children: "Descri\u00E7\u00E3o" })] }) }), _jsx("tbody", { children: despesasArr && despesasArr.length ? despesasArr.map((d) => (_jsxs("tr", { children: [_jsx("td", { children: d.data }), _jsx("td", { children: d.categoria }), _jsxs("td", { children: ["R$ ", Number(d.valor).toFixed(2)] }), _jsx("td", { children: d.descricao })] }, d.id))) : (_jsx("tr", { children: _jsx("td", { colSpan: 4, className: "text-center", children: "Nenhuma despesa encontrada." }) })) })] }) }) })] }) })] })] }));
};
export default EmpresaDetail;
