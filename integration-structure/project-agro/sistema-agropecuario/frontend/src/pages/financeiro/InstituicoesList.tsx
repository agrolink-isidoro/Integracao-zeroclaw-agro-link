import React from 'react';
import useApi from '@/hooks/useApi';
import { useApiDelete } from '@/hooks/useApi';
const InstituicaoFormLazy = React.lazy(() => import('@/components/financeiro/InstituicaoForm'));

const InstituicoesList: React.FC = () => {
  // Fetch all institutions without pagination (backend returns all ~280 institutions)
  const api = useApi();
  const del = useApiDelete('/comercial/instituicoes-financeiras/', [['instituicoes']]);
  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState<any | null>(null);
  const [insts, setInsts] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isError, setIsError] = React.useState(false);
  const [error, setError] = React.useState<any>(null);

  React.useEffect(() => {
    // Load all institutions at once (no pagination)
    const loadInstitutions = async () => {
      try {
        const resp = await api.client.get('/comercial/instituicoes-financeiras/');
        const data = resp.data;
        // Handle both paginated and non-paginated responses
        const institutions = Array.isArray(data) ? data : (data?.results || []);
        setInsts(institutions);
      } catch (e: any) {
        setIsError(true);
        setError(e);
      } finally {
        setIsLoading(false);
      }
    };
    loadInstitutions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Confirma exclusão da instituição?')) return;
    try {
      await del.mutateAsync(id);
    } catch (e) {
      console.error('Erro ao excluir instituição', e);
      alert('Falha ao excluir instituição');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Instituições Financeiras (BACEN)</h5>
        <div>
          <button className="btn btn-sm btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>Nova Instituição</button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {isError ? (
            <div className="alert alert-danger">Erro ao carregar instituições: {(error as any)?.message || 'Erro desconhecido'}</div>
          ) : isLoading ? (
            <div>Carregando instituições...</div>
          ) : insts.length === 0 ? (
            <div className="text-muted">Nenhuma instituição encontrada.</div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover table-sm">
                  <thead>
                    <tr>
                      <th>Código BACEN</th>
                      <th>Nome</th>
                      <th>Segmento</th>
                      <th>Cidade</th>
                      <th>UF</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {insts.map((i: any) => (
                      <tr key={i.id}>
                        <td>{i.codigo_bacen}</td>
                        <td>{i.nome}</td>
                        <td>{i.segmento}</td>
                        <td>{i.municipio || '-'}</td>
                        <td>{i.uf || '-'}</td>
                        <td>
                          <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => { setEditing(i); setShowForm(true); }}>Editar</button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(i.id)}>Excluir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {showForm && (
        <div className="modal d-block" tabIndex={-1} role="dialog">
          <div className="modal-dialog modal-lg" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editing ? 'Editar Instituição' : 'Nova Instituição'}</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowForm(false)} />
              </div>
              <div className="modal-body">
                <React.Suspense fallback={<div>Carregando formulário...</div>}>
                  <InstituicaoFormLazy initialData={editing} onClose={() => setShowForm(false)} onSaved={() => setShowForm(false)} />
                </React.Suspense>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstituicoesList;
