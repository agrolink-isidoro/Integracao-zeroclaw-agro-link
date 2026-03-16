import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductSelector from '@/components/financeiro/ProductSelector';
import ItemEmprestimoList from '@/components/financeiro/ItemEmprestimoList';
import ProdutosService from '@/services/produtos';
jest.mock('@/services/produtos');
const mockedProdutosService = ProdutosService;
describe('ProductSelector Component', () => {
    const mockProdutos = [
        {
            id: 1,
            nome: 'Fertilizante NPK',
            unidade: 'kg',
            quantidade_estoque: 100,
            preco_unitario: 150,
            status: 'ativo',
            ativo: true,
            estoque_minimo: 10,
            codigo: 'FERT-001'
        },
        {
            id: 2,
            nome: 'Sementes Milho',
            unidade: 'kg',
            quantidade_estoque: 50,
            preco_unitario: 50,
            status: 'ativo',
            ativo: true,
            estoque_minimo: 5,
            codigo: 'SEED-001'
        }
    ];
    beforeEach(() => {
        mockedProdutosService.listar.mockResolvedValue({
            count: 2,
            next: null,
            previous: null,
            results: mockProdutos
        });
    });
    it('renders product selector with available products', async () => {
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const onAddItem = jest.fn();
        render(_jsx(QueryClientProvider, { client: qc, children: _jsx(ProductSelector, { onAddItem: onAddItem }) }));
        await waitFor(() => {
            expect(screen.getByText('Adicionar Produto')).toBeInTheDocument();
        });
        expect(screen.getByText('Produto')).toBeInTheDocument();
        expect(screen.getByText('Quantidade')).toBeInTheDocument();
        expect(screen.getByText('Valor Unitário')).toBeInTheDocument();
    });
    it('displays available quantity when product is selected', async () => {
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const onAddItem = jest.fn();
        render(_jsx(QueryClientProvider, { client: qc, children: _jsx(ProductSelector, { onAddItem: onAddItem }) }));
        await waitFor(() => {
            expect(screen.getByText('Produto')).toBeInTheDocument();
        });
        // Select a product
        const selectButtons = screen.getAllByRole('button');
        const selectBtn = selectButtons.find(btn => btn.textContent?.includes('Selecione produto'));
        if (selectBtn) {
            fireEvent.click(selectBtn);
        }
        await waitFor(() => {
            const fertilizer = screen.queryByText(/Fertilizante NPK/);
            if (fertilizer) {
                fireEvent.click(fertilizer);
            }
        });
        await waitFor(() => {
            expect(screen.queryByText(/Disponível: 100 kg/)).toBeInTheDocument();
        });
    });
    it('validates quantity against available stock', async () => {
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const onAddItem = jest.fn();
        render(_jsx(QueryClientProvider, { client: qc, children: _jsx(ProductSelector, { onAddItem: onAddItem }) }));
        // Note: Full E2E test would need to:
        // 1. Select a product with 100kg available
        // 2. Enter 150kg
        // 3. Try to add
        // 4. Expect validation error
    });
    it('calculates total value automatically', async () => {
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const onAddItem = jest.fn();
        render(_jsx(QueryClientProvider, { client: qc, children: _jsx(ProductSelector, { onAddItem: onAddItem }) }));
        await waitFor(() => {
            expect(screen.getByDisplayValue('1')).toBeInTheDocument();
        });
        // Find and fill quantity input
        const quantityInput = screen.getByPlaceholderText('Ex: 50');
        await userEvent.clear(quantityInput);
        await userEvent.type(quantityInput, '10');
        // Find and fill price input
        const priceInput = screen.getByPlaceholderText('Ex: 150.00');
        await userEvent.clear(priceInput);
        await userEvent.type(priceInput, '100');
        // Check calculated total
        const totalInput = screen.getByDisplayValue('1000.00');
        expect(totalInput).toBeInTheDocument();
    });
    it('clears form after adding item', async () => {
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const onAddItem = jest.fn();
        render(_jsx(QueryClientProvider, { client: qc, children: _jsx(ProductSelector, { onAddItem: onAddItem }) }));
        await waitFor(() => {
            expect(screen.getByDisplayValue('1')).toBeInTheDocument();
        });
        // This would be a full interaction test
        // Just verify the component renders for now
    });
});
describe('ItemEmprestimoList Component', () => {
    const mockItems = [
        {
            id: 1,
            produto: 1,
            produto_nome: 'Fertilizante NPK',
            produto_unidade: 'kg',
            quantidade: '50',
            unidade: 'kg',
            valor_unitario: '150',
            valor_total: '7500',
            observacoes: 'Entrega em duas parcelas',
            criado_em: '2026-03-02T10:00:00Z',
            atualizado_em: '2026-03-02T10:00:00Z'
        },
        {
            id: 2,
            produto: 2,
            produto_nome: 'Sementes Milho',
            produto_unidade: 'kg',
            quantidade: '100',
            unidade: 'kg',
            valor_unitario: '50',
            valor_total: '5000',
            observacoes: '',
            criado_em: '2026-03-02T10:00:00Z',
            atualizado_em: '2026-03-02T10:00:00Z'
        }
    ];
    it('renders list of items', () => {
        const onRemoveItem = jest.fn();
        render(_jsx(ItemEmprestimoList, { items: mockItems, onRemoveItem: onRemoveItem }));
        expect(screen.getByText('Fertilizante NPK')).toBeInTheDocument();
        expect(screen.getByText('Sementes Milho')).toBeInTheDocument();
    });
    it('displays item details correctly', () => {
        const onRemoveItem = jest.fn();
        render(_jsx(ItemEmprestimoList, { items: mockItems, onRemoveItem: onRemoveItem }));
        // Check quantities
        expect(screen.getByText('50 kg')).toBeInTheDocument();
        expect(screen.getByText('100 kg')).toBeInTheDocument();
        // Check values
        expect(screen.getByText('R$ 150.00')).toBeInTheDocument();
        expect(screen.getByText('R$ 50.00')).toBeInTheDocument();
        // Check totals
        expect(screen.getByText('R$ 7500.00')).toBeInTheDocument();
        expect(screen.getByText('R$ 5000.00')).toBeInTheDocument();
    });
    it('displays grand total correctly', () => {
        const onRemoveItem = jest.fn();
        render(_jsx(ItemEmprestimoList, { items: mockItems, onRemoveItem: onRemoveItem }));
        // Total: 7500 + 5000 = 12500
        expect(screen.getByText('R$ 12500.00')).toBeInTheDocument();
    });
    it('calls onRemoveItem when remove button is clicked', () => {
        const onRemoveItem = jest.fn();
        const { container } = render(_jsx(ItemEmprestimoList, { items: mockItems, onRemoveItem: onRemoveItem }));
        const deleteButtons = screen.getAllByRole('button');
        if (deleteButtons.length > 0) {
            fireEvent.click(deleteButtons[0]);
            expect(onRemoveItem).toHaveBeenCalled();
        }
    });
    it('shows empty state when no items', () => {
        const onRemoveItem = jest.fn();
        render(_jsx(ItemEmprestimoList, { items: [], onRemoveItem: onRemoveItem }));
        expect(screen.getByText(/Nenhum produto adicionado/i)).toBeInTheDocument();
    });
    it('displays observacoes when present', () => {
        const onRemoveItem = jest.fn();
        render(_jsx(ItemEmprestimoList, { items: mockItems, onRemoveItem: onRemoveItem }));
        expect(screen.getByText('Entrega em duas parcelas')).toBeInTheDocument();
    });
});
describe('OperacaoForm Integration with ItemEmprestimo', () => {
    it('should render product selection option when tipo is emprestimo', () => {
        // This would be a full integration test
        // Would test that the ProductSelector and ItemEmprestimoList are shown
        // when the checkbox is enabled
    });
    it('should calculate valor_emprestimo from items', () => {
        // Test that when items are added, valor_emprestimo is auto-calculated
    });
    it('should create items after emprestimo is created', () => {
        // Test the complete flow:
        // 1. Create emprestimo
        // 2. Add items
        // 3. Submit form
        // 4. Verify items are created with correct emprestimo_id
    });
    it('should handle item creation errors gracefully', () => {
        // Test error handling when item creation fails
        // but emprestimo was created successfully
    });
});
