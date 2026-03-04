import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { OrdemServicoMaquina as OrdemServico } from '@/types/estoque_maquinas';
import OrdemServicoForm from '../components/maquinas/OrdemServicoFormMaquinas';

const Manutencao: React.FC = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<OrdemServico | undefined>(undefined);

  const { data: ordens = [], isLoading } = useQuery<OrdemServico[]>({
    queryKey: ['maquinas', 'ordens-servico'],
    queryFn: async () => {
      const resp = await api.get('/maquinas/ordens-servico/');
      return resp.data.results || resp.data;
    }
  });

  const concluirMutation = useMutation({
    mutationFn: async (id: number) => {
      const resp = await api.post(`/maquinas/ordens-servico/${id}/concluir/`);
      return resp.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maquinas', 'ordens-servico'] })
  });

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>
            <i className="bi bi-tools me-2"></i>
            Manutenção - Ordens de Serviço
          </h2>
          <p className="text-muted mb-0">Listagem e gerenciamento de Ordens de Serviço</p>
        </div>
        <div>
          <button className="btn btn-success" onClick={() => { setEditing(undefined); setShowModal(true); }}>
            <i className="bi bi-plus-circle me-1"></i> Nova OS
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {isLoading ? (
            <p>Carregando...</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Nº OS</th>
                    <th>Equipamento</th>
                    <th>Tipo</th>
                    <th>Prioridade</th>
                    <th>Status</th>
                    <th>Data Abertura</th>
                    <th>Data Prevista</th>
                    <th>Custo Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {ordens.map((o) => (
                    <tr key={o.id}>
                      <td>{o.numero_os}</td>
                      <td>{o.equipamento_detail?.nome || o.equipamento}</td>
                      <td>{o.tipo}</td>
                      <td>{o.prioridade}</td>
                      <td>{o.status}</td>
                      <td>{o.data_abertura ? new Date(o.data_abertura).toLocaleString() : '-'}</td>
                      <td>{o.data_previsao || '-'}</td>
                      <td>{o.custo_total ? `R$ ${Number(o.custo_total).toLocaleString('pt-BR', {minimumFractionDigits:2})}` : '-'}</td>
                      <td className="text-end">
                        {o.status !== 'concluida' && (
                          <button className="btn btn-sm btn-primary me-2" onClick={() => concluirMutation.mutate(o.id)}>
                            Concluir
                          </button>
                        )}
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => { setEditing(o); setShowModal(true); }}>Editar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <OrdemServicoForm
          ordemServico={editing}
          onClose={() => { setShowModal(false); setEditing(undefined); }}
          onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['maquinas', 'ordens-servico'] }); setShowModal(false); }}
        />
      )}
    </div>
  );
};

export default Manutencao;
