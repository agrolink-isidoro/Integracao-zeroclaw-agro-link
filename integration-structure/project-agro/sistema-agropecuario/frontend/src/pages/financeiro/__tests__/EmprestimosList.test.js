import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EmprestimosList from '../EmprestimosList';
import financeiroService from '@/services/financeiro';
import * as csvUtils from '@/utils/csv';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
jest.mock('@/services/financeiro');
const mocked = financeiroService;
const renderWithClient = (ui) => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(_jsx(QueryClientProvider, { client: qc, children: ui }));
};
describe('EmprestimosList', () => {
    it('renders list and exports CSV when clicking Exportar CSV and calls gerarParcelasEmprestimo', async () => {
        const sample = [{ id: 2, descricao: 'Emp 1', valor_emprestado: 500, numero_parcelas: 6, data_contratacao: '2026-02-01', criado_em: '2026-02-01' }];
        mocked.getEmprestimos.mockResolvedValue(sample);
        mocked.gerarParcelasEmprestimo.mockResolvedValue(sample[0]);
        const spy = jest.spyOn(csvUtils, 'downloadCSV').mockImplementation(() => { });
        renderWithClient(_jsx(EmprestimosList, {}));
        expect(await screen.findByText('Emp 1')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Exportar CSV'));
        expect(spy).toHaveBeenCalledWith('emprestimos.csv', expect.any(String));
        // simulate user confirming the action
        window.confirm = jest.fn().mockReturnValue(true);
        fireEvent.click(screen.getByText('Gerar Parcelas'));
        expect(mocked.gerarParcelasEmprestimo).toHaveBeenCalledWith(2);
        spy.mockRestore();
    });
    it('opens inline create form and submits', async () => {
        mocked.getEmprestimos.mockResolvedValue([]);
        mocked.createEmprestimo.mockResolvedValue({ id: 888 });
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(_jsx(QueryClientProvider, { client: qc, children: _jsx(EmprestimosList, {}) }));
        expect(await screen.findByText('Empréstimos')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Novo'));
        expect(await screen.findByLabelText('Descrição')).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Inline Emp' } });
        fireEvent.change(screen.getByLabelText('Valor emprestado'), { target: { value: '600' } });
        fireEvent.change(screen.getByLabelText('Número de parcelas'), { target: { value: '4' } });
        fireEvent.change(screen.getByLabelText('Data contratação'), { target: { value: '2026-04-01' } });
        fireEvent.click(screen.getByText('Criar'));
        await waitFor(() => expect(mocked.createEmprestimo).toHaveBeenCalledWith(expect.objectContaining({ descricao: 'Inline Emp', numero_parcelas: 4 })));
    });
});
