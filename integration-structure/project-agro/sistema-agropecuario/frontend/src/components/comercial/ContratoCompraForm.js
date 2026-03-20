import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import ModalForm from '../common/ModalForm';
import comercialService from '../../services/comercial';
const ContratoCompraForm = ({ isOpen, onClose, onSubmit, initialData }) => {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('identificacao');
    const [formData, setFormData] = useState({
        // TAB 1: Identificação
        numero_contrato: '',
        titulo: '',
        fornecedor_id: '',
        status: 'ativo',
        data_inicio: '',
        data_fim: '',
        observacoes: '',
        // TAB 2: Produto
        produto: '',
        quantidade: '',
        unidade_medida: 'sc',
        preco_unitario: '',
        valor_total: '',
        qualidade_especificacao: '',
        // TAB 3: Condições de Compra
        condicao_pagamento: 'dinheiro',
        prazo_entrega_dias: '',
        desconto_global_percentual: '',
        taxa_juros: '',
        barter: false,
        barter_descricao: '',
        // TAB 4: Documentos
        nfe_numero: '',
        nfe_chave: '',
    });
    const [documentos, setDocumentos] = useState([]);
    const [fornecedores, setFornecedores] = useState([]);
    const [fornecedoresSearchQuery, setFornecedoresSearchQuery] = useState('');
    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                numero_contrato: initialData.numero_contrato || '',
                titulo: initialData.titulo || '',
                fornecedor_id: String(initialData.fornecedor || initialData.fornecedor_id || ''),
                status: initialData.status || 'ativo',
                data_inicio: initialData.data_inicio || '',
                data_fim: initialData.data_fim || '',
                observacoes: initialData.observacoes || '',
                produto: initialData.produto || '',
                quantidade: String(initialData.quantidade || ''),
                unidade_medida: initialData.unidade_medida || 'sc',
                preco_unitario: String(initialData.preco_unitario || ''),
                valor_total: String(initialData.valor_total || ''),
                qualidade_especificacao: initialData.qualidade_especificacao || '',
                condicao_pagamento: initialData.condicao_pagamento || 'dinheiro',
                prazo_entrega_dias: String(initialData.prazo_entrega_dias || ''),
                desconto_global_percentual: String(initialData.desconto_global_percentual || ''),
                taxa_juros: String(initialData.taxa_juros || ''),
            }));
        }
    }, [initialData]);
    // Carregar fornecedores ao abrir o modal ou quando a busca muda
    useEffect(() => {
        if (!isOpen)
            return;
        const carregarFornecedores = async () => {
            try {
                const dados = await comercialService.getFornecedores(fornecedoresSearchQuery ? { busca: fornecedoresSearchQuery } : undefined);
                setFornecedores(Array.isArray(dados) ? dados : []);
            }
            catch (error) {
                console.error('Erro ao carregar fornecedores:', error);
                setFornecedores([]);
            }
        };
        // Fazemos debounce na busca para não fazer muitas requisições
        const timeoutId = setTimeout(carregarFornecedores, 300);
        return () => clearTimeout(timeoutId);
    }, [isOpen, fornecedoresSearchQuery]);
    const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
    const handleFileChange = (e) => {
        if (e.target.files)
            setDocumentos(prev => [...prev, ...Array.from(e.target.files)]);
    };
    const removeDocumento = (index) => setDocumentos(prev => prev.filter((_, i) => i !== index));
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const submitData = {
                ...formData,
                valor_total: parseFloat(formData.valor_total) || 0,
                partes: [{ tipo_parte: 'fornecedor', entidade_id: 1, papel_contrato: 'vendedor' }],
                itens: [],
                documento: documentos.length > 0 ? documentos[0] : null,
            };
            await onSubmit(submitData);
            onClose();
        }
        catch (error) {
            console.error('Erro ao salvar compra:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const tabs = [
        { id: 'identificacao', label: 'Identificação', icon: 'bi-file-earmark-text' },
        { id: 'produto', label: 'Produto', icon: 'bi-box-seam' },
        { id: 'condicoes', label: 'Condições de Compra', icon: 'bi-handshake' },
        { id: 'documentos', label: 'Documentos', icon: 'bi-paperclip' },
    ];
    return (_jsx(ModalForm, { isOpen: isOpen, title: "Novo Contrato - Compra", onClose: onClose, size: "lg", children: _jsxs("form", { onSubmit: handleSubmit, children: [_jsx("div", { className: "border-bottom mb-3", children: _jsx("nav", { className: "d-flex overflow-auto", children: tabs.map((tab) => (_jsxs("button", { type: "button", onClick: () => setActiveTab(tab.id), className: `py-2 px-3 border-bottom border-2 fw-medium text-nowrap me-1 btn btn-link text-decoration-none ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted'}`, style: { background: 'none' }, children: [_jsx("i", { className: `bi ${tab.icon} me-2` }), tab.label] }, tab.id))) }) }), _jsxs("div", { style: { minHeight: '350px' }, children: [activeTab === 'identificacao' && (_jsxs("div", { children: [_jsxs("h6", { className: "text-primary mb-3", children: [_jsx("i", { className: "bi bi-file-earmark-text me-2" }), "Identifica\u00E7\u00E3o da Compra"] }), _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { className: "form-label", children: "N\u00FAmero do Contrato *" }), _jsx("input", { type: "text", className: "form-control", value: formData.numero_contrato, onChange: e => set('numero_contrato', e.target.value), required: true })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "T\u00EDtulo *" }), _jsx("input", { type: "text", className: "form-control", placeholder: "Ex: Compra de Sementes de Soja", value: formData.titulo, onChange: e => set('titulo', e.target.value), required: true })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { className: "form-label", children: "Status" }), _jsxs("select", { className: "form-select", value: formData.status, onChange: e => set('status', e.target.value), children: [_jsx("option", { value: "rascunho", children: "Rascunho" }), _jsx("option", { value: "ativo", children: "Ativo" }), _jsx("option", { value: "cancelado", children: "Cancelado" }), _jsx("option", { value: "encerrado", children: "Encerrado" })] })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Fornecedor *" }), _jsx("input", { type: "text", className: "form-control", placeholder: "Buscar fornecedor cadastrado...", value: formData.fornecedor_id, onChange: e => {
                                                        set('fornecedor_id', e.target.value);
                                                        setFornecedoresSearchQuery(e.target.value);
                                                    }, required: true, list: "fornecedores-list" }), _jsx("datalist", { id: "fornecedores-list", children: fornecedores.map((f) => (_jsx("option", { value: f.nome_fantasia || f.razao_social || '', children: f.nome_fantasia || f.razao_social }, f.id))) }), _jsx("small", { className: "text-muted", children: "Digite para buscar fornecedor no sistema" })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { className: "form-label", children: "Data de In\u00EDcio *" }), _jsx("input", { type: "date", className: "form-control", value: formData.data_inicio, onChange: e => set('data_inicio', e.target.value), required: true })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Data de T\u00E9rmino" }), _jsx("input", { type: "date", className: "form-control", value: formData.data_fim, onChange: e => set('data_fim', e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Observa\u00E7\u00F5es" }), _jsx("textarea", { className: "form-control", rows: 2, placeholder: "Notas sobre a compra...", value: formData.observacoes, onChange: e => set('observacoes', e.target.value) })] })] })] })), activeTab === 'produto' && (_jsxs("div", { children: [_jsxs("h6", { className: "text-primary mb-3", children: [_jsx("i", { className: "bi bi-box-seam me-2" }), "Especifica\u00E7\u00F5es do Produto"] }), _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Produto *" }), _jsx("input", { type: "text", className: "form-control", placeholder: "Ex: Sementes de Soja, Fertilizante NPK", value: formData.produto, onChange: e => set('produto', e.target.value), required: true })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-4", children: [_jsx("label", { className: "form-label", children: "Quantidade *" }), _jsx("input", { type: "number", className: "form-control", step: "0.001", placeholder: "Ex: 1000", value: formData.quantidade, onChange: e => set('quantidade', e.target.value), required: true })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { className: "form-label", children: "Unidade *" }), _jsxs("select", { className: "form-select", value: formData.unidade_medida, onChange: e => set('unidade_medida', e.target.value), required: true, children: [_jsx("option", { value: "sc", children: "Sacas (60kg)" }), _jsx("option", { value: "ton", children: "Toneladas" }), _jsx("option", { value: "kg", children: "Quilogramas" }), _jsx("option", { value: "litros", children: "Litros" }), _jsx("option", { value: "unidade", children: "Unidades" })] })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { className: "form-label", children: "Pre\u00E7o Unit\u00E1rio (R$)" }), _jsx("input", { type: "number", className: "form-control", step: "0.01", placeholder: "Ex: 125.50", value: formData.preco_unitario, onChange: e => set('preco_unitario', e.target.value) })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { className: "form-label", children: "Valor Total (R$) *" }), _jsx("input", { type: "number", className: "form-control", step: "0.01", value: formData.valor_total, onChange: e => set('valor_total', e.target.value), required: true })] }), _jsxs("div", { className: "col-12", children: [_jsx("label", { className: "form-label", children: "Especifica\u00E7\u00E3o de Qualidade" }), _jsx("input", { type: "text", className: "form-control", placeholder: "Ex: Pureza m\u00EDnima 99%, Germina\u00E7\u00E3o m\u00EDnima 90%", value: formData.qualidade_especificacao, onChange: e => set('qualidade_especificacao', e.target.value) })] })] })] })), activeTab === 'condicoes' && (_jsxs("div", { children: [_jsxs("h6", { className: "text-primary mb-3", children: [_jsx("i", { className: "bi bi-handshake me-2" }), "Condi\u00E7\u00F5es de Compra"] }), _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12 col-sm-6 col-md-4", children: [_jsx("label", { className: "form-label", children: "Condi\u00E7\u00E3o de Pagamento *" }), _jsxs("select", { className: "form-select", value: formData.condicao_pagamento, onChange: e => set('condicao_pagamento', e.target.value), required: true, children: [_jsx("option", { value: "dinheiro", children: "Dinheiro" }), _jsx("option", { value: "credito_30", children: "Cr\u00E9dito 30 dias" }), _jsx("option", { value: "credito_60", children: "Cr\u00E9dito 60 dias" }), _jsx("option", { value: "credito_90", children: "Cr\u00E9dito 90 dias" }), _jsx("option", { value: "parcelado", children: "Parcelado" })] })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-4", children: [_jsx("label", { className: "form-label", children: "Prazo de Entrega (dias)" }), _jsx("input", { type: "number", className: "form-control", placeholder: "Ex: 15", value: formData.prazo_entrega_dias, onChange: e => set('prazo_entrega_dias', e.target.value) })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-4", children: [_jsx("label", { className: "form-label", children: "Desconto Global (%)" }), _jsx("input", { type: "number", className: "form-control", step: "0.01", placeholder: "Ex: 5.00", value: formData.desconto_global_percentual, onChange: e => set('desconto_global_percentual', e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Taxa de Juros (% a.m.)" }), _jsx("input", { type: "number", className: "form-control", step: "0.01", placeholder: "Ex: 2.00", value: formData.taxa_juros, onChange: e => set('taxa_juros', e.target.value) })] }), _jsx("div", { className: "col-12", children: _jsxs("div", { className: "form-check", children: [_jsx("input", { className: "form-check-input", type: "checkbox", id: "barter-check", checked: formData.barter, onChange: e => set('barter', e.target.checked) }), _jsx("label", { className: "form-check-label", htmlFor: "barter-check", children: "Esta \u00E9 uma compra com Barter (troca)" })] }) }), formData.barter && (_jsxs("div", { className: "col-12", children: [_jsx("label", { className: "form-label", children: "Descri\u00E7\u00E3o do Barter" }), _jsx("textarea", { className: "form-control", rows: 2, placeholder: "Descreva o que est\u00E1 sendo trocado...", value: formData.barter_descricao, onChange: e => set('barter_descricao', e.target.value) })] }))] })] })), activeTab === 'documentos' && (_jsxs("div", { children: [_jsxs("h6", { className: "text-primary mb-3", children: [_jsx("i", { className: "bi bi-paperclip me-2" }), "Documenta\u00E7\u00E3o"] }), _jsxs("div", { className: "row g-2 g-md-3 mb-4 pb-3 border-bottom", children: [_jsx("div", { className: "col-12", children: _jsxs("h6", { className: "text-secondary mb-3", children: [_jsx("i", { className: "bi bi-receipt me-2" }), "Vincular NFe"] }) }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "N\u00FAmero da NFe" }), _jsx("input", { type: "text", className: "form-control", placeholder: "Ex: 123456", value: formData.nfe_numero, onChange: e => set('nfe_numero', e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Chave de Acesso NFe" }), _jsx("input", { type: "text", className: "form-control", placeholder: "Ex: 35210412345678901234567890123456789012345678", value: formData.nfe_chave, onChange: e => set('nfe_chave', e.target.value) })] })] }), _jsxs("div", { className: "row g-3", children: [_jsx("div", { className: "col-12", children: _jsxs("div", { className: "border border-dashed rounded p-3 bg-light text-center", children: [_jsxs("label", { htmlFor: "compra-file-upload", className: "btn btn-outline-primary mb-2", style: { cursor: 'pointer' }, children: [_jsx("i", { className: "bi bi-cloud-upload me-2" }), "Selecionar Arquivos"] }), _jsx("input", { id: "compra-file-upload", type: "file", multiple: true, onChange: handleFileChange, className: "d-none", accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png" }), _jsx("p", { className: "text-muted mb-0 small", children: "NF-e, Contrato, Anexos (PDF, DOC, DOCX, JPG, PNG)" })] }) }), documentos.length > 0 && (_jsx("div", { className: "col-12", children: _jsx("div", { className: "list-group", children: documentos.map((doc, index) => (_jsxs("div", { className: "list-group-item d-flex justify-content-between align-items-center", children: [_jsxs("div", { className: "d-flex align-items-center", children: [_jsx("i", { className: "bi bi-file-earmark-text text-primary me-2 fs-5" }), _jsxs("div", { children: [_jsx("div", { className: "fw-medium", children: doc.name }), _jsxs("small", { className: "text-muted", children: [(doc.size / 1024).toFixed(1), " KB"] })] })] }), _jsx("button", { type: "button", className: "btn btn-sm btn-outline-danger", onClick: () => removeDocumento(index), children: _jsx("i", { className: "bi bi-trash" }) })] }, index))) }) }))] })] }))] }), _jsxs("div", { className: "d-flex justify-content-end gap-2 pt-4 border-top mt-3", children: [_jsxs("button", { type: "button", className: "btn btn-outline-secondary", onClick: onClose, disabled: loading, children: [_jsx("i", { className: "bi bi-x-circle me-1" }), " Cancelar"] }), _jsxs("button", { type: "submit", className: "btn btn-info", disabled: loading, children: [_jsx("i", { className: "bi bi-check-circle me-1" }), loading ? 'Salvando...' : 'Salvar Compra'] })] })] }) }));
};
export default ContratoCompraForm;
