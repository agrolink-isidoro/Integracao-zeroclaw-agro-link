import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PendingRateios from '../PendingRateios';
import api from '@/services/api';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
jest.mock('@/services/api');
jest.mock('@/contexts/AuthContext');
jest.mock('@/hooks/useToast');
const mockedApi = api;
const mockedUseAuth = useAuthContext;
const mockedUseToast = useToast;
describe('PendingRateios', () => {
    beforeEach(() => jest.resetAllMocks());
    it('renders approvals and triggers approve/reject and invalidates queries when user can approve', async () => {
        const qc = new QueryClient();
        const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');
        const refreshSpy = jest.fn().mockResolvedValue(true);
        mockedUseAuth.mockReturnValue({ refreshToken: refreshSpy, isAuthenticated: true });
        const showErrorSpy = jest.fn();
        // first GET -> approvals list (pending), second GET -> permissions (can_approve=true)
        mockedApi.get.mockResolvedValueOnce({ data: [{ id: 1, rateio: { id: 11 }, status: 'pending', criado_em: '2025-12-28T10:00:00Z', criado_por_nome: 'User A' }] })
            .mockResolvedValueOnce({ data: { can_approve: true, can_reject: true } });
        mockedApi.post.mockResolvedValue({ data: {} });
        // prepare useToast spy before render so component captures it
        mockedUseToast.mockReturnValue({ showError: showErrorSpy, showSuccess: jest.fn(), showInfo: jest.fn() });
        render(_jsx(QueryClientProvider, { client: qc, children: _jsx(PendingRateios, {}) }));
        await waitFor(() => expect(screen.getByText(/Rateio #11/)).toBeInTheDocument());
        // Approve should call refreshToken when access is missing and then post
        fireEvent.click(screen.getByText(/Aprovar/));
        await waitFor(() => expect(refreshSpy).toHaveBeenCalled());
        await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith('/financeiro/rateios-approvals/1/approve/'));
        // item should be removed from the DOM immediately via cache update
        await waitFor(() => expect(screen.queryByText(/Rateio #11/)).not.toBeInTheDocument());
        // Now verify permission-denied flow on a fresh pending item
        mockedApi.get.mockResolvedValueOnce({ data: [{ id: 3, rateio: { id: 33 }, status: 'pending', criado_em: '2025-12-28T12:00:00Z', criado_por_nome: 'User C' }] })
            .mockResolvedValueOnce({ data: { can_approve: true, can_reject: true } });
        const qc3 = new QueryClient();
        render(_jsx(QueryClientProvider, { client: qc3, children: _jsx(PendingRateios, {}) }));
        await waitFor(() => expect(screen.getByText(/Rateio #33/)).toBeInTheDocument());
        mockedUseAuth.mockReturnValue({ refreshToken: jest.fn().mockResolvedValue(true), isAuthenticated: true });
        mockedApi.post.mockRejectedValueOnce({ response: { status: 403, data: { detail: 'Forbidden' } } });
        fireEvent.click(screen.getByText(/Aprovar/));
        await waitFor(() => expect(showErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Você não tem permissão')));
        // Reject should also call post (simulate success)
        mockedApi.post.mockResolvedValueOnce({ data: {} });
        fireEvent.click(screen.getByText(/Rejeitar/));
        await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith('/financeiro/rateios-approvals/3/reject/'));
        await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['rateios-approvals'] }));
        await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['despesas'] }));
    });
    it('hides approve/reject when user lacks permission', async () => {
        const qc2 = new QueryClient();
        // approvals and permissions=false
        mockedApi.get.mockResolvedValueOnce({ data: [{ id: 2, rateio: { id: 22 }, status: 'pending', criado_em: '2025-12-28T11:00:00Z', criado_por_nome: 'User B' }] })
            .mockResolvedValueOnce({ data: { can_approve: false, can_reject: false } });
        // ensure auth context exists in this test too
        mockedUseAuth.mockReturnValue({ refreshToken: jest.fn().mockResolvedValue(true), isAuthenticated: true });
        mockedUseToast.mockReturnValue({ showError: jest.fn(), showSuccess: jest.fn(), showInfo: jest.fn() });
        render(_jsx(QueryClientProvider, { client: qc2, children: _jsx(PendingRateios, {}) }));
        await waitFor(() => expect(screen.getByText(/Rateio #22/)).toBeInTheDocument());
        // When permission is false, show a single disabled "Sem permissão" button
        expect(screen.getByText(/Sem permissão/)).toBeInTheDocument();
        expect(screen.queryByText(/Aprovar/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Rejeitar/)).not.toBeInTheDocument();
    });
});
