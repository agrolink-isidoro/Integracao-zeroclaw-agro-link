import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MovimentacoesPage from './Movimentacoes';
import { movimentacoesService, produtosService } from '../../services/produtos';

jest.mock('../../services/produtos', () => ({
  movimentacoesService: {
    listarStatements: jest.fn()
  },
  produtosService: {
    buscarSimples: jest.fn()
  }
}));

describe('MovimentacoesPage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('renders list and applies product autocomplete filter', async () => {
    (produtosService as any).buscarSimples.mockResolvedValue([{ id: 1, nome: 'Produto A', codigo: 'P-A' }]);
    (movimentacoesService as any).listarStatements.mockResolvedValue({ count: 1, results: [{ id: 10, produto: 1, produto_nome: 'Produto A', tipo: 'entrada', quantidade: 5, data_movimentacao: '2025-01-01T00:00:00Z' }] });

    render(<MovimentacoesPage />);

    // type in product input
    const input = screen.getByPlaceholderText('Digite nome ou ID (min 2 chars)');
    fireEvent.change(input, { target: { value: 'Prod' } });

    await waitFor(() => expect(produtosService.buscarSimples).toHaveBeenCalledWith('Prod', 10));

    // suggestion should appear
    const matches = await screen.findAllByText(/Produto A/);
    expect(matches.length).toBeGreaterThan(0);

    // Click the suggestion (first match is suggestion dropdown)
    fireEvent.click(matches[0]);

    // Apply filter
    fireEvent.click(screen.getByText('Aplicar'));

    await waitFor(() => expect((movimentacoesService as any).listarStatements).toHaveBeenCalled());

    // Table row should show Produto A
    const tableMatch = await screen.findByText((_, node) => node?.nodeName === 'TD' && /Produto A/.test(node.textContent || ''));
    expect(tableMatch).toBeInTheDocument();
  });
});
