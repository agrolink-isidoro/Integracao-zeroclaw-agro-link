import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import TransportFields from '../../components/TransportFields';
import { useToast } from '../../hooks/useToast';

interface Props {
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
  custo_transporte_unidade?: 'unidade' | 'saca' | 'tonelada';
};

type SessionItemDetail = {
  id: number;
  talhao: number;
  talhao_name?: string;
  quantidade_colhida?: number;
  status?: string;
};

type Session = {
  id: number;
  plantio_nome?: string;
  data_inicio?: string;
  status?: string;
  itens?: SessionItemDetail[];
};

type MovFormState = {
  session?: number;
  session_item?: number;
  talhao?: number;
  transporte: TransportPayload;
  condicoes_graos?: string;
  destino_tipo: 'armazenagem_interna' | 'contrato_industria' | 'armazenagem_geral';
  local_tipo: 'silo_bolsa' | 'armazem';
  local_destino?: number;
  contrato_ref?: number;
  empresa_destino?: number;
  nf_provisoria?: string;
  peso_estimado?: number;
};

  type MovPayload = {
    session_item?: number | null;
    talhao?: number | null;
    transporte?: TransportPayload | null;
    condicoes_graos?: string | null;
    destino_tipo?: 'armazenagem_interna' | 'contrato_industria' | 'armazenagem_geral' | null;
    contrato_ref?: number | null;
    empresa_destino?: number | null;
    local_tipo?: 'silo_bolsa' | 'armazem' | null;
    local_destino?: number | null;
    nf_provisoria?: string | null;
    peso_estimado?: number | null;
    placa?: string | null;
    motorista?: string | null;
    tara?: number | null;
    peso_bruto?: number | null;
    descontos?: number | null;
    custo_transporte?: number | null;
    custo_transporte_unidade?: 'unidade' | 'saca' | 'tonelada' | null;
  };

  const MovimentacaoCargaModal: React.FC<Props> = ({ onClose, onSuccess }) => {
    // DEBUG v2.0 - Log inicial para verificar se o código está sendo carregado
    console.log('🚀 MovimentacaoCargaModal CARREGADO - v2.0');
    
    const queryClient = useQueryClient();
    const [formState, setFormState] = useState<MovFormState>({
      session: undefined,
      session_item: undefined,
      talhao: undefined,
      transporte: {} as TransportPayload,
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

    const { data: sessions = [] } = useQuery<Session[]>({
      queryKey: ['harvest-sessions'],
      queryFn: async () => {
        const r = await api.get('/agricultura/harvest-sessions/');
        console.log('=== SESSÕES RECEBIDAS DO BACKEND ===');
        console.log('Total de sessões:', r.data?.length || 0);
        console.log('Sessões:', r.data);
        return r.data as Session[];
      }
    });

    // Only show sessions that are not finished or cancelled
    const selectableSessions = (sessions || []).filter((s: Session) => {
      const status = s.status || '';
      const isSelectable = !['finalizada', 'cancelada'].includes(status);
      console.log(`Sessão ${s.id} (${s.plantio_nome}) - status: "${status}" - selecionável: ${isSelectable}`);
      return isSelectable;
    });


    // Fetch storage locals and companies for destination selection
    const { data: locais = [] } = useQuery<{ id: number; nome: string; tipo?: string }[]>({ queryKey: ['locais-armazenamento'], queryFn: async () => { const r = await api.get('estoque/locais-armazenamento/'); return r.data as { id: number; nome: string; tipo?: string }[]; }});
    // Busca fornecedores (empresas/terceiros) cadastrados para preencher o campo Empresa/Prestador
    const { data: empresas = [] } = useQuery<{ id: number; nome: string }[]>({
      queryKey: ['fornecedores-select'],
      queryFn: async () => {
        const r = await api.get('comercial/fornecedores/?page_size=200&status=ativo');
        const d = r.data;
        // suporta resposta paginada { results: [...] } e array direto
        return (Array.isArray(d) ? d : (d.results || [])) as { id: number; nome: string }[];
      }
    });

    const { data: sessionDetail = null, refetch } = useQuery<Session | null>({
      queryKey: ['harvest-session', formState.session],
      queryFn: async () => {
        if (!formState.session) return null;
        const r = await api.get(`agricultura/harvest-sessions/${formState.session}/`);
        return r.data as Session;
      },
      enabled: !!formState.session
    });

    // Compute a default session item id (first pending/colhido) without mutating state inside an effect
    const defaultSessionItemId = React.useMemo(() => {
      if (sessionDetail && Array.isArray(sessionDetail.itens) && sessionDetail.itens.length > 0) {
        const firstPending = sessionDetail.itens.find((i: SessionItemDetail) => i.status === 'pendente' || i.status === 'colhido');
        return firstPending ? firstPending.id : undefined;
      }
      return undefined;
    }, [sessionDetail]);
    
    // Auto-set session_item and talhao when sessionDetail loads with default item
    React.useEffect(() => {
      if (defaultSessionItemId && sessionDetail?.itens) {
        const defaultItem = sessionDetail.itens.find((i: SessionItemDetail) => i.id === defaultSessionItemId);
        if (defaultItem) {
          console.log('=== AUTO-SELEÇÃO DE ITEM PADRÃO ===');
          console.log('Item padrão:', defaultItem);
          console.log('Talhão do item:', defaultItem.talhao);
          console.log('===================================');
          setFormState((s: MovFormState) => { 
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

    const mutation = useMutation<void, unknown, Record<string, unknown>>({
      mutationFn: async (payload: Record<string, unknown>) => api.post('agricultura/movimentacoes-carga/', payload),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['harvest-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['movimentacoes-carga'] });
        showSuccess('Movimentação registrada com sucesso');
        onSuccess();
        onClose();
      },
      onError: (error: unknown) => {
        console.error('[MovimentacaoCarga] submit error', error);
        // Provide a best-effort message without relying on any-typed access
        const fallback = 'Erro ao registrar movimentação';
        const msg = typeof error === 'string' ? error : (typeof error === 'object' && error !== null) ? JSON.stringify(error) : fallback;
        showError(msg);
      }
    });

    const handleSubmit = (e: React.FormEvent) => {
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

      const payload: MovPayload = {
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

    return (
      <form onSubmit={handleSubmit}>
        <div className="modal-header">
          <h5 className="modal-title">Nova Movimentação de Carga</h5>
          <button type="button" className="btn-close" onClick={onClose}></button>
        </div>
        <div className="modal-body p-3 p-md-4">
          <div className="mb-3">
            <label className="form-label">Sessão de Colheita</label>
            <select className="form-select" value={formState.session || ''} onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : undefined;
                setFormState((s: MovFormState) => ({
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
              }}>
              <option value="">Selecione a sessão</option>
              {selectableSessions.map((s: Session) => (
                <option key={s.id} value={s.id}>{`${s.plantio_nome} - ${s.data_inicio} (${s.status})`}</option>
              ))}
            </select>
          </div>

          {sessionDetail && (
            <div className="mb-3">
              <label className="form-label">Item da Sessão</label>
              {Array.isArray(sessionDetail.itens) && sessionDetail.itens.length > 0 ? (
                <select 
                  className="form-select" 
                  value={formState.session_item || ''} 
                  onChange={(e) => {
                    const selectedId = e.target.value ? Number(e.target.value) : undefined;
                    const selectedItem = sessionDetail.itens?.find((it: SessionItemDetail) => it.id === selectedId);
                    const talhao = selectedItem?.talhao;
                    console.log('=== SELEÇÃO DE ITEM ===');
                    console.log('ID selecionado:', selectedId);
                    console.log('Item encontrado:', selectedItem);
                    console.log('Talhão do item:', talhao);
                    console.log('=======================');
                    setFormState((s: MovFormState) => ({ ...s, session_item: selectedId, talhao }));
                  }}
                >
                  <option value="">Selecione item</option>
                  {sessionDetail.itens?.map((it: SessionItemDetail) => (
                    <option key={it.id} value={it.id}>{(it.talhao_name as any) || it.talhao} - {it.quantidade_colhida || 0}kg - {it.status}</option>
                  ))}
                </select>
              ) : (
                <div className="alert alert-warning">Sessão selecionada não tem talhões iniciados. Inicie a sessão com talhões antes de registrar movimentação.</div>
              )}
            </div>
          )}

          <TransportFields
            value={formState.transporte}
            onChange={(v: any) => setFormState((s: MovFormState) => ({ ...s, transporte: v }))}
            showMotorista={true}
            showDescontos={true}
            showCusto={true}
          />

          <hr />
          <div className="mb-3">
            <label className="form-label">Tipo de destino</label>
            <select aria-label="Tipo de destino" className="form-select" value={formState.destino_tipo} onChange={(e) => setFormState((s: MovFormState) => ({ ...s, destino_tipo: e.target.value as MovFormState['destino_tipo'] }))}>
              <option value="armazenagem_interna">Armazenamento na propriedade</option>
              <option value="contrato_industria">Contrato direto com indústria</option>
              <option value="armazenagem_geral">Armazém geral (terceiro)</option>
            </select>
          </div>

          {formState.destino_tipo === 'armazenagem_interna' && (
            <div className="mb-3">
              <label className="form-label">Tipo de local</label>
              <select className="form-select" value={formState.local_tipo} onChange={(e) => setFormState((s: MovFormState) => ({ ...s, local_tipo: e.target.value as MovFormState['local_tipo'] }))}>
                <option value="silo_bolsa">Silo Bolsa</option>
                <option value="armazem">Armazém</option>
              </select>

              <label className="form-label mt-2">Local de destino <span className="text-danger">*</span></label>
              {locais.length === 0 ? (
                <select className="form-select" disabled><option>Nenhum local de armazenamento cadastrado</option></select>
              ) : (
                <select className="form-select" value={formState.local_destino || ''} onChange={(e) => setFormState((s: MovFormState) => ({ ...s, local_destino: e.target.value ? Number(e.target.value) : undefined }))}>
                  <option value="">Selecione um local</option>
                  {locais.map((l) => (
                    <option key={l.id} value={l.id}>{l.nome} ({l.tipo})</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {(formState.destino_tipo === 'contrato_industria' || formState.destino_tipo === 'armazenagem_geral') && (
            <div className="mb-3">
              <label className="form-label">Empresa/Prestador <span className="text-danger">*</span></label>
              <select className={`form-select ${!formState.empresa_destino ? '' : ''}`} value={formState.empresa_destino || ''} onChange={(e) => setFormState((s: MovFormState) => ({ ...s, empresa_destino: e.target.value ? Number(e.target.value) : undefined }))}>
                <option value="">Selecione uma empresa</option>
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.nome}</option>
                ))}
              </select>

              <label className="form-label mt-2">NF provisória (opcional)</label>
              <input className="form-control" value={formState.nf_provisoria || ''} onChange={(e) => setFormState((s: MovFormState) => ({ ...s, nf_provisoria: e.target.value }))} />

              <label className="form-label mt-2">Peso estimado (kg) <span className="text-danger">*</span></label>
              <input type="number" step="0.01" className={`form-control ${!formState.peso_estimado ? '' : ''}`} value={formState.peso_estimado ?? ''} onChange={(e) => setFormState((s: MovFormState) => ({ ...s, peso_estimado: e.target.value ? Number(e.target.value) : undefined }))} />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={Boolean((mutation as any).isLoading)}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={Boolean((mutation as any).isLoading) || Boolean(sessionDetail && Array.isArray(sessionDetail.itens) && sessionDetail.itens.length === 0)} aria-disabled={Boolean((mutation as any).isLoading) || Boolean(sessionDetail && Array.isArray(sessionDetail.itens) && sessionDetail.itens.length === 0)}>{(mutation as any).isLoading ? 'Enviando...' : 'Registrar Movimentação'}</button>
        </div>
      </form>
    );
  };


export default MovimentacaoCargaModal;
