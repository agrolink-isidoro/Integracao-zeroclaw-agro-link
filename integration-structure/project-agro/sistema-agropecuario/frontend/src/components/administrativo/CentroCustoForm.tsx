import React, { useState } from 'react';
import { useApiCreate } from '@/hooks/useApi';

const CentroCustoForm: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const create = useApiCreate('/administrativo/centros-custo/', [['centros-custo']]);
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('administrativo');
  const [ativo, setAtivo] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await create.mutateAsync({ codigo, nome, categoria, ativo });
      alert('Centro criado');
      onClose?.();
    } catch (err: unknown) {
      const extractDetail = (e: unknown) => {
        if (!e || typeof e !== 'object') return String(e);
        const ae = e as { response?: { data?: unknown }; message?: string };
        if (ae.response && typeof ae.response.data === 'object' && ae.response.data !== null && 'detail' in (ae.response.data as Record<string, unknown>)) {
          const d = (ae.response.data as Record<string, unknown>)['detail'];
          return typeof d === 'string' ? d : JSON.stringify(d);
        }
        return JSON.stringify(ae.response?.data) || ae.message || 'Erro desconhecido';
      };
      const detail = extractDetail(err);
      const ae2 = err as { response?: { data?: unknown } };
      console.error('Erro ao criar centro:', ae2.response?.data);
      alert('Erro ao criar centro: ' + detail);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-info text-white d-flex align-items-center">
        <i className="bi bi-diagram-3 me-2"></i>
        <h5 className="mb-0">Novo Centro de Custo</h5>
      </div>
      <div className="card-body p-3 p-md-4">
        <form onSubmit={handleSubmit}>
          <div className="row g-2 g-md-3">
            <div className="col-12 col-md-6">
              <label htmlFor="codigo" className="form-label">
                <i className="bi bi-hash me-1"></i>Código
              </label>
              <input id="codigo" className="form-control" value={codigo} onChange={(e) => setCodigo(e.target.value)} required />
            </div>
            <div className="col-12 col-md-6">
              <label htmlFor="nome" className="form-label">
                <i className="bi bi-tag me-1"></i>Nome
              </label>
              <input id="nome" className="form-control" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
            <div className="col-12">
              <label htmlFor="categoria" className="form-label">
                <i className="bi bi-list-ul me-1"></i>Categoria
              </label>
              <select id="categoria" className="form-select" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                <option value="administrativo">Administrativo</option>
                <option value="transporte">Transporte</option>
                <option value="manutencao">Manutenção</option>
                <option value="frete">Frete</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className="col-12">
              <div className="form-check mt-2">
                <input className="form-check-input" type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} id="ativo" />
                <label className="form-check-label" htmlFor="ativo">
                  <i className="bi bi-toggle-on me-1"></i>Ativo
                </label>
              </div>
            </div>
            <div className="col-12">
              <div className="d-flex flex-column flex-sm-row gap-2 justify-content-end mt-3">
                <button type="button" className="btn btn-outline-secondary" onClick={() => onClose?.()} disabled={submitting}>
                  <i className="bi bi-x-circle me-2"></i>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-info text-white" disabled={submitting}>
                  <i className="bi bi-check-circle me-2"></i>
                  {submitting ? 'Enviando...' : 'Criar'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CentroCustoForm;
