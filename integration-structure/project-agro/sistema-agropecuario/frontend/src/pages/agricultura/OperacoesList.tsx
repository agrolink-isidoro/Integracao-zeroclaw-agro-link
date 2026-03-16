import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { Manejo } from '../../types/agricultura';
import type { OrdemServico } from '../../types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ManejoForm } from './ManejoForm';
import { OrdemServicoForm } from './OrdemServicoForm';

// Interface unificada de Operação
interface Operacao {
  id: number;
  tipo_origem: 'manejo' | 'ordem_servico';
  tipo: string;
  data: string;
  descricao?: string;
  custo: number;
  equipamento?: string;
  maquina?: string;
  status?: string;
  plantio?: number;
  plantio_nome?: string;
  fazenda?: number;
  fazenda_nome?: string;
  talhoes: number[];
  talhoes_info?: Array<Record<string, unknown>>;
}

export const OperacoesList: React.FC = () => {
  const qc = useQueryClient();
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [showManejoForm, setShowManejoForm] = useState(false);
  const [showOSForm, setShowOSForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; tipo_origem: string; nome: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Buscar manejos
  const { data: manejos = [], isLoading: loadingManejos } = useQuery<Manejo[]>({
    queryKey: ['manejos'],
    queryFn: async () => {
      const response = await api.get('/agricultura/manejos/');
      return response.data;
    },
  });

  // Buscar ordens de serviço
  const { data: ordensServico = [], isLoading: loadingOrdens } = useQuery<OrdemServico[]>({
    queryKey: ['ordens-servico'],
    queryFn: async () => {
      const response = await api.get('/agricultura/ordens-servico/');
      return response.data as OrdemServico[];
    },
  });

  // Unificar em operações
  const operacoes: Operacao[] = [
    ...manejos.map(m => ({
      id: m.id!,
      tipo_origem: 'manejo' as const,
      tipo: m.tipo,
      data: m.data_manejo,
      descricao: m.descricao,
      custo: m.custo || 0,
      equipamento: m.equipamento,
      plantio: m.plantio,
      fazenda: m.fazenda,
      talhoes: m.talhoes || [],
      talhoes_info: m.talhoes_info
    })),
    ...ordensServico.map((os: OrdemServico) => ({
      id: os.id!,
      tipo_origem: 'ordem_servico' as const,
      tipo: os.tarefa,
      data: os.data_inicio,
      descricao: os.tarefa,
      custo: ((os as any).custo_total) || 0,
      maquina: os.maquina,
      status: os.status,
      fazenda: (os as any).fazenda,
      talhoes: (os as any).talhoes || [],
      talhoes_info: (os as any).talhoes_info
    }))
  ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const isLoading = loadingManejos || loadingOrdens;

  if (isLoading) return <LoadingSpinner />;

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      const endpoint = deleteConfirm.tipo_origem === 'manejo'
        ? `/agricultura/manejos/${deleteConfirm.id}/`
        : `/agricultura/ordens-servico/${deleteConfirm.id}/`;
      await api.delete(endpoint);
      qc.invalidateQueries({ queryKey: ['manejos'] });
      qc.invalidateQueries({ queryKey: ['ordens-servico'] });
      setDeleteConfirm(null);
    } catch (e) {
      console.error('Erro ao deletar operação:', e);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filtrar operações
  const operacoesFiltradas = operacoes.filter(op => {
    if (filtroTipo !== 'todos' && op.tipo_origem !== filtroTipo) return false;
    if (filtroStatus !== 'todos') {
      if (op.tipo_origem === 'ordem_servico' && op.status !== filtroStatus) return false;
    }
    return true;
  });

  const getIconeOperacao = (tipo: string, tipo_origem: string) => {
    if (tipo_origem === 'ordem_servico') return '📋';
    
    // Ícones por tipo de manejo
    const icones: Record<string, string> = {
      preparo_solo: '🚜',
      aracao: '🚜',
      gradagem: '🚜',
      plantio_direto: '🌱',
      plantio_convencional: '🌱',
      adubacao_base: '🌿',
      adubacao_cobertura: '🌿',
      pulverizacao: '💧',
      controle_pragas: '🐛',
      irrigacao: '💦',
      poda: '✂️',
      capina: '🔪',
      rocada: '🌾',
      colheita: '🌽'
    };
    
    return icones[tipo] || '🔧';
  };

  const getCorOperacao = (tipo_origem: string) => {
    return tipo_origem === 'manejo' ? 'primary' : 'warning';
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="bi bi-list-check me-2"></i>
          Operações Agrícolas
        </h2>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-primary"
            onClick={() => setShowManejoForm(true)}
          >
            <i className="bi bi-plus-circle me-2"></i>
            Nova Operação (Manejo)
          </button>
          <button 
            className="btn btn-warning"
            onClick={() => setShowOSForm(true)}
          >
            <i className="bi bi-clipboard-plus me-2"></i>
            Nova OS
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row">
            <div className="col-md-3">
              <label className="form-label">Tipo de Registro</label>
              <select 
                className="form-select"
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="manejo">Manejos</option>
                <option value="ordem_servico">Ordens de Serviço</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Status</label>
              <select 
                className="form-select"
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="aprovada">Aprovada</option>
                <option value="ativa">Ativa</option>
                <option value="concluida">Concluída</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <h6 className="text-muted mb-2">Total de Operações</h6>
              <h3 className="mb-0">{operacoes.length}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <h6 className="text-muted mb-2">Manejos</h6>
              <h3 className="mb-0 text-primary">{manejos.length}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <h6 className="text-muted mb-2">Ordens de Serviço</h6>
              <h3 className="mb-0 text-warning">{ordensServico.length}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <h6 className="text-muted mb-2">Custo Total</h6>
              <h3 className="mb-0 text-success">
                R$ {operacoes.reduce((sum, op) => sum + op.custo, 0).toFixed(2)}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Operações */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Histórico de Operações</h5>
        </div>
        <div className="card-body">
          {operacoesFiltradas.length === 0 ? (
            <div className="alert alert-info text-center">
              <i className="bi bi-info-circle me-2"></i>
              Nenhuma operação encontrada
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Operação</th>
                    <th>Fazenda/Safra</th>
                    <th>Equipamento</th>
                    <th>Status</th>
                    <th className="text-end">Custo</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {operacoesFiltradas.map((op) => (
                    <tr key={`${op.tipo_origem}-${op.id}`}>
                      <td>
                        <small className="text-muted">
                          {new Date(op.data).toLocaleDateString()}
                        </small>
                      </td>
                      <td>
                        <span className={`badge bg-${getCorOperacao(op.tipo_origem)}`}>
                          {op.tipo_origem === 'manejo' ? 'Manejo' : 'OS'}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <span className="me-2" style={{ fontSize: '1.5rem' }}>
                            {getIconeOperacao(op.tipo, op.tipo_origem)}
                          </span>
                          <div>
                            <strong>{op.tipo}</strong>
                            {op.descricao && (
                              <div>
                                <small className="text-muted">{op.descricao}</small>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <small className="text-muted">
                          {op.fazenda_nome || '-'}<br />
                          {op.plantio_nome && <span className="badge bg-secondary">{op.plantio_nome}</span>}
                        </small>
                      </td>
                      <td>
                        <small>{op.equipamento || op.maquina || '-'}</small>
                      </td>
                      <td>
                        {op.status && (
                          <span className={`badge bg-${
                            op.status === 'concluida' ? 'success' :
                            op.status === 'ativa' ? 'primary' :
                            op.status === 'aprovada' ? 'info' : 'secondary'
                          }`}>
                            {op.status}
                          </span>
                        )}
                      </td>
                      <td className="text-end">
                        <strong>R$ {op.custo.toFixed(2)}</strong>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          title="Deletar"
                          onClick={() => setDeleteConfirm({ id: op.id, tipo_origem: op.tipo_origem, nome: op.descricao || op.tipo })}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showManejoForm && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <ManejoForm
                onClose={() => setShowManejoForm(false)}
                onSuccess={() => {
                  setShowManejoForm(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showOSForm && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <OrdemServicoForm
                onClose={() => setShowOSForm(false)}
                onSuccess={() => {
                  setShowOSForm(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-danger"><i className="bi bi-exclamation-triangle me-2"></i>Confirmar exclusão</h5>
                <button className="btn-close" onClick={() => setDeleteConfirm(null)} disabled={deleteLoading}></button>
              </div>
              <div className="modal-body">
                <p>Excluir operação <strong>{deleteConfirm.nome}</strong>?</p>
                <p className="text-muted small mb-0">Esta ação não pode ser desfeita.</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)} disabled={deleteLoading}>Cancelar</button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={deleteLoading}>
                  {deleteLoading ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="bi bi-trash me-1"></i>}
                  Deletar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperacoesList;
