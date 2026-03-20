import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import TransportFields from '../../components/TransportFields';
import { useToast } from '../../hooks/useToast';
const EditMovimentacaoModal = ({ movimentacao: m, onClose, onSuccess }) => {
    const queryClient = useQueryClient();
    const { showError, showSuccess } = useToast();
    const [formState, setFormState] = useState({
        transporte: {
            placa: m.placa || m.transporte?.placa || '',
            motorista: m.motorista || m.transporte?.motorista || '',
            tara: Number(m.tara ?? m.transporte?.tara ?? 0),
            peso_bruto: Number(m.peso_bruto ?? m.transporte?.peso_bruto ?? 0),
            descontos: Number(m.descontos ?? m.transporte?.descontos ?? 0),
            custo_transporte: Number(m.custo_transporte ?? m.transporte?.custo_transporte ?? 0),
            custo_transporte_unidade: m.custo_transporte_unidade || 'total',
        },
        condicoes_graos: m.condicoes_graos || '',
        destino_tipo: m.destino_tipo || 'armazenagem_interna',
        local_tipo: 'armazem',
        local_destino: m.local_destino ?? undefined,
        empresa_destino: m.empresa_destino ?? undefined,
        nf_provisoria: m.nf_provisoria || '',
        contrato_ref: m.contrato_ref || '',
    });
    const { data: locais = [] } = useQuery({
        queryKey: ['locais-armazenamento'],
        queryFn: async () => {
            const r = await api.get('estoque/locais-armazenamento/');
            return r.data;
        },
    });
    const { data: empresas = [] } = useQuery({
        queryKey: ['fornecedores-select'],
        queryFn: async () => {
            const r = await api.get('comercial/fornecedores/?page_size=200&status=ativo');
            const d = r.data;
            return (Array.isArray(d) ? d : (d.results || []));
        },
    });
    const mutation = useMutation({
        mutationFn: async (payload) => api.patch(`agricultura/movimentacoes-carga/${m.id}/`, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['harvest-sessions'] });
            queryClient.invalidateQueries({ queryKey: ['movimentacoes-carga'] });
            showSuccess('Movimentação atualizada com sucesso');
            onSuccess();
            onClose();
        },
        onError: (error) => {
            console.error('[EditMovimentacao] error', error);
            const fallback = 'Erro ao atualizar movimentação';
            const msg = typeof error === 'string'
                ? error
                : typeof error === 'object' && error !== null
                    ? JSON.stringify(error)
                    : fallback;
            showError(msg);
        },
    });
    const handleSubmit = (e) => {
        e.preventDefault();
        if (formState.destino_tipo === 'armazenagem_interna' && !formState.local_destino) {
            showError('Selecione o local de destino para armazenamento interno');
            return;
        }
        if ((formState.destino_tipo === 'contrato_industria' || formState.destino_tipo === 'armazenagem_geral') &&
            !formState.empresa_destino) {
            showError('Selecione a empresa/prestador responsável');
            return;
        }
        const payload = {
            placa: formState.transporte.placa ?? null,
            motorista: formState.transporte.motorista ?? null,
            tara: formState.transporte.tara ?? 0,
            peso_bruto: formState.transporte.peso_bruto ?? 0,
            descontos: formState.transporte.descontos ?? 0,
            custo_transporte: formState.transporte.custo_transporte ?? 0,
            custo_transporte_unidade: formState.transporte.custo_transporte_unidade ?? 'total',
            condicoes_graos: formState.condicoes_graos || null,
            destino_tipo: formState.destino_tipo || null,
            local_destino: formState.destino_tipo === 'armazenagem_interna' ? (formState.local_destino || null) : null,
            empresa_destino: formState.destino_tipo === 'contrato_industria' || formState.destino_tipo === 'armazenagem_geral'
                ? (formState.empresa_destino || null)
                : null,
            nf_provisoria: formState.nf_provisoria || null,
            contrato_ref: formState.contrato_ref || null,
        };
        mutation.mutate(payload);
    };
    return (_jsx("div", { className: "modal show d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, onClick: onClose, children: _jsx("div", { className: "modal-dialog modal-dialog-centered modal-lg", onClick: (e) => e.stopPropagation(), children: _jsx("div", { className: "modal-content", style: { display: 'flex', flexDirection: 'column', maxHeight: '90vh' }, children: _jsxs("form", { onSubmit: handleSubmit, style: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsxs("div", { className: "modal-header bg-warning bg-opacity-10", children: [_jsxs("h5", { className: "modal-title", children: [_jsx("i", { className: "bi bi-pencil me-2" }), "Editar Movimenta\u00E7\u00E3o #", m.id] }), _jsx("button", { type: "button", className: "btn-close", onClick: onClose })] }), _jsxs("div", { className: "modal-body", style: { overflowY: 'auto', flex: '1', backgroundColor: '#fff' }, children: [_jsxs("div", { className: "alert alert-info py-2 mb-3", children: [_jsx("strong", { children: "Talh\u00E3o:" }), " ", m.talhao_name || (m.talhao ? `Talhão ${m.talhao}` : '—')] }), _jsx(TransportFields, { value: formState.transporte, onChange: (v) => setFormState((s) => ({ ...s, transporte: v })), showMotorista: true, showDescontos: true, showCusto: true }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Condi\u00E7\u00F5es dos Gr\u00E3os" }), _jsx("textarea", { className: "form-control", rows: 2, value: formState.condicoes_graos, onChange: (e) => setFormState((s) => ({ ...s, condicoes_graos: e.target.value })) })] }), _jsx("hr", {}), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Tipo de destino" }), _jsxs("select", { className: "form-select", value: formState.destino_tipo, onChange: (e) => setFormState((s) => ({ ...s, destino_tipo: e.target.value })), children: [_jsx("option", { value: "armazenagem_interna", children: "Armazenamento na propriedade" }), _jsx("option", { value: "contrato_industria", children: "Contrato direto com ind\u00FAstria" }), _jsx("option", { value: "armazenagem_geral", children: "Armaz\u00E9m geral (terceiro)" })] })] }), formState.destino_tipo === 'armazenagem_interna' && (_jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Tipo de local" }), _jsxs("select", { className: "form-select", value: formState.local_tipo, onChange: (e) => setFormState((s) => ({ ...s, local_tipo: e.target.value })), children: [_jsx("option", { value: "silo_bolsa", children: "Silo Bolsa" }), _jsx("option", { value: "armazem", children: "Armaz\u00E9m" })] }), _jsxs("label", { className: "form-label mt-2", children: ["Local de destino ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("select", { className: "form-select", value: formState.local_destino || '', onChange: (e) => setFormState((s) => ({
                                                ...s,
                                                local_destino: e.target.value ? Number(e.target.value) : undefined,
                                            })), children: [_jsx("option", { value: "", children: "Selecione um local" }), locais.map((l) => (_jsxs("option", { value: l.id, children: [l.nome, " (", l.tipo, ")"] }, l.id)))] })] })), (formState.destino_tipo === 'contrato_industria' || formState.destino_tipo === 'armazenagem_geral') && (_jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: ["Empresa/Prestador ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("select", { className: "form-select", value: formState.empresa_destino || '', onChange: (e) => setFormState((s) => ({
                                                ...s,
                                                empresa_destino: e.target.value ? Number(e.target.value) : undefined,
                                            })), children: [_jsx("option", { value: "", children: "Selecione uma empresa" }), empresas.map((emp) => (_jsx("option", { value: emp.id, children: emp.nome }, emp.id)))] }), _jsx("label", { className: "form-label mt-2", children: "NF provis\u00F3ria (opcional)" }), _jsx("input", { className: "form-control", value: formState.nf_provisoria, onChange: (e) => setFormState((s) => ({ ...s, nf_provisoria: e.target.value })) })] }))] }), _jsxs("div", { className: "modal-footer", style: { flexShrink: 0, backgroundColor: '#fff', borderTop: '1px solid var(--bs-border-color)' }, children: [_jsx("button", { type: "button", className: "btn btn-outline-secondary", onClick: onClose, children: "Cancelar" }), _jsx("button", { type: "submit", className: "btn btn-warning", disabled: Boolean(mutation.isPending), children: mutation.isPending ? 'Salvando...' : 'Salvar Alterações' })] })] }) }) }) }));
};
export default EditMovimentacaoModal;
