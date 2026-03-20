import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import financeiroService from '@/services/financeiro';
import { useQueryClient } from '@tanstack/react-query';
import { useApiQuery } from '@/hooks/useApi';
import { toast } from 'react-hot-toast';
const VencimentoForm = ({ initialData, onClose, onSaved }) => {
    const queryClient = useQueryClient();
    const isEdit = !!initialData;
    const [titulo, setTitulo] = useState(initialData?.titulo || '');
    const [descricao, setDescricao] = useState(initialData?.descricao || '');
    const [valor, setValor] = useState(initialData?.valor || '');
    const [dataVencimento, setDataVencimento] = useState(initialData?.data_vencimento || '');
    const [tipo, setTipo] = useState(initialData?.tipo || 'despesa');
    const [status, setStatus] = useState(initialData?.status || 'pendente');
    const [contaId, setContaId] = useState(initialData?.conta_bancaria || null);
    const [talhaoId, setTalhaoId] = useState(initialData?.talhao || null);
    const [errors, setErrors] = useState({});
    // Fetch contas bancárias e talhões
    const { data: contas = [] } = useApiQuery(['contas-bancarias'], '/financeiro/contas/');
    const { data: talhoes = [], isLoading: loadingTalhoes } = useApiQuery(['talhoes'], '/talhoes/');
    const validate = () => {
        const e = {};
        if (!titulo.trim())
            e.titulo = 'Título é obrigatório';
        if (!valor || isNaN(Number(valor)) || Number(valor) <= 0)
            e.valor = 'Valor deve ser maior que zero';
        if (!dataVencimento)
            e.dataVencimento = 'Data de vencimento é obrigatória';
        if (!contaId)
            e.contaId = 'Conta bancária é obrigatória';
        setErrors(e);
        return Object.keys(e).length === 0;
    };
    const handleSave = async () => {
        console.log('=== DEBUG VencimentoForm - handleSave ===');
        console.log('Estado atual:', { titulo, descricao, valor, dataVencimento, tipo, status, contaId, talhaoId });
        if (!validate()) {
            console.error('❌ Validação falhou:', errors);
            return;
        }
        console.log('✅ Validação passou');
        const payload = {
            titulo,
            descricao,
            valor: Number(valor),
            data_vencimento: dataVencimento,
            tipo,
            status,
            conta_bancaria: contaId,
        };
        // Only add talhao if it's set
        if (talhaoId !== null) {
            payload.talhao = talhaoId;
        }
        console.log('📦 Payload montado:', payload);
        console.log('🔄 Modo:', isEdit ? 'EDIÇÃO' : 'CRIAÇÃO');
        try {
            if (isEdit && initialData?.id) {
                console.log('🔧 Atualizando vencimento ID:', initialData.id);
                await financeiroService.updateVencimento(initialData.id, payload);
                console.log('✅ Atualização bem-sucedida');
                toast.success('Vencimento atualizado com sucesso!');
                if (onSaved)
                    onSaved({ id: initialData.id, ...payload });
            }
            else {
                console.log('➕ Criando novo vencimento...');
                const created = await financeiroService.createVencimento(payload);
                console.log('✅ Criação bem-sucedida:', created);
                toast.success('Vencimento criado com sucesso!');
                if (onSaved)
                    onSaved(created);
                // Update caches immediately: cancel in-flight vencimentos queries, then insert created item into matching caches
                try {
                    const predicate = (query) => {
                        const key = query.queryKey;
                        return Array.isArray(key) && key[0] === 'financeiro' && key[1] === 'vencimentos';
                    };
                    // Cancel ongoing vencimentos queries to avoid race where an older in-flight response overwrites our inserted item
                    try {
                        await queryClient.cancelQueries({ predicate: predicate });
                        console.log('🛑 Cancelled in-flight vencimentos queries');
                    }
                    catch (e) {
                        console.warn('⚠️ Erro ao cancelar queries:', e);
                    }
                    const matched = queryClient.getQueryCache().findAll({ predicate: predicate });
                    console.log('🔍 Queries matched for cache update:', matched.map(q => q.queryKey));
                    matched.forEach(q => {
                        const key = q.queryKey;
                        // Strict validation: only operate on exact financeiro/vencimentos keys
                        if (!Array.isArray(key) || key[0] !== 'financeiro' || key[1] !== 'vencimentos')
                            return;
                        queryClient.setQueryData(key, (old) => {
                            if (!old)
                                return [created];
                            if (Array.isArray(old)) {
                                if (old.some((o) => o.id === created.id))
                                    return old;
                                console.log(`🔄 Inserting created id=${created.id} into cache key`, key, 'oldLen=', old.length);
                                return [created, ...old];
                            }
                            return old;
                        });
                    });
                }
                catch (e) {
                    console.warn('⚠️ Erro ao atualizar cache localmente:', e);
                }
            }
            console.log('🔄 Invalidando cache de queries...');
            // Invalidate all vencimentos queries regardless of pageSize
            const predicate = (query) => {
                const key = query.queryKey;
                return Array.isArray(key) && key[0] === 'financeiro' && key[1] === 'vencimentos';
            };
            queryClient.invalidateQueries({ predicate: predicate });
            // Log which queries matched and force refetch to ensure UI updates
            try {
                const matched = queryClient.getQueryCache().findAll({ predicate: predicate });
                console.log('🔍 Queries matched for refetch:', matched.map(q => q.queryKey));
                await queryClient.refetchQueries({ predicate: predicate });
                console.log('✅ Refetch triggered for matched queries');
            }
            catch (e) {
                console.warn('⚠️ Erro ao forçar refetch:', e);
            }
            console.log('🚪 Fechando modal...');
            onClose();
            console.log('=== FIM DEBUG handleSave - SUCESSO ===');
        }
        catch (err) {
            console.error('❌ ERRO ao salvar vencimento:', err);
            console.error('Detalhes do erro:', {
                response: err?.response,
                data: err?.response?.data,
                status: err?.response?.status,
                headers: err?.response?.headers,
                message: err?.message,
            });
            const errorMsg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'erro desconhecido';
            toast.error('Falha ao salvar: ' + errorMsg);
            console.log('=== FIM DEBUG handleSave - ERRO ===');
        }
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-card-heading me-2" }), "T\u00EDtulo"] }), _jsx("input", { className: `form-control ${errors.titulo ? 'is-invalid' : ''}`, value: titulo, onChange: (e) => setTitulo(e.target.value), placeholder: "Ex: Pagamento Fornecedor XYZ" }), errors.titulo && _jsx("div", { className: "invalid-feedback", children: errors.titulo })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Descri\u00E7\u00E3o (opcional)" }), _jsx("textarea", { className: "form-control", rows: 2, value: descricao, onChange: (e) => setDescricao(e.target.value), placeholder: "Detalhes adicionais..." })] }), _jsxs("div", { className: "row g-2 mb-3", children: [_jsxs("div", { className: "col-md-6", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-cash me-2" }), "Valor"] }), _jsx("input", { type: "number", step: "0.01", className: `form-control ${errors.valor ? 'is-invalid' : ''}`, value: valor, onChange: (e) => setValor(e.target.value), placeholder: "0.00" }), errors.valor && _jsx("div", { className: "invalid-feedback", children: errors.valor })] }), _jsxs("div", { className: "col-md-6", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-calendar me-2" }), "Data de Vencimento"] }), _jsx("input", { type: "date", className: `form-control ${errors.dataVencimento ? 'is-invalid' : ''}`, value: dataVencimento, onChange: (e) => setDataVencimento(e.target.value) }), errors.dataVencimento && _jsx("div", { className: "invalid-feedback", children: errors.dataVencimento })] })] }), _jsxs("div", { className: "row g-2 mb-3", children: [_jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label", children: "Tipo" }), _jsxs("select", { className: "form-select", value: tipo, onChange: (e) => setTipo(e.target.value), children: [_jsx("option", { value: "receita", children: "Receita" }), _jsx("option", { value: "despesa", children: "Despesa" })] })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label", children: "Status" }), _jsxs("select", { className: "form-select", value: status, onChange: (e) => setStatus(e.target.value), children: [_jsx("option", { value: "pendente", children: "Pendente" }), _jsx("option", { value: "pago", children: "Pago" }), _jsx("option", { value: "cancelado", children: "Cancelado" })] })] })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-bank me-2" }), "Conta Banc\u00E1ria"] }), _jsxs("select", { className: `form-select ${errors.contaId ? 'is-invalid' : ''}`, value: contaId ?? '', onChange: (e) => setContaId(e.target.value ? Number(e.target.value) : null), children: [_jsx("option", { value: "", children: "Selecione uma conta..." }), contas.map((c) => (_jsxs("option", { value: c.id, children: [c.banco, " - ", c.agencia, " / ", c.conta] }, c.id)))] }), errors.contaId && _jsx("div", { className: "invalid-feedback", children: errors.contaId })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-geo-alt me-2" }), "Talh\u00E3o (opcional)"] }), _jsxs("select", { className: "form-select", value: talhaoId ?? '', onChange: (e) => setTalhaoId(e.target.value ? Number(e.target.value) : null), disabled: loadingTalhoes, children: [_jsx("option", { value: "", children: loadingTalhoes ? 'Carregando...' : talhoes.length === 0 ? 'Nenhum talhão cadastrado' : 'Selecione um talhão' }), !loadingTalhoes && talhoes.map((t) => (_jsx("option", { value: t.id, children: t.nome }, t.id)))] }, `talhoes-${talhoes.length}`), !loadingTalhoes && talhoes.length === 0 && (_jsx("small", { className: "text-muted d-block mt-1", children: "\uD83D\uDCA1 Cadastre talh\u00F5es em Fazendas para vincular vencimentos" }))] }), _jsxs("div", { className: "d-flex justify-content-end gap-2", children: [_jsx("button", { className: "btn btn-outline-secondary", onClick: onClose, children: "Cancelar" }), _jsx("button", { className: "btn btn-primary", onClick: handleSave, children: isEdit ? 'Salvar' : 'Criar' })] })] }));
};
export default VencimentoForm;
