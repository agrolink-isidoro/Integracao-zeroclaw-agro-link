
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Manutencao from '../Manutencao';
import api from '../../services/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('Manutencao Page', () => {
  const queryClient = new QueryClient();

  beforeEach(() => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url.startsWith('/maquinas/ordens-servico/')) {
        return Promise.resolve({ data: { results: [
          { id: 1, numero_os: 'OS1', equipamento_detail: { nome: 'Trator A' }, tipo: 'corretiva', prioridade: 'media', status: 'aberta', data_abertura: '2025-01-01T10:00:00Z', data_previsao: '2025-02-01', custo_total: '100.00' }
        ] } });
      }
      return Promise.resolve({ data: [] });
    });

    mockedApi.post.mockResolvedValue({ data: { id: 1, status: 'concluida' } });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders ordens and can concluir an ordem', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Manutencao />
      </QueryClientProvider>
    );

    // wait for list to load
    await waitFor(() => expect(mockedApi.get).toHaveBeenCalledWith('/maquinas/ordens-servico/'));
    expect(mockedApi.get).toHaveBeenCalled();

    expect(await screen.findByText('OS1')).toBeInTheDocument();

    const concluirBtn = screen.getByText(/Concluir/i);
    fireEvent.click(concluirBtn);

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith('/maquinas/ordens-servico/1/concluir/'));
  });
});
