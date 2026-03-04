import React, { useState } from 'react';
import { useEmpresas } from '@/hooks/useEmpresas';
import { Link, useNavigate } from 'react-router-dom';
import ModalForm from '@/components/common/ModalForm';
import EmpresaCreate from './EmpresaCreate';

const EmpresasList: React.FC = () => {
  const { data, isLoading, error } = useEmpresas();
  const empresas = Array.isArray(data) ? (data as any[]) : [];
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();

  if (isLoading) return <div>Carregando empresas...</div>;
  if (error) return <div className="alert alert-danger">Erro ao carregar empresas.</div>;

  const handleCloseModal = () => setShowCreateModal(false);

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Empresas / Prestadoras</h2>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>Nova Empresa</button>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CNPJ</th>
                  <th>Contato</th>
                  <th>Endereço</th>
                </tr>
              </thead>
              <tbody>
                {empresas.length ? empresas.map((e: any) => (
                  <tr key={e.id}>
                    <td><Link to={`/comercial/empresas/${e.id}`}>{e.nome}</Link></td>
                    <td>{e.cnpj}</td>
                    <td>{e.contato || '-'}</td>
                    <td>{e.endereco || '-'}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="text-center">Nenhuma empresa encontrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ModalForm isOpen={showCreateModal} onClose={handleCloseModal} title="Nova Empresa">
        <EmpresaCreate onSuccess={(data: any) => { handleCloseModal(); navigate(`/comercial/empresas/${data.id}`); }} onCancel={handleCloseModal} />
      </ModalForm>
    </div>
  );
}

export default EmpresasList;
