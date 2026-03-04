import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProdutosList from '../components/estoque/ProdutosList';
import * as produtosService from '../services/produtos';
import type { ProdutoResponse } from '../services/produtos';
import type { CategoriaProduto } from '../types/estoque_maquinas';

jest.mock('../services/produtos');

const mockedProdutos = produtosService as jest.Mocked<typeof produtosService>;

describe('ProdutosList integration', () => {
  const queryClient = new QueryClient();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders products when API returns paginated object', async () => {
    const fakePaged = { count: 1, next: null, previous: null, results: [{ id: 99, codigo: 'TEST99', nome: 'Produto 99', quantidade_estoque: 5, unidade: 'kg' }] };
    mockedProdutos.produtosService.listar = jest.fn().mockResolvedValue(fakePaged as unknown as ProdutoResponse);
    mockedProdutos.categoriasService.listar = jest.fn().mockResolvedValue([] as unknown as CategoriaProduto[]);

    render(
      <QueryClientProvider client={queryClient}>
        <ProdutosList />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Produto 99/)).toBeInTheDocument();
      expect(screen.getByText(/TEST99/)).toBeInTheDocument();
    });
  });

  it('renders products when API returns array-shaped results (legacy style wrapped)', async () => {
    const fakeArray = [{ id: 100, codigo: 'T100', nome: 'Produto 100', quantidade_estoque: 2, unidade: 't' }];
    const wrapped = { count: 1, next: null, previous: null, results: fakeArray };
    mockedProdutos.produtosService.listar = jest.fn().mockResolvedValue(wrapped as unknown as ProdutoResponse);
    mockedProdutos.categoriasService.listar = jest.fn().mockResolvedValue([] as unknown as CategoriaProduto[]);

    render(
      <QueryClientProvider client={queryClient}>
        <ProdutosList />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Produto 100/)).toBeInTheDocument();
    });
  });
});