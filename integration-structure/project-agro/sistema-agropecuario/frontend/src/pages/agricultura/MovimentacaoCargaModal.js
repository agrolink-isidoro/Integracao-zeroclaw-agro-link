import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import TransportFields from '../../components/TransportFields';
import { useToast } from '../../hooks/useToast';
const MovimentacaoCargaModal = ({ onClose, onSuccess }) => {
    // DEBUG v2.0 - Log inicial para verificar se o código está sendo carregado
    console.log('🚀 MovimentacaoCargaModal CARREGADO - v2.0');
    const queryClient = useQueryClient();
    const [formState, setFormState] = useState({
        session: undefined,
        session_item: undefined,
        talhao: undefined,
        transporte: {},
        condicoes_graos: undefined,
        destino_tipo: 'armazenagem_interna',
        local_tipo: 'silo_bolsa',
        local_destino: undefined,
        contrato_ref: undefined,
        empresa_destino: undefined,
        nf_provisoria: undefined,
        peso_estimado: undefined
    });
    console.log('📋 Estado inicial do formulário:', formState);
    const { data: sessions = [] } = useQuery({
        queryKey: ['harvest-sessions'],
        queryFn: async () => {
            const r = await api.get('/agricultura/harvest-sessions/');
            console.log('=== SESSÕES RECEBIDAS DO BACKEND ===');
            console.log('Total de sessões:', r.data?.length || 0);
            console.log('Sessões:', r.data);
            return r.data;
        }
    });
    // Only show sessions that are not finished or cancelled
    const selectableSessions = (sessions || []).filter((s) => {
        const status = s.status || '';
        const isSelectable = !['finalizada', 'cancelada'].includes(status);
        console.log(`Sessão ${s.id} (${s.plantio_nome}) - status: "${status}" - selecionável: ${isSelectable}`);
        return isSelectable;
    });
    // Fetch storage locals and companies for destination selection
    const { data: locais = [] } = useQuery({ queryKey: ['locais-armazenamento'], queryFn: async () => { const r = await api.get('estoque/locais-armazenamento/'); return r.data; } });
    // Busca fornecedores (empresas/terceiros) cadastrados para preencher o campo Empresa/Prestador
    const { data: empresas = [] } = useQuery({
        queryKey: ['fornecedores-select'],
        queryFn: async () => {
            const r = await api.get('comercial/fornecedores/?page_size=200&status=ativo');
            const d = r.data;
            // suporta resposta paginada { results: [...] } e array direto
            return (Array.isArray(d) ? d : (d.results || []));
        }
    });
    const { data: sessionDetail = null, refetch } = useQuery({
        queryKey: ['harvest-session', formState.session],
        queryFn: async () => {
            if (!formState.session)
                return null;
            const r = await api.get(`agricultura/harvest-sessions/${formState.session}/`);
            return r.data;
        },
        enabled: !!formState.session
    });
    // Compute a default session item id (first pending/colhido) without mutating state inside an effect
    const defaultSessionItemId = React.useMemo(() => {
        if (sessionDetail && Array.isArray(sessionDetail.itens) && sessionDetail.itens.length > 0) {
            const firstPending = sessionDetail.itens.find((i) => i.status === 'pendente' || i.status === 'colhido');
            return firstPending ? firstPending.id : undefined;
        }
        return undefined;
    }, [sessionDetail]);
    // Auto-set session_item and talhao when sessionDetail loads with default item
    React.useEffect(() => {
        if (defaultSessionItemId && sessionDetail?.itens) {
            const defaultItem = sessionDetail.itens.find((i) => i.id === defaultSessionItemId);
            if (defaultItem) {
                console.log('=== AUTO-SELEÇÃO DE ITEM PADRÃO ===');
                console.log('Item padrão:', defaultItem);
                console.log('Talhão do item:', defaultItem.talhao);
                console.log('===================================');
                setFormState((s) => {
                    // Só configura se ainda não há item selecionado
                    if (!s.session_item) {
                        return {
                            ...s,
                            session_item: defaultItem.id,
                            talhao: defaultItem.talhao
                        };
                    }
                    return s;
                });
            }
        }
    }, [defaultSessionItemId, sessionDetail]);
    // Note: destination fields reset is performed when the user changes the session (in the select onChange) to avoid setState inside an effect.
    const { showError, showSuccess } = useToast();
    const mutation = useMutation({
        mutationFn: async (payload) => api.post('agricultura/movimentacoes-carga/', payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['harvest-sessions'] });
            queryClient.invalidateQueries({ queryKey: ['movimentacoes-carga'] });
            showSuccess('Movimentação registrada com sucesso');
            onSuccess();
            onClose();
        },
        onError: (error) => {
            console.error('[MovimentacaoCarga] submit error', error);
            // Provide a best-effort message without relying on any-typed access
            const fallback = 'Erro ao registrar movimentação';
            const msg = typeof error === 'string' ? error : (typeof error === 'object' && error !== null) ? JSON.stringify(error) : fallback;
            showError(msg);
        }
    });
    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('=== SUBMIT DEBUG ===');
        console.log('formState completo:', formState);
        console.log('session_item:', formState.session_item);
        console.log('talhao:', formState.talhao);
        console.log('===================');
        // Ensure either a session item or an explicit talhão is provided
        if (!formState.session_item && !formState.talhao) {
            showError('Selecione o item da sessão ou informe o talhão antes de registrar a movimentação');
            return;
        }
        // Client-side validation for destination
        if (formState.destino_tipo === 'armazenagem_interna' && !formState.local_destino) {
            showError('Selecione o local de destino para armazenamento interno');
            return;
        }
        if ((formState.destino_tipo === 'contrato_industria' || formState.destino_tipo === 'armazenagem_geral') && !formState.empresa_destino) {
            showError('Selecione a empresa/prestador responsável');
            return;
        }
        const payload = {
            session_item: formState.session_item || null,
            talhao: formState.talhao || null,
            transporte: formState.transporte || null,
            condicoes_graos: formState.condicoes_graos || null,
            destino_tipo: formState.destino_tipo || null,
            contrato_ref: formState.contrato_ref || null,
            empresa_destino: formState.empresa_destino || null,
            local_tipo: formState.local_tipo || null,
            local_destino: formState.local_destino || null,
            nf_provisoria: formState.nf_provisoria || null,
            peso_estimado: formState.peso_estimado || null
        };
        // Keep backwards-compat keys for older clients optionally
        if (formState.transporte) {
            payload.placa = formState.transporte.placa ?? null;
            payload.motorista = formState.transporte.motorista ?? null;
            payload.tara = formState.transporte.tara ?? null;
            payload.peso_bruto = formState.transporte.peso_bruto ?? null;
            payload.descontos = formState.transporte.descontos ?? 0;
            payload.custo_transporte = formState.transporte.custo_transporte ?? null;
            payload.custo_transporte_unidade = formState.transporte.custo_transporte_unidade ?? null;
        }
        console.debug('[MovimentacaoCarga] submit payload:', payload);
        mutation.mutate(payload);
    };
    return (_jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: "Nova Movimenta\u00E7\u00E3o de Carga" }), _jsx("button", { type: "button", className: "btn-close", onClick: onClose })] }), _jsxs("div", { className: "modal-body p-3 p-md-4", children: [_jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Sess\u00E3o de Colheita" }), _jsxs("select", { className: "form-select", value: formState.session || '', onChange: (e) => {
                                    const val = e.target.value ? Number(e.target.value) : undefined;
                                    setFormState((s) => ({
                                        ...s,
                                        session: val,
                                        session_item: undefined,
                                        talhao: undefined,
                                        local_destino: undefined,
                                        empresa_destino: undefined,
                                        nf_provisoria: undefined,
                                        peso_estimado: undefined
                                    }));
                                    refetch();
                                }, children: [_jsx("option", { value: "", children: "Selecione a sess\u00E3o" }), selectableSessions.map((s) => (_jsx("option", { value: s.id, children: `${s.plantio_nome} - ${s.data_inicio} (${s.status})` }, s.id)))] })] }), sessionDetail && (_jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Item da Sess\u00E3o" }), Array.isArray(sessionDetail.itens) && sessionDetail.itens.length > 0 ? (_jsxs("select", { className: "form-select", value: formState.session_item || '', onChange: (e) => {
                                    const selectedId = e.target.value ? Number(e.target.value) : undefined;
                                    const selectedItem = sessionDetail.itens?.find((it) => it.id === selectedId);
                                    const talhao = selectedItem?.talhao;
                                    console.log('=== SELEÇÃO DE ITEM ===');
                                    console.log('ID selecionado:', selectedId);
                                    console.log('Item encontrado:', selectedItem);
                                    console.log('Talhão do item:', talhao);
                                    console.log('=======================');
                                    setFormState((s) => ({ ...s, session_item: selectedId, talhao }));
                                }, children: [_jsx("option", { value: "", children: "Selecione item" }), sessionDetail.itens?.map((it) => (_jsxs("option", { value: it.id, children: [it.talhao_name || it.talhao, " - ", it.quantidade_colhida || 0, "kg - ", it.status] }, it.id)))] })) : (_jsx("div", { className: "alert alert-warning", children: "Sess\u00E3o selecionada n\u00E3o tem talh\u00F5es iniciados. Inicie a sess\u00E3o com talh\u00F5es antes de registrar movimenta\u00E7\u00E3o." }))] })), _jsx(TransportFields, { value: formState.transporte, onChange: (v) => setFormState((s) => ({ ...s, transporte: v })), showMotorista: true, showDescontos: true, showCusto: true }), _jsx("hr", {}), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Tipo de destino" }), _jsxs("select", { "aria-label": "Tipo de destino", className: "form-select", value: formState.destino_tipo, onChange: (e) => setFormState((s) => ({ ...s, destino_tipo: e.target.value })), children: [_jsx("option", { value: "armazenagem_interna", children: "Armazenamento na propriedade" }), _jsx("option", { value: "contrato_industria", children: "Contrato direto com ind\u00FAstria" }), _jsx("option", { value: "armazenagem_geral", children: "Armaz\u00E9m geral (terceiro)" })] })] }), formState.destino_tipo === 'armazenagem_interna' && (_jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Tipo de local" }), _jsxs("select", { className: "form-select", value: formState.local_tipo, onChange: (e) => setFormState((s) => ({ ...s, local_tipo: e.target.value })), children: [_jsx("option", { value: "silo_bolsa", children: "Silo Bolsa" }), _jsx("option", { value: "armazem", children: "Armaz\u00E9m" })] }), _jsxs("label", { className: "form-label mt-2", children: ["Local de destino ", _jsx("span", { className: "text-danger", children: "*" })] }), locais.length === 0 ? (_jsx("select", { className: "form-select", disabled: true, children: _jsx("option", { children: "Nenhum local de armazenamento cadastrado" }) })) : (_jsxs("select", { className: "form-select", value: formState.local_destino || '', onChange: (e) => setFormState((s) => ({ ...s, local_destino: e.target.value ? Number(e.target.value) : undefined })), children: [_jsx("option", { value: "", children: "Selecione um local" }), locais.map((l) => (_jsxs("option", { value: l.id, children: [l.nome, " (", l.tipo, ")"] }, l.id)))] }))] })), (formState.destino_tipo === 'contrato_industria' || formState.destino_tipo === 'armazenagem_geral') && (_jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: ["Empresa/Prestador ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("select", { className: `form-select ${!formState.empresa_destino ? '' : ''}`, value: formState.empresa_destino || '', onChange: (e) => setFormState((s) => ({ ...s, empresa_destino: e.target.value ? Number(e.target.value) : undefined })), children: [_jsx("option", { value: "", children: "Selecione uma empresa" }), empresas.map((emp) => (_jsx("option", { value: emp.id, children: emp.nome }, emp.id)))] }), _jsx("label", { className: "form-label mt-2", children: "NF provis\u00F3ria (opcional)" }), _jsx("input", { className: "form-control", value: formState.nf_provisoria || '', onChange: (e) => setFormState((s) => ({ ...s, nf_provisoria: e.target.value })) }), _jsxs("label", { className: "form-label mt-2", children: ["Peso estimado (kg) ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { type: "number", step: "0.01", className: `form-control ${!formState.peso_estimado ? '' : ''}`, value: formState.peso_estimado ?? '', onChange: (e) => setFormState((s) => ({ ...s, peso_estimado: e.target.value ? Number(e.target.value) : undefined })) })] }))] }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { type: "button", className: "btn btn-outline-secondary", onClick: onClose, disabled: Boolean(mutation.isLoading), children: "Cancelar" }), _jsx("button", { type: "submit", className: "btn btn-primary", disabled: Boolean(mutation.isLoading) || Boolean(sessionDetail && Array.isArray(sessionDetail.itens) && sessionDetail.itens.length === 0), "aria-disabled": Boolean(mutation.isLoading) || Boolean(sessionDetail && Array.isArray(sessionDetail.itens) && sessionDetail.itens.length === 0), children: mutation.isLoading ? 'Enviando...' : 'Registrar Movimentação' })] })] }));
};
export default MovimentacaoCargaModal;
