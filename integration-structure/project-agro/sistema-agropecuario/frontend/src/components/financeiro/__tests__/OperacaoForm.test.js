import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OperacaoForm from '../OperacaoForm';
jest.mock('@/hooks/useApi', () => ({
    useApiQuery: jest.fn(),
    useApiCreate: jest.fn(),
}));
import * as useApi from '@/hooks/useApi';
describe('OperacaoForm (Empréstimo)', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });
    it('sends numeric fields as numbers and includes data_primeiro_vencimento in payload', async () => {
        // Mock queries: clientes should be available for empréstimo
        useApi.useApiQuery.mockImplementation((key) => {
            if (Array.isArray(key) && key[0] === 'clientes')
                return { data: [{ id: 1, nome: 'Cliente A' }], isLoading: false };
            return { data: [], isLoading: false };
        });
        const mutateAsync = jest.fn().mockResolvedValue({ id: 123 });
        useApi.useApiCreate.mockReturnValue({ mutateAsync });
        const onClose = jest.fn();
        const onSaved = jest.fn();
        const { container } = render(_jsx(OperacaoForm, { tipo: "emprestimo", onClose: onClose, onSaved: onSaved }));
        // fill required fields
        fireEvent.change(container.querySelector('input[name="titulo"]'), { target: { value: 'Empréstimo Teste' } });
        fireEvent.change(container.querySelector('input[name="valor_total"]'), { target: { value: '1000' } });
        fireEvent.change(container.querySelector('input[name="valor_entrada"]'), { target: { value: '100' } });
        // set juros (label-based lookup) and date
        const taxaLabel = screen.getByText(/Taxa de Juros/);
        const taxaInput = taxaLabel.parentElement.querySelector('input');
        fireEvent.change(taxaInput, { target: { value: '2.5' } });
        fireEvent.change(container.querySelector('input[name="data_primeiro_vencimento"]'), { target: { value: '2026-01-15' } });
        // select beneficiario (cliente)
        const select = container.querySelector('select[name="beneficiario"]');
        fireEvent.change(select, { target: { value: '1' } });
        // click create
        fireEvent.click(screen.getByRole('button', { name: /Criar/i }));
        await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
        const payload = mutateAsync.mock.calls[0][0];
        expect(payload.titulo).toBe('Empréstimo Teste');
        expect(typeof payload.valor_emprestimo).toBe('number');
        expect(payload.valor_emprestimo).toBe(1000);
        expect(typeof payload.valor_entrada).toBe('number');
        expect(payload.valor_entrada).toBe(100);
        expect(typeof payload.taxa_juros).toBe('number');
        expect(payload.taxa_juros).toBeCloseTo(2.5);
        expect(payload.data_primeiro_vencimento).toBe('2026-01-15');
        expect(payload.cliente).toBe(1);
        // onSaved should have been called with the mutation result
        expect(onSaved).toHaveBeenCalledWith({ id: 123 });
        expect(onClose).toHaveBeenCalled();
    });
});
