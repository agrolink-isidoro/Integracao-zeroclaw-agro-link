import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ComercialService from '@/services/comercial';
const ClienteDetail = () => {
    const { id } = useParams();
    const clienteId = Number(id);
    const { data: cliente, isLoading, error } = useQuery({
        queryKey: ['cliente', clienteId],
        queryFn: () => ComercialService.getClienteById(clienteId),
        enabled: !!clienteId
    });
    if (!clienteId)
        return _jsx("div", { children: "Cliente inv\u00E1lido" });
    if (isLoading)
        return _jsx("div", { children: "Carregando..." });
    if (error)
        return _jsx("div", { children: "Erro ao carregar cliente" });
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsx("div", { className: "d-flex justify-content-between align-items-center mb-3", children: _jsxs("h2", { children: ["Cliente: ", cliente.nome] }) }), _jsx("div", { className: "card", children: _jsx("div", { className: "card-body", children: _jsxs("dl", { children: [_jsx("dt", { children: "CPF/CNPJ" }), _jsx("dd", { children: cliente.cpf_cnpj }), _jsx("dt", { children: "Contato" }), _jsx("dd", { children: cliente.telefone || cliente.celular || cliente.email }), _jsx("dt", { children: "Endere\u00E7o" }), _jsx("dd", { children: cliente.endereco && `${cliente.endereco}, ${cliente.numero || ''} - ${cliente.cidade}/${cliente.estado}` })] }) }) })] }));
};
export default ClienteDetail;
