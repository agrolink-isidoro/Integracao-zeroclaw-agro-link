jest.mock('@/services/api');
import api from '@/services/api';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CentrosCustoList from '../CentrosCustoList';

const mockedApi = api as jest.Mocked<typeof api>;

describe('CentrosCustoList', () => {
  const qc = new QueryClient();

  beforeEach(() => jest.resetAllMocks());

  it('renders list and deletes item', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [{ id: 1, codigo: 'C001', nome: 'Centro A', categoria: 'administrativo', ativo: true }] } as any);
    mockedApi.delete.mockResolvedValueOnce({} as any);

    render(
      <QueryClientProvider client={qc}>
        <CentrosCustoList />
      </QueryClientProvider>
    );

    expect(screen.getByText(/Carregando/i)).toBeInTheDocument();

    await waitFor(() => expect(mockedApi.get).toHaveBeenCalledWith('/administrativo/centros-custo/'));

    await waitFor(() => expect(screen.getByText('Centro A')).toBeInTheDocument());

    // Simulate remove confirmation
    window.confirm = jest.fn(() => true);
    fireEvent.click(screen.getByText('Remover'));

    await waitFor(() => expect(mockedApi.delete).toHaveBeenCalledWith('/administrativo/centros-custo/1/'));
  });
});
