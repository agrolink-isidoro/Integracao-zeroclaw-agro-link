import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DespesaForm from '../DespesaForm';
import api from '@/services/api';
jest.mock('@/services/api');
const mockedApi = api;
describe('DespesaForm', () => {
    const qc = new QueryClient();
    beforeEach(() => jest.resetAllMocks());
    it('renders form, loads centros and submits', async () => {
        mockedApi.get.mockResolvedValueOnce({ data: [{ id: 1, codigo: 'C001', nome: 'Centro A' }] });
        mockedApi.post.mockResolvedValueOnce({ data: { id: 5, titulo: 'X' } });
        const onClose = jest.fn();
        render(_jsx(QueryClientProvider, { client: qc, children: _jsx(DespesaForm, { onClose: onClose }) }));
        // ensure centros loaded
        await waitFor(() => expect(screen.getByText(/Centro A/)).toBeInTheDocument());
        // mock alert to avoid jsdom not implemented error
        // (component calls alert on success)
        window.alert = jest.fn();
        // fill form
        fireEvent.change(screen.getByLabelText(/Título/i), { target: { value: 'Teste Despesa' } });
        fireEvent.change(screen.getByLabelText(/Valor/i), { target: { value: '42.00' } });
        fireEvent.change(screen.getByLabelText(/Data/i), { target: { value: '2025-12-29' } });
        fireEvent.change(screen.getByLabelText(/Centro de Custo/i), { target: { value: '1' } });
        // submit
        fireEvent.click(screen.getByText(/Criar/));
        await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith('/administrativo/despesas/', expect.objectContaining({ titulo: 'Teste Despesa' })));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });
});
