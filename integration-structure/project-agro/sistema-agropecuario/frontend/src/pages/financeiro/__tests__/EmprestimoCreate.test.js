import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EmprestimoCreate from '../EmprestimoCreate';
import financeiroService from '@/services/financeiro';
jest.mock('@/services/financeiro');
const mocked = financeiroService;
describe('EmprestimoCreate', () => {
    it('submits form and calls onSuccess when provided', async () => {
        mocked.createEmprestimo.mockResolvedValue({ id: 222 });
        const onSuccess = jest.fn();
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(_jsx(QueryClientProvider, { client: qc, children: _jsx(MemoryRouter, { children: _jsx(EmprestimoCreate, { onSuccess: onSuccess }) }) }));
        fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Test Emp' } });
        fireEvent.change(screen.getByLabelText('Valor emprestado'), { target: { value: '500' } });
        fireEvent.change(screen.getByLabelText('Número de parcelas'), { target: { value: '3' } });
        fireEvent.change(screen.getByLabelText('Data contratação'), { target: { value: '2026-02-01' } });
        fireEvent.click(screen.getByText('Criar'));
        await waitFor(() => expect(mocked.createEmprestimo).toHaveBeenCalled());
        await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    });
});
