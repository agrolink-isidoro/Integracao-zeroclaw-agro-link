import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProdutosList from '../components/estoque/ProdutosList';
import * as services from '../services/produtos';
jest.mock('../services/produtos');
const mocked = services;
describe('Produtos save integration', () => {
    const queryClient = new QueryClient();
    beforeEach(() => {
        jest.resetAllMocks();
    });
    it('creates a product and sends local_armazenamento as ID and preco_venda mapped', async () => {
        // Mock initial list calls
        mocked.produtosService.listar = jest.fn().mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
        mocked.categoriasService.listar = jest.fn().mockResolvedValue([]);
        mocked.locaisService.listar = jest.fn().mockResolvedValue([{ id: 1, nome: 'Silo A', tipo: 'silo', ativo: true }]);
        mocked.produtosService.criar = jest.fn().mockResolvedValue({ id: 500 });
        render(_jsx(QueryClientProvider, { client: queryClient, children: _jsx(ProdutosList, {}) }));
        // Open modal
        fireEvent.click(screen.getByText(/Novo Produto/i));
        // Fill required fields
        fireEvent.change(screen.getByLabelText(/Código/i), { target: { value: 'PRD123' } });
        fireEvent.change(screen.getByLabelText(/Nome/i), { target: { value: 'Produto Teste' } });
        fireEvent.change(screen.getByLabelText(/Categoria/i), { target: { value: 'construcao' } });
        // Price and select local
        fireEvent.change(screen.getByLabelText(/Preço Unitário/i), { target: { value: '120.5' } });
        // Wait for select to be populated
        await waitFor(() => expect(screen.getByRole('combobox', { name: /Local de Armazenagem/i })).toBeInTheDocument());
        const selectLocal = screen.getByRole('combobox', { name: /Local de Armazenagem/i });
        fireEvent.change(selectLocal, { target: { value: '1' } });
        // Submit
        fireEvent.click(screen.getByRole('button', { name: /Cadastrar/i }));
        await waitFor(() => expect(mocked.produtosService.criar).toHaveBeenCalled());
        expect(mocked.produtosService.criar).toHaveBeenCalled();
        const firstCallArg = mocked.produtosService.criar.mock.calls[0][0];
        expect(firstCallArg.preco_venda).toBe(120.5);
        expect(firstCallArg.local_armazenamento).toBe(1);
        expect(firstCallArg.codigo).toBe('PRD123');
    });
    it('blocks update when category requires princípio ativo and it is missing', async () => {
        // Mock list with an inseticida missing principio_ativo
        mocked.produtosService.listar = jest.fn().mockResolvedValue({
            count: 1,
            results: [
                {
                    id: 25,
                    codigo: 'INSET001',
                    nome: 'Inseticida Karate Zeon - 1 Litro',
                    categoria: 'inseticida',
                    unidade: 'L',
                    principio_ativo: null,
                    vencimento: null,
                    preco_venda: null
                }
            ],
            next: null,
            previous: null
        });
        mocked.categoriasService.listar = jest.fn().mockResolvedValue([]);
        mocked.locaisService.listar = jest.fn().mockResolvedValue([]);
        mocked.produtosService.atualizar = jest.fn().mockResolvedValue({});
        render(_jsx(QueryClientProvider, { client: queryClient, children: _jsx(ProdutosList, {}) }));
        // Wait for product to appear
        await waitFor(() => expect(screen.getByText(/Karate Zeon/)).toBeInTheDocument());
        // Click edit on the specific product row
        const productRow = screen.getByText(/Karate Zeon/).closest('tr');
        const editButton = productRow ? productRow.querySelector('button[title="Editar"]') : null;
        expect(editButton).not.toBeNull();
        if (editButton)
            fireEvent.click(editButton);
        // Wait for modal/dialog to appear (submit button text may vary)
        await waitFor(() => expect(screen.getByText(/Atualizar|Cadastrar/i)).toBeInTheDocument());
        // Change price only (search within the document for the form input)
        fireEvent.change(screen.getByLabelText(/Preço Unitário/i), { target: { value: '200' } });
        // Grab the modal and submit the form programmatically to ensure validation runs in test environment
        const modal = document.querySelector('.modal.show');
        expect(modal).not.toBeNull();
        const form = modal.querySelector('form');
        expect(form).not.toBeNull();
        fireEvent.submit(form);
        // Should not call API because validation requires princípio ativo
        await waitFor(() => expect(mocked.produtosService.atualizar).not.toHaveBeenCalled());
        // Expect the Princípio Ativo input to be marked invalid
        const { getByLabelText } = within(modal);
        const principioInput = getByLabelText(/Princípio Ativo/i);
        await waitFor(() => expect(principioInput.className).toMatch(/is-invalid/));
        // Now close and re-open the modal, simulate user filling data and submitting — should call API
        const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
        fireEvent.click(cancelBtn);
        // Re-open edit modal
        if (editButton)
            fireEvent.click(editButton);
        await waitFor(() => expect(screen.getByText(/Atualizar|Cadastrar/i)).toBeInTheDocument());
        const modal2 = document.querySelector('.modal.show');
        const { getByLabelText: getByLabelText2 } = within(modal2);
        const principioInput2 = getByLabelText2(/Princípio Ativo/i);
        const vencimentoInput2 = getByLabelText2(/Vencimento/i);
        const precoInput2 = getByLabelText2(/Preço Unitário/i);
        fireEvent.change(principioInput2, { target: { value: 'Lambda-cialotrina' } });
        fireEvent.change(vencimentoInput2, { target: { value: '2026-11-27' } });
        fireEvent.change(precoInput2, { target: { value: '200' } });
        await waitFor(() => expect(principioInput2.className).not.toMatch(/is-invalid/));
        // Click the update button
        const updateButton2 = screen.getByRole('button', { name: /Atualizar/i });
        fireEvent.click(updateButton2);
        await waitFor(() => expect(mocked.produtosService.atualizar).toHaveBeenCalled());
        const callArg = mocked.produtosService.atualizar.mock.calls[0][1];
        expect(callArg.principio_ativo).toBe('Lambda-cialotrina');
        expect(callArg.preco_venda).toBe(200);
    });
});
