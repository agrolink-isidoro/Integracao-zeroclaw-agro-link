import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import ModalForm from '../common/ModalForm';
import comercialService from '../../services/comercial';
const ContratoVendaForm = ({ isOpen, onClose, onSubmit, initialData }) => {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('identificacao');
    const [formData, setFormData] = useState({
        // TAB 1: Identificação
        numero_contrato: '',
        titulo: '',
        cliente_id: '',
        status: 'ativo',
        data_inicio: '',
        data_entrega_prevista: '',
        observacoes: '',
        // TAB 2: Produto
        cultura: '', // ABERTO para qualquer tipo
        variedade_cultivar: '', // OPCIONAL
        quantidade: '',
        unidade_medida: 'sc', // Sacas, Toneladas, Caixas, Quilogramas, Punhados, Unidades
        preco_unitario: '',
        valor_total: '',
        qualidade_esperada: '',
        local_entrega: '',
        // TAB 3: Pagamento
        forma_pagamento: 'a_vista', // À Vista, Parcelado, Antecipado, Sobre Rodas, Entrega Indústria, Futuro Pós, Futuro Pré
        numero_parcelas: '1',
        periodicidade_parcela: 'mensal',
        primeira_data_vencimento: '',
        desconto_percentual: '',
        comissao_percentual: '',
        rastrear_comissao: false,
        // TAB 4: Entrega
        tipo_entrega: 'fob', // FOB (Comprador Busca), CIF (Vendedor Entrega)
        fazenda_origem: '',
        cultura_colheita: '',
        tipo_colheita: '', // Colheita Completa, Silo Bolsa, Contrato Indústria
        peso_estimado: '',
        custos_armazenagem: '',
        custos_frete: '',
        responsavel_frete: 'vendedor', // Vendedor ou Comprador
    });
    const [documentos, setDocumentos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [clientesSearchQuery, setClientesSearchQuery] = useState('');
    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                numero_contrato: initialData.numero_contrato || '',
                titulo: initialData.titulo || '',
                cliente_id: String(initialData.cliente || initialData.cliente_id || ''),
                status: initialData.status || 'ativo',
                data_inicio: initialData.data_inicio || '',
                data_entrega_prevista: initialData.data_entrega_prevista || '',
                observacoes: initialData.observacoes || '',
                cultura: initialData.cultura || '',
                variedade_cultivar: initialData.variedade_cultivar || '',
                quantidade: String(initialData.quantidade || ''),
                unidade_medida: initialData.unidade_medida || 'sc',
                preco_unitario: String(initialData.preco_unitario || ''),
                valor_total: String(initialData.valor_total || ''),
                qualidade_esperada: initialData.qualidade_esperada || '',
                local_entrega: initialData.local_entrega || '',
                forma_pagamento: initialData.forma_pagamento || 'a_vista',
                tipo_entrega: initialData.tipo_entrega || 'fob',
            }));
        }
    }, [initialData]);
    // Carregar clientes ao abrir o modal ou quando a busca muda
    useEffect(() => {
        if (!isOpen)
            return;
        const carregarClientes = async () => {
            try {
                const dados = await comercialService.getClientes(clientesSearchQuery || undefined);
                setClientes(Array.isArray(dados) ? dados : []);
            }
            catch (error) {
                console.error('Erro ao carregar clientes:', error);
                setClientes([]);
            }
        };
        // Debounce na busca
        const timeoutId = setTimeout(carregarClientes, 300);
        return () => clearTimeout(timeoutId);
    }, [isOpen, clientesSearchQuery]);
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
                partes: [{ tipo_parte: 'cliente', entidade_id: 1, papel_contrato: 'comprador' }],
                itens: [],
                documento: documentos.length > 0 ? documentos[0] : null,
            };
            await onSubmit(submitData);
            onClose();
        }
        catch (error) {
            console.error('Erro ao salvar venda:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const tabs = [
        { id: 'identificacao', label: 'Identificação', icon: 'bi-file-earmark-text' },
        { id: 'produto', label: 'Produto/Colheita', icon: 'bi-box-seam' },
        { id: 'pagamento', label: 'Pagamento', icon: 'bi-credit-card' },
        { id: 'entrega', label: 'Tipo de Entrega', icon: 'bi-truck' },
        { id: 'documentos', label: 'Documentos', icon: 'bi-paperclip' },
    ];
    return (_jsx(ModalForm, { isOpen: isOpen, title: "Novo Contrato - Venda de Produtos", onClose: onClose, size: "xl", children: _jsxs("form", { onSubmit: handleSubmit, children: [_jsx("div", { className: "border-bottom mb-3", children: _jsx("nav", { className: "d-flex overflow-auto", children: tabs.map((tab) => (_jsxs("button", { type: "button", onClick: () => setActiveTab(tab.id), className: `py-2 px-3 border-bottom border-2 fw-medium text-nowrap me-1 btn btn-link text-decoration-none ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted'}`, style: { background: 'none' }, children: [_jsx("i", { className: `bi ${tab.icon} me-2` }), tab.label] }, tab.id))) }) }), _jsxs("div", { style: { minHeight: '400px' }, children: [activeTab === 'identificacao' && (_jsxs("div", { children: [_jsxs("h6", { className: "text-primary mb-3", children: [_jsx("i", { className: "bi bi-file-earmark-text me-2" }), "Identifica\u00E7\u00E3o da Venda"] }), _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { className: "form-label", children: "N\u00FAmero do Contrato *" }), _jsx("input", { type: "text", className: "form-control", value: formData.numero_contrato, onChange: e => set('numero_contrato', e.target.value), required: true })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "T\u00EDtulo *" }), _jsx("input", { type: "text", className: "form-control", placeholder: "Ex: Venda de Soja Safra 2025/2026", value: formData.titulo, onChange: e => set('titulo', e.target.value), required: true })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { className: "form-label", children: "Status" }), _jsxs("select", { className: "form-select", value: formData.status, onChange: e => set('status', e.target.value), children: [_jsx("option", { value: "rascunho", children: "Rascunho" }), _jsx("option", { value: "ativo", children: "Ativo" }), _jsx("option", { value: "encerrado", children: "Encerrado" }), _jsx("option", { value: "cancelado", children: "Cancelado" })] })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-6", children: [_jsx("label", { className: "form-label", children: "Cliente *" }), _jsx("input", { type: "text", className: "form-control", placeholder: "Buscar cliente cadastrado...", value: formData.cliente_id, onChange: e => {
                                                        set('cliente_id', e.target.value);
                                                        setClientesSearchQuery(e.target.value);
                                                    }, required: true, list: "clientes-list" }), _jsx("datalist", { id: "clientes-list", children: clientes.map((c) => (_jsx("option", { value: c.nome_fantasia || c.razao_social || c.nome_completo || '', children: c.nome_fantasia || c.razao_social || c.nome_completo }, c.id))) }), _jsx("small", { className: "text-muted", children: "Digite para buscar cliente no sistema" })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { className: "form-label", children: "Data de In\u00EDcio *" }), _jsx("input", { type: "date", className: "form-control", value: formData.data_inicio, onChange: e => set('data_inicio', e.target.value), required: true })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-6", children: [_jsx("label", { className: "form-label", children: "Data Prevista de Entrega" }), _jsx("input", { type: "date", className: "form-control", value: formData.data_entrega_prevista, onChange: e => set('data_entrega_prevista', e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Observa\u00E7\u00F5es" }), _jsx("textarea", { className: "form-control", rows: 2, placeholder: "Notas gerais sobre a venda...", value: formData.observacoes, onChange: e => set('observacoes', e.target.value) })] })] })] })), activeTab === 'produto' && (_jsxs("div", { children: [_jsxs("h6", { className: "text-primary mb-3", children: [_jsx("i", { className: "bi bi-box-seam me-2" }), "Produto/Colheita"] }), _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Cultura/Produto *" }), _jsx("input", { type: "text", className: "form-control", placeholder: "Ex: Soja, Milho, Alface, Tomate, Ma\u00E7\u00E3, Banana, Ab\u00F3bora, Horti-fruti...", value: formData.cultura, onChange: e => set('cultura', e.target.value), required: true }), _jsx("small", { className: "text-muted", children: "Qualquer tipo de cultura (gr\u00E3os, horti-fruti, frutas, etc)" })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { className: "form-label", children: ["Variedade/Cultivar ", _jsx("span", { className: "text-muted", children: "(Opcional)" })] }), _jsx("input", { type: "text", className: "form-control", placeholder: "Ex: M6410 IPRO, Salateira, Gala, Braeburn...", value: formData.variedade_cultivar, onChange: e => set('variedade_cultivar', e.target.value) }), _jsx("small", { className: "text-muted", children: "Campo opcional" })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-4", children: [_jsx("label", { className: "form-label", children: "Quantidade *" }), _jsx("input", { type: "number", className: "form-control", step: "0.001", placeholder: "Ex: 5000", value: formData.quantidade, onChange: e => set('quantidade', e.target.value), required: true })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-4", children: [_jsx("label", { className: "form-label", children: "Unidade de Medida *" }), _jsxs("select", { className: "form-select", value: formData.unidade_medida, onChange: e => set('unidade_medida', e.target.value), required: true, children: [_jsx("option", { value: "sc", children: "Sacas (60kg)" }), _jsx("option", { value: "ton", children: "Toneladas" }), _jsx("option", { value: "caixas", children: "Caixas" }), _jsx("option", { value: "kg", children: "Quilogramas" }), _jsx("option", { value: "punhados", children: "Punhados" }), _jsx("option", { value: "unidades", children: "Unidades" })] })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-4", children: [_jsx("label", { className: "form-label", children: "Valor Total (R$) *" }), _jsx("input", { type: "number", className: "form-control", step: "0.01", placeholder: "0.00", value: formData.valor_total, onChange: e => set('valor_total', e.target.value), required: true })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { className: "form-label", children: "Pre\u00E7o Unit\u00E1rio (R$)" }), _jsx("input", { type: "number", className: "form-control", step: "0.01", placeholder: "0.00", value: formData.preco_unitario, onChange: e => set('preco_unitario', e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-9", children: [_jsx("label", { className: "form-label", children: "Qualidade Esperada" }), _jsx("textarea", { className: "form-control", rows: 2, placeholder: "Ex: Umidade m\u00E1x 14%, Impurezas m\u00E1x 1%...", value: formData.qualidade_esperada, onChange: e => set('qualidade_esperada', e.target.value) })] }), _jsxs("div", { className: "col-12", children: [_jsx("label", { className: "form-label", children: "Local de Entrega" }), _jsx("input", { type: "text", className: "form-control", placeholder: "Ex: Armaz\u00E9m XYZ, Rodovia BR-163...", value: formData.local_entrega, onChange: e => set('local_entrega', e.target.value) })] })] })] })), activeTab === 'pagamento' && (_jsxs("div", { children: [_jsxs("h6", { className: "text-primary mb-3", children: [_jsx("i", { className: "bi bi-credit-card me-2" }), "Modalidade de Pagamento"] }), _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Forma de Pagamento *" }), _jsxs("select", { className: "form-select", value: formData.forma_pagamento, onChange: e => set('forma_pagamento', e.target.value), required: true, children: [_jsx("option", { value: "a_vista", children: "\u00C0 Vista" }), _jsx("option", { value: "sobre_rodas", children: "Sobre Rodas" }), _jsx("option", { value: "parcelado", children: "Parcelado (N parcelas)" }), _jsx("option", { value: "antecipado", children: "Antecipado (remove 50%)" }), _jsx("option", { value: "entrega_industria", children: "Entrega na Ind\u00FAstria" }), _jsx("option", { value: "futuro_pos", children: "Contrato Futuro P\u00F3s Fixado" }), _jsx("option", { value: "futuro_pre", children: "Contrato Futuro Pr\u00E9 Fixado" })] })] }), formData.forma_pagamento === 'antecipado' && (_jsx("div", { className: "col-12", children: _jsxs("div", { className: "alert alert-info mb-0", children: [_jsx("i", { className: "bi bi-info-circle me-2" }), _jsx("strong", { children: "Nota:" }), " Antecipado remove 50% do valor no fechamento do contrato"] }) })), (formData.forma_pagamento === 'parcelado' || formData.forma_pagamento === 'sobre_rodas') && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { className: "form-label", children: "N\u00FAmero de Parcelas *" }), _jsx("input", { type: "number", className: "form-control", min: "2", max: "12", value: formData.numero_parcelas, onChange: e => set('numero_parcelas', e.target.value) })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { className: "form-label", children: "Periodicidade" }), _jsxs("select", { className: "form-select", value: formData.periodicidade_parcela, onChange: e => set('periodicidade_parcela', e.target.value), children: [_jsx("option", { value: "semanal", children: "Semanal" }), _jsx("option", { value: "quinzenal", children: "Quinzenal" }), _jsx("option", { value: "mensal", children: "Mensal" }), _jsx("option", { value: "trimestral", children: "Trimestral" })] })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Primeira Data de Vencimento" }), _jsx("input", { type: "date", className: "form-control", value: formData.primeira_data_vencimento, onChange: e => set('primeira_data_vencimento', e.target.value) })] })] })), _jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { className: "form-label", children: "Desconto (%)" }), _jsx("input", { type: "number", className: "form-control", step: "0.01", placeholder: "0.00", value: formData.desconto_percentual, onChange: e => set('desconto_percentual', e.target.value) })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { className: "form-label", children: "Comiss\u00E3o Vendedor (%)" }), _jsx("input", { type: "number", className: "form-control", step: "0.01", placeholder: "0.00", value: formData.comissao_percentual, onChange: e => set('comissao_percentual', e.target.value) })] }), _jsx("div", { className: "col-12", children: _jsxs("div", { className: "form-check", children: [_jsx("input", { type: "checkbox", className: "form-check-input", id: "rastrear-comissao", checked: formData.rastrear_comissao, onChange: e => set('rastrear_comissao', e.target.checked) }), _jsx("label", { className: "form-check-label", htmlFor: "rastrear-comissao", children: "Rastrear Comiss\u00E3o de Vendedor" })] }) })] })] })), activeTab === 'entrega' && (_jsxs("div", { children: [_jsxs("h6", { className: "text-primary mb-3", children: [_jsx("i", { className: "bi bi-truck me-2" }), "Tipo de Entrega"] }), _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12", children: [_jsx("label", { className: "form-label", children: "Incoterm / Tipo de Entrega *" }), _jsxs("div", { className: "d-flex gap-2", children: [_jsxs("button", { type: "button", className: `btn btn-sm ${formData.tipo_entrega === 'fob' ? 'btn-warning' : 'btn-outline-secondary'}`, onClick: () => set('tipo_entrega', 'fob'), children: [_jsx("i", { className: "bi bi-box me-1" }), "FOB (Comprador Busca)"] }), _jsxs("button", { type: "button", className: `btn btn-sm ${formData.tipo_entrega === 'cif' ? 'btn-warning' : 'btn-outline-secondary'}`, onClick: () => set('tipo_entrega', 'cif'), children: [_jsx("i", { className: "bi bi-truck me-1" }), "CIF (Vendedor Entrega)"] })] }), _jsx("small", { className: "text-muted d-block mt-2", children: formData.tipo_entrega === 'fob' ? 'Comprador é responsável por buscar e pagar o frete.' : 'Vendedor é responsável pela entrega e absorve custos de frete.' })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Fazenda de Origem" }), _jsx("input", { type: "text", className: "form-control", placeholder: "Nome ou identifica\u00E7\u00E3o da fazenda", value: formData.fazenda_origem, onChange: e => set('fazenda_origem', e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Cultura da Colheita" }), _jsx("input", { type: "text", className: "form-control", placeholder: "Ex: Soja, Milho...", value: formData.cultura_colheita, onChange: e => set('cultura_colheita', e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Tipo de Colheita" }), _jsxs("select", { className: "form-select", value: formData.tipo_colheita, onChange: e => set('tipo_colheita', e.target.value), children: [_jsx("option", { value: "", children: "Selecione" }), _jsx("option", { value: "completa", children: "Colheita Completa c/ Pesagem" }), _jsx("option", { value: "silo_bolsa", children: "Silo Bolsa (armazenagem)" }), _jsx("option", { value: "contrato_industria", children: "Contrato Ind\u00FAstria" })] })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Peso Estimado" }), _jsx("input", { type: "number", className: "form-control", step: "0.001", placeholder: "Ex: 5000", value: formData.peso_estimado, onChange: e => set('peso_estimado', e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Custos de Armazenagem (R$)" }), _jsx("input", { type: "number", className: "form-control", step: "0.01", placeholder: "0.00", value: formData.custos_armazenagem, onChange: e => set('custos_armazenagem', e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Custos de Frete (R$)" }), _jsx("input", { type: "number", className: "form-control", step: "0.01", placeholder: "0.00", value: formData.custos_frete, onChange: e => set('custos_frete', e.target.value) })] }), _jsxs("div", { className: "col-12", children: [_jsx("label", { className: "form-label", children: "Respons\u00E1vel pelo Frete" }), _jsx("select", { className: "form-select", value: formData.responsavel_frete, disabled: true, title: formData.tipo_entrega === 'fob' ? 'Automaticamente selecionado: Comprador paga' : 'Automaticamente selecionado: Vendedor absorve', children: _jsx("option", { value: formData.tipo_entrega === 'fob' ? 'comprador' : 'vendedor', children: formData.tipo_entrega === 'fob' ? 'Comprador (Paga frete)' : 'Vendedor (Absorve custo)' }) }), _jsx("small", { className: "text-muted", children: "Preenchido automaticamente baseado no incoterm selecionado" })] })] })] })), activeTab === 'documentos' && (_jsxs("div", { children: [_jsxs("h6", { className: "text-primary mb-3", children: [_jsx("i", { className: "bi bi-paperclip me-2" }), "Documenta\u00E7\u00E3o"] }), _jsxs("div", { className: "row g-3", children: [_jsx("div", { className: "col-12", children: _jsxs("div", { className: "border border-dashed rounded p-3 bg-light text-center", children: [_jsxs("label", { htmlFor: "venda-file-upload", className: "btn btn-outline-primary mb-2", style: { cursor: 'pointer' }, children: [_jsx("i", { className: "bi bi-cloud-upload me-2" }), "Selecionar Arquivos"] }), _jsx("input", { id: "venda-file-upload", type: "file", multiple: true, onChange: handleFileChange, className: "d-none", accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png" }), _jsx("p", { className: "text-muted mb-0 small", children: "NF-e, Contrato, Anexos (PDF, DOC, DOCX, JPG, PNG)" })] }) }), documentos.length > 0 && (_jsx("div", { className: "col-12", children: _jsx("div", { className: "list-group", children: documentos.map((doc, index) => (_jsxs("div", { className: "list-group-item d-flex justify-content-between align-items-center", children: [_jsxs("div", { className: "d-flex align-items-center", children: [_jsx("i", { className: "bi bi-file-earmark-text text-primary me-2 fs-5" }), _jsxs("div", { children: [_jsx("div", { className: "fw-medium", children: doc.name }), _jsxs("small", { className: "text-muted", children: [(doc.size / 1024).toFixed(1), " KB"] })] })] }), _jsx("button", { type: "button", className: "btn btn-sm btn-outline-danger", onClick: () => removeDocumento(index), children: _jsx("i", { className: "bi bi-trash" }) })] }, index))) }) }))] })] }))] }), _jsxs("div", { className: "d-flex justify-content-end gap-2 pt-4 border-top mt-3", children: [_jsxs("button", { type: "button", className: "btn btn-outline-secondary", onClick: onClose, disabled: loading, children: [_jsx("i", { className: "bi bi-x-circle me-1" }), " Cancelar"] }), _jsxs("button", { type: "submit", className: "btn btn-success", disabled: loading, children: [_jsx("i", { className: "bi bi-check-circle me-1" }), loading ? 'Salvando...' : 'Salvar Venda'] })] })] }) }));
};
export default ContratoVendaForm;
