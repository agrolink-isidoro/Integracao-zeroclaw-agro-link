import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const mockUseAuthContext = jest.fn(() => ({ user: { id: 1, username: 'test' }, loading: false, isAuthenticated: true, login: jest.fn(), logout: jest.fn(), register: jest.fn(), refreshToken: jest.fn() }));
jest.mock('@/contexts/AuthContext', () => ({ useAuthContext: () => mockUseAuthContext() }));
import Notifications from '../Notifications';
import api from '@/services/api';
jest.mock('@/services/api');
const mockedApi = api;
describe('Notifications', () => {
    const qc = new QueryClient();
    beforeEach(() => {
        jest.resetAllMocks();
        mockUseAuthContext.mockImplementation(() => ({ user: { id: 1, username: 'test' }, loading: false, isAuthenticated: true, login: jest.fn(), logout: jest.fn(), register: jest.fn(), refreshToken: jest.fn() }));
    });
    it('renders unread notifications and can mark all read', async () => {
        mockedApi.get.mockResolvedValueOnce({ data: [{ id: 1, titulo: 'Teste', mensagem: 'Msg' }] });
        mockedApi.post.mockResolvedValueOnce({ data: {} });
        render(_jsx(QueryClientProvider, { client: qc, children: _jsx(Notifications, {}) }));
        fireEvent.click(screen.getByLabelText(/Notificações/));
        await waitFor(() => expect(screen.getByText(/Teste/)).toBeInTheDocument());
        fireEvent.click(screen.getByText(/Marcar todas lidas/));
        await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith('/administrativo/notificacoes/marcar_todas_lidas/'));
    });
    it('does not call notifications API when not authenticated', async () => {
        // Simulate unauthenticated state
        mockUseAuthContext.mockReturnValue({ user: null, loading: false, isAuthenticated: false, login: jest.fn(), logout: jest.fn(), register: jest.fn(), refreshToken: jest.fn() });
        // Re-import component to pick up mocked hook
        const { default: NotificationsNoAuth } = await import('../Notifications');
        render(_jsx(QueryClientProvider, { client: qc, children: _jsx(NotificationsNoAuth, {}) }));
        // Open the panel - should not trigger API when unauthenticated
        fireEvent.click(screen.getByLabelText(/Notificações/));
        await new Promise(r => setTimeout(r, 50));
        expect(mockedApi.get).not.toHaveBeenCalled();
        mockUseAuthContext.mockReset();
    });
});
