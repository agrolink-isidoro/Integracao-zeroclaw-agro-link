import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RotateCcw, Pause, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface UploadSession {
  id: string;
  upload_nome: string;
  status: 'em_progresso' | 'pausada' | 'concluida' | 'cancelada';
  criado_por_nome: string;
  progresso_percentage: number;
  registros_processados: number;
  total_registros: number;
  notas: string[];
  criado_em: string;
  atualizado_em: string;
}

interface UploadHistoryPanelProps {
  onRetomar?: (sessionId: string, contextSummary: string) => void;
}

const UploadHistoryPanel: React.FC<UploadHistoryPanelProps> = ({ onRetomar }) => {
  const [expanded, setExpanded] = useState(false);

  // Busca histórico de sessões
  const { data: sessions = [], isLoading, refetch } = useQuery<UploadSession[]>({
    queryKey: ['upload-sessions'],
    queryFn: async () => {
      const response = await api.get('/actions/sessions/');
      return response.data;
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  // Agrupa por status
  const emProgresso = sessions.filter(s => s.status === 'em_progresso');
  const pausadas = sessions.filter(s => s.status === 'pausada');
  const concluidas = sessions.filter(s => s.status === 'concluida');

  const handleRetomar = async (session: UploadSession) => {
    try {
      const response = await api.post(`/actions/sessions/${session.id}/retomar/`);
      const data = response.data;
      
      toast.success(`✅ ${session.upload_nome} retomada!`);
      
      // Notifica parent component
      if (onRetomar) {
        onRetomar(session.id, data.context_summary);
      }
      
      // Atualiza lista
      refetch();
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Erro ao retomar sessão';
      toast.error(msg);
    }
  };

  const handlePausar = async (sessionId: string) => {
    try {
      await api.post(`/actions/sessions/${sessionId}/pausar/`);
      toast.success('Sessão pausada');
      refetch();
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Erro ao pausar sessão';
      toast.error(msg);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'em_progresso':
        return <span className="badge bg-primary">Em andamento</span>;
      case 'pausada':
        return <span className="badge bg-warning">Pausada</span>;
      case 'concluida':
        return <span className="badge bg-success">Concluída</span>;
      case 'cancelada':
        return <span className="badge bg-danger">Cancelada</span>;
      default:
        return <span className="badge bg-secondary">{status}</span>;
    }
  };

  const SessionCard = ({ session }: { session: UploadSession }) => (
    <div className="card mb-3 border-1 shadow-sm">
      <div className="card-body p-3">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="flex-grow-1">
            <h6 className="card-title mb-1 fw-semibold">{session.upload_nome}</h6>
            <small className="text-muted">
              {new Date(session.criado_em).toLocaleDateString('pt-BR')}
              {' '}
              {new Date(session.criado_em).toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </small>
          </div>
          <div>{getStatusBadge(session.status)}</div>
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="progress bg-light" style={{ height: '6px' }}>
            <div
              className={`progress-bar ${
                session.status === 'concluida' ? 'bg-success' :
                session.status === 'pausada' ? 'bg-warning' :
                'bg-primary'
              }`}
              style={{ width: `${session.progresso_percentage}%` }}
              role="progressbar"
            />
          </div>
          <small className="d-block mt-1 text-muted">
            {session.registros_processados} de {session.total_registros} 
            {' '}
            ({session.progresso_percentage.toFixed(1)}%)
          </small>
        </div>

        {/* Notas */}
        {session.notas.length > 0 && (
          <div className="mb-2">
            <small className="d-block text-muted mb-1">📝 Notas:</small>
            <div className="d-flex flex-wrap gap-1">
              {session.notas.slice(-3).map((nota, idx) => (
                <span key={idx} className="text-truncate" style={{ maxWidth: '100px' }}>
                  <small className="badge bg-light text-dark">{nota}</small>
                </span>
              ))}
              {session.notas.length > 3 && (
                <small className="badge bg-light text-dark">
                  +{session.notas.length - 3}
                </small>
              )}
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="d-flex gap-2 mt-3">
          {session.status === 'em_progresso' && (
            <>
              <button
                className="btn btn-sm btn-primary flex-grow-1"
                onClick={() => handleRetomar(session)}
                title="Retomar análise"
              >
                <RotateCcw className="me-1" size={14} />
                Retomar
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => handlePausar(session.id)}
                title="Pausar análise"
              >
                <Pause size={14} />
              </button>
            </>
          )}
          {session.status === 'pausada' && (
            <button
              className="btn btn-sm btn-warning w-100"
              onClick={() => handleRetomar(session)}
            >
              <RotateCcw className="me-1" size={14} />
              Resumir
            </button>
          )}
          {session.status === 'concluida' && (
            <button
              className="btn btn-sm btn-secondary w-100"
              disabled
            >
              <CheckCircle className="me-1" size={14} />
              Concluída
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (!expanded) {
    return (
      <button
        className="btn btn-outline-secondary btn-sm w-100 mb-3"
        onClick={() => setExpanded(true)}
      >
        <Clock size={16} className="me-2" />
        Histórico de Uploads ({emProgresso.length + pausadas.length})
      </button>
    );
  }

  return (
    <div className="card mb-3 border-1">
      <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between">
        <h6 className="mb-0 fw-semibold">
          <Clock size={18} className="me-2" style={{ display: 'inline' }} />
          Histórico de Uploads
        </h6>
        <button
          className="btn-close"
          onClick={() => setExpanded(false)}
          aria-label="Fechar"
        />
      </div>

      <div className="card-body p-3" style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {isLoading ? (
          <div className="text-center py-4">
            <div className="spinner-border spinner-border-sm text-primary mb-2" />
            <p className="text-muted small">Carregando histórico...</p>
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-muted text-center py-4 small">
            Nenhuma sessão anterior. Comece pelo upload de um arquivo!
          </p>
        ) : (
          <>
            {/* Em progresso */}
            {emProgresso.length > 0 && (
              <>
                <h6 className="small fw-semibold text-muted mb-2">
                  📊 Em Andamento ({emProgresso.length})
                </h6>
                {emProgresso.map(session => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </>
            )}

            {/* Pausadas */}
            {pausadas.length > 0 && (
              <>
                <h6 className="small fw-semibold text-muted mb-2 mt-3">
                  ⏸️ Pausadas ({pausadas.length})
                </h6>
                {pausadas.map(session => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </>
            )}

            {/* Concluídas */}
            {concluidas.length > 0 && (
              <>
                <h6 className="small fw-semibold text-muted mb-2 mt-3">
                  ✅ Concluídas ({concluidas.length})
                </h6>
                {concluidas.map(session => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UploadHistoryPanel;
