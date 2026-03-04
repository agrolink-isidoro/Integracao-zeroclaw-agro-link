import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import financeiroService from '../../services/financeiro';
import type { Plantio, Manejo, OrdemServico } from '../../types/agricultura';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { SafraForm } from './SafraForm';
import { useToast } from '../../hooks/useToast';
import { ManejoForm } from './ManejoForm';
import { OrdemServicoForm } from './OrdemServicoForm';
import ColheitaForm from './ColheitaForm';

interface SafraDetalhada extends Plantio {
  manejos?: Manejo[];
  ordens_servico?: OrdemServico[];
  total_operacoes?: number;
}

export const SafrasList: React.FC = () => {
  const queryClient = useQueryClient();
  const [safraExpandida, setSafraExpandida] = useState<number | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [showSafraForm, setShowSafraForm] = useState(false);
  const [showManejoForm, setShowManejoForm] = useState(false);
  const [showOSForm, setShowOSForm] = useState(false);
  const [showColheitaForm, setShowColheitaForm] = useState(false);
  const [safraEdit, setSafraEdit] = useState<Plantio | undefined>(undefined);
  const [plantioIdForForm, setPlantioIdForForm] = useState<number | undefined>(undefined);

  // Mutation para deletar safra
  const { showSuccess, showError } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`agricultura/plantios/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantios'] });
      showSuccess && showSuccess('Safra excluída');
    },
    onError: (err: unknown) => {
      console.error('Erro ao excluir safra', err);
      const e = err as { response?: { data?: any } } | null;
      const msg = e?.response?.data?.detail || e?.response?.data || 'Erro ao excluir safra';
      showError && showError(String(msg));
    }
  });

  const handleDeleteSafra = (safra: Plantio) => {
    if (window.confirm(`Tem certeza que deseja excluir a safra "${safra.nome_safra}"? Esta ação não pode ser desfeita.`)) {
      deleteMutation.mutate(safra.id);
    }
  };

  // Buscar plantios (safras)
  const { data: plantios = [], isLoading, error } = useQuery<Plantio[]>({
    queryKey: ['plantios'],
    queryFn: async () => {
      const response = await api.get('/agricultura/plantios/');
      // Support both paginated DRF responses and plain lists
      return response.data?.results ?? response.data;
    },
  });

  // Buscar manejos quando expandir uma safra
  const { data: manejos = [] } = useQuery<Manejo[]>({
    queryKey: ['manejos'],
    queryFn: async () => {
      const response = await api.get('/agricultura/manejos/');
      return response.data;
    },
    enabled: safraExpandida !== null,
  });

  // Buscar ordens de serviço
  const { data: ordensServico = [] } = useQuery<OrdemServico[]>({
    queryKey: ['ordens-servico'],
    queryFn: async () => {
      const response = await api.get('/agricultura/ordens-servico/');
      return response.data;
    },
    enabled: safraExpandida !== null,
  });

  // Buscar rateios/despesas relacionados à safra expandida
  const { data: rateiosDaSafra = [], isLoading: rateiosLoading } = useQuery({
    queryKey: ['rateios', safraExpandida],
    queryFn: async () => {
      if (!safraExpandida) return [];
      return financeiroService.getRateios({ safra: safraExpandida as number });
    },
    enabled: safraExpandida !== null,
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="Erro ao carregar safras" />;

  // Agregar operações por plantio
  const safrasComOperacoes: SafraDetalhada[] = plantios.map(plantio => {
    const manejosDoPlantio = manejos.filter(m => m.plantio === plantio.id);
    const osDoPlantio = ordensServico.filter(os => {
      // OrdemServico não tem plantio direto, mas tem talhões
      // Verificar se algum talhão da OS está no plantio
      const talhoesPlantio = plantio.talhoes || [];
      const osTalhoes = os.talhoes || [];
      return osTalhoes.some(t => talhoesPlantio.includes(t));
    });

    return {
      ...plantio,
      manejos: manejosDoPlantio,
      ordens_servico: osDoPlantio,
      total_operacoes: manejosDoPlantio.length + osDoPlantio.length,
    };
  });

  // Filtrar por status
  const safrasFiltradas = filtroStatus === 'todos' 
    ? safrasComOperacoes 
    : safrasComOperacoes.filter(s => s.status === filtroStatus);

  // Agrupar por cultura (conceito de "Safra")
  const safrasPorCultura = safrasFiltradas.reduce((acc, safra) => {
    const cultura = safra.cultura_nome || 'Sem cultura';
    if (!acc[cultura]) acc[cultura] = [];
    acc[cultura].push(safra);
    return acc;
  }, {} as Record<string, SafraDetalhada[]>);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      planejado: 'secondary',
      em_andamento: 'primary',
      colhido: 'success',
      perdido: 'danger',
    };
    return `badge bg-${colors[status] || 'secondary'}`;
  };

  const toggleExpansao = (id: number) => {
    setSafraExpandida(safraExpandida === id ? null : id);
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="bi bi-calendar-event me-2"></i>
          Safras e Operações Agrícolas
        </h2>
        <button 
          className="btn btn-primary"
          onClick={() => {
            setSafraEdit(undefined);
            setShowSafraForm(true);
          }}
        >
          <i className="bi bi-plus-circle me-2"></i>
          Nova Safra
        </button>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row">
            <div className="col-md-3">
              <label className="form-label">Status</label>
              <select 
                className="form-select"
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="planejado">Planejado</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="colhido">Colhido</option>
                <option value="perdido">Perdido</option>
              </select>
            </div>
            <div className="col-md-9">
              <label className="form-label">&nbsp;</label>
              <div className="d-flex gap-2">
                <button className="btn btn-outline-secondary">
                  <i className="bi bi-funnel me-2"></i>
                  Mais Filtros
                </button>
                <button className="btn btn-outline-secondary">
                  <i className="bi bi-download me-2"></i>
                  Exportar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card text-white bg-primary">
            <div className="card-body">
              <h5 className="card-title">Total de Safras</h5>
              <h2>{safrasComOperacoes.length}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-white bg-success">
            <div className="card-body">
              <h5 className="card-title">Área Total</h5>
              <h2>
                {safrasComOperacoes.reduce((sum, s) => sum + (s.area_total_ha || 0), 0).toFixed(0)} ha
              </h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-white bg-warning">
            <div className="card-body">
              <h5 className="card-title">Em Andamento</h5>
              <h2>
                {safrasComOperacoes.filter(s => s.status === 'em_andamento').length}
              </h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-white bg-info">
            <div className="card-body">
              <h5 className="card-title">Operações</h5>
              <h2>
                {safrasComOperacoes.reduce((sum, s) => sum + (s.total_operacoes || 0), 0)}
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de safras agrupadas por cultura */}
      {Object.entries(safrasPorCultura).map(([cultura, safras]) => (
        <div key={cultura} className="mb-4">
          <h4 className="mb-3">
            <i className="bi bi-flower2 me-2 text-success"></i>
            Safra {cultura}
          </h4>
          
          {safras.map((safra) => (
            <div key={safra.id} className="card mb-3">
              <div 
                className="card-header d-flex justify-content-between align-items-center"
                style={{ cursor: 'pointer' }}
                onClick={() => toggleExpansao(safra.id!)}
              >
                <div>
                  <h5 className="mb-0">
                    {safra.nome_safra}
                    <span className={`ms-2 ${getStatusBadge(safra.status)}`}>
                      {safra.status}
                    </span>
                  </h5>
                  <small className="text-muted">
                    {safra.fazenda_nome} • 
                    {safra.talhoes_info?.length} talhão(ões) • 
                    {safra.area_total_ha} ha • 
                    Plantio: {new Date(safra.data_plantio).toLocaleDateString()}
                  </small>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <span className="badge bg-info">
                    {safra.total_operacoes} operações
                  </span>
                  <Link to={`/dashboard/inteligencia?safraId=${safra.id}`} onClick={(e) => e.stopPropagation()} className="btn btn-sm btn-outline-primary" title="Abrir Central de Inteligência">
                    <i className="bi bi-lightbulb-fill me-1" style={{ color: '#198754' }}></i>
                    Central de Inteligência
                  </Link>
                  <button className="btn btn-sm btn-outline-info" onClick={async (e) => { e.stopPropagation(); try { const servis = await import('../../services/operacoes'); await servis.default.recalcularPlantio(safra.id); queryClient.invalidateQueries({ queryKey: ['plantios'] }); } catch (err) { console.error(err); } }}>
                    Recalcular custos
                  </button>
                  <i className={`bi bi-chevron-${safraExpandida === safra.id ? 'up' : 'down'}`}></i>
                </div>
              </div>

              {safraExpandida === safra.id && (
                <div className="card-body">
                  {/* Timeline de Operações */}
                  <div className="mb-4">
                    <h6 className="mb-3">
                      <i className="bi bi-clock-history me-2"></i>
                      Timeline de Operações
                    </h6>
                    
                    {safra.total_operacoes === 0 ? (
                      <div className="alert alert-info">
                        Nenhuma operação registrada ainda. 
                        <button className="btn btn-sm btn-link">Adicionar primeira operação</button>
                      </div>
                    ) : (
                      <div className="timeline">
                        {/* Manejos */}
                        {safra.manejos?.map((manejo) => (
                          <div key={`manejo-${manejo.id}`} className="timeline-item mb-3">
                            <div className="d-flex">
                              <div className="timeline-icon bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" 
                                   style={{ width: '40px', height: '40px', minWidth: '40px' }}>
                                <i className="bi bi-tools"></i>
                              </div>
                              <div className="ms-3 flex-grow-1">
                                <div className="card">
                                  <div className="card-body">
                                    <div className="d-flex justify-content-between">
                                      <div>
                                        <h6 className="mb-1">
                                          <span className="badge bg-primary me-2">Manejo</span>
                                          {manejo.tipo}
                                        </h6>
                                        <small className="text-muted">
                                          {new Date(manejo.data_manejo).toLocaleDateString()} • 
                                          {manejo.equipamento ? ` Equipamento: ${manejo.equipamento}` : ''}
                                        </small>
                                        {manejo.descricao && (
                                          <p className="mt-2 mb-0">{manejo.descricao}</p>
                                        )}
                                      </div>
                                      <div className="text-end">
                                        <strong>R$ {(manejo.custo_total ?? manejo.custo ?? 0).toFixed(2)}</strong>
                                        <div className="mt-2">
                                          {manejo.contabilizado ? (
                                            <span className="badge bg-success">Contabilizado</span>
                                          ) : (
                                            <button
                                              className="btn btn-sm btn-outline-primary"
                                              onClick={async () => {
                                                try {
                                                  await (await import('../../services/operacoes')).default.contabilizarManejo(manejo.id!);
                                                  // refetch manejos
                                                  queryClient.invalidateQueries({ queryKey: ['manejos'] });
                                                } catch (e) {
                                                  console.error('Erro ao contabilizar manejo', e);
                                                }
                                              }}
                                            >
                                              Contabilizar
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Ordens de Serviço */}
                        {safra.ordens_servico?.map((os) => (
                          <div key={`os-${os.id}`} className="timeline-item mb-3">
                            <div className="d-flex">
                              <div className="timeline-icon bg-warning text-white rounded-circle d-flex align-items-center justify-content-center" 
                                   style={{ width: '40px', height: '40px', minWidth: '40px' }}>
                                <i className="bi bi-clipboard-check"></i>
                              </div>
                              <div className="ms-3 flex-grow-1">
                                <div className="card">
                                  <div className="card-body">
                                    <div className="d-flex justify-content-between">
                                      <div>
                                        <h6 className="mb-1">
                                          <span className="badge bg-warning me-2">Ordem de Serviço</span>
                                          {os.tarefa}
                                        </h6>
                                        <small className="text-muted">
                                          Início: {new Date(os.data_inicio).toLocaleDateString()} • 
                                          {os.maquina ? ` Máquina: ${os.maquina}` : ''}
                                          <span className={`ms-2 badge ${getStatusBadge(os.status)}`}>
                                            {os.status}
                                          </span>
                                        </small>
                                      </div>
                                      <div className="text-end">
                                        <strong>R$ {os.custo_total.toFixed(2)}</strong>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Despesas & Rateios da Safra */}
                  <div className="mb-4">
                    <h6 className="mb-3">
                      <i className="bi bi-receipt me-2"></i>
                      Despesas & Rateios desta Safra
                    </h6>
                    {rateiosLoading ? (
                      <div>Carregando...</div>
                    ) : rateiosDaSafra.length === 0 ? (
                      <div className="alert alert-light">Nenhuma despesa ou rateio vinculado a esta safra.</div>
                    ) : (
                      <div className="list-group">
                        {rateiosDaSafra.map((r) => (
                          <a key={r.id} href={`/financeiro/rateios/${r.id}`} className="list-group-item list-group-item-action d-flex justify-content-between align-items-start">
                            <div>
                              <strong>{r.titulo}</strong>
                              <div className="small text-muted">{r.descricao}</div>
                            </div>
                            <div className="text-end">
                              <div>R$ {r.valor_total.toFixed(2)}</div>
                              <small className="text-muted">{new Date(r.data_rateio).toLocaleDateString()}</small>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Botões de ação */}
                  <div className="d-flex gap-2">
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        setPlantioIdForForm(safra.id);
                        setShowManejoForm(true);
                      }}
                    >
                      <i className="bi bi-plus-circle me-1"></i>
                      Adicionar Manejo
                    </button>
                    <button 
                      className="btn btn-sm btn-warning"
                      onClick={() => {
                        setPlantioIdForForm(safra.id);
                        setShowOSForm(true);
                      }}
                    >
                      <i className="bi bi-clipboard-plus me-1"></i>
                      Nova Ordem de Serviço
                    </button>
                    <button className="btn btn-sm btn-success" onClick={() => { setPlantioIdForForm(safra.id); setShowColheitaForm(true); }}>
                      <i className="bi bi-box-seam me-1"></i>
                      Registrar Colheita
                    </button>
                    <button 
                      className="btn btn-sm btn-outline-secondary ms-auto"
                      onClick={() => {
                        setSafraEdit(safra);
                        setShowSafraForm(true);
                      }}
                    >
                      <i className="bi bi-pencil me-1"></i>
                      Editar Safra
                    </button>
                    <button 
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDeleteSafra(safra)}
                      disabled={deleteMutation.isPending}
                    >
                      <i className="bi bi-trash me-1"></i>
                      Excluir
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      {safrasFiltradas.length === 0 && (
        <div className="alert alert-info text-center">
          <i className="bi bi-info-circle me-2"></i>
          Nenhuma safra encontrada com os filtros selecionados.
        </div>
      )}

      {/* Modals */}
      {showSafraForm && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <SafraForm
                plantio={safraEdit}
                onClose={() => {
                  setShowSafraForm(false);
                  setSafraEdit(undefined);
                }}
                onSuccess={() => {
                  setShowSafraForm(false);
                  setSafraEdit(undefined);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showManejoForm && plantioIdForForm && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <ManejoForm
                plantioId={plantioIdForForm}
                onClose={() => {
                  setShowManejoForm(false);
                  setPlantioIdForForm(undefined);
                }}
                onSuccess={() => {
                  setShowManejoForm(false);
                  setPlantioIdForForm(undefined);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showColheitaForm && plantioIdForForm && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <ColheitaForm
                plantioId={plantioIdForForm}
                onClose={() => {
                  setShowColheitaForm(false);
                  setPlantioIdForForm(undefined);
                }}
                onSuccess={() => {
                  setShowColheitaForm(false);
                  setPlantioIdForForm(undefined);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showOSForm && plantioIdForForm && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <OrdemServicoForm
                plantioId={plantioIdForForm}
                onClose={() => {
                  setShowOSForm(false);
                  setPlantioIdForForm(undefined);
                }}
                onSuccess={() => {
                  setShowOSForm(false);
                  setPlantioIdForForm(undefined);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SafrasList;
