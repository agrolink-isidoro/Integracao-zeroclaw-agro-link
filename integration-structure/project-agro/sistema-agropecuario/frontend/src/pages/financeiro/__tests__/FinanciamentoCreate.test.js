import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FinanciamentoCreate from '../FinanciamentoCreate';
import financeiroService from '@/services/financeiro';
jest.mock('@/services/financeiro');
const mocked = financeiroService;
describe('FinanciamentoCreate', () => {
    it('submits form and calls onSuccess when provided', async () => {
        mocked.createFinanciamento.mockResolvedValue({ id: 123 });
        const onSuccess = jest.fn();
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(_jsx(QueryClientProvider, { client: qc, children: _jsx(MemoryRouter, { children: _jsx(FinanciamentoCreate, { onSuccess: onSuccess }) }) }));
        fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Test Fin' } });
        fireEvent.change(screen.getByLabelText('Valor financiado'), { target: { value: '1000' } });
        fireEvent.change(screen.getByLabelText('Número de parcelas'), { target: { value: '5' } });
        fireEvent.change(screen.getByLabelText('Data contratação'), { target: { value: '2026-01-01' } });
        fireEvent.click(screen.getByText('Criar'));
        await waitFor(() => expect(mocked.createFinanciamento).toHaveBeenCalled());
        // ensure onSuccess was invoked
        await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    });
});
