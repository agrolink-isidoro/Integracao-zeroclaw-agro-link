import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EmprestimoDetail from '../EmprestimoDetail';
import financeiroService from '@/services/financeiro';
jest.mock('@/services/financeiro');
const mocked = financeiroService;
const renderWithClientAndRoute = (ui, route = '/financeiro/emprestimos/2') => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(_jsx(QueryClientProvider, { client: qc, children: _jsx(MemoryRouter, { initialEntries: [route], children: ui }) }));
};
describe('EmprestimoDetail', () => {
    it('renders emprestimo and parcelas and marks parcela paid', async () => {
        const emp = { id: 2, descricao: 'Emp 1', valor_emprestado: 500, numero_parcelas: 3, data_contratacao: '2026-02-01', criado_em: '2026-02-01' };
        const parcelas = [{ id: 20, numero_parcela: 1, valor_parcela: 166.67, data_vencimento: '2026-03-01', pago: false }];
        mocked.getEmprestimoById.mockResolvedValue(emp);
        mocked.getParcelasEmprestimo.mockResolvedValue(parcelas);
        mocked.marcarParcelaEmprestimoPago.mockResolvedValue({ ...parcelas[0], pago: true });
        renderWithClientAndRoute(_jsx(Routes, { children: _jsx(Route, { path: "/financeiro/emprestimos/:id", element: _jsx(EmprestimoDetail, {}) }) }));
        expect(await screen.findByText('Emp 1')).toBeInTheDocument();
        expect(await screen.findByText('R$ 166.67')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Marcar pago'));
        expect(mocked.marcarParcelaEmprestimoPago).toHaveBeenCalledWith(20);
    });
    it('generates parcelas when clicking Gerar Parcelas and confirms', async () => {
        const emp = { id: 2, descricao: 'Emp 1', valor_emprestado: 500, numero_parcelas: 3, data_contratacao: '2026-02-01', criado_em: '2026-02-01' };
        const parcelas = [{ id: 20, numero_parcela: 1, valor_parcela: 166.67, data_vencimento: '2026-03-01', pago: false }];
        mocked.getEmprestimoById.mockResolvedValue(emp);
        mocked.getParcelasEmprestimo.mockResolvedValue(parcelas);
        mocked.gerarParcelasEmprestimo.mockResolvedValue(emp);
        renderWithClientAndRoute(_jsx(Routes, { children: _jsx(Route, { path: "/financeiro/emprestimos/:id", element: _jsx(EmprestimoDetail, {}) }) }));
        expect(await screen.findByText('Emp 1')).toBeInTheDocument();
        window.confirm = jest.fn().mockReturnValue(true);
        fireEvent.click(screen.getByText('Gerar Parcelas'));
        expect(mocked.gerarParcelasEmprestimo).toHaveBeenCalledWith(2);
    });
});
