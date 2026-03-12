import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import operacoesService from '../services/operacoes';
import { ordensService } from '../services/equipamentos';
import dashboardService from '../services/dashboard';

type PendingItem = {
  id: string;
  module: 'Agricultura' | 'Máquinas' | 'Estoque';
  title: string;
  date?: string | null;
  meta?: string;
  link: string;
};

const PendingActivitiesTable: React.FC = () => {
  const [items, setItems] = useState<PendingItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const [ops, ords, estoque] = await Promise.all([
          // next planned operations, limit 6, order by data_operacao or data_inicio
          operacoesService.listar({ status: 'planejada', ordering: 'data_operacao' }),
          ordensService.listar({ status: 'planejada', ordering: 'data_agendada' }).catch(() => ordensService.listar({ status: 'planejada' })),
          dashboardService.getEstoque(),
        ]);

        const opItems: PendingItem[] = (ops || [])
          .slice(0, 6)
          .map((o: any) => ({
            id: `op-${o.id}`,
            module: 'Agricultura',
            title: o.tipo_display || o.categoria_display || `Operação #${o.id}`,
            date: o.data_operacao || o.data_inicio || null,
            meta: o.fazenda ? String(o.fazenda) : undefined,
            link: '/agricultura',
          }));

        const ordItems: PendingItem[] = (ords || [])
          .slice(0, 6)
          .map((o: any) => ({
            id: `ord-${o.id}`,
            module: 'Máquinas',
            title: o.titulo || o.descricao || `Ordem #${o.id}`,
            date: o.data_agendada || o.data_inicio || null,
            meta: o.equipamento ? String(o.equipamento) : undefined,
            link: '/maquinas',
          }));

        const estoqueItems: PendingItem[] = (estoque?.kpis?.abaixo_minimo_itens || [])
          .slice(0, 6)
          .map((it: any) => ({
            id: `est-${it.id}`,
            module: 'Estoque',
            title: it.nome || it.codigo || `Item #${it.id}`,
            date: null,
            meta: `${it.quantidade_estoque} ${it.unidade ?? ''}`.trim(),
            link: '/estoque',
          }));

        const combined = [...opItems, ...ordItems, ...estoqueItems]
          .sort((a, b) => {
            if (a.date && b.date) return new Date(a.date).getTime() - new Date(b.date).getTime();
            if (a.date) return -1;
            if (b.date) return 1;
            return 0;
          })
          .slice(0, 10);

        if (mounted) setItems(combined);
      } catch (err) {
        console.error('PendingActivitiesTable error', err);
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="card shadow-sm mb-4">
        <div className="card-header">
          <h6 className="mb-0">Atividades Pendentes</h6>
        </div>
        <div className="card-body text-center text-muted py-4">
          <div className="spinner-border spinner-border-sm me-2" role="status"></div>
          Carregando...
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="card shadow-sm mb-4">
        <div className="card-header">
          <h6 className="mb-0">Atividades Pendentes</h6>
        </div>
        <div className="card-body text-center text-muted py-4">
          <i className="bi bi-check2-all fs-3 d-block mb-2 text-success"></i>
          <small>Nenhuma atividade pendente</small>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-header d-flex align-items-center">
        <h6 className="mb-0">Atividades Pendentes</h6>
        <small className="text-muted ms-3">Próximas operações, ordens e estoques baixos</small>
      </div>
      <div className="table-responsive">
        <table className="table mb-0">
          <thead>
            <tr>
              <th style={{ width: 120 }}>Módulo</th>
              <th>Item</th>
              <th style={{ width: 140 }}>Prazo / Quantidade</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td><span className="text-muted" style={{ fontSize: '0.85rem' }}>{it.module}</span></td>
                <td>
                  <div className="fw-semibold text-truncate" style={{ maxWidth: 320 }}>{it.title}</div>
                  {it.meta && <div className="text-muted" style={{ fontSize: '0.75rem' }}>{it.meta}</div>}
                </td>
                <td>{it.date ? new Date(it.date).toLocaleString('pt-BR') : it.meta || '—'}</td>
                <td>
                  <Link to={it.link} className="btn btn-sm btn-outline-dark">Abrir</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card-footer text-end">
        <Link to="/agricultura" className="btn btn-sm btn-link">Ver mais</Link>
      </div>
    </div>
  );
};

export default PendingActivitiesTable;
