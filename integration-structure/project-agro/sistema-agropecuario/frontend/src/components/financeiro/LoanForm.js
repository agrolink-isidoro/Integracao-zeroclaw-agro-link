import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useForm } from 'react-hook-form';
import financeiroService from '@/services/financeiro';
import { useApiQuery } from '@/hooks/useApi';
import SelectDropdown from '@/components/common/SelectDropdown';
import ComercialService from '@/services/comercial';
const LoanForm = ({ defaultTipo = 'financiamento', onSuccess, onCancel }) => {
    const { register, handleSubmit, watch, setValue } = useForm({ defaultValues: { tipo_operacao: defaultTipo, carencia_meses: 0, juros_embutidos: false } });
    const tipo = watch('tipo_operacao');
    const selectedInst = watch('instituicao_financeira');
    // request more results to populate the dropdown fully
    const { data: insts = [] } = useApiQuery(['instituicoes'], '/comercial/instituicoes-financeiras/?page_size=1000');
    const handleSearchInst = async (term) => {
        const results = await ComercialService.getInstituicoes({ busca: term });
        return results.map((r) => ({ value: r.id, label: `${r.codigo_bacen} — ${r.nome}` }));
    };
    const onSubmit = async (data) => {
        try {
            console.debug('LoanForm.onSubmit', data);
            const tituloFinal = data.titulo && data.titulo.trim().length ? data.titulo : (data.descricao || '');
            if (data.tipo_operacao === 'financiamento') {
                const firstVenc = data.data_primeiro_vencimento || (() => {
                    const base = data.data_contratacao || new Date().toISOString().slice(0, 10);
                    const dt = new Date(base);
                    dt.setMonth(dt.getMonth() + 1);
                    return dt.toISOString().slice(0, 10);
                })();
                const payload = {
                    titulo: tituloFinal,
                    descricao: data.descricao,
                    instituicao_financeira: data.instituicao_financeira,
                    valor_financiado: Number(data.valor || 0),
                    valor_entrada: data.valor_entrada ? Number(data.valor_entrada) : 0,
                    taxa_juros: Number(data.taxa_juros ?? 0),
                    frequencia_taxa: data.frequencia_taxa || 'mensal',
                    metodo_calculo: data.metodo_calculo || 'price',
                    numero_parcelas: Number(data.numero_parcelas || 1),
                    prazo_meses: Number(data.prazo_meses ?? data.numero_parcelas ?? 1),
                    // carência e juros embutidos (backend já suporta)
                    carencia_meses: Number(data.carencia_meses || 0),
                    juros_embutidos: Boolean(data.juros_embutidos || false),
                    data_contratacao: data.data_contratacao,
                    data_primeiro_vencimento: firstVenc,
                };
                // include numero_contrato when present
                if (data.numero_contrato && String(data.numero_contrato).trim())
                    payload.numero_contrato = data.numero_contrato;
                const created = await financeiroService.createFinanciamento(payload);
                if (onSuccess)
                    onSuccess(created);
            }
            else {
                const firstVenc = data.data_primeiro_vencimento || (() => {
                    const base = data.data_contratacao || new Date().toISOString().slice(0, 10);
                    const dt = new Date(base);
                    dt.setMonth(dt.getMonth() + 1);
                    return dt.toISOString().slice(0, 10);
                })();
                const payload = {
                    titulo: tituloFinal,
                    descricao: data.descricao,
                    instituicao_financeira: data.instituicao_financeira,
                    valor_emprestimo: Number(data.valor || 0),
                    valor_entrada: data.valor_entrada ? Number(data.valor_entrada) : 0,
                    taxa_juros: Number(data.taxa_juros ?? 0),
                    frequencia_taxa: data.frequencia_taxa || 'mensal',
                    metodo_calculo: data.metodo_calculo || 'price',
                    numero_parcelas: Number(data.numero_parcelas || 1),
                    prazo_meses: Number(data.prazo_meses ?? data.numero_parcelas ?? 1),
                    // carência e juros embutidos
                    carencia_meses: Number(data.carencia_meses || 0),
                    juros_embutidos: Boolean(data.juros_embutidos || false),
                    data_contratacao: data.data_contratacao,
                    data_primeiro_vencimento: firstVenc,
                };
                console.debug('calling createEmprestimo', financeiroService.createEmprestimo);
                const created = await financeiroService.createEmprestimo(payload);
                try {
                    const mockCalls = (financeiroService.createEmprestimo?.mock?.calls?.length) ?? 0;
                    console.debug('after createEmprestimo call, mock calls:', mockCalls);
                }
                catch (err) {
                    // ignore
                }
                if (onSuccess)
                    onSuccess(created);
            }
        }
        catch (e) {
            console.error('Erro ao criar operação financeira', e);
            alert('Erro ao criar operação financeira');
        }
    };
    return (_jsxs("div", { className: "container-fluid p-3 p-md-4", children: [_jsx("h4", { className: "mb-4", children: tipo === 'financiamento' ? 'Novo Financiamento' : 'Novo Empréstimo' }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), children: [_jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Tipo" }), _jsxs("select", { className: "form-select", ...register('tipo_operacao'), children: [_jsx("option", { value: "financiamento", children: "Financiamento" }), _jsx("option", { value: "emprestimo", children: "Empr\u00E9stimo" })] })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "T\u00EDtulo" }), _jsx("input", { className: "form-control", ...register('titulo'), "aria-label": "T\u00EDtulo" })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Descri\u00E7\u00E3o" }), _jsx("textarea", { className: "form-control", "aria-label": "Descri\u00E7\u00E3o", ...register('descricao') })] }), _jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Institui\u00E7\u00E3o financeira" }), _jsxs("div", { children: [_jsx(SelectDropdown, { options: insts.map(i => ({ value: i.id, label: `${i.codigo_bacen} — ${i.nome}` })), value: selectedInst, onChange: (v) => setValue('instituicao_financeira', v ? Number(v) : undefined), placeholder: "Pesquise por nome ou c\u00F3digo", searchable: true, onSearch: handleSearchInst }), _jsx("input", { type: "hidden", ...register('instituicao_financeira') })] })] }), _jsxs("div", { className: "col-md-6", children: [_jsxs("label", { className: "form-label", children: ["Valor ", tipo === 'financiamento' ? 'financiado' : 'emprestado'] }), _jsx("input", { className: "form-control", type: "number", step: "0.01", ...register('valor', { required: true }), "aria-label": tipo === 'financiamento' ? 'Valor financiado' : 'Valor emprestado' })] })] }), _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label", children: "Valor entrada" }), _jsx("input", { className: "form-control", type: "number", step: "0.01", ...register('valor_entrada') })] }), _jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label", children: "Taxa juros (%)" }), _jsx("input", { className: "form-control", type: "number", step: "0.01", ...register('taxa_juros') })] }), _jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label", children: "Frequ\u00EAncia taxa" }), _jsxs("select", { className: "form-select", ...register('frequencia_taxa'), children: [_jsx("option", { value: "mensal", children: "Mensal" }), _jsx("option", { value: "trimestral", children: "Trimestral" }), _jsx("option", { value: "semestral", children: "Semestral" }), _jsx("option", { value: "anual", children: "Anual" })] })] })] }), _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label", children: "M\u00E9todo c\u00E1lculo" }), _jsxs("select", { className: "form-select", ...register('metodo_calculo'), children: [_jsx("option", { value: "price", children: "Price" }), _jsx("option", { value: "sac", children: "SAC" }), _jsx("option", { value: "personalizado", children: "Personalizado" })] })] }), _jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label", children: "N\u00FAmero de parcelas" }), _jsx("input", { className: "form-control", type: "number", ...register('numero_parcelas', { required: true }), "aria-label": "N\u00FAmero de parcelas" })] }), _jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label", children: "Prazo (meses)" }), _jsx("input", { className: "form-control", type: "number", ...register('prazo_meses') })] })] }), _jsxs("div", { className: "row g-2 g-md-3 align-items-center mt-2", children: [_jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label", children: "Car\u00EAncia (meses)" }), _jsx("input", { className: "form-control", type: "number", min: 0, ...register('carencia_meses') })] }), _jsx("div", { className: "col-md-6 d-flex align-items-center", children: _jsxs("div", { className: "form-check", children: [_jsx("input", { className: "form-check-input", type: "checkbox", ...register('juros_embutidos'), id: "jurosEmbutidos" }), _jsx("label", { className: "form-check-label", htmlFor: "jurosEmbutidos", children: "Juros embutidos na car\u00EAncia" })] }) })] }), _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label", children: "Data contrata\u00E7\u00E3o" }), _jsx("input", { className: "form-control", type: "date", ...register('data_contratacao', { required: true }), "aria-label": "Data contrata\u00E7\u00E3o" })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label", children: "Data primeiro vencimento" }), _jsx("input", { className: "form-control", type: "date", ...register('data_primeiro_vencimento') })] })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "N\u00FAmero do Contrato (opcional)" }), _jsx("input", { className: "form-control", ...register('numero_contrato'), placeholder: "Ex: CT-1234" })] }), _jsxs("div", { className: "d-flex gap-2", children: [_jsx("button", { className: "btn btn-primary", type: "submit", children: "Criar" }), _jsx("button", { type: "button", className: "btn btn-outline-secondary", onClick: () => onCancel && onCancel(), children: "Cancelar" })] })] })] }));
};
export default LoanForm;
