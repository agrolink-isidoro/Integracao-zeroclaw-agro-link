import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { useAuthContext } from '@/contexts/AuthContext';

interface NotificationItem {
  id: number;
  titulo?: string;
  mensagem?: string;
}

const Notifications: React.FC = () => {
  const { isAuthenticated, loading: authLoading } = useAuthContext();
  const { data: notifs = [], isLoading, refetch } = useQuery<NotificationItem[]>({
    queryKey: ['notificacoes-nao-lidas'],
    queryFn: async () => {
      const response = await api.get('/administrativo/notificacoes/nao_lidas/');
      return response.data as NotificationItem[];
    },
    enabled: !authLoading && !!isAuthenticated,
    retry: false,
  });

  const [open, setOpen] = useState(false);

  async function markAllRead() {
    try {
      await api.post('/administrativo/notificacoes/marcar_todas_lidas/');
      refetch();
      setOpen(false);
    } catch (err) {
      console.error('Erro marcando notificações lidas', err);
    }
  }

  const unread = (notifs || []).length;

  return (
    <div className="position-relative me-3">
      <button className="btn btn-outline-secondary btn-sm position-relative" onClick={() => setOpen(!open)} aria-label="Notificações">
        <i className="bi bi-bell" />
        {unread > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">{unread}</span>}
      </button>

      {open && (
        <div className="card position-absolute" style={{ right: 0, width: 320, zIndex: 2000 }}>
          <div className="card-header d-flex justify-content-between align-items-center">
            <strong>Notificações</strong>
            <button className="btn btn-link btn-sm" onClick={markAllRead}>Marcar todas lidas</button>
          </div>
          <div className="card-body">
            {isLoading && <div>Carregando...</div>}
            {!isLoading && notifs.length === 0 && <div className="text-muted">Nenhuma notificação.</div>}
            <ul className="list-group list-group-flush">
              {notifs.map(n => (
                <li key={n.id} className="list-group-item">
                  <div><strong>{n.titulo}</strong></div>
                  <div className="text-muted small">{n.mensagem}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
