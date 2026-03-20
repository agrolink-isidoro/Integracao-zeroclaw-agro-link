import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DespesaPrestadoraCreate from '../DespesaPrestadoraCreate';
import ComercialService from '@/services/comercial';
import api from '@/services/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
jest.mock('@/services/comercial');
jest.mock('@/services/api');
const mockedComercial = ComercialService;
const mockedApi = api;
describe('DespesaPrestadoraCreate', () => {
    beforeEach(() => {
        mockedComercial.createDespesaPrestadora = jest.fn().mockResolvedValue({ id: 1, empresa: 1 });
        mockedApi.get = jest.fn().mockResolvedValue({ data: [{ id: 1, nome: 'Empresa A' }, { id: 2, nome: 'Empresa B' }] });
    });
    it('submits a new despesa prestadora and navigates to empresa', async () => {
        const q = new QueryClient();
        render(_jsx(QueryClientProvider, { client: q, children: _jsx(MemoryRouter, { initialEntries: ["/comercial/despesas-prestadoras/new?empresa=1"], children: _jsxs(Routes, { children: [_jsx(Route, { path: "/comercial/despesas-prestadoras/new", element: _jsx(DespesaPrestadoraCreate, {}) }), _jsx(Route, { path: "/comercial/empresas/1", element: _jsx("div", { children: "Empresa 1" }) })] }) }) }));
        // ensure empresa is prefilled by checking that option exists and is clickable
        const empresaPlaceholder = await screen.findByText('Selecione uma empresa');
        fireEvent.click(empresaPlaceholder);
        const empresaOption = await screen.findByText('Empresa A');
        fireEvent.click(empresaOption);
        const categoriaInput = document.querySelector('input[name="categoria"]');
        fireEvent.change(categoriaInput, { target: { value: 'Serviço' } });
        const valorInput = document.querySelector('input[name="valor"]');
        fireEvent.change(valorInput, { target: { value: '200.00' } });
        const submit = screen.getByRole('button', { name: /salvar despesa/i });
        fireEvent.click(submit);
        await waitFor(() => expect(mockedComercial.createDespesaPrestadora).toHaveBeenCalled());
        expect(mockedComercial.createDespesaPrestadora).toHaveBeenCalledWith(expect.objectContaining({ categoria: 'Serviço', empresa: 1 }));
        // valor may be sent as number or string depending on input handling; assert numeric equivalence
        const payload = mockedComercial.createDespesaPrestadora.mock.calls[0][0];
        expect(Number(payload.valor)).toBeCloseTo(200);
        await waitFor(() => expect(screen.getByText('Empresa 1')).toBeInTheDocument());
    });
});
