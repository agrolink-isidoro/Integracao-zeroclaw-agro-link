import React from 'react';
import { useApiQuery, useApiDelete } from '@/hooks/useApi';
import FuncionarioForm from './FuncionarioForm';

interface Funcionario { id: number; nome: string; cargo?: string; salario_bruto?: number; ativo?: boolean }

const FuncionariosList: React.FC = () => {
  const { data: funcionarios = [], isLoading, error, refetch } = useApiQuery<Funcionario[]>(['funcionarios'], '/administrativo/funcionarios/');
  const deleteMut = useApiDelete('/administrativo/funcionarios/', [['funcionarios']]);

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Funcionario | null>(null);

  return (
    <div>
      <div className="d-flex justify-content-between mb-2">
        <div><strong>Funcionários</strong></div>
        <div>
          <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => refetch()}><i className="bi bi-arrow-clockwise" /> Atualizar</button>
          <button className="btn btn-sm btn-primary" onClick={() => { setEditing(null); setOpen(true); }}><i className="bi bi-plus" /> Novo</button>
        </div>
      </div>

      {isLoading && <div>Carregando...</div>}
      {error && <div className="text-danger">Erro ao carregar funcionários</div>}

      {funcionarios.length === 0 && !isLoading && <div className="text-muted">Nenhum funcionário cadastrado.</div>}

      {funcionarios.length > 0 && (
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>#</th>
                <th>Nome</th>
                <th>Cargo</th>
                <th>Salário</th>
                <th>Ativo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {funcionarios.map(f => (
                <tr key={f.id}>
                  <td>{f.id}</td>
                  <td>{f.nome}</td>
                  <td>{f.cargo || '-'}</td>
                  <td>{f.salario_bruto ? `R$ ${f.salario_bruto}` : '-'}</td>
                  <td>{f.ativo ? <span className="badge bg-success">Sim</span> : <span className="badge bg-secondary">Não</span>}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => { setEditing(f); setOpen(true); }}>Editar</button>
                    <button className="btn btn-sm btn-danger" onClick={() => { if (window.confirm('Remover funcionário?')) deleteMut.mutate(f.id); }}>Remover</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="modal d-block" tabIndex={-1} role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editing ? 'Editar Funcionário' : 'Novo Funcionário'}</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setOpen(false)} />
              </div>
              <div className="modal-body">
                <FuncionarioForm onClose={() => { setOpen(false); setEditing(null); }} initialData={editing} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FuncionariosList;
