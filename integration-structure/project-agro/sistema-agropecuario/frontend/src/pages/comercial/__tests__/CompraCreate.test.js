import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import CompraCreate from '../CompraCreate';
import ComercialService from '@/services/comercial';
import api from '@/services/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
jest.mock('@/services/comercial');
jest.mock('@/services/api');
const mockedComercial = ComercialService;
const mockedApi = api;
describe('CompraCreate', () => {
    beforeEach(() => {
        mockedComercial.createCompra = jest.fn().mockResolvedValue({ id: 1 });
        mockedApi.get = jest.fn().mockResolvedValue({ data: [{ id: 1, nome: 'Fornecedor Y' }] });
    });
    it('submits a new compra', async () => {
        const q = new QueryClient();
        render(_jsx(QueryClientProvider, { client: q, children: _jsx(MemoryRouter, { initialEntries: ["/comercial/compras/new"], children: _jsxs(Routes, { children: [_jsx(Route, { path: "/comercial/compras/new", element: _jsx(CompraCreate, {}) }), _jsx(Route, { path: "/comercial/compras", element: _jsx("div", { children: "Compras List" }) })] }) }) }));
        // Open fornecedor dropdown and select option (click the field then option)
        const fornecedorPlaceholder = await screen.findByText('Selecione um fornecedor');
        fireEvent.click(fornecedorPlaceholder);
        const option = await screen.findByText('Fornecedor Y');
        fireEvent.click(option);
        // Fill other fields (select by name attribute because labels are not linked)
        const dateInput = document.querySelector('input[name="data"]');
        fireEvent.change(dateInput, { target: { value: '2026-01-05' } });
        const valorInput = document.querySelector('input[name="valor_total"]');
        fireEvent.change(valorInput, { target: { value: '1500.00' } });
        const submit = screen.getByRole('button', { name: /salvar compra/i });
        fireEvent.click(submit);
        await waitFor(() => expect(mockedComercial.createCompra).toHaveBeenCalled());
        expect(mockedComercial.createCompra).toHaveBeenCalledWith({ fornecedor: 1, data: '2026-01-05', valor_total: 1500, descricao: '' });
        // After success, should navigate to compras list (our route shows 'Compras List')
        await waitFor(() => expect(screen.getByText('Compras List')).toBeInTheDocument());
    });
});
