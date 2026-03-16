import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FinanciamentosList from '../FinanciamentosList';
import financeiroService from '@/services/financeiro';
import * as csvUtils from '@/utils/csv';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
jest.mock('@/services/financeiro');
const mocked = financeiroService;
const renderWithClient = (ui) => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(_jsx(QueryClientProvider, { client: qc, children: ui }));
};
describe('FinanciamentosList', () => {
    it('renders list and exports CSV when clicking Exportar CSV and calls gerarParcelas', async () => {
        const sample = [{ id: 1, descricao: 'Fin 1', valor_financiado: 1000, numero_parcelas: 4, data_contratacao: '2026-01-01', criado_em: '2026-01-01' }];
        mocked.getFinanciamentos.mockResolvedValue(sample);
        mocked.gerarParcelasFinanciamento.mockResolvedValue(sample[0]);
        const spy = jest.spyOn(csvUtils, 'downloadCSV').mockImplementation(() => { });
        renderWithClient(_jsx(FinanciamentosList, {}));
        expect(await screen.findByText('Fin 1')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Exportar CSV'));
        expect(spy).toHaveBeenCalledWith('financiamentos.csv', expect.any(String));
        // simulate user confirming the action
        window.confirm = jest.fn().mockReturnValue(true);
        fireEvent.click(screen.getByText('Gerar Parcelas'));
        expect(mocked.gerarParcelasFinanciamento).toHaveBeenCalledWith(1);
        spy.mockRestore();
    });
    it('opens inline create form and submits', async () => {
        mocked.getFinanciamentos.mockResolvedValue([]);
        mocked.createFinanciamento.mockResolvedValue({ id: 999 });
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(_jsx(QueryClientProvider, { client: qc, children: _jsx(FinanciamentosList, {}) }));
        expect(await screen.findByText('Financiamentos')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Novo'));
        expect(await screen.findByLabelText('Descrição')).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Inline Fin' } });
        fireEvent.change(screen.getByLabelText('Valor financiado'), { target: { value: '2500' } });
        fireEvent.change(screen.getByLabelText('Número de parcelas'), { target: { value: '5' } });
        fireEvent.change(screen.getByLabelText('Data contratação'), { target: { value: '2026-03-01' } });
        fireEvent.click(screen.getByText('Criar'));
        // ensure service was called
        await waitFor(() => expect(mocked.createFinanciamento).toHaveBeenCalledWith(expect.objectContaining({ descricao: 'Inline Fin', numero_parcelas: 5 })));
    });
});
