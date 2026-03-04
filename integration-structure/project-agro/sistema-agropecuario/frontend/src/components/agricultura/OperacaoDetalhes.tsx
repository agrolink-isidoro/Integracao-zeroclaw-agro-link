import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import operacoesService from '../../services/operacoes';
import type { Operacao } from '../../services/operacoes';

const OperacaoDetalhes: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [operacao, setOperacao] = useState<Operacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      carregarOperacao();
    }
  }, [id]);

  const carregarOperacao = async () => {
    try {
      setLoading(true);
      const data = await operacoesService.buscar(Number(id));
      setOperacao(data);
      setError(null);
    } catch (err: any) {
      setError('Erro ao carregar operação: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConcluir = async () => {
    if (!window.confirm('Confirma a conclusão desta operação? Essa ação consumirá reservas e finalizará a operação.')) return;
    try {
      if (!id) return;
      await operacoesService.atualizar(Number(id), { status: 'concluida' });
      await carregarOperacao();
    } catch (err: any) {
      alert('Erro ao concluir operação: ' + err.message);
    }
  };

  const handleCancelar = async () => {
    if (!window.confirm('Deseja realmente cancelar esta operação?')) return;
    try {
      if (!id) return;
      await operacoesService.atualizar(Number(id), { status: 'cancelada' });
      await carregarOperacao();
      navigate('/agricultura/operacoes');
    } catch (err: any) {
      alert('Erro ao cancelar operação: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !operacao) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error || 'Operação não encontrada'}
        </div>
        <button onClick={() => navigate('/agricultura/operacoes')} className="btn btn-secondary">
          <i className="bi bi-arrow-left me-2"></i>
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="bi bi-file-text me-2"></i>
          Detalhes da Operação #{operacao.id}
        </h2>
        <div>
          <button 
            onClick={() => navigate('/agricultura/operacoes')} 
            className="btn btn-secondary me-2"
          >
            <i className="bi bi-arrow-left me-2"></i>
            Voltar
          </button>

          {(operacao.status !== 'concluida' && operacao.status !== 'cancelada') && (
            <>
              <button
                onClick={handleConcluir}
                className="btn btn-success me-2"
                title="Concluir"
              >
                <i className="bi bi-check2-circle me-2"></i>
                Concluir
              </button>

              <button
                onClick={handleCancelar}
                className="btn btn-outline-danger me-2"
                title="Cancelar"
              >
                <i className="bi bi-x-circle me-2"></i>
                Cancelar
              </button>
            </>
          )}

          <button 
            onClick={() => navigate(`/agricultura/operacoes/${id}/editar`)} 
            className="btn btn-primary"
          >
            <i className="bi bi-pencil me-2"></i>
            Editar
          </button>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-light">
              <h5 className="mb-0">
                <i className="bi bi-info-circle me-2"></i>
                Informações Gerais
              </h5>
            </div>
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-bold">Categoria:</label>
                  <p className="form-control-plaintext">{operacao.categoria_display}</p>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Tipo:</label>
                  <p className="form-control-plaintext">{operacao.tipo_display}</p>
                </div>
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-bold">Data de Operação:</label>
                  <p className="form-control-plaintext">
                    {operacao.data_operacao ? new Date(operacao.data_operacao).toLocaleDateString('pt-BR') : '-'}
                  </p>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Status:</label>
                  <p className="form-control-plaintext">
                    <span className={`badge ${
                      operacao.status === 'planejada' ? 'bg-primary' :
                      operacao.status === 'em_andamento' ? 'bg-warning text-dark' :
                      operacao.status === 'concluida' ? 'bg-success' : 'bg-danger'
                    }`}>
                      {operacao.status_display || operacao.status}
                    </span>
                  </p>
                </div>
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-bold">Data Início:</label>
                  <p className="form-control-plaintext">
                    {operacao.data_inicio ? new Date(operacao.data_inicio).toLocaleString('pt-BR') : '-'}
                  </p>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Data Término:</label>
                  <p className="form-control-plaintext">
                    {operacao.data_fim ? new Date(operacao.data_fim).toLocaleString('pt-BR') : '-'}
                  </p>
                </div>
              </div>

              {operacao.observacoes && (
                <div className="row mb-3">
                  <div className="col-12">
                    <label className="form-label fw-bold">Observações:</label>
                    <p className="form-control-plaintext">{operacao.observacoes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-light">
              <h5 className="mb-0">
                <i className="bi bi-calculator me-2"></i>
                Resumo
              </h5>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between mb-3">
                <span className="text-muted">Área Total:</span>
                <span className="fw-bold">{operacao.area_total_ha.toFixed(2)} ha</span>
              </div>
              <div className="d-flex justify-content-between mb-3">
                <span className="text-muted">Custo Total:</span>
                <span className="fw-bold text-success">
                  R$ {(operacao.custo_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="d-flex justify-content-between mb-3">
                <span className="text-muted">Custo Mão de Obra:</span>
                <span>R$ {(operacao.custo_mao_obra || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="d-flex justify-content-between mb-3">
                <span className="text-muted">Custo Máquina:</span>
                <span>R$ {(operacao.custo_maquina || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Custo Insumos:</span>
                <span>R$ {(operacao.custo_insumos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-header bg-light">
              <h5 className="mb-0">
                <i className="bi bi-clock-history me-2"></i>
                Histórico
              </h5>
            </div>
            <div className="card-body">
              <div className="mb-2">
                <small className="text-muted">Criado em:</small>
                <p className="mb-0">{new Date(operacao.criado_em).toLocaleString('pt-BR')}</p>
              </div>
              {operacao.atualizado_em && (
                <div>
                  <small className="text-muted">Atualizado em:</small>
                  <p className="mb-0">{new Date(operacao.atualizado_em).toLocaleString('pt-BR')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperacaoDetalhes;
