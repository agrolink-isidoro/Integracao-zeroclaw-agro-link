import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EquipamentosList from '../components/maquinas/EquipamentosList';
import api from '../services/api';

jest.mock('../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('EquipamentosList integration', () => {
  const queryClient = new QueryClient();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders equipamentos when API returns paginated object', async () => {
    const fakePaged = { count: 1, next: null, previous: null, results: [{ id: 1, nome: 'Equip 1', marca: 'M', modelo: 'X', status: 'ativo', horimetro_atual: 10, valor_aquisicao: 1000, data_aquisicao: '2020-01-01'}] };
    mockedApi.get = jest.fn().mockResolvedValue({ data: fakePaged });

    render(
      <QueryClientProvider client={queryClient}>
        <EquipamentosList />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Equip 1/)).toBeInTheDocument();
    });
  });
});