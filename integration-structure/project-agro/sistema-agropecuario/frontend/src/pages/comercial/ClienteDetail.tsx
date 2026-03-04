import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ComercialService from '@/services/comercial';

const ClienteDetail: React.FC = () => {
  const { id } = useParams();
  const clienteId = Number(id);

  const { data: cliente, isLoading, error } = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: () => ComercialService.getClienteById(clienteId),
    enabled: !!clienteId
  });

  if (!clienteId) return <div>Cliente inválido</div>;
  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro ao carregar cliente</div>;

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Cliente: {cliente.nome}</h2>
      </div>

      <div className="card">
        <div className="card-body">
          <dl>
            <dt>CPF/CNPJ</dt>
            <dd>{cliente.cpf_cnpj}</dd>
            <dt>Contato</dt>
            <dd>{cliente.telefone || cliente.celular || cliente.email}</dd>
            <dt>Endereço</dt>
            <dd>{cliente.endereco && `${cliente.endereco}, ${cliente.numero || ''} - ${cliente.cidade}/${cliente.estado}`}</dd>
          </dl>
        </div>
      </div>
    </div>
  );
};

export default ClienteDetail;
