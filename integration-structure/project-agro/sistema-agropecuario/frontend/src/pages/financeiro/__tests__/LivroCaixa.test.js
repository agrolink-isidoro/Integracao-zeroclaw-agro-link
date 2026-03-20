import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, waitFor } from '@testing-library/react';
import LivroCaixa from '@/pages/financeiro/LivroCaixa';
import financeiroService from '@/services/financeiro';
import * as useApi from '@/hooks/useApi';
jest.mock('@/services/financeiro');
jest.mock('@/hooks/useApi');
describe('LivroCaixa', () => {
    beforeEach(() => {
        useApi.useApiQuery.mockReturnValue({ data: [{ id: 1, banco: 'Banco A', conta: '12345' }], isLoading: false });
    });
    it('renderiza a lista de lançamentos', async () => {
        financeiroService.getLancamentos.mockResolvedValue([
            { id: 1, data: '2025-10-01', descricao: 'Pagamento X', conta: { id: 1, banco: 'Banco A', conta: '12345' }, tipo: 'pagamento', valor: 100.0, reconciled: false },
        ]);
        render(_jsx(LivroCaixa, {}));
        await waitFor(() => expect(financeiroService.getLancamentos).toHaveBeenCalled());
        expect(screen.getByText('Livro Caixa')).toBeInTheDocument();
        expect(screen.getByText('Pagamento X')).toBeInTheDocument();
        expect(screen.getByText('Banco A - 12345')).toBeInTheDocument();
    });
});
