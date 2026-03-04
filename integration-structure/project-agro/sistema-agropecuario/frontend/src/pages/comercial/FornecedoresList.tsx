import React from 'react';
import FornecedorList from '@/components/comercial/FornecedorList';

const FornecedoresPage: React.FC = () => {
  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-0">Fornecedores</h1>
          <p className="text-muted">Lista de fornecedores — pesquisar, cadastrar, editar e gerenciar documentos.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <FornecedorList onEdit={() => { /* enable Edit button in list */ }} />
        </div>
      </div>
    </div>
  );
};

export default FornecedoresPage;
