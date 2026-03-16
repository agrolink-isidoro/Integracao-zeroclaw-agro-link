import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Input from '@/components/common/Input';
import Button from '@/components/Button';
import ComercialService from '@/services/comercial';
const schema = yup.object().shape({
    numero_contrato: yup.string().required('Número do contrato é obrigatório'),
    titulo: yup.string().required('Título é obrigatório'),
    tipo_contrato: yup.string().required('Tipo de contrato é obrigatório'),
    categoria: yup.string().required('Categoria é obrigatória'),
    status: yup.string().required('Status é obrigatório'),
    valor_total: yup.number().required('Valor total é obrigatório'),
    data_inicio: yup.string().required('Data de início é obrigatória'),
    data_fim: yup.string(),
    // Condições should be an array; forms may post empty array by default
    condicoes: yup.array().of(yup.object().shape({
        tipo_condicao: yup.string().required(),
        descricao: yup.string().required(),
        obrigatoria: yup.boolean(),
    })).default([]),
    // Commercial contract specific optional fields
    modalidade_comercial: yup.string(),
    instrumento_garantia: yup.string(),
    produto: yup.mixed(),
    variedade: yup.string(),
    safra: yup.mixed(),
    quantidade: yup.mixed(),
    unidade_medida: yup.string(),
    qualidade_especificacao: yup.string(),
    preco_unitario: yup.mixed(),
    forma_pagamento: yup.string(),
    prazo_pagamento_dias: yup.mixed(),
    data_entrega: yup.string(),
    local_entrega: yup.string(),
    produto_troca_recebido: yup.mixed(),
    quantidade_troca_recebida: yup.mixed(),
    unidade_troca_recebida: yup.string(),
});
const ContratoCreate = ({ onSuccess, onCancel }) => {
    const [documentos, setDocumentos] = React.useState([]);
    const [tipoContrato, setTipoContrato] = React.useState('');
    const [modalidadeComercial, setModalidadeComercial] = React.useState('');
    const { control, handleSubmit, watch } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            numero_contrato: '',
            titulo: '',
            tipo_contrato: '',
            categoria: '',
            status: 'ativo',
            valor_total: '',
            data_inicio: '',
            data_fim: '',
            partes: [],
            itens: [],
            condicoes: []
        }
    });
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const mutation = useMutation({
        mutationFn: (payload) => ComercialService.createContrato(payload),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['contratos'] });
            const d = data;
            if (onSuccess)
                onSuccess(data);
            else
                navigate(`/comercial/contratos/${String(d.id)}`);
        }
    });
    const loading = mutation.status === 'pending';
    const onSubmit = async (data) => {
        try {
            // For MVP, add a simple parte
            const d = data;
            const payload = {
                ...d,
                partes: [{
                        tipo_parte: 'cliente',
                        entidade_id: 1, // placeholder
                        papel_contrato: 'contratante'
                    }],
                condicoes: Array.isArray(d.condicoes) ? d.condicoes : [],
                documentos: documentos.map(file => ({
                    nome: file.name,
                    tipo: file.type,
                    tamanho: file.size
                }))
            };
            await mutation.mutateAsync(payload);
        }
        catch (e) {
            console.error('Erro ao criar contrato', e);
        }
    };
    const handleFileChange = (event) => {
        const files = event.target.files;
        if (files) {
            setDocumentos([...documentos, ...Array.from(files)]);
        }
    };
    const removeDocumento = (index) => {
        setDocumentos(documentos.filter((_, i) => i !== index));
    };
    return (_jsxs("div", { className: "container-fluid py-4", children: [!onCancel && (_jsx("div", { className: "d-flex justify-content-between align-items-center mb-3", children: _jsx("h2", { children: "Novo Contrato" }) })), _jsx("div", { className: "card", children: _jsx("div", { className: "card-body p-3 p-md-4", children: _jsxs("form", { onSubmit: handleSubmit(onSubmit), children: [_jsxs("div", { className: "mb-4", children: [_jsxs("h6", { className: "text-primary mb-3", children: [_jsx("i", { className: "bi bi-file-earmark-text me-2" }), "Identifica\u00E7\u00E3o do Contrato"] }), _jsxs("div", { className: "row g-2 g-md-3", children: [_jsx("div", { className: "col-12 col-sm-6 col-md-3", children: _jsx(Controller, { name: "numero_contrato", control: control, render: ({ field, fieldState }) => (_jsx(Input, { label: "N\u00FAmero do Contrato *", ...field, error: fieldState.error?.message })) }) }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Controller, { name: "titulo", control: control, render: ({ field, fieldState }) => (_jsx(Input, { label: "T\u00EDtulo / Objeto *", placeholder: "Ex: Venda de Soja Safra 2025/2026", ...field, error: fieldState.error?.message })) }) }), _jsx("div", { className: "col-12 col-sm-6 col-md-3", children: _jsx(Controller, { name: "status", control: control, render: ({ field }) => (_jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Status" }), _jsxs("select", { ...field, className: "form-select", children: [_jsx("option", { value: "rascunho", children: "Rascunho" }), _jsx("option", { value: "ativo", children: "Ativo" }), _jsx("option", { value: "suspenso", children: "Suspenso" }), _jsx("option", { value: "cancelado", children: "Cancelado" }), _jsx("option", { value: "encerrado", children: "Encerrado" })] })] })) }) }), _jsx("div", { className: "col-12 col-sm-6 col-lg-3", children: _jsx(Controller, { name: "tipo_contrato", control: control, render: ({ field, fieldState }) => (_jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Tipo de Opera\u00E7\u00E3o *" }), _jsxs("select", { ...field, className: "form-select", onChange: (e) => {
                                                                    field.onChange(e);
                                                                    setTipoContrato(e.target.value);
                                                                }, children: [_jsx("option", { value: "", children: "Selecione" }), _jsx("option", { value: "venda", children: "Venda" }), _jsx("option", { value: "compra", children: "Compra" }), _jsx("option", { value: "bater", children: "Barter" }), _jsx("option", { value: "servico", children: "Servi\u00E7o" }), _jsx("option", { value: "outros", children: "Arrendamento / Outros" })] }), fieldState.error && _jsx("small", { className: "text-danger", children: fieldState.error.message })] })) }) }), _jsx("div", { className: "col-12 col-sm-6 col-lg-3", children: _jsx(Controller, { name: "modalidade_comercial", control: control, render: ({ field, fieldState }) => (_jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Modalidade Comercial *" }), _jsxs("select", { ...field, className: "form-select", onChange: (e) => {
                                                                    field.onChange(e);
                                                                    setModalidadeComercial(e.target.value);
                                                                }, children: [_jsx("option", { value: "", children: "Selecione" }), _jsx("option", { value: "spot", children: "SPOT (\u00C0 Vista)" }), _jsx("option", { value: "fixo", children: "Fixo (Pr\u00E9-Fixado)" }), _jsx("option", { value: "futuro", children: "Futuro" }), _jsx("option", { value: "a_fixar", children: "A Fixar" }), _jsx("option", { value: "consignado", children: "Consignado" })] }), fieldState.error && _jsx("small", { className: "text-danger", children: fieldState.error.message })] })) }) }), _jsx("div", { className: "col-12 col-sm-6 col-lg-3", children: _jsx(Controller, { name: "categoria", control: control, render: ({ field, fieldState }) => (_jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Categoria *" }), _jsxs("select", { ...field, className: "form-select", children: [_jsx("option", { value: "", children: "Selecione" }), _jsx("option", { value: "graos", children: "Gr\u00E3os" }), _jsx("option", { value: "insumos", children: "Insumos" }), _jsx("option", { value: "sementes", children: "Sementes" }), _jsx("option", { value: "fertilizantes", children: "Fertilizantes" }), _jsx("option", { value: "defensivos", children: "Defensivos" }), _jsx("option", { value: "servicos", children: "Servi\u00E7os" }), _jsx("option", { value: "equipamentos", children: "Equipamentos" }), _jsx("option", { value: "outros", children: "Outros" })] }), fieldState.error && _jsx("small", { className: "text-danger", children: fieldState.error.message })] })) }) }), _jsx("div", { className: "col-12 col-sm-6 col-lg-3", children: _jsx(Controller, { name: "instrumento_garantia", control: control, render: ({ field }) => (_jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Garantia" }), _jsxs("select", { ...field, className: "form-select", children: [_jsx("option", { value: "", children: "Nenhum" }), _jsx("option", { value: "cpr_fisica", children: "CPR F\u00EDsica" }), _jsx("option", { value: "cpr_financeira", children: "CPR Financeira" }), _jsx("option", { value: "nota_promissoria", children: "Nota Promiss\u00F3ria" }), _jsx("option", { value: "penhor", children: "Penhor" }), _jsx("option", { value: "aval", children: "Aval" })] })] })) }) })] })] }), _jsx("hr", { className: "my-4" }), _jsxs("div", { className: "mb-4", children: [_jsxs("h6", { className: "text-primary mb-3", children: [_jsx("i", { className: "bi bi-box-seam me-2" }), "Especifica\u00E7\u00F5es do Produto/Servi\u00E7o"] }), _jsxs("div", { className: "row g-2 g-md-3", children: [_jsx("div", { className: "col-12 col-md-6", children: _jsx(Controller, { name: "produto", control: control, render: ({ field }) => (_jsx(Input, { label: "Produto/Servi\u00E7o *", placeholder: "Ex: Soja em Gr\u00E3o", ...field })) }) }), _jsx("div", { className: "col-12 col-sm-6 col-md-3", children: _jsx(Controller, { name: "variedade", control: control, render: ({ field }) => (_jsx(Input, { label: "Variedade/Cultivar", placeholder: "Ex: M6410 IPRO", ...field })) }) }), _jsx("div", { className: "col-12 col-sm-6 col-md-3", children: _jsx(Controller, { name: "safra", control: control, render: ({ field }) => (_jsx(Input, { label: "Safra", placeholder: "Ex: 2025/2026", ...field })) }) }), _jsx("div", { className: "col-12 col-sm-6 col-md-4", children: _jsx(Controller, { name: "quantidade", control: control, render: ({ field }) => (_jsx(Input, { label: "Quantidade *", type: "number", step: "0.001", placeholder: "Ex: 5000", ...field })) }) }), _jsx("div", { className: "col-12 col-sm-6 col-md-3", children: _jsx(Controller, { name: "unidade_medida", control: control, render: ({ field }) => (_jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Unidade *" }), _jsxs("select", { ...field, className: "form-select", children: [_jsx("option", { value: "sc", children: "Sacas (60kg)" }), _jsx("option", { value: "ton", children: "Toneladas" }), _jsx("option", { value: "kg", children: "Quilogramas" }), _jsx("option", { value: "litros", children: "Litros" }), _jsx("option", { value: "unidade", children: "Unidades" })] })] })) }) }), _jsx("div", { className: "col-12 col-md-5", children: _jsx(Controller, { name: "qualidade_especificacao", control: control, render: ({ field }) => (_jsx(Input, { label: "Especifica\u00E7\u00E3o de Qualidade", placeholder: "Ex: Umidade m\u00E1x 14%, Impurezas m\u00E1x 1%", ...field })) }) })] })] }), _jsx("hr", { className: "my-4" }), _jsxs("div", { className: "mb-4", children: [_jsxs("h6", { className: "text-primary mb-3", children: [_jsx("i", { className: "bi bi-currency-dollar me-2" }), "Valores, Pre\u00E7os e Prazos"] }), _jsxs("div", { className: "row g-2 g-md-3", children: [_jsx("div", { className: "col-12 col-sm-6 col-md-3", children: _jsx(Controller, { name: "preco_unitario", control: control, render: ({ field }) => (_jsx(Input, { label: "Pre\u00E7o Unit\u00E1rio (R$)", type: "number", step: "0.01", placeholder: "Ex: 125.50", ...field })) }) }), _jsx("div", { className: "col-12 col-sm-6 col-md-3", children: _jsx(Controller, { name: "valor_total", control: control, render: ({ field, fieldState }) => (_jsx(Input, { label: "Valor Total (R$) *", type: "number", step: "0.01", ...field, error: fieldState.error?.message })) }) }), _jsx("div", { className: "col-12 col-sm-6 col-md-3", children: _jsx(Controller, { name: "forma_pagamento", control: control, render: ({ field }) => (_jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Forma de Pagamento" }), _jsxs("select", { ...field, className: "form-select", children: [_jsx("option", { value: "a_vista", children: "\u00C0 Vista" }), _jsx("option", { value: "parcelado", children: "Parcelado" }), _jsx("option", { value: "antecipado", children: "Antecipado" }), _jsx("option", { value: "pos_entrega", children: "P\u00F3s-Entrega" }), _jsx("option", { value: "troca", children: "Troca (Barter)" })] })] })) }) }), _jsx("div", { className: "col-12 col-sm-6 col-md-3", children: _jsx(Controller, { name: "prazo_pagamento_dias", control: control, render: ({ field }) => (_jsx(Input, { label: "Prazo (dias)", type: "number", placeholder: "Ex: 30", ...field })) }) }), _jsx("div", { className: "col-12 col-sm-6 col-md-4", children: _jsx(Controller, { name: "data_inicio", control: control, render: ({ field, fieldState }) => (_jsx(Input, { label: "Data de In\u00EDcio *", type: "date", ...field, error: fieldState.error?.message })) }) }), _jsx("div", { className: "col-12 col-sm-6 col-md-4", children: _jsx(Controller, { name: "data_entrega", control: control, render: ({ field }) => (_jsx(Input, { label: "Data de Entrega", type: "date", ...field })) }) }), _jsx("div", { className: "col-12 col-sm-6 col-md-4", children: _jsx(Controller, { name: "data_fim", control: control, render: ({ field }) => (_jsx(Input, { label: "Data de T\u00E9rmino", type: "date", ...field })) }) }), _jsx("div", { className: "col-12", children: _jsx(Controller, { name: "local_entrega", control: control, render: ({ field }) => (_jsx(Input, { label: "Local de Entrega", placeholder: "Ex: Armaz\u00E9m XYZ, Rodovia BR-163 km 512, Lucas do Rio Verde - MT", ...field })) }) }), tipoContrato === 'barter' && (_jsxs(_Fragment, { children: [_jsx("div", { className: "col-12", children: _jsxs("div", { className: "alert alert-info mb-0", children: [_jsx("i", { className: "bi bi-info-circle me-2" }), _jsx("strong", { children: "Opera\u00E7\u00E3o Barter:" }), " Especifique os produtos/insumos envolvidos na troca e suas quantidades equivalentes."] }) }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Controller, { name: "produto_troca_recebido", control: control, render: ({ field }) => (_jsx(Input, { label: "Produto Recebido na Troca", placeholder: "Ex: Fertilizante NPK", ...field })) }) }), _jsx("div", { className: "col-12 col-sm-6 col-md-3", children: _jsx(Controller, { name: "quantidade_troca_recebida", control: control, render: ({ field }) => (_jsx(Input, { label: "Quantidade Recebida", type: "number", step: "0.001", ...field })) }) }), _jsx("div", { className: "col-12 col-sm-6 col-md-3", children: _jsx(Controller, { name: "unidade_troca_recebida", control: control, render: ({ field }) => (_jsx(Input, { label: "Unidade", placeholder: "Ex: Toneladas", ...field })) }) })] }))] })] }), _jsx("hr", { className: "my-4" }), _jsx("hr", { className: "my-4" }), _jsxs("div", { className: "mb-4", children: [_jsxs("h6", { className: "text-primary mb-3", children: [_jsx("i", { className: "bi bi-list-check me-2" }), "Condi\u00E7\u00F5es, Cl\u00E1usulas e Observa\u00E7\u00F5es"] }), _jsx("div", { className: "row g-2 g-md-3", children: _jsx("div", { className: "col-12", children: _jsx(Controller, { name: "condicoes", control: control, render: ({ field }) => (_jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Condi\u00E7\u00F5es Contratuais e Cl\u00E1usulas" }), _jsx("textarea", { ...field, rows: 5, className: "form-control", placeholder: "Descreva as condi\u00E7\u00F5es, cl\u00E1usulas, penalidades, multas e termos espec\u00EDficos do contrato..." })] })) }) }) })] }), _jsx("hr", { className: "my-4" }), _jsxs("div", { className: "mb-4", children: [_jsxs("h6", { className: "text-primary mb-3", children: [_jsx("i", { className: "bi bi-paperclip me-2" }), "Documentos Anexos"] }), _jsxs("div", { className: "row g-3", children: [_jsx("div", { className: "col-12", children: _jsxs("div", { className: "border border-dashed rounded p-3 bg-light", children: [_jsxs("div", { className: "d-flex align-items-center justify-content-center mb-3", children: [_jsxs("label", { htmlFor: "file-upload", className: "btn btn-outline-primary mb-0 cursor-pointer", children: [_jsx("i", { className: "bi bi-cloud-upload me-2" }), "Selecionar Arquivos"] }), _jsx("input", { id: "file-upload", type: "file", multiple: true, onChange: handleFileChange, className: "d-none", accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png" })] }), _jsx("p", { className: "text-muted text-center mb-0 small", children: "Formatos aceitos: PDF, DOC, DOCX, JPG, PNG (M\u00E1x. 10MB por arquivo)" })] }) }), documentos.length > 0 && (_jsx("div", { className: "col-12", children: _jsx("div", { className: "list-group", children: documentos.map((doc, index) => (_jsxs("div", { className: "list-group-item d-flex justify-content-between align-items-center", children: [_jsxs("div", { className: "d-flex align-items-center", children: [_jsx("i", { className: "bi bi-file-earmark-text text-primary me-2 fs-5" }), _jsxs("div", { children: [_jsx("div", { className: "fw-medium", children: doc.name }), _jsxs("small", { className: "text-muted", children: [(doc.size / 1024).toFixed(2), " KB"] })] })] }), _jsx("button", { type: "button", className: "btn btn-sm btn-outline-danger", onClick: () => removeDocumento(index), children: _jsx("i", { className: "bi bi-trash" }) })] }, index))) }) }))] })] }), _jsxs("div", { className: "d-flex justify-content-end gap-2 mt-4", children: [onCancel && (_jsxs("button", { type: "button", className: "btn btn-outline-secondary", onClick: onCancel, children: [_jsx("i", { className: "bi bi-x-circle me-1" }), "Cancelar"] })), _jsxs(Button, { type: "submit", className: "btn btn-primary", disabled: loading, children: [_jsx("i", { className: "bi bi-check-circle me-1" }), loading ? 'Salvando...' : 'Salvar Contrato'] })] })] }) }) })] }));
};
export default ContratoCreate;
