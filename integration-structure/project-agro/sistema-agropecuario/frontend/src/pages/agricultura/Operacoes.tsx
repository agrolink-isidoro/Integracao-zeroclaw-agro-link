import React, { useState } from 'react';
import OperacoesList from '../../components/agricultura/OperacoesList';
import OperacaoWizard from '../../components/agricultura/OperacaoWizard';
import ModalForm from '../../components/common/ModalForm';
import operacoesService, { type Operacao } from '../../services/operacoes';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const OperacoesPage: React.FC = () => {
  const [showWizard, setShowWizard] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const queryClient = useQueryClient();

  const { data: operacoes = [] } = useQuery<Operacao[]>({
    queryKey: ['operacoes'],
    queryFn: operacoesService.listar,
  });

  const stats = React.useMemo(() => ({
    planejadas: (operacoes || []).filter((op: Operacao) => op.status === 'planejada').length,
    em_andamento: (operacoes || []).filter((op: Operacao) => op.status === 'em_andamento').length,
    finalizadas: (operacoes || []).filter((op: Operacao) => op.status === 'concluida').length,
  }), [operacoes]);


  const handleWizardSuccess = () => {
    setShowWizard(false);
    // Invalidate operacoes query so stats and list refresh
    queryClient.invalidateQueries({ queryKey: ['operacoes'] });
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container-fluid py-4">
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h2>
              <i className="bi bi-list-check me-2"></i>
              Operações Agrícolas
            </h2>
            <p className="text-muted mb-0">
              Gestão unificada de manejos, ordens de serviço e operações
            </p>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="btn btn-success"
          >
            <i className="bi bi-plus-lg me-2"></i>
            Nova Operação
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <ul className="nav nav-tabs mb-4" role="tablist">
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${!showWizard ? 'active' : ''}`}
            onClick={() => setShowWizard(false)}
            type="button"
          >
            <i className="bi bi-table me-2"></i>
            Listagem
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${showWizard ? 'active' : ''}`}
            onClick={() => setShowWizard(true)}
            type="button"
          >
            <i className="bi bi-magic me-2"></i>
            Novo Wizard
          </button>
        </li>
      </ul>

      {/* Tab Content */}
      <div className="tab-content">
        {!showWizard && (
          <div className="tab-pane fade show active">
            <OperacoesList key={refreshKey} />
          </div>
        )}

        {/* Wizard agora é apresentado como modal */}
        {showWizard && (
          <ModalForm isOpen={showWizard} onClose={() => setShowWizard(false)} title="Nova Operação Agrícola" size="xl">
            <OperacaoWizard onSuccess={handleWizardSuccess} />
          </ModalForm>
        )}
      </div>

      {/* Estatísticas Rápidas */}
      <div className="row mt-5">
        <div className="col-12">
          <h5 className="mb-3">
            <i className="bi bi-graph-up me-2"></i>
            Resumo de Operações
          </h5>
        </div>
        <div className="col-md-4">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1 small">Operações Planejadas</p>
                  <h4 className="mb-0 text-primary">{stats.planejadas}</h4>
                </div>
                <i className="bi bi-calendar-event text-primary fs-2"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1 small">Em Andamento</p>
                  <h4 className="mb-0 text-warning">{stats.em_andamento}</h4>
                </div>
                <i className="bi bi-hourglass-split text-warning fs-2"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1 small">Finalizadas</p>
                  <h4 className="mb-0 text-success">{stats.finalizadas}</h4>
                </div>
                <i className="bi bi-check-circle text-success fs-2"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperacoesPage;
