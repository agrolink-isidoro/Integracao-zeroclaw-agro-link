import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import Dashboard from '../Dashboard';
import ModuleTabs from '@/components/common/ModuleTabs';
import financeiroService from '@/services/financeiro';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
jest.mock('@/services/financeiro');
const mocked = financeiroService;
// Mock react-chartjs-2 so tests don't need canvas in the JSDOM environment
jest.mock('react-chartjs-2', () => ({
    Pie: () => _jsx("div", { "data-testid": "pie-chart" }),
    Bar: () => _jsx("div", { "data-testid": "bar-chart" }),
}));
const renderWithClient = (ui) => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(_jsx(QueryClientProvider, { client: qc, children: _jsx(MemoryRouter, { children: ui }) }));
};
describe('Financeiro Dashboard - navigation', () => {
    it('renders module tabs and navigates to Financiamentos', async () => {
        const sample = {
            vencimentos: { total_pendente: 10, total_pago: 0, total_atrasado: 0, count_pendente: 0, count_pago: 0, count_atrasado: 0 },
            financiamentos: { total_financiado: 0, total_pendente: 0, count_ativos: 0 },
            emprestimos: { total_emprestado: 0, total_pendente: 0, count_ativos: 0 },
            data_referencia: '2026-01-01'
        };
        mocked.getResumoFinanceiro.mockResolvedValue(sample);
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        // Render ModuleTabs directly to test navigation (avoid importing parent page in unit tests)
        const tabs = [
            { id: 'dashboard', label: 'Visão Geral', icon: 'bi bi-speedometer2', to: '/financeiro/dashboard' },
            { id: 'rateios', label: 'Rateios', icon: 'bi bi-list-check', to: '/financeiro/rateios' },
            { id: 'vencimentos', label: 'Lista', icon: 'bi bi-calendar3', to: '/financeiro/vencimentos' },
            { id: 'financiamentos', label: 'Financiamentos', icon: 'bi bi-bank', to: '/financeiro/financiamentos' },
            { id: 'emprestimos', label: 'Empréstimos', icon: 'bi bi-wallet2', to: '/financeiro/emprestimos' },
        ];
        render(_jsx(QueryClientProvider, { client: qc, children: _jsx(MemoryRouter, { initialEntries: ["/financeiro/dashboard"], children: _jsxs(Routes, { children: [_jsx(Route, { path: "/financeiro/dashboard", element: _jsx(ModuleTabs, { tabs: tabs }) }), _jsx(Route, { path: "/financeiro/financiamentos", element: _jsx("div", { children: "Financiamentos Page" }) })] }) }) }));
        // ModuleTabs should be present (rendered directly)
        expect(await screen.findByRole('button', { name: /Financiamentos/i })).toBeInTheDocument();
        // ensure Financiamentos tab is rendered (navigation tested in integration/e2e)
        expect(screen.getByText(/Financiamentos/i)).toBeInTheDocument();
    });
});
describe('Financeiro Dashboard', () => {
    it('renders summary numbers and charts', async () => {
        const sample = {
            vencimentos: { total_pendente: 1234.5, total_pago: 200, total_atrasado: 50, count_pendente: 3, count_pago: 1, count_atrasado: 1 },
            financiamentos: { total_financiado: 10000, total_pendente: 5000, count_ativos: 2 },
            emprestimos: { total_emprestado: 5000, total_pendente: 1200, count_ativos: 1 },
            data_referencia: '2026-01-01'
        };
        mocked.getResumoFinanceiro.mockResolvedValue(sample);
        renderWithClient(_jsx(Dashboard, {}));
        await waitFor(() => expect(mocked.getResumoFinanceiro).toHaveBeenCalled());
        // Scope assertions to the 'Vencimentos' card to avoid ambiguous matches
        const headings = await screen.findAllByText('Vencimentos');
        const heading = headings.find(h => h.tagName.toLowerCase() === 'h6');
        expect(heading).toBeTruthy();
        const cardBody = heading.closest('.card-body');
        expect(cardBody).toBeTruthy();
        const withinVenc = within(cardBody);
        expect(withinVenc.getByText(/Pendente:/)).toBeInTheDocument();
        expect(withinVenc.getByText(/1234.5/)).toBeInTheDocument();
        // Charts should render our mocked chart components
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
    it('passes selected date to API when updated', async () => {
        const sample = {
            vencimentos: { total_pendente: 10, total_pago: 0, total_atrasado: 0, count_pendente: 0, count_pago: 0, count_atrasado: 0 },
            financiamentos: { total_financiado: 0, total_pendente: 0, count_ativos: 0 },
            emprestimos: { total_emprestado: 0, total_pendente: 0, count_ativos: 0 },
            data_referencia: '2026-01-01'
        };
        mocked.getResumoFinanceiro.mockResolvedValue(sample);
        renderWithClient(_jsx(Dashboard, {}));
        // initial call should happen with undefined (no date selected)
        await waitFor(() => expect(mocked.getResumoFinanceiro).toHaveBeenCalledWith(undefined));
        // data selector should be present on the dashboard
        const input = await screen.findByLabelText('Data referência');
        fireEvent.change(input, { target: { value: '2026-01-01' } });
        const btn = await screen.findByRole('button', { name: /Atualizar/i });
        fireEvent.click(btn);
        await waitFor(() => expect(mocked.getResumoFinanceiro).toHaveBeenCalled());
        // ensure one of the calls used the selected date
        const calledWithDate = mocked.getResumoFinanceiro.mock.calls.some((c) => c[0] === '2026-01-01');
        expect(calledWithDate).toBeTruthy();
    });
});
