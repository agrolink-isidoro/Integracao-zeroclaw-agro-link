import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import ModalForm from '../common/ModalForm';
import comercialService from '../../services/comercial';
const ContratoFinanceiroForm = ({ isOpen, onClose, onSubmit, initialData }) => {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('identificacao');
    const [formData, setFormData] = useState({
        // TAB 1: Identificação
        numero_contrato: '',
        titulo: '',
        status: 'ativo',
        data_contratacao: '',
        data_vigencia: '',
        data_termino: '',
        observacoes: '',
        // TAB 2: Produto Financeiro
        produto_financeiro: 'seguro', // seguro | aplicacao | consorcio
        // SEGURO
        tipo_seguro: '',
        culturas_cobertas: '',
        cobertura_percentual: '',
        premio: '',
        limite_indenizacao: '',
        numero_apolice: '',
        seguradora: '',
        // APLICAÇÃO
        tipo_aplicacao: '', // CDB | LCI | Fundo
        valor_aplicado: '',
        taxa_juros: '',
        prazo_meses: '',
        data_resgate: '',
        rendimento_estimado: '',
        banco: '',
        // CONSÓRCIO
        bem_consortiado: '',
        valor_carta: '',
        numero_parcelas: '',
        valor_parcela: '',
        fundo_reserva_percentual: '',
        numero_consorcio: '',
        data_saida: '',
        administradora: '',
        reajuste_anual: false,
        inflacao_media_percentual: '',
        // TAB 3: Beneficiário
        pessoa_juridica: '',
        cpf_cnpj: '',
        email: '',
        telefone: '',
        conta_deposito: '',
        banco_deposito: '',
        responsavel_pagamento: '',
    });
    const [documentos, setDocumentos] = useState([]);
    const [contas, setContas] = useState([]);
    const [contasSearchQuery, setContasSearchQuery] = useState('');
    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                numero_contrato: initialData.numero_contrato || '',
                titulo: initialData.titulo || '',
                status: initialData.status || 'ativo',
                data_contratacao: initialData.data_contratacao || '',
                data_vigencia: initialData.data_vigencia || '',
                data_termino: initialData.data_termino || '',
                observacoes: initialData.observacoes || '',
                produto_financeiro: initialData.produto_financeiro || 'seguro',
                tipo_seguro: initialData.tipo_seguro || '',
                culturas_cobertas: initialData.culturas_cobertas || '',
                cobertura_percentual: String(initialData.cobertura_percentual || ''),
                premio: String(initialData.premio || ''),
                limite_indenizacao: String(initialData.limite_indenizacao || ''),
                numero_apolice: initialData.numero_apolice || '',
                seguradora: initialData.seguradora || '',
                valor_aplicado: String(initialData.valor_aplicado || ''),
                taxa_juros: String(initialData.taxa_juros || ''),
                prazo_meses: String(initialData.prazo_meses || ''),
                banco: initialData.banco || '',
                cpf_cnpj: initialData.cpf_cnpj || '',
                email: initialData.email || '',
                telefone: initialData.telefone || '',
            }));
        }
    }, [initialData]);
    // Carregar contas ao abrir o modal ou quando a busca muda
    useEffect(() => {
        if (!isOpen)
            return;
        const carregarContas = async () => {
            try {
                const dados = await comercialService.getContas(contasSearchQuery || undefined);
                setContas(Array.isArray(dados) ? dados : []);
            }
            catch (error) {
                console.error('Erro ao carregar contas:', error);
                setContas([]);
            }
        };
        // Debounce na busca
        const timeoutId = setTimeout(carregarContas, 300);
        return () => clearTimeout(timeoutId);
    }, [isOpen, contasSearchQuery]);
    const set = (field, value) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };
            // Auto-calcular rendimento para aplicações financeiras
            if (field === 'valor_aplicado' || field === 'taxa_juros' || field === 'prazo_meses') {
                if (formData.produto_financeiro === 'aplicacao' && updated.valor_aplicado && updated.taxa_juros && updated.prazo_meses) {
                    const valorAplicado = parseFloat(updated.valor_aplicado) || 0;
                    const taxaAnual = parseFloat(updated.taxa_juros) || 0;
                    const meses = parseFloat(updated.prazo_meses) || 0;
                    // Cálculo simples de rendimento: (valor * taxa% * meses) / 12
                    const rendimento = (valorAplicado * (taxaAnual / 100) * meses) / 12;
                    updated.rendimento_estimado = rendimento.toFixed(2);
                }
            }
            return updated;
        });
    };
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
                premio: parseFloat(formData.premio) || 0,
                valor_aplicado: parseFloat(formData.valor_aplicado) || 0,
                valor_carta: parseFloat(formData.valor_carta) || 0,
                partes: [{ tipo_parte: 'beneficiario', entidade_id: 1, papel_contrato: 'beneficiario' }],
                documento: documentos.length > 0 ? documentos[0] : null,
            };
            await onSubmit(submitData);
            onClose();
        }
        catch (error) {
            console.error('Erro ao salvar financeiro:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const tabs = [
        { id: 'identificacao', label: 'Identificação', icon: 'bi-file-earmark-text' },
        { id: 'produto', label: 'Produto Financeiro', icon: 'bi-bank2' },
        { id: 'beneficiario', label: 'Beneficiário', icon: 'bi-person-check' },
        { id: 'documentos', label: 'Documentos', icon: 'bi-paperclip' },
    ];
    return (_jsx(ModalForm, { isOpen: isOpen, title: "Novo Contrato - Financeiro", onClose: onClose, size: "lg", children: _jsxs("form", { onSubmit: handleSubmit, children: [_jsx("div", { className: "border-bottom mb-3", children: _jsx("nav", { className: "d-flex overflow-auto", children: tabs.map((tab) => (_jsxs("button", { type: "button", onClick: () => setActiveTab(tab.id), className: `py-2 px-3 border-bottom border-2 fw-medium text-nowrap me-1 btn btn-link text-decoration-none ${activeTab === tab.id ? 'border-warning text-warning' : 'border-transparent text-muted'}`, style: { background: 'none' }, children: [_jsx("i", { className: `bi ${tab.icon} me-2` }), tab.label] }, tab.id))) }) }), _jsxs("div", { style: { minHeight: '400px' }, children: [activeTab === 'identificacao' && (_jsxs("div", { children: [_jsxs("h6", { className: "text-warning mb-3", children: [_jsx("i", { className: "bi bi-file-earmark-text me-2" }), "Identifica\u00E7\u00E3o do Contrato Financeiro"] }), _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { className: "form-label", children: "N\u00FAmero do Contrato *" }), _jsx("input", { type: "text", className: "form-control", value: formData.numero_contrato, onChange: e => set('numero_contrato', e.target.value), required: true })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "T\u00EDtulo *" }), _jsx("input", { type: "text", className: "form-control", placeholder: "Ex: Seguro de Safra - Soja 2024", value: formData.titulo, onChange: e => set('titulo', e.target.value), required: true })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { className: "form-label", children: "Status" }), _jsxs("select", { className: "form-select", value: formData.status, onChange: e => set('status', e.target.value), children: [_jsx("option", { value: "rascunho", children: "Rascunho" }), _jsx("option", { value: "ativo", children: "Ativo" }), _jsx("option", { value: "cancelado", children: "Cancelado" }), _jsx("option", { value: "encerrado", children: "Encerrado" })] })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-4", children: [_jsx("label", { className: "form-label", children: "Data de Contrata\u00E7\u00E3o *" }), _jsx("input", { type: "date", className: "form-control", value: formData.data_contratacao, onChange: e => set('data_contratacao', e.target.value), required: true })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-4", children: [_jsx("label", { className: "form-label", children: "Data de Vig\u00EAncia" }), _jsx("input", { type: "date", className: "form-control", value: formData.data_vigencia, onChange: e => set('data_vigencia', e.target.value) })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-4", children: [_jsx("label", { className: "form-label", children: "Data de T\u00E9rmino" }), _jsx("input", { type: "date", className: "form-control", value: formData.data_termino, onChange: e => set('data_termino', e.target.value) })] }), _jsxs("div", { className: "col-12", children: [_jsx("label", { className: "form-label", children: "Observa\u00E7\u00F5es" }), _jsx("textarea", { className: "form-control", rows: 2, placeholder: "Notas gerais...", value: formData.observacoes, onChange: e => set('observacoes', e.target.value) })] })] })] })), activeTab === 'produto' && (_jsxs("div", { children: [_jsxs("h6", { className: "text-warning mb-3", children: [_jsx("i", { className: "bi bi-bank2 me-2" }), "Especifica\u00E7\u00F5es do Produto Financeiro"] }), _jsx("div", { className: "row g-2 g-md-3 mb-3 pb-3 border-bottom", children: _jsxs("div", { className: "col-12", children: [_jsx("label", { className: "form-label", children: "Tipo de Produto Financeiro *" }), _jsx("div", { className: "d-flex gap-2 flex-wrap", children: ['seguro', 'aplicacao', 'consorcio'].map((type) => (_jsxs("button", { type: "button", className: `btn btn-sm ${formData.produto_financeiro === type
                                                        ? 'btn-warning'
                                                        : 'btn-outline-secondary'}`, onClick: () => set('produto_financeiro', type), children: [_jsx("i", { className: `bi ${type === 'seguro' ? 'bi-shield-check' :
                                                                type === 'aplicacao' ? 'bi-graph-up' :
                                                                    'bi-diagram-3'} me-1` }), type === 'seguro' ? 'Seguro' : type === 'aplicacao' ? 'Aplicação' : 'Consórcio'] }, type))) })] }) }), formData.produto_financeiro === 'seguro' && (_jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Tipo de Seguro *" }), _jsxs("select", { className: "form-select", value: formData.tipo_seguro, onChange: e => set('tipo_seguro', e.target.value), required: true, children: [_jsx("option", { value: "", children: "Selecione" }), _jsx("option", { value: "agricola", children: "Seguro Agr\u00EDcola" }), _jsx("option", { value: "vida", children: "Seguro de Vida" }), _jsx("option", { value: "equipamentos", children: "Seguro de Equipamentos" }), _jsx("option", { value: "responsabilidade", children: "Seguro de Responsabilidade" })] })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Seguradora" }), _jsx("input", { type: "text", className: "form-control", placeholder: "Ex: HDI, Zurich, Allianz", value: formData.seguradora, onChange: e => set('seguradora', e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Culturas Cobertas" }), _jsx("input", { type: "text", className: "form-control", placeholder: "Ex: Soja, Milho, Trigo", value: formData.culturas_cobertas, onChange: e => set('culturas_cobertas', e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Cobertura (%)" }), _jsx("input", { type: "number", className: "form-control", step: "0.01", placeholder: "Ex: 80.00", value: formData.cobertura_percentual, onChange: e => set('cobertura_percentual', e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Pr\u00EAmio (R$) *" }), _jsx("input", { type: "number", className: "form-control", step: "0.01", placeholder: "Ex: 5000.00", value: formData.premio, onChange: e => set('premio', e.target.value), required: true })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Limite de Indeniza\u00E7\u00E3o (R$)" }), _jsx("input", { type: "number", className: "form-control", step: "0.01", placeholder: "Ex: 100000.00", value: formData.limite_indenizacao, onChange: e => set('limite_indenizacao', e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "N\u00FAmero da Ap\u00F3lice" }), _jsx("input", { type: "text", className: "form-control", value: formData.numero_apolice, onChange: e => set('numero_apolice', e.target.value) })] })] })), formData.produto_financeiro === 'aplicacao' && (_jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Tipo de Aplica\u00E7\u00E3o *" }), _jsxs("select", { className: "form-select", value: formData.tipo_aplicacao, onChange: e => set('tipo_aplicacao', e.target.value), required: true, children: [_jsx("option", { value: "", children: "Selecione" }), _jsx("option", { value: "CDB", children: "CDB - Certificado de Dep\u00F3sito Banc\u00E1rio" }), _jsx("option", { value: "LCI", children: "LCI - Letra de Cr\u00E9dito Imobili\u00E1rio" }), _jsx("option", { value: "Fundo", children: "Fundo de Investimento" })] })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Banco / Institui\u00E7\u00E3o" }), _jsx("input", { type: "text", className: "form-control", placeholder: "Ex: Banco do Brasil, Ita\u00FA, Caixa", value: formData.banco, onChange: e => set('banco', e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Valor Aplicado (R$) *" }), _jsx("input", { type: "number", className: "form-control", step: "0.01", placeholder: "Ex: 50000.00", value: formData.valor_aplicado, onChange: e => set('valor_aplicado', e.target.value), required: true })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Taxa de Juros (% a.a.) *" }), _jsx("input", { type: "number", className: "form-control", step: "0.01", placeholder: "Ex: 10.50", value: formData.taxa_juros, onChange: e => set('taxa_juros', e.target.value), required: true })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Prazo (meses) *" }), _jsx("input", { type: "number", className: "form-control", placeholder: "Ex: 12", value: formData.prazo_meses, onChange: e => set('prazo_meses', e.target.value), required: true })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Data de Resgate" }), _jsx("input", { type: "date", className: "form-control", value: formData.data_resgate, onChange: e => set('data_resgate', e.target.value) })] }), _jsxs("div", { className: "col-12", children: [_jsx("label", { className: "form-label", children: "Rendimento Estimado (R$)" }), _jsx("input", { type: "number", className: "form-control", step: "0.01", placeholder: "Calculado automaticamente", value: formData.rendimento_estimado, onChange: e => set('rendimento_estimado', e.target.value), disabled: true, title: "Calculado automaticamente a partir da taxa de juros, valor aplicado e prazo" }), _jsx("small", { className: "text-muted", children: "Atualizado automaticamente baseado na taxa de juros e prazo" })] })] })), formData.produto_financeiro === 'consorcio' && (_jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Bem Consortiado *" }), _jsx("input", { type: "text", className: "form-control", placeholder: "Ex: Trator, Colheitadeira, Caminh\u00E3o", value: formData.bem_consortiado, onChange: e => set('bem_consortiado', e.target.value), required: true })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Administradora" }), _jsx("input", { type: "text", className: "form-control", placeholder: "Ex: Bradescon, Uniconsorcios", value: formData.administradora, onChange: e => set('administradora', e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Valor da Carta (R$) *" }), _jsx("input", { type: "number", className: "form-control", step: "0.01", placeholder: "Ex: 250000.00", value: formData.valor_carta, onChange: e => set('valor_carta', e.target.value), required: true })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "N\u00FAmero do Cons\u00F3rcio" }), _jsx("input", { type: "text", className: "form-control", value: formData.numero_consorcio, onChange: e => set('numero_consorcio', e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-4", children: [_jsx("label", { className: "form-label", children: "N\u00FAmero de Parcelas *" }), _jsx("input", { type: "number", className: "form-control", min: "6", max: "200", placeholder: "Ex: 60", value: formData.numero_parcelas, onChange: e => set('numero_parcelas', e.target.value), required: true })] }), _jsxs("div", { className: "col-12 col-md-4", children: [_jsx("label", { className: "form-label", children: "Valor da Parcela (R$)" }), _jsx("input", { type: "number", className: "form-control", step: "0.01", placeholder: "Ex: 4166.67", value: formData.valor_parcela, onChange: e => set('valor_parcela', e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-4", children: [_jsx("label", { className: "form-label", children: "Fundo de Reserva (%)" }), _jsx("input", { type: "number", className: "form-control", step: "0.01", placeholder: "Ex: 10.00", value: formData.fundo_reserva_percentual, onChange: e => set('fundo_reserva_percentual', e.target.value) })] }), _jsx("div", { className: "col-12", children: _jsxs("div", { className: "form-check", children: [_jsx("input", { className: "form-check-input", type: "checkbox", id: "reajuste-anual-check", checked: formData.reajuste_anual, onChange: e => set('reajuste_anual', e.target.checked) }), _jsx("label", { className: "form-check-label", htmlFor: "reajuste-anual-check", children: "Incluir Reajuste Anual" })] }) }), formData.reajuste_anual && (_jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Infla\u00E7\u00E3o M\u00E9dia Anual (%)" }), _jsx("input", { type: "number", className: "form-control", step: "0.01", placeholder: "Ex: 6.50", value: formData.inflacao_media_percentual, onChange: e => set('inflacao_media_percentual', e.target.value) }), _jsx("small", { className: "text-muted", children: "Utilizada para reajustar valor da carta anualmente" })] })), _jsxs("div", { className: "col-12", children: [_jsx("label", { className: "form-label", children: "Data de Sa\u00EDda / Contempla\u00E7\u00E3o" }), _jsx("input", { type: "date", className: "form-control", value: formData.data_saida, onChange: e => set('data_saida', e.target.value) })] })] }))] })), activeTab === 'beneficiario' && (_jsxs("div", { children: [_jsxs("h6", { className: "text-warning mb-3", children: [_jsx("i", { className: "bi bi-person-check me-2" }), "Dados do Benefici\u00E1rio"] }), _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Nome / Pessoa Jur\u00EDdica *" }), _jsx("input", { type: "text", className: "form-control", placeholder: "Ex: Jo\u00E3o Silva ou Empresa LTDA", value: formData.pessoa_juridica, onChange: e => set('pessoa_juridica', e.target.value), required: true })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "CPF / CNPJ *" }), _jsx("input", { type: "text", className: "form-control", placeholder: "Ex: 000.000.000-00 ou 00.000.000/0000-00", value: formData.cpf_cnpj, onChange: e => set('cpf_cnpj', e.target.value), required: true })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "E-mail" }), _jsx("input", { type: "email", className: "form-control", placeholder: "Ex: email@example.com", value: formData.email, onChange: e => set('email', e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Telefone" }), _jsx("input", { type: "tel", className: "form-control", placeholder: "Ex: (11) 98765-4321", value: formData.telefone, onChange: e => set('telefone', e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Banco" }), _jsx("input", { type: "text", className: "form-control", placeholder: "Ex: Banco do Brasil, Ita\u00FA, Caixa", value: formData.banco_deposito, onChange: e => set('banco_deposito', e.target.value), list: "bancos-list" }), _jsxs("datalist", { id: "bancos-list", children: [_jsx("option", { value: "Banco do Brasil" }), _jsx("option", { value: "Ita\u00FA" }), _jsx("option", { value: "Caixa Econ\u00F4mica" }), _jsx("option", { value: "Bradesco" })] })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "N\u00FAmero da Conta para Dep\u00F3sito" }), _jsx("input", { type: "text", className: "form-control", placeholder: "Ex: 12345-67 ou buscar conta cadastrada", value: formData.conta_deposito, onChange: e => {
                                                        set('conta_deposito', e.target.value);
                                                        setContasSearchQuery(e.target.value);
                                                    }, list: "contas-list" }), _jsx("datalist", { id: "contas-list", children: contas.map((c) => (_jsxs("option", { value: `${c.conta}-${c.agencia} (${c.banco})`, children: [c.conta, "-", c.agencia, " (", c.banco, ")"] }, c.id))) }), _jsx("small", { className: "text-muted", children: "Digite para buscar conta no m\u00F3dulo financeiro" })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Respons\u00E1vel pelo Pagamento" }), _jsx("input", { type: "text", className: "form-control", value: formData.responsavel_pagamento, onChange: e => set('responsavel_pagamento', e.target.value) })] })] })] })), activeTab === 'documentos' && (_jsxs("div", { children: [_jsxs("h6", { className: "text-warning mb-3", children: [_jsx("i", { className: "bi bi-paperclip me-2" }), "Documenta\u00E7\u00E3o"] }), _jsxs("div", { className: "row g-3", children: [_jsx("div", { className: "col-12", children: _jsxs("div", { className: "border border-dashed rounded p-3 bg-light text-center", children: [_jsxs("label", { htmlFor: "financeiro-file-upload", className: "btn btn-outline-warning mb-2", style: { cursor: 'pointer' }, children: [_jsx("i", { className: "bi bi-cloud-upload me-2" }), "Selecionar Arquivos"] }), _jsx("input", { id: "financeiro-file-upload", type: "file", multiple: true, onChange: handleFileChange, className: "d-none", accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png" }), _jsx("p", { className: "text-muted mb-0 small", children: "Contrato, Ap\u00F3lice, Aditivos, Comprovantes (PDF, DOC, DOCX, JPG, PNG)" })] }) }), documentos.length > 0 && (_jsx("div", { className: "col-12", children: _jsx("div", { className: "list-group", children: documentos.map((doc, index) => (_jsxs("div", { className: "list-group-item d-flex justify-content-between align-items-center", children: [_jsxs("div", { className: "d-flex align-items-center", children: [_jsx("i", { className: "bi bi-file-earmark-text text-warning me-2 fs-5" }), _jsxs("div", { children: [_jsx("div", { className: "fw-medium", children: doc.name }), _jsxs("small", { className: "text-muted", children: [(doc.size / 1024).toFixed(1), " KB"] })] })] }), _jsx("button", { type: "button", className: "btn btn-sm btn-outline-danger", onClick: () => removeDocumento(index), children: _jsx("i", { className: "bi bi-trash" }) })] }, index))) }) }))] })] }))] }), _jsxs("div", { className: "d-flex justify-content-end gap-2 pt-4 border-top mt-3", children: [_jsxs("button", { type: "button", className: "btn btn-outline-secondary", onClick: onClose, disabled: loading, children: [_jsx("i", { className: "bi bi-x-circle me-1" }), " Cancelar"] }), _jsxs("button", { type: "submit", className: "btn btn-warning", disabled: loading, children: [_jsx("i", { className: "bi bi-check-circle me-1" }), loading ? 'Salvando...' : 'Salvar Financeiro'] })] })] }) }));
};
export default ContratoFinanceiroForm;
