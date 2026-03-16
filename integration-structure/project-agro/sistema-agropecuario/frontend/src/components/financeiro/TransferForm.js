import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useMemo, useState } from 'react';
import { useApiCreate, useApiQuery } from '@/hooks/useApi';
/** Check if a string-like value is meaningful (not empty, null, undefined). */
const filled = (v) => typeof v === 'string' && v.trim().length > 0;
const TransferForm = ({ onClose, onSaved }) => {
    const { data: contas = [] } = useApiQuery(['contas-bancarias'], '/financeiro/contas/?page_size=1000');
    const { data: fornecedores = [], isLoading: loadingFornecedores, error: errorFornecedores } = useApiQuery(['fornecedores'], '/comercial/fornecedores/?page_size=1000&status=ativo');
    const [contaOrigem, setContaOrigem] = useState('');
    const [contaDestino, setContaDestino] = useState('');
    const [tipo, setTipo] = useState('interno');
    const [valor, setValor] = useState('0.00');
    const [descricao, setDescricao] = useState('');
    const [pixOrigem, setPixOrigem] = useState('');
    const [pixDestino, setPixDestino] = useState('');
    const [fornecedorId, setFornecedorId] = useState('');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const isPix = tipo === 'pix';
    const isExternal = tipo === 'doc' || tipo === 'ted';
    const showFornecedor = tipo !== 'interno';
    const requireContaDestino = !isPix;
    const createTransfer = useApiCreate('/financeiro/transferencias/', [['transferencias']]);
    // --- Derive selected fornecedor's payment capabilities ---
    const selectedFornecedor = fornecedorId ? fornecedores.find((f) => f.id === fornecedorId) : null;
    const fornBankData = selectedFornecedor?.dados_bancarios;
    const fornHasBank = useMemo(() => {
        if (!fornBankData)
            return false;
        return filled(fornBankData.banco) && filled(fornBankData.agencia) && filled(fornBankData.conta);
    }, [fornBankData]);
    const fornHasPix = useMemo(() => {
        if (!fornBankData)
            return false;
        return filled(fornBankData.chave_pix);
    }, [fornBankData]);
    // True when a fornecedor is selected but has NO payment data at all
    const fornMissingData = !!fornecedorId && !fornHasBank && !fornHasPix;
    // --- Reset errors on field change ---
    useEffect(() => {
        setErrors({});
    }, [tipo, pixOrigem, pixDestino, contaOrigem, contaDestino, valor, fornecedorId]);
    // --- When a fornecedor is selected, auto-detect payment method ---
    useEffect(() => {
        if (!fornecedorId || !fornBankData)
            return;
        const hasBank = filled(fornBankData.banco) && filled(fornBankData.agencia) && filled(fornBankData.conta);
        const hasPix = filled(fornBankData.chave_pix);
        if (hasBank && !hasPix) {
            // Only bank data → switch to TED
            setTipo('ted');
        }
        else if (hasPix && !hasBank) {
            // Only PIX → switch to PIX and auto-fill key
            setTipo('pix');
            setPixDestino(fornBankData.chave_pix);
        }
        else if (hasPix && hasBank) {
            // Both available → default to TED if currently interno
            if (tipo === 'interno') {
                setTipo('ted');
            }
            if (tipo === 'pix') {
                setPixDestino(fornBankData.chave_pix);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fornecedorId]);
    // When switching to PIX and fornecedor has pix, auto-fill
    useEffect(() => {
        if (isPix && fornBankData && filled(fornBankData.chave_pix) && !pixDestino) {
            setPixDestino(fornBankData.chave_pix);
        }
    }, [isPix, fornBankData, pixDestino]);
    const validate = () => {
        const e = {};
        if (!contaOrigem)
            e.conta_origem = 'Conta de origem obrigatória';
        if (requireContaDestino && !contaDestino)
            e.conta_destino = 'Conta de destino obrigatória';
        if (contaOrigem && contaDestino && contaOrigem === contaDestino)
            e.conta_destino = 'Conta de destino deve ser diferente da origem';
        if (!valor || isNaN(Number(String(valor))) || Number(String(valor)) <= 0)
            e.valor = 'Valor inválido';
        if (isPix) {
            if (!pixOrigem)
                e.pix_key_origem = 'Chave PIX de origem obrigatória para transferências PIX';
            if (!pixDestino)
                e.pix_key_destino = 'Chave PIX de destino obrigatória para transferências PIX';
        }
        if (isExternal && !fornecedorId) {
            e.fornecedor_id = 'Fornecedor é obrigatório para transferências DOC/TED';
        }
        // Block if fornecedor has no payment data
        if (fornMissingData && showFornecedor) {
            e.fornecedor_id = 'Dados bancários não disponíveis. Favor informar no cadastro do fornecedor.';
        }
        return e;
    };
    const handleSubmit = async () => {
        const e = validate();
        if (Object.keys(e).length) {
            setErrors(e);
            return;
        }
        setSaving(true);
        try {
            const payload = {
                conta_origem: contaOrigem,
                tipo_transferencia: tipo,
                valor: Number(String(valor)),
                descricao: descricao || undefined,
            };
            if (contaDestino) {
                payload.conta_destino = contaDestino;
            }
            else {
                payload.conta_destino = null;
            }
            if (isPix) {
                payload.pix_key_origem = pixOrigem;
                payload.pix_key_destino = pixDestino;
            }
            if (fornecedorId) {
                payload.fornecedor_id = fornecedorId;
            }
            const res = await createTransfer.mutateAsync(payload);
            if (onSaved)
                onSaved(res);
            onClose();
        }
        catch (err) {
            const data = err?.response?.data || err?.data || null;
            if (data && typeof data === 'object') {
                const eMap = {};
                Object.entries(data).forEach(([k, v]) => { eMap[k] = String(v); });
                setErrors(eMap);
            }
            else {
                alert('Erro ao criar transferência: ' + (err?.message || String(err)));
            }
        }
        finally {
            setSaving(false);
        }
    };
    // --- Determine which tipo options are available based on fornecedor data ---
    const tipoOptions = useMemo(() => {
        const base = [
            { value: 'interno', label: 'Interno' },
            { value: 'doc', label: 'DOC' },
            { value: 'ted', label: 'TED' },
            { value: 'pix', label: 'PIX' },
        ];
        if (!fornecedorId)
            return base;
        // When fornecedor is selected, filter to available methods
        const available = [];
        if (fornHasBank) {
            available.push({ value: 'doc', label: 'DOC' });
            available.push({ value: 'ted', label: 'TED' });
        }
        if (fornHasPix) {
            available.push({ value: 'pix', label: 'PIX' });
        }
        // If nothing available, show all (validation will block)
        if (available.length === 0)
            return base;
        return available;
    }, [fornecedorId, fornHasBank, fornHasPix]);
    return (_jsx("div", { className: "modal show d-block", tabIndex: -1, role: "dialog", children: _jsx("div", { className: "modal-dialog", role: "document", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: "Nova Transfer\u00EAncia" }), _jsx("button", { type: "button", className: "btn-close", "aria-label": "Close", onClick: onClose })] }), _jsxs("div", { className: "modal-body", children: [_jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-tag me-2" }), "Tipo"] }), _jsx("select", { name: "tipo", className: "form-select", value: tipo, onChange: (e) => setTipo(e.target.value), children: tipoOptions.map(o => _jsx("option", { value: o.value, children: o.label }, o.value)) })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-bank me-2" }), "Conta Origem"] }), _jsxs("select", { name: "conta_origem", className: "form-select", value: contaOrigem, onChange: (e) => setContaOrigem(e.target.value ? Number(e.target.value) : ''), children: [_jsx("option", { value: "", children: "Selecione..." }), contas.map(c => _jsxs("option", { value: c.id, children: [c.banco, " - ", c.conta] }, c.id))] }), errors.conta_origem && _jsx("div", { className: "text-danger small", children: errors.conta_origem })] }), showFornecedor && (_jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-people me-2" }), "Fornecedor ", isExternal && _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("select", { name: "fornecedor_id", className: "form-select", value: fornecedorId, onChange: (e) => setFornecedorId(e.target.value ? Number(e.target.value) : ''), children: [_jsx("option", { value: "", children: loadingFornecedores ? 'Carregando fornecedores...' : 'Selecione um fornecedor...' }), fornecedores.map((f) => (_jsxs("option", { value: f.id, children: [f.nome, f.cpf_cnpj ? ` (${f.cpf_cnpj})` : ''] }, f.id)))] }), errorFornecedores && (_jsx("div", { className: "text-danger small", children: "Erro ao carregar fornecedores. Tente recarregar a p\u00E1gina." })), errors.fornecedor_id && _jsx("div", { className: "text-danger small", children: errors.fornecedor_id }), fornMissingData && (_jsxs("div", { className: "alert alert-warning mt-2 mb-0 py-2 small", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-2" }), _jsx("strong", { children: "Dados banc\u00E1rios n\u00E3o dispon\u00EDveis." }), " Favor informar no cadastro do fornecedor antes de realizar a transfer\u00EAncia."] })), !fornecedorId && isExternal && (_jsxs("div", { className: "form-text text-muted small mt-1", children: [_jsx("i", { className: "bi bi-info-circle me-1" }), "Transfer\u00EAncias DOC/TED exigem v\u00EDnculo com um fornecedor cadastrado."] })), !fornecedorId && isPix && (_jsxs("div", { className: "form-text text-muted small mt-1", children: [_jsx("i", { className: "bi bi-info-circle me-1" }), "Vincular fornecedor \u00E9 opcional para PIX, mas facilita o rastreamento."] })), fornecedorId && !fornMissingData && fornBankData && (_jsxs("div", { className: "border rounded p-2 mt-2 bg-light small", children: [_jsxs("strong", { children: [_jsx("i", { className: "bi bi-credit-card me-1" }), "Dados banc\u00E1rios do fornecedor:"] }), fornHasBank && (_jsxs(_Fragment, { children: [_jsxs("div", { children: ["Banco: ", fornBankData.banco, " | Ag: ", fornBankData.agencia, " | Cc: ", fornBankData.conta] }), filled(fornBankData.tipo_conta) && _jsxs("div", { children: ["Tipo: ", fornBankData.tipo_conta] }), filled(fornBankData.titular) && _jsxs("div", { children: ["Titular: ", fornBankData.titular] })] })), fornHasPix && (_jsxs("div", { children: [_jsx("i", { className: "bi bi-qr-code me-1" }), "PIX (", fornBankData.tipo_chave_pix || 'chave', "): ", fornBankData.chave_pix] })), fornHasBank && fornHasPix && (_jsxs("div", { className: "text-success mt-1", children: [_jsx("i", { className: "bi bi-check-circle me-1" }), "Dados banc\u00E1rios e chave PIX dispon\u00EDveis. Selecione o tipo desejado acima."] }))] }))] })), !isPix && (_jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-bank me-2" }), "Conta Destino ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("select", { name: "conta_destino", className: "form-select", value: contaDestino, onChange: (e) => setContaDestino(e.target.value ? Number(e.target.value) : ''), children: [_jsx("option", { value: "", children: "Selecione..." }), contas.map(c => _jsxs("option", { value: c.id, children: [c.banco, " - ", c.conta] }, c.id))] }), errors.conta_destino && _jsx("div", { className: "text-danger small", children: errors.conta_destino })] })), isPix && (_jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-bank me-2" }), "Conta Destino ", _jsx("span", { className: "text-muted small", children: "(opcional)" })] }), _jsxs("select", { name: "conta_destino", className: "form-select", value: contaDestino, onChange: (e) => setContaDestino(e.target.value ? Number(e.target.value) : ''), children: [_jsx("option", { value: "", children: "Nenhuma (sa\u00EDda via PIX)" }), contas.map(c => _jsxs("option", { value: c.id, children: [c.banco, " - ", c.conta] }, c.id))] }), _jsxs("div", { className: "form-text text-muted small mt-1", children: [_jsx("i", { className: "bi bi-info-circle me-1" }), "PIX n\u00E3o exige conta de destino interna \u2014 o dinheiro sai pela chave PIX."] }), errors.conta_destino && _jsx("div", { className: "text-danger small", children: errors.conta_destino })] })), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-cash me-2" }), "Valor"] }), _jsx("input", { name: "valor", placeholder: "Valor", className: "form-control", value: valor, onChange: (e) => setValor(e.target.value) }), errors.valor && _jsx("div", { className: "text-danger small", children: errors.valor })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Descri\u00E7\u00E3o (opcional)" }), _jsx("input", { className: "form-control", value: descricao, onChange: (e) => setDescricao(e.target.value) })] }), isPix && (_jsxs("div", { className: "border rounded p-2 mb-3", children: [_jsx("div", { className: "mb-2", children: _jsx("strong", { children: "Chaves PIX (obrigat\u00F3rias para PIX)" }) }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Chave PIX Origem" }), _jsx("input", { name: "pix_key_origem", placeholder: "Chave PIX Origem", className: "form-control", value: pixOrigem, onChange: (e) => setPixOrigem(e.target.value) }), errors.pix_key_origem && _jsx("div", { className: "text-danger small", children: errors.pix_key_origem })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Chave PIX Destino" }), _jsx("input", { name: "pix_key_destino", placeholder: "Chave PIX Destino", className: "form-control", value: pixDestino, onChange: (e) => setPixDestino(e.target.value) }), errors.pix_key_destino && _jsx("div", { className: "text-danger small", children: errors.pix_key_destino })] })] }))] }), _jsxs("div", { className: "modal-footer d-flex flex-column flex-sm-row gap-2", children: [_jsx("button", { className: "btn btn-secondary", onClick: onClose, disabled: saving, children: "Cancelar" }), _jsx("button", { className: "btn btn-primary", onClick: handleSubmit, disabled: saving || (fornMissingData && showFornecedor), children: saving ? 'Enviando...' : 'Enviar Transferência' })] })] }) }) }));
};
export default TransferForm;
