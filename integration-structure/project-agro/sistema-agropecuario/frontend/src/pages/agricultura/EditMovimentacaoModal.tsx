import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import TransportFields from '../../components/TransportFields';
import { useToast } from '../../hooks/useToast';

interface MovimentacaoCarga {
  id: number;
  session_item?: number | null;
  talhao?: number | null;
  talhao_name?: string;
  placa?: string;
  motorista?: string;
  tara?: number | null;
  peso_bruto?: number | null;
  peso_liquido?: number | null;
  descontos?: number | null;
  custo_transporte?: number | null;
  custo_transporte_unidade?: string;
  condicoes_graos?: string;
  destino_tipo?: string;
  empresa_destino?: number | null;
  empresa_destino_nome?: string;
  local_destino?: number | null;
  local_destino_nome?: string;
  contrato_ref?: string;
  nf_provisoria?: string;
  reconciled?: boolean;
  criado_em?: string;
  transporte?: {
    id?: number;
    placa?: string;
    motorista?: string;
    tara?: number | null;
    peso_bruto?: number | null;
    descontos?: number | null;
    custo_transporte?: number | null;
  } | null;
}

interface Props {
  movimentacao: MovimentacaoCarga;
  onClose: () => void;
  onSuccess: () => void;
}

type TransportPayload = {
  placa?: string;
  motorista?: string;
  tara?: number;
  peso_bruto?: number;
  descontos?: number;
  custo_transporte?: number;
  custo_transporte_unidade?: 'unidade' | 'saca' | 'tonelada' | 'total';
};

type EditFormState = {
  transporte: TransportPayload;
  condicoes_graos: string;
  destino_tipo: string;
  local_tipo: 'silo_bolsa' | 'armazem';
  local_destino?: number;
  empresa_destino?: number;
  nf_provisoria: string;
  peso_estimado?: number;
  contrato_ref: string;
};

