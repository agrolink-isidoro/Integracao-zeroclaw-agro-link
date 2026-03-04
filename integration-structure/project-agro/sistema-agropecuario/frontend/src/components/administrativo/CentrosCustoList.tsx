import React from 'react';
import { useApiQuery, useApiDelete } from '@/hooks/useApi';

interface Centro { id: number; codigo: string; nome: string; categoria: string; ativo: boolean }

const CentrosCustoList: React.FC<{ onOpenCreate?: () => void }> = ({ onOpenCreate }) => {
  const { data: centros = [], isLoading, error, refetch } = useApiQuery<Centro[]>(['centros-custo'], '/administrativo/centros-custo/');
  const deleteMut = useApiDelete('/administrativo/centros-custo/', [['centros-custo']]);

  return (
    <div>
      <div className="d-flex justify-content-between mb-2">
        <div><strong>Centros de Custo</strong></div>
        <div>
          <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => refetch()}><i className="bi bi-arrow-clockwise" /> Atualizar</button>
          <button className="btn btn-sm btn-primary" onClick={() => onOpenCreate && onOpenCreate()}><i className="bi bi-plus" /> Novo</button>
        </div>
      </div>

      {isLoading && <div>Carregando...</div>}
      {error && <div className="text-danger">Erro ao carregar centros</div>}

      {centros.length === 0 && !isLoading && <div className="text-muted">Nenhum centro cadastrado.</div>}

      {centros.length > 0 && (
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>#</th>
                <th>Código</th>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Ativo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {centros.map(c => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.codigo}</td>
                  <td>{c.nome}</td>
                  <td>{c.categoria}</td>
                  <td>{c.ativo ? <span className="badge bg-success">Sim</span> : <span className="badge bg-secondary">Não</span>}</td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => { if (window.confirm('Remover centro?')) deleteMut.mutate(c.id); }}>Remover</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default CentrosCustoList;
