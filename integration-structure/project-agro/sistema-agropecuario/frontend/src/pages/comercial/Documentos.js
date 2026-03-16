import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ComercialService from '@/services/comercial';
import FileUpload from '@/components/common/FileUpload';
const Documentos = () => {
    const qc = useQueryClient();
    const { data: documentos = [], isLoading } = useQuery({ queryKey: ['documentos'], queryFn: () => ComercialService.getDocumentos() });
    const { data: fornecedores = [] } = useQuery({ queryKey: ['fornecedores'], queryFn: () => ComercialService.getFornecedores() });
    const [form, setForm] = useState({ fornecedor: '', titulo: '', tipo: 'outros', data_vencimento: '' });
    const [arquivo, setArquivo] = useState(null);
    const createDoc = useMutation({
        mutationFn: async (fd) => await ComercialService.createDocumento(fd),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['documentos'] })
    });
    const deleteDoc = useMutation({
        mutationFn: async (id) => await ComercialService.deleteDocumento(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['documentos'] })
    });
    const handleSubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData();
        fd.append('fornecedor', form.fornecedor);
        fd.append('titulo', form.titulo);
        fd.append('tipo', form.tipo);
        if (form.data_vencimento)
            fd.append('data_vencimento', form.data_vencimento);
        if (arquivo)
            fd.append('arquivo', arquivo);
        await createDoc.mutateAsync(fd);
        setForm({ fornecedor: '', titulo: '', tipo: 'outros', data_vencimento: '' });
        setArquivo(null);
    };
    return (_jsxs("div", { children: [_jsx("div", { className: "d-flex justify-content-between align-items-center mb-4", children: _jsxs("div", { children: [_jsx("h1", { className: "h3 mb-0", children: "Documentos de Fornecedores" }), _jsx("p", { className: "text-muted", children: "Gerencie documentos, vencimentos e arquivos" })] }) }), _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "card mb-4", children: [_jsx("div", { className: "card-header", children: "Enviar Documento" }), _jsx("div", { className: "card-body", children: _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "mb-3", children: [_jsx("label", { htmlFor: "fornecedor", className: "form-label", children: "Fornecedor" }), _jsxs("select", { id: "fornecedor", className: "form-select", value: form.fornecedor, onChange: (e) => setForm({ ...form, fornecedor: e.target.value }), children: [_jsx("option", { value: "", children: "Selecione" }), fornecedores && fornecedores.map((f) => (_jsx("option", { value: f.id, children: f.nome }, f.id)))] })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { htmlFor: "titulo", className: "form-label", children: "T\u00EDtulo" }), _jsx("input", { id: "titulo", className: "form-control", value: form.titulo, onChange: (e) => setForm({ ...form, titulo: e.target.value }) })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { htmlFor: "tipo", className: "form-label", children: "Tipo" }), _jsxs("select", { id: "tipo", className: "form-select", value: form.tipo, onChange: (e) => setForm({ ...form, tipo: e.target.value }), children: [_jsx("option", { value: "contrato", children: "Contrato" }), _jsx("option", { value: "certificado", children: "Certificado" }), _jsx("option", { value: "licenca", children: "Licen\u00E7a" }), _jsx("option", { value: "outros", children: "Outros" })] })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { htmlFor: "data_vencimento", className: "form-label", children: "Data de Vencimento" }), _jsx("input", { id: "data_vencimento", type: "date", className: "form-control", value: form.data_vencimento, onChange: (e) => setForm({ ...form, data_vencimento: e.target.value }) })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Arquivo" }), _jsx(FileUpload, { onFileSelect: (files) => setArquivo(files?.[0] ?? null) })] }), _jsx("button", { className: "btn btn-primary", type: "submit", disabled: Boolean(createDoc.isLoading), children: "Enviar" })] }) })] }) }), _jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "card mb-4", children: [_jsx("div", { className: "card-header", children: "Lista de Documentos" }), _jsx("div", { className: "card-body", children: isLoading ? (_jsx("div", { children: "Carregando..." })) : documentos && documentos.length ? (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "T\u00EDtulo" }), _jsx("th", { children: "Fornecedor" }), _jsx("th", { children: "Vencimento" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "A\u00E7\u00F5es" })] }) }), _jsx("tbody", { children: documentos.map((d) => (_jsxs("tr", { children: [_jsx("td", { children: d.titulo }), _jsx("td", { children: d.fornecedor_nome }), _jsx("td", { children: d.data_vencimento || '-' }), _jsx("td", { children: d.status_calculado }), _jsxs("td", { children: [d.arquivo_url ? _jsx("a", { className: "btn btn-sm btn-outline-secondary me-2", href: d.arquivo_url, target: "_blank", rel: "noreferrer", children: "Baixar" }) : null, _jsx("button", { className: "btn btn-sm btn-danger", onClick: () => deleteDoc.mutate(d.id), children: "Remover" })] })] }, d.id))) })] }) })) : (_jsx("p", { className: "text-muted", children: "Nenhum documento encontrado." })) })] }) })] })] }));
};
export default Documentos;
