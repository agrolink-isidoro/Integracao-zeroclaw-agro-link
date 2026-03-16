import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useApiCreate, useApiUpdate, useApiQuery } from '@/hooks/useApi';
import SelectDropdown from '@/components/common/SelectDropdown';
import ComercialService from '@/services/comercial';
const ContaForm = ({ initialData, onClose, onSaved }) => {
    const isEdit = !!initialData;
    const [banco, setBanco] = useState(initialData?.banco || '');
    const [bancoId, setBancoId] = useState(initialData?.instituicao || null);
    const [bancoOptions, setBancoOptions] = useState([]);
    const [agencia, setAgencia] = useState(initialData?.agencia || '');
    const [conta, setConta] = useState(initialData?.conta || '');
    const { data: insts = [] } = useApiQuery(['instituicoes'], '/comercial/instituicoes-financeiras/?page_size=1000');
    // Sincronizar bancoOptions com insts quando carregar
    React.useEffect(() => {
        if (insts.length > 0) {
            setBancoOptions(insts);
        }
    }, [insts]);
    const [tipo, setTipo] = useState(initialData?.tipo || 'corrente');
    const [moeda, setMoeda] = useState(initialData?.moeda || 'BRL');
    const [saldoInicial, setSaldoInicial] = useState(initialData?.saldo_inicial ?? '0.00');
    const [ativo, setAtivo] = useState(initialData?.ativo ?? true);
    const [errors, setErrors] = useState({});
    const create = useApiCreate('/financeiro/contas/', [['contas-bancarias']]);
    const update = useApiUpdate('/financeiro/contas/', [['contas-bancarias']]);
    useEffect(() => {
        if (initialData) {
            setBanco(initialData.banco || '');
            setBancoId(initialData.instituicao || null);
            setAgencia(initialData.agencia || '');
            setConta(initialData.conta || '');
            setTipo(initialData.tipo || 'corrente');
            setMoeda(initialData.moeda || 'BRL');
            setSaldoInicial(initialData.saldo_inicial ?? '0.00');
            setAtivo(initialData.ativo ?? true);
        }
    }, [initialData]);
    const validate = () => {
        const e = {};
        if (!banco || !banco.trim())
            e.banco = 'Banco é obrigatório';
        if (!conta || !conta.trim())
            e.conta = 'Conta é obrigatória';
        setErrors(e);
        return Object.keys(e).length === 0;
    };
    const handleSave = async () => {
        if (!validate())
            return;
        // Validate decimal separator: require dot as decimal separator for cents
        if (String(saldoInicial).includes(',')) {
            alert('A digitar centavos usar ponto(.) como separador');
            return;
        }
        const payload = {
            banco,
            agencia,
            conta,
            tipo,
            moeda,
            saldo_inicial: saldoInicial,
            ativo,
            instituicao: bancoId
        };
        try {
            if (isEdit && initialData?.id) {
                await update.mutateAsync({ id: initialData.id, ...payload });
                if (onSaved)
                    onSaved({ id: initialData.id, ...payload });
            }
            else {
                const created = await create.mutateAsync(payload);
                if (onSaved)
                    onSaved(created);
            }
            onClose();
        }
        catch (err) {
            console.error('Erro ao salvar conta:', err);
            // More user-friendly message when backend returns 400 for invalid saldo format
            if (err?.response?.status === 400 && err?.response?.data) {
                alert('Falha ao salvar: valor inválido. Use ponto (.) como separador decimal ao digitar centavos.');
            }
            else {
                alert('Falha ao salvar: ' + (err?.response?.data?.detail || err?.message || 'erro desconhecido'));
            }
        }
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-bank me-2" }), "Banco"] }), _jsx(SelectDropdown, { options: bancoOptions.map((i) => ({ value: i.id, label: `${i.codigo_bacen} — ${i.nome}` })), value: bancoId ?? '', onChange: (v) => {
                            const id = v === '' ? null : Number(v);
                            setBancoId(id);
                            const sel = bancoOptions.find((it) => it.id === id);
                            setBanco(sel ? `${sel.codigo_bacen} — ${sel.nome}` : '');
                        }, placeholder: "Selecione institui\u00E7\u00E3o (nome ou c\u00F3digo)", searchable: true, onSearch: async (term) => {
                            const results = await ComercialService.getInstituicoes({ busca: term });
                            // Adicionar resultados ao cache
                            setBancoOptions(prev => {
                                const map = new Map(prev.map(item => [item.id, item]));
                                results.forEach((r) => map.set(r.id, r));
                                return Array.from(map.values());
                            });
                            return results.map((r) => ({ value: r.id, label: `${r.codigo_bacen} — ${r.nome}` }));
                        } }), errors.banco && _jsx("div", { className: "invalid-feedback", children: errors.banco })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Ag\u00EAncia" }), _jsx("input", { name: "agencia", className: "form-control", value: agencia, onChange: (e) => setAgencia(e.target.value) })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Conta" }), _jsx("input", { name: "conta", className: `form-control ${errors.conta ? 'is-invalid' : ''}`, value: conta, onChange: (e) => setConta(e.target.value) }), errors.conta && _jsx("div", { className: "invalid-feedback", children: errors.conta })] }), _jsxs("div", { className: "row g-2 mb-3", children: [_jsxs("div", { className: "col", children: [_jsx("label", { className: "form-label", children: "Tipo" }), _jsxs("select", { className: "form-select", value: tipo, onChange: (e) => setTipo(e.target.value), children: [_jsx("option", { value: "corrente", children: "Conta Corrente" }), _jsx("option", { value: "poupanca", children: "Poupan\u00E7a" })] })] }), _jsxs("div", { className: "col", children: [_jsx("label", { className: "form-label", children: "Moeda" }), _jsx("input", { className: "form-control", value: moeda, onChange: (e) => setMoeda(e.target.value) })] })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-cash me-2" }), "Saldo Inicial"] }), _jsx("input", { className: "form-control", value: String(saldoInicial), onChange: (e) => setSaldoInicial(e.target.value), onBlur: (e) => setSaldoInicial(String(e.target.value).replace(/,/g, '.')) })] }), _jsxs("div", { className: "form-check mb-3", children: [_jsx("input", { className: "form-check-input", type: "checkbox", checked: ativo, onChange: (e) => setAtivo(e.target.checked), id: "conta-ativo" }), _jsx("label", { className: "form-check-label", htmlFor: "conta-ativo", children: "Ativo" })] }), _jsxs("div", { className: "d-flex justify-content-end gap-2", children: [_jsx("button", { className: "btn btn-outline-secondary", onClick: onClose, children: "Cancelar" }), _jsx("button", { className: "btn btn-primary", onClick: handleSave, children: isEdit ? 'Salvar' : 'Criar' })] })] }));
};
export default ContaForm;
