import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProdutoForm from '../ProdutoForm';
import * as services from '../../../services/produtos';
describe('ProdutoForm', () => {
    it('sends category tag and maps preco_unitario -> preco_venda and local_armazenagem -> local_armazenamento', async () => {
        const onSave = jest.fn().mockResolvedValue({});
        const onCancel = jest.fn();
        // Mock locaisService.listar to return a single local BEFORE rendering
        const mocked = services;
        mocked.locaisService.listar = jest.fn().mockResolvedValue([{ id: 1, nome: 'Silo A', tipo: 'silo', ativo: true }]);
        render(_jsx(ProdutoForm, { onSave: onSave, onCancel: onCancel }));
        // Fill required fields
        fireEvent.change(screen.getByLabelText(/Código/i), { target: { value: 'ARE0001' } });
        fireEvent.change(screen.getByLabelText(/Nome/i), { target: { value: 'AREIA GROSSA' } });
        // Select category 'Construção' which has tag 'construcao'
        const select = screen.getByLabelText(/Categoria/i);
        fireEvent.change(select, { target: { value: 'construcao' } });
        // Preço unitário and local de armazenagem (select from fetched locais)
        fireEvent.change(screen.getByLabelText(/Preço Unitário/i), { target: { value: '700' } });
        // Wait for the select to be populated
        await waitFor(() => expect(screen.getByRole('combobox', { name: /Local de Armazenagem/i })).toBeInTheDocument());
        const selectLocal = screen.getByRole('combobox', { name: /Local de Armazenagem/i });
        // select by id value
        fireEvent.change(selectLocal, { target: { value: '1' } });
        // Ensure operation-only fields are not visible
        expect(screen.queryByLabelText(/Princípio Ativo/i)).toBeNull();
        expect(screen.queryByLabelText(/Dosagem Padrão/i)).toBeNull();
        expect(screen.queryByLabelText(/Lote/i)).toBeNull();
        // Submit the form
        const submit = screen.getByRole('button', { name: /Cadastrar/i });
        fireEvent.click(submit);
        await waitFor(() => expect(onSave).toHaveBeenCalled());
        const savedArg = onSave.mock.calls[0][0];
        // Should send backend keys: categoria as tag, preco_venda mapped from preco_unitario, local_armazenamento as ID
        expect(savedArg.categoria).toBe('construcao');
        expect(savedArg.preco_venda).toBe(700);
        expect(savedArg.local_armazenamento).toBe(1);
    });
});
