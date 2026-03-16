import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FinanciamentoDetail from '../FinanciamentoDetail';
import financeiroService from '@/services/financeiro';
jest.mock('@/services/financeiro');
const mocked = financeiroService;
const renderWithClientAndRoute = (ui, route = '/financeiro/financiamentos/1') => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(_jsx(QueryClientProvider, { client: qc, children: _jsx(MemoryRouter, { initialEntries: [route], children: ui }) }));
};
describe('FinanciamentoDetail', () => {
    it('renders financing and parcelas and marks parcela paid', async () => {
        const financ = { id: 1, descricao: 'Fin 1', valor_financiado: 1000, numero_parcelas: 2, data_contratacao: '2026-01-01', criado_em: '2026-01-01' };
        const parcelas = [{ id: 10, numero_parcela: 1, valor_parcela: 500, data_vencimento: '2026-02-01', pago: false }];
        mocked.getFinanciamentoById.mockResolvedValue(financ);
        mocked.getParcelasFinanciamento.mockResolvedValue(parcelas);
        mocked.marcarParcelaFinanciamentoPago.mockResolvedValue({ ...parcelas[0], pago: true });
        renderWithClientAndRoute(_jsx(Routes, { children: _jsx(Route, { path: "/financeiro/financiamentos/:id", element: _jsx(FinanciamentoDetail, {}) }) }));
        expect(await screen.findByText('Fin 1')).toBeInTheDocument();
        expect(await screen.findByText('R$ 500')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Marcar pago'));
        expect(mocked.marcarParcelaFinanciamentoPago).toHaveBeenCalledWith(10);
    });
    it('generates parcelas when clicking Gerar Parcelas and confirms', async () => {
        const financ = { id: 1, descricao: 'Fin 1', valor_financiado: 1000, numero_parcelas: 2, data_contratacao: '2026-01-01', criado_em: '2026-01-01' };
        const parcelas = [{ id: 10, numero_parcela: 1, valor_parcela: 500, data_vencimento: '2026-02-01', pago: false }];
        mocked.getFinanciamentoById.mockResolvedValue(financ);
        mocked.getParcelasFinanciamento.mockResolvedValue(parcelas);
        mocked.gerarParcelasFinanciamento.mockResolvedValue(financ);
        renderWithClientAndRoute(_jsx(Routes, { children: _jsx(Route, { path: "/financeiro/financiamentos/:id", element: _jsx(FinanciamentoDetail, {}) }) }));
        expect(await screen.findByText('Fin 1')).toBeInTheDocument();
        window.confirm = jest.fn().mockReturnValue(true);
        fireEvent.click(screen.getByText('Gerar Parcelas'));
        expect(mocked.gerarParcelasFinanciamento).toHaveBeenCalledWith(1);
    });
});
