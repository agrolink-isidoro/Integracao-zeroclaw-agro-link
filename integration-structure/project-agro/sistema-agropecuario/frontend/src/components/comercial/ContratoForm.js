import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Plus, X } from 'lucide-react';
import Input from '../common/Input';
import SelectDropdown from '../common/SelectDropdown';
import ModalForm from '../common/ModalForm';
import Button from '../Button';
import comercialService from '../../services/comercial';
const schema = yup.object().shape({
    numero_contrato: yup.string().required('Número do contrato é obrigatório'),
    titulo: yup.string().required('Título é obrigatório'),
    tipo_contrato: yup.string().required('Tipo de contrato é obrigatório'),
    categoria: yup.string().required('Categoria é obrigatória'),
    status: yup.string().required('Status é obrigatório'),
    valor_total: yup.number().min(0, 'Valor deve ser positivo').required('Valor total é obrigatório'),
    data_inicio: yup.string().required('Data de início é obrigatória'),
    data_fim: yup.string(),
    prazo_execucao_dias: yup.number().min(0, 'Prazo deve ser positivo'),
    observacoes: yup.string(),
});
const ContratoForm = ({ isOpen, onClose, onSubmit, contrato, loading = false }) => {
    const [activeTab, setActiveTab] = useState('dados_gerais');
    const [partes, setPartes] = useState(contrato?.partes || []);
    const [itens, setItens] = useState(contrato?.itens || []);
    const [condicoes, setCondicoes] = useState(contrato?.condicoes || []);
    const [fornecedores, setFornecedores] = useState([]);
    const [prestadores, setPrestadores] = useState([]);
    const [instituicoes, setInstituicoes] = useState([]);
    // Estados específicos para Compra
    const [compraData, setCompraData] = useState({
        fornecedor_id: 0,
        condicao_pagamento: 'dinheiro',
        prazo_entrega_dias: 0,
        desconto_global_percentual: 0,
    });
    // Estados específicos para Venda
    const [vendaData, setVendaData] = useState({
        cliente_id: 0,
        numero_parcelas: 1,
        periodicidade_parcela: 'mensal',
        rastrear_comissao: true,
        percentual_comissao: 0,
    });
    // Estados específicos para Financeiro
    const [financeiroData, setFinanceiroData] = useState({
        produto_financeiro: 'emprestimo',
        instituicao_financeira_id: 0,
        valor_entrada: 0,
        taxa_juros: 0,
        prazo_meses: 12,
        numero_parcelas: 12,
    });
    const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: contrato || {
            tipo_contrato: 'compra',
            categoria: 'insumos',
            status: 'rascunho',
            valor_total: 0,
            partes: [],
            itens: [],
            condicoes: [],
        }
    });
    // Load entities (fornecedores, prestadores, instituicoes)
    const loadEntidades = async () => {
        try {
            const [forns, prests, insts] = await Promise.all([
                comercialService.getFornecedores(),
                comercialService.getPrestadores(),
                comercialService.getInstituicoes()
            ]);
            setFornecedores(forns);
            setPrestadores(prests);
            setInstituicoes(insts);
        }
        catch (error) {
            console.error('Erro ao carregar entidades:', error);
        }
    };
    useEffect(() => {
        if (contrato) {
            Object.keys(contrato).forEach(key => {
                if (!['partes', 'itens', 'condicoes'].includes(key)) {
                    setValue(key, contrato[key]);
                }
            });
            setPartes(contrato.partes || []);
            setItens(contrato.itens || []);
            setCondicoes(contrato.condicoes || []);
        }
        loadEntidades();
    }, [contrato, setValue]);
    const handleFormSubmit = async (data) => {
        try {
            const submitData = {
                ...data,
                partes,
                itens,
                condicoes,
            };
            // Adicionar dados específicos baseado no tipo de contrato
            switch (data.tipo_contrato) {
                case 'compra':
                    submitData.compra_especifico = compraData;
                    break;
                case 'venda':
                    submitData.venda_especifico = vendaData;
                    break;
                case 'financiamento':
                    submitData.financeiro_especifico = financeiroData;
                    break;
            }
            await onSubmit(submitData);
            onClose();
        }
        catch (error) {
            console.error('Erro ao salvar contrato:', error);
        }
    };
    // Parte functions
    const addParte = () => {
        setPartes([...partes, {
                tipo_parte: 'fornecedor',
                entidade_id: 0,
                entidade_nome: '',
                entidade_tipo_pessoa: 'pj',
                entidade_cpf_cnpj: '',
                papel_contrato: 'contratante',
            }]);
    };
    const removeParte = (index) => {
        setPartes(partes.filter((_, i) => i !== index));
    };
    const updateParte = (index, field, value) => {
        const updated = [...partes];
        updated[index] = { ...updated[index], [field]: value };
        // Auto-fill entidade data when entidade_id changes
        if (field === 'entidade_id' && value) {
            const entidade = getEntidadeById(Number(value), updated[index].tipo_parte);
            if (entidade) {
                updated[index].entidade_nome = getEntidadeNome(entidade);
                updated[index].entidade_tipo_pessoa = getEntidadeTipoPessoa(entidade);
                updated[index].entidade_cpf_cnpj = getEntidadeCpfCnpj(entidade);
            }
        }
        setPartes(updated);
    };
    const getEntidadeById = (id, tipo) => {
        switch (tipo) {
            case 'fornecedor': return fornecedores.find(f => f.id === id);
            case 'prestador': return prestadores.find(p => p.id === id);
            case 'instituicao': return instituicoes.find(i => i.id === id);
            default: return undefined;
        }
    };
    const getEntidadeNome = (entidade) => {
        if ('nome_completo' in entidade) {
            return entidade.nome_completo || entidade.razao_social || '';
        }
        if ('razao_social' in entidade) {
            return entidade.razao_social || '';
        }
        if ('nome' in entidade) {
            return entidade.nome || '';
        }
        return '';
    };
    const getEntidadeTipoPessoa = (entidade) => {
        if ('tipo_pessoa' in entidade) {
            return entidade.tipo_pessoa;
        }
        return 'pj'; // Instituições são sempre PJ
    };
    const getEntidadeCpfCnpj = (entidade) => {
        if ('cpf_cnpj' in entidade) {
            return entidade.cpf_cnpj;
        }
        return '';
    };
    const getEntidadesOptions = (tipo) => {
        switch (tipo) {
            case 'fornecedor':
                return fornecedores.map(f => ({
                    value: f.id.toString(),
                    label: f.tipo_pessoa === 'pf' ? f.nome_completo : f.razao_social
                }));
            case 'prestador':
                return prestadores.map(p => ({
                    value: p.id.toString(),
                    label: p.tipo_pessoa === 'pf' ? p.nome_completo : p.razao_social
                }));
            case 'instituicao':
                return instituicoes.map(i => ({
                    value: i.id.toString(),
                    label: i.nome
                }));
            default: return [];
        }
    };
    // Item functions
    const addItem = () => {
        setItens([...itens, {
                tipo_item: 'produto',
                descricao: '',
                quantidade: 1,
                unidade: 'un',
                valor_unitario: 0,
                valor_total: 0,
            }]);
    };
    const removeItem = (index) => {
        setItens(itens.filter((_, i) => i !== index));
    };
    const updateItem = (index, field, value) => {
        const updated = [...itens];
        updated[index] = { ...updated[index], [field]: value };
        // Auto-calculate valor_total
        if (field === 'quantidade' || field === 'valor_unitario') {
            const item = updated[index];
            item.valor_total = (Number(item.quantidade) || 0) * (Number(item.valor_unitario) || 0);
        }
        setItens(updated);
    };
    // Condicao functions
    const addCondicao = () => {
        setCondicoes([...condicoes, {
                tipo_condicao: 'pagamento',
                descricao: '',
                obrigatoria: true,
            }]);
    };
    const removeCondicao = (index) => {
        setCondicoes(condicoes.filter((_, i) => i !== index));
    };
    const updateCondicao = (index, field, value) => {
        const updated = [...condicoes];
        updated[index] = { ...updated[index], [field]: value };
        setCondicoes(updated);
    };
    const tabs = [
        { id: 'dados_gerais', label: 'Dados Gerais', icon: '📋' },
        ...(watch('tipo_contrato') === 'compra' ? [{ id: 'compra_especifico', label: 'Compra', icon: '🛒' }] : []),
        ...(watch('tipo_contrato') === 'venda' ? [{ id: 'venda_especifico', label: 'Venda', icon: '📊' }] : []),
        ...(watch('tipo_contrato') === 'financiamento' ? [{ id: 'financeiro_especifico', label: 'Financeiro', icon: '💰' }] : []),
        { id: 'partes', label: 'Partes', icon: '👥' },
        { id: 'itens', label: 'Itens', icon: '📦' },
        { id: 'condicoes', label: 'Condições', icon: '⚖️' },
        { id: 'documento', label: 'Documento', icon: '📄' },
    ];
    return (_jsx(ModalForm, { isOpen: isOpen, title: contrato ? 'Editar Contrato' : 'Novo Contrato', onClose: onClose, size: "xl", children: _jsxs("form", { onSubmit: handleSubmit(handleFormSubmit), children: [_jsx("div", { className: "border-bottom mb-3", children: _jsx("nav", { className: "d-flex overflow-auto", children: tabs.map((tab) => (_jsxs("button", { type: "button", onClick: () => setActiveTab(tab.id), className: `py-2 px-1 border-bottom border-2 fw-medium text-nowrap me-3 ${activeTab === tab.id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted'}`, children: [_jsx("span", { className: "me-2", children: tab.icon }), tab.label] }, tab.id))) }) }), _jsxs("div", { style: { minHeight: '500px' }, children: [activeTab === 'dados_gerais' && (_jsxs("div", { className: "row g-2 g-md-3", children: [_jsx(Controller, { name: "numero_contrato", control: control, render: ({ field }) => (_jsx(Input, { label: "N\u00FAmero do Contrato", ...field, error: errors.numero_contrato?.message })) }), _jsx(Controller, { name: "titulo", control: control, render: ({ field }) => (_jsx(Input, { label: "T\u00EDtulo", ...field, error: errors.titulo?.message })) }), _jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Tipo de Contrato" }), _jsx(Controller, { name: "tipo_contrato", control: control, render: ({ field }) => (_jsx(SelectDropdown, { options: [
                                                    { value: 'compra', label: 'Compra' },
                                                    { value: 'venda', label: 'Venda' }, { value: 'venda_futura', label: 'Venda Futura' },
                                                    { value: 'venda_spot', label: 'Venda Spot' },
                                                    { value: 'bater', label: 'Barter' }, { value: 'servico', label: 'Serviço' },
                                                    { value: 'fornecimento', label: 'Fornecimento' },
                                                    { value: 'parceria', label: 'Parceria' },
                                                    { value: 'outros', label: 'Outros' },
                                                ], ...field, error: errors.tipo_contrato?.message })) })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Categoria" }), _jsx(Controller, { name: "categoria", control: control, render: ({ field }) => (_jsx(SelectDropdown, { options: [
                                                    { value: 'insumos', label: 'Insumos' },
                                                    { value: 'maquinas', label: 'Máquinas' },
                                                    { value: 'servicos', label: 'Serviços' },
                                                    { value: 'financiamento', label: 'Financiamento' },
                                                    { value: 'arrendamento', label: 'Arrendamento' },
                                                    { value: 'outros', label: 'Outros' },
                                                ], ...field, error: errors.categoria?.message })) })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Status" }), _jsx(Controller, { name: "status", control: control, render: ({ field }) => (_jsx(SelectDropdown, { options: [
                                                    { value: 'rascunho', label: 'Rascunho' },
                                                    { value: 'em_negociacao', label: 'Em Negociação' },
                                                    { value: 'assinado', label: 'Assinado' },
                                                    { value: 'em_execucao', label: 'Em Execução' },
                                                    { value: 'concluido', label: 'Concluído' },
                                                    { value: 'cancelado', label: 'Cancelado' },
                                                    { value: 'suspenso', label: 'Suspenso' },
                                                ], ...field, error: errors.status?.message })) })] }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Controller, { name: "valor_total", control: control, render: ({ field }) => (_jsx(Input, { label: "Valor Total", type: "number", step: "0.01", ...field, onChange: (e) => field.onChange(parseFloat(e.target.value) || 0), error: errors.valor_total?.message })) }) }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Controller, { name: "data_inicio", control: control, render: ({ field }) => (_jsx(Input, { label: "Data de In\u00EDcio", type: "date", ...field, error: errors.data_inicio?.message })) }) }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Controller, { name: "data_fim", control: control, render: ({ field }) => (_jsx(Input, { label: "Data de Fim", type: "date", ...field, error: errors.data_fim?.message })) }) }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Controller, { name: "prazo_execucao_dias", control: control, render: ({ field }) => (_jsx(Input, { label: "Prazo de Execu\u00E7\u00E3o (dias)", type: "number", ...field, onChange: (e) => field.onChange(parseInt(e.target.value) || 0), error: errors.prazo_execucao_dias?.message })) }) }), _jsx("div", { className: "col-12", children: _jsx(Controller, { name: "observacoes", control: control, render: ({ field }) => (_jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Observa\u00E7\u00F5es" }), _jsx("textarea", { ...field, rows: 3, className: "form-control" })] })) }) })] })), activeTab === 'partes' && (_jsxs("div", { children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsx("h3", { className: "fs-5 fw-medium", children: "Partes Envolvidas" }), _jsxs(Button, { type: "button", onClick: addParte, variant: "secondary", size: "sm", children: [_jsx(Plus, { className: "w-4 h-4 mr-2" }), "Adicionar Parte"] })] }), partes.map((parte, index) => (_jsxs("div", { className: "border rounded p-4 mb-3", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsxs("h4", { className: "fw-medium", children: ["Parte ", index + 1] }), _jsx(Button, { type: "button", onClick: () => removeParte(index), variant: "danger", size: "sm", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Tipo de Parte" }), _jsx(SelectDropdown, { value: parte.tipo_parte, onChange: (value) => updateParte(index, 'tipo_parte', value), options: [
                                                                { value: 'fornecedor', label: 'Fornecedor' },
                                                                { value: 'prestador', label: 'Prestador de Serviço' },
                                                                { value: 'instituicao', label: 'Instituição Financeira' },
                                                                { value: 'proprietario', label: 'Proprietário' },
                                                                { value: 'outros', label: 'Outros' },
                                                            ] })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Entidade" }), _jsx(SelectDropdown, { value: parte.entidade_id?.toString() || '', onChange: (value) => updateParte(index, 'entidade_id', parseInt(value)), options: [
                                                                { value: '', label: 'Selecione...' },
                                                                ...getEntidadesOptions(parte.tipo_parte)
                                                            ] })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Papel no Contrato" }), _jsx(SelectDropdown, { value: parte.papel_contrato, onChange: (value) => updateParte(index, 'papel_contrato', value), options: [
                                                                { value: 'contratante', label: 'Contratante' },
                                                                { value: 'contratado', label: 'Contratado' },
                                                                { value: 'fiador', label: 'Fiador' },
                                                                { value: 'avalista', label: 'Avalista' },
                                                                { value: 'interveniente', label: 'Interveniente' },
                                                            ] })] }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Input, { label: "Representante", value: parte.representante_nome || '', onChange: (e) => updateParte(index, 'representante_nome', e.target.value) }) }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Input, { label: "CPF do Representante", value: parte.representante_cpf || '', onChange: (e) => updateParte(index, 'representante_cpf', e.target.value) }) }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Input, { label: "Cargo do Representante", value: parte.representante_cargo || '', onChange: (e) => updateParte(index, 'representante_cargo', e.target.value) }) })] })] }, index))), partes.length === 0 && (_jsx("div", { className: "text-center py-4 text-muted", children: "Nenhuma parte adicionada" }))] })), activeTab === 'itens' && (_jsxs("div", { children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsx("h3", { className: "fs-5 fw-medium", children: "Itens do Contrato" }), _jsxs(Button, { type: "button", onClick: addItem, variant: "secondary", size: "sm", children: [_jsx(Plus, { className: "w-4 h-4 mr-2" }), "Adicionar Item"] })] }), itens.map((item, index) => (_jsxs("div", { className: "border rounded p-4 mb-3", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsxs("h4", { className: "fw-medium", children: ["Item ", index + 1] }), _jsx(Button, { type: "button", onClick: () => removeItem(index), variant: "danger", size: "sm", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Tipo de Item" }), _jsx(SelectDropdown, { value: item.tipo_item, onChange: (value) => updateItem(index, 'tipo_item', value), options: [
                                                                { value: 'produto', label: 'Produto' },
                                                                { value: 'servico', label: 'Serviço' },
                                                                { value: 'financiamento', label: 'Financiamento' },
                                                                { value: 'outros', label: 'Outros' },
                                                            ] })] }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Input, { label: "Descri\u00E7\u00E3o", value: item.descricao, onChange: (e) => updateItem(index, 'descricao', e.target.value) }) }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Input, { label: "Quantidade", type: "number", step: "0.01", value: item.quantidade?.toString() || '', onChange: (e) => updateItem(index, 'quantidade', parseFloat(e.target.value) || 0) }) }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Input, { label: "Unidade", value: item.unidade || '', onChange: (e) => updateItem(index, 'unidade', e.target.value) }) }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Input, { label: "Valor Unit\u00E1rio", type: "number", step: "0.01", value: item.valor_unitario?.toString() || '', onChange: (e) => updateItem(index, 'valor_unitario', parseFloat(e.target.value) || 0) }) }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Input, { label: "Valor Total", type: "number", step: "0.01", value: item.valor_total.toString(), readOnly: true, className: "bg-light" }) }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Input, { label: "Especifica\u00E7\u00F5es", value: item.especificacoes || '', onChange: (e) => updateItem(index, 'especificacoes', e.target.value) }) })] })] }, index))), itens.length === 0 && (_jsx("div", { className: "text-center py-4 text-muted", children: "Nenhum item adicionado" }))] })), activeTab === 'condicoes' && (_jsxs("div", { children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsx("h3", { className: "fs-5 fw-medium", children: "Condi\u00E7\u00F5es do Contrato" }), _jsxs(Button, { type: "button", onClick: addCondicao, variant: "secondary", size: "sm", children: [_jsx(Plus, { className: "w-4 h-4 mr-2" }), "Adicionar Condi\u00E7\u00E3o"] })] }), condicoes.map((condicao, index) => (_jsxs("div", { className: "border rounded p-4 mb-3", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsxs("h4", { className: "fw-medium", children: ["Condi\u00E7\u00E3o ", index + 1] }), _jsx(Button, { type: "button", onClick: () => removeCondicao(index), variant: "danger", size: "sm", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Tipo de Condi\u00E7\u00E3o" }), _jsx(SelectDropdown, { value: condicao.tipo_condicao, onChange: (value) => updateCondicao(index, 'tipo_condicao', value), options: [
                                                                { value: 'pagamento', label: 'Pagamento' },
                                                                { value: 'entrega', label: 'Entrega' },
                                                                { value: 'garantia', label: 'Garantia' },
                                                                { value: 'multa', label: 'Multa' },
                                                                { value: 'rescisao', label: 'Rescisão' },
                                                                { value: 'outras', label: 'Outras' },
                                                            ] })] }), _jsxs("div", { className: "col-12 col-md-6 d-flex align-items-center", children: [_jsx("input", { type: "checkbox", checked: condicao.obrigatoria, onChange: (e) => updateCondicao(index, 'obrigatoria', e.target.checked), className: "form-check-input me-2" }), _jsx("label", { className: "form-check-label", children: "Obrigat\u00F3ria" })] }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Input, { label: "Valor Refer\u00EAncia", type: "number", step: "0.01", value: condicao.valor_referencia?.toString() || '', onChange: (e) => updateCondicao(index, 'valor_referencia', parseFloat(e.target.value) || 0) }) }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Input, { label: "Percentual Refer\u00EAncia (%)", type: "number", step: "0.01", value: condicao.percentual_referencia?.toString() || '', onChange: (e) => updateCondicao(index, 'percentual_referencia', parseFloat(e.target.value) || 0) }) }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Input, { label: "Prazo (dias)", type: "number", value: condicao.prazo_dias?.toString() || '', onChange: (e) => updateCondicao(index, 'prazo_dias', parseInt(e.target.value) || 0) }) })] }), _jsxs("div", { className: "col-12", children: [_jsx("label", { className: "form-label", children: "Descri\u00E7\u00E3o" }), _jsx("textarea", { value: condicao.descricao, onChange: (e) => updateCondicao(index, 'descricao', e.target.value), rows: 3, className: "form-control" })] })] }, index))), condicoes.length === 0 && (_jsx("div", { className: "text-center py-4 text-muted", children: "Nenhuma condi\u00E7\u00E3o adicionada" }))] })), activeTab === 'documento' && (_jsx("div", { children: _jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Documento do Contrato" }), _jsx("input", { type: "file", accept: ".pdf,.doc,.docx", onChange: (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setValue('documento', file);
                                            }
                                        }, className: "form-control" }), _jsx("p", { className: "text-muted mt-1", children: "Formatos aceitos: PDF, DOC, DOCX" })] }) })), activeTab === 'compra_especifico' && (_jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Fornecedor" }), _jsx(SelectDropdown, { value: compraData.fornecedor_id?.toString() || '', onChange: (value) => setCompraData({ ...compraData, fornecedor_id: parseInt(value) }), options: [
                                                { value: '', label: 'Selecione...' },
                                                ...fornecedores.map(f => ({
                                                    value: f.id.toString(),
                                                    label: f.tipo_pessoa === 'pf' ? f.nome_completo : f.razao_social
                                                }))
                                            ] })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Condi\u00E7\u00E3o de Pagamento" }), _jsx(SelectDropdown, { value: compraData.condicao_pagamento?.toString() ?? '', onChange: (value) => setCompraData({ ...compraData, condicao_pagamento: String(value) }), options: [
                                                { value: 'dinheiro', label: 'Dinheiro' },
                                                { value: 'credito_30', label: 'Crédito 30 dias' },
                                                { value: 'credito_60', label: 'Crédito 60 dias' },
                                                { value: 'credito_90', label: 'Crédito 90 dias' },
                                                { value: 'parcelado', label: 'Parcelado' },
                                            ] })] }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Input, { label: "Prazo de Entrega (dias)", type: "number", value: compraData.prazo_entrega_dias?.toString() || '', onChange: (e) => setCompraData({ ...compraData, prazo_entrega_dias: parseInt(e.target.value) || 0 }) }) }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Input, { label: "Desconto Global (%)", type: "number", step: "0.01", value: compraData.desconto_global_percentual?.toString() || '', onChange: (e) => setCompraData({ ...compraData, desconto_global_percentual: parseFloat(e.target.value) || 0 }) }) })] })), activeTab === 'venda_especifico' && (_jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Cliente" }), _jsx(SelectDropdown, { value: vendaData.cliente_id?.toString() || '', onChange: (value) => setVendaData({ ...vendaData, cliente_id: parseInt(value) }), options: [
                                                { value: '', label: 'Selecione...' },
                                                { value: '1', label: 'Carregando clientes...' }
                                            ] })] }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Input, { label: "N\u00FAmero de Parcelas", type: "number", value: vendaData.numero_parcelas?.toString() || '', onChange: (e) => setVendaData({ ...vendaData, numero_parcelas: parseInt(e.target.value) || 1 }) }) }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Periodicidade da Parcela" }), _jsx(SelectDropdown, { value: vendaData.periodicidade_parcela?.toString() ?? '', onChange: (value) => setVendaData({ ...vendaData, periodicidade_parcela: String(value) }), options: [
                                                { value: 'semanal', label: 'Semanal' },
                                                { value: 'quinzenal', label: 'Quinzenal' },
                                                { value: 'mensal', label: 'Mensal' },
                                                { value: 'bimestral', label: 'Bimestral' },
                                                { value: 'trimestral', label: 'Trimestral' },
                                            ] })] }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Input, { label: "Percentual de Comiss\u00E3o (%)", type: "number", step: "0.01", value: vendaData.percentual_comissao?.toString() || '', onChange: (e) => setVendaData({ ...vendaData, percentual_comissao: parseFloat(e.target.value) || 0 }) }) }), _jsxs("div", { className: "col-12", children: [_jsx("input", { type: "checkbox", checked: vendaData.rastrear_comissao, onChange: (e) => setVendaData({ ...vendaData, rastrear_comissao: e.target.checked }), className: "form-check-input me-2" }), _jsx("label", { className: "form-check-label", children: "Rastrear Comiss\u00E3o" })] })] })), activeTab === 'financeiro_especifico' && (_jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Tipo de Produto Financeiro" }), _jsx(SelectDropdown, { value: financeiroData.produto_financeiro?.toString() ?? '', onChange: (value) => setFinanceiroData({ ...financeiroData, produto_financeiro: String(value) }), options: [
                                                { value: 'emprestimo', label: 'Empréstimo' },
                                                { value: 'consorcio', label: 'Consórcio' },
                                                { value: 'seguro', label: 'Seguro' },
                                                { value: 'aplicacao', label: 'Aplicação Financeira' },
                                            ] })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Institui\u00E7\u00E3o Financeira" }), _jsx(SelectDropdown, { value: financeiroData.instituicao_financeira_id?.toString() || '', onChange: (value) => setFinanceiroData({ ...financeiroData, instituicao_financeira_id: parseInt(value) }), options: [
                                                { value: '', label: 'Selecione...' },
                                                ...instituicoes.map(i => ({
                                                    value: i.id.toString(),
                                                    label: i.nome
                                                }))
                                            ] })] }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Input, { label: "Valor de Entrada", type: "number", step: "0.01", value: financeiroData.valor_entrada?.toString() || '', onChange: (e) => setFinanceiroData({ ...financeiroData, valor_entrada: parseFloat(e.target.value) || 0 }) }) }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Input, { label: "Taxa de Juros (%)", type: "number", step: "0.01", value: financeiroData.taxa_juros?.toString() || '', onChange: (e) => setFinanceiroData({ ...financeiroData, taxa_juros: parseFloat(e.target.value) || 0 }) }) }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Input, { label: "Prazo (meses)", type: "number", value: financeiroData.prazo_meses?.toString() || '', onChange: (e) => setFinanceiroData({ ...financeiroData, prazo_meses: parseInt(e.target.value) || 12 }) }) }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Input, { label: "N\u00FAmero de Parcelas", type: "number", value: financeiroData.numero_parcelas?.toString() || '', onChange: (e) => setFinanceiroData({ ...financeiroData, numero_parcelas: parseInt(e.target.value) || 12 }) }) })] }))] }), _jsxs("div", { className: "d-flex justify-content-end pt-4 border-top mt-3", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: onClose, disabled: loading, children: "Cancelar" }), _jsx(Button, { type: "submit", disabled: loading, className: "ms-2", children: loading ? 'Salvando...' : (contrato ? 'Atualizar' : 'Criar') })] })] }) }));
};
export default ContratoForm;
