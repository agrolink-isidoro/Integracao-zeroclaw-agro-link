import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LocaisArmazenagemList from '../LocaisArmazenagemList';
import api from '../../../services/api';

jest.mock('../../../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('LocaisArmazenagemList', () => {
  const qc = new QueryClient();

  beforeEach(() => jest.resetAllMocks());

  it('renders list and opens modal (kg case)', async () => {
    mockedApi.get.mockResolvedValue({ data: [{ id: 1, nome: 'Silo A', tipo: 'silo', capacidade_total: 1000, unidade_capacidade: 'kg', fazenda: 1, ativo: true }] } as any);

    render(
      <QueryClientProvider client={qc}>
        <LocaisArmazenagemList />
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText(/Silo A/)).toBeInTheDocument());

    // capacity should show correctly with friendly unit label (accept `kg` shorthand)
    await waitFor(() => expect(screen.getByText(/1\.000\s*kg/)).toBeInTheDocument());

    // open modal
    fireEvent.click(screen.getByText(/Novo Local/));
    await waitFor(() => expect(screen.getByText(/Nome/i)).toBeInTheDocument());
  });

  it('shows saca_60kg friendly label in list', async () => {
    mockedApi.get.mockResolvedValue({ data: [{ id: 2, nome: 'Depósito Saca', tipo: 'armazem', capacidade_total: 120, unidade_capacidade: 'saca_60kg', fazenda: 1, ativo: true }] } as any);

    render(
      <QueryClientProvider client={qc}>
        <LocaisArmazenagemList />
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText(/Depósito Saca/)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/120 Saca \(60kg\)/)).toBeInTheDocument());
  });
});
