import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RateiosList from '../RateiosList';
import financeiroService from '@/services/financeiro';
import * as csvUtils from '@/utils/csv';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
jest.mock('@/services/financeiro');
const mocked = financeiroService;
const renderWithClient = (ui) => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(_jsx(QueryClientProvider, { client: qc, children: ui }));
};
describe('RateiosList', () => {
    it('renders list and exports CSV when clicking Exportar CSV', async () => {
        const sample = [{ id: 1, titulo: 'Rateio 1', descricao: 'desc', valor_total: 100, data_rateio: '2026-01-01', criado_em: '2026-01-01', talhoes: [] }];
        mocked.getRateios.mockResolvedValue(sample);
        const spy = jest.spyOn(csvUtils, 'downloadCSV').mockImplementation(() => { });
        renderWithClient(_jsx(RateiosList, {}));
        expect(await screen.findByText('Rateio 1')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Exportar CSV'));
        expect(spy).toHaveBeenCalledWith('rateios.csv', expect.any(String));
        spy.mockRestore();
    });
});
