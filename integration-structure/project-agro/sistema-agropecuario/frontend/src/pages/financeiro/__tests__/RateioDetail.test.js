import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RateioDetail from '../RateioDetail';
import financeiroService from '@/services/financeiro';
import api from '@/services/api';
import { useAuthContext } from '@/contexts/AuthContext';
jest.mock('@/contexts/AuthContext');
jest.mock('@/services/api');
const mockedUseAuth = useAuthContext;
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
jest.mock('@/services/financeiro');
const mocked = financeiroService;
const mockedApi = api;
const renderWithClient = (ui) => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(_jsx(QueryClientProvider, { client: qc, children: ui }));
};
describe('RateioDetail', () => {
    it('shows approval buttons and calls approve/reject', async () => {
        const rateio = { id: 1, titulo: 'R1', descricao: 'd', data_rateio: '2026-01-01', valor_total: 300, area_total_hectares: 10, talhoes_rateio: [], talhoes: [], criado_em: '2026-01-01' };
        const approval = { id: 5, rateio: 1, status: 'pending', criado_em: '2026-01-01' };
        mocked.getRateioById.mockResolvedValue(rateio);
        mocked.getRateioApprovals.mockResolvedValue([approval]);
        // permissions endpoint (can approve)
        mockedApi.get.mockResolvedValueOnce({ data: { can_approve: true, can_reject: true } });
        mocked.approveRateio.mockResolvedValue({ status: 'approved' });
        mocked.rejectRateio.mockResolvedValue({ status: 'rejected' });
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');
        const refreshSpy = jest.fn().mockResolvedValue(true);
        mockedUseAuth.mockReturnValue({ refreshToken: refreshSpy, isAuthenticated: true });
        render(_jsx(QueryClientProvider, { client: qc, children: _jsx(MemoryRouter, { initialEntries: ["/financeiro/rateios/1"], children: _jsx(Routes, { children: _jsx(Route, { path: "/financeiro/rateios/:id", element: _jsx(RateioDetail, {}) }) }) }) }));
        expect(await screen.findByText('R1')).toBeInTheDocument();
        const approveBtn = await screen.findByText('Aprovar');
        const rejectBtn = await screen.findByText('Rejeitar');
        fireEvent.click(approveBtn);
        await waitFor(() => expect(refreshSpy).toHaveBeenCalled());
        await waitFor(() => expect(mocked.approveRateio).toHaveBeenCalledWith(5));
        await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['financeiro', 'rateio', 1] }));
        await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['financeiro', 'rateio-approvals'] }));
        await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['financeiro', 'vencimentos'] }));
        await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['despesas'] }));
        fireEvent.click(rejectBtn);
        await waitFor(() => expect(mocked.rejectRateio).toHaveBeenCalledWith(5));
        await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['financeiro', 'rateio', 1] }));
        await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['financeiro', 'rateio-approvals'] }));
        await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['despesas'] }));
    });
    it('shows not found message when rateio is missing', async () => {
        mocked.getRateioById.mockResolvedValue(null);
        mocked.getRateioApprovals.mockResolvedValue([]);
        renderWithClient(_jsx(MemoryRouter, { initialEntries: ["/financeiro/rateios/999"], children: _jsx(Routes, { children: _jsx(Route, { path: "/financeiro/rateios/:id", element: _jsx(RateioDetail, {}) }) }) }));
        expect(await screen.findByText('Rateio não encontrado')).toBeInTheDocument();
    });
});