const EditMovimentacaoModal: React.FC<Props> = ({ movimentacao: m, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();

  const [formState, setFormState] = useState<EditFormState>({
    transporte: {
      placa: m.placa || m.transporte?.placa || '',
      motorista: m.motorista || m.transporte?.motorista || '',
      tara: Number(m.tara ?? m.transporte?.tara ?? 0),
      peso_bruto: Number(m.peso_bruto ?? m.transporte?.peso_bruto ?? 0),
      descontos: Number(m.descontos ?? m.transporte?.descontos ?? 0),
      custo_transporte: Number(m.custo_transporte ?? m.transporte?.custo_transporte ?? 0),
      custo_transporte_unidade: (m.custo_transporte_unidade as TransportPayload['custo_transporte_unidade']) || 'total',
    },
    condicoes_graos: m.condicoes_graos || '',
    destino_tipo: m.destino_tipo || 'armazenagem_interna',
    local_tipo: 'armazem',
    local_destino: m.local_destino ?? undefined,
    empresa_destino: m.empresa_destino ?? undefined,
    nf_provisoria: m.nf_provisoria || '',
    contrato_ref: m.contrato_ref || '',
  });

  const { data: locais = [] } = useQuery<{ id: number; nome: string; tipo?: string }[]>({
    queryKey: ['locais-armazenamento'],
    queryFn: async () => {
      const r = await api.get('estoque/locais-armazenamento/');
      return r.data as { id: number; nome: string; tipo?: string }[];
    },
  });

  const { data: empresas = [] } = useQuery<{ id: number; nome: string }[]>({
    queryKey: ['fornecedores-select'],
    queryFn: async () => {
      const r = await api.get('comercial/fornecedores/?page_size=200&status=ativo');
      const d = r.data;
      return (Array.isArray(d) ? d : (d.results || [])) as { id: number; nome: string }[];
    },
  });

  const mutation = useMutation<void, unknown, Record<string, unknown>>({
    mutationFn: async (payload: Record<string, unknown>) =>
      api.patch(`agricultura/movimentacoes-carga/${m.id}/`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['harvest-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-carga'] });
      showSuccess('Movimentação atualizada com sucesso');
      onSuccess();
      onClose();
    },
    onError: (error: unknown) => {
      console.error('[EditMovimentacao] error', error);
      const fallback = 'Erro ao atualizar movimentação';
      const msg =
        typeof error === 'string'
          ? error
          : typeof error === 'object' && error !== null
            ? JSON.stringify(error)
            : fallback;
      showError(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formState.destino_tipo === 'armazenagem_interna' && !formState.local_destino) {
      showError('Selecione o local de destino para armazenamento interno');
      return;
    }
    if (
      (formState.destino_tipo === 'contrato_industria' || formState.destino_tipo === 'armazenagem_geral') &&
      !formState.empresa_destino
    ) {
      showError('Selecione a empresa/prestador responsável');
      return;
    }

    const payload: Record<string, unknown> = {
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
      empresa_destino:
        formState.destino_tipo === 'contrato_industria' || formState.destino_tipo === 'armazenagem_geral'
          ? (formState.empresa_destino || null)
          : null,
      nf_provisoria: formState.nf_provisoria || null,
      contrato_ref: formState.contrato_ref || null,
    };

    mutation.mutate(payload);
  };

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-dialog-centered modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content" style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="modal-header bg-warning bg-opacity-10">
              <h5 className="modal-title">
                <i className="bi bi-pencil me-2"></i>
                Editar Movimentação #{m.id}
              </h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>

            <div className="modal-body" style={{ overflowY: 'auto', flex: '1', backgroundColor: '#fff' }}>
              {/* Info do talhão (somente leitura) */}
              <div className="alert alert-info py-2 mb-3">
                <strong>Talhão:</strong> {m.talhao_name || (m.talhao ? `Talhão ${m.talhao}` : '—')}
              </div>

              {/* Transporte */}
              <TransportFields
                value={formState.transporte}
                onChange={(v: Partial<TransportPayload>) =>
                  setFormState((s) => ({ ...s, transporte: v as TransportPayload }))
                }
                showMotorista={true}
                showDescontos={true}
                showCusto={true}
              />

              {/* Condições dos grãos */}
              <div className="mb-3">
                <label className="form-label">Condições dos Grãos</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={formState.condicoes_graos}
                  onChange={(e) => setFormState((s) => ({ ...s, condicoes_graos: e.target.value }))}
                />
              </div>

              <hr />

              {/* Tipo de destino */}
              <div className="mb-3">
                <label className="form-label">Tipo de destino</label>
                <select
                  className="form-select"
                  value={formState.destino_tipo}
                  onChange={(e) => setFormState((s) => ({ ...s, destino_tipo: e.target.value }))}
                >
                  <option value="armazenagem_interna">Armazenamento na propriedade</option>
                  <option value="contrato_industria">Contrato direto com indústria</option>
                  <option value="armazenagem_geral">Armazém geral (terceiro)</option>
                </select>
              </div>

              {/* Armazenagem interna */}
              {formState.destino_tipo === 'armazenagem_interna' && (
                <div className="mb-3">
                  <label className="form-label">Tipo de local</label>
                  <select
                    className="form-select"
                    value={formState.local_tipo}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, local_tipo: e.target.value as EditFormState['local_tipo'] }))
                    }
                  >
                    <option value="silo_bolsa">Silo Bolsa</option>
                    <option value="armazem">Armazém</option>
                  </select>

                  <label className="form-label mt-2">
                    Local de destino <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={formState.local_destino || ''}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        local_destino: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                  >
                    <option value="">Selecione um local</option>
                    {locais.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nome} ({l.tipo})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Contrato / Armazém geral */}
              {(formState.destino_tipo === 'contrato_industria' || formState.destino_tipo === 'armazenagem_geral') && (
                <div className="mb-3">
                  <label className="form-label">
                    Empresa/Prestador <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={formState.empresa_destino || ''}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        empresa_destino: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                  >
                    <option value="">Selecione uma empresa</option>
                    {empresas.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nome}
                      </option>
                    ))}
                  </select>

                  <label className="form-label mt-2">NF provisória (opcional)</label>
                  <input
                    className="form-control"
                    value={formState.nf_provisoria}
                    onChange={(e) => setFormState((s) => ({ ...s, nf_provisoria: e.target.value }))}
                  />
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ flexShrink: 0, backgroundColor: '#fff', borderTop: '1px solid var(--bs-border-color)' }}>
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-warning" disabled={Boolean((mutation as any).isPending)}>
                {(mutation as any).isPending ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditMovimentacaoModal;
