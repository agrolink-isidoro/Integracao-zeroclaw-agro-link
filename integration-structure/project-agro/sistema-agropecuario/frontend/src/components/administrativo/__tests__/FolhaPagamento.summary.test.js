import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import api from '@/services/api';
import FolhaPagamento from '@/components/administrativo/FolhaPagamento';
jest.mock('@/services/api');
const mockedApi = api;
describe('FolhaPagamento summary cards', () => {
    it('loads and displays previous month summary automatically', async () => {
        // mock funcionarios list
        mockedApi.get.mockImplementation((url) => {
            if (url.includes('/administrativo/funcionarios/')) {
                return Promise.resolve({ data: [{ id: 1, nome: 'João' }, { id: 2, nome: 'Maria' }] });
            }
            if (url.includes('/administrativo/folha-pagamento/summary')) {
                return Promise.resolve({ data: { total_horas_extra_cost: 111.111, total_inss: 22.222, total_folha: 333.333 } });
            }
            return Promise.resolve({ data: [] });
        });
        const queryClient = new QueryClient();
        render(_jsx(QueryClientProvider, { client: queryClient, children: _jsx(FolhaPagamento, {}) }));
        // Wait until summary values are displayed
        await waitFor(() => {
            expect(screen.getByText('R$ 111.111')).toBeInTheDocument();
            expect(screen.getByText('R$ 22.222')).toBeInTheDocument();
            expect(screen.getByText('R$ 333.333')).toBeInTheDocument();
        });
    });
});
