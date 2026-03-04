jest.mock('@/services/api');
import api from '@/services/api';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CentroCustoForm from '../CentroCustoForm';

const mockedApi = api as jest.Mocked<typeof api>;

describe('CentroCustoForm', () => {
  const qc = new QueryClient();

  beforeEach(() => { jest.resetAllMocks(); window.alert = jest.fn(); });

  it('submits form and shows success', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { id: 1, codigo: 'C001', nome: 'Centro A' } } as any);

    const onClose = jest.fn();
    render(
      <QueryClientProvider client={qc}>
        <CentroCustoForm onClose={onClose} />
      </QueryClientProvider>
    );

    fireEvent.change(screen.getByLabelText(/Código/i), { target: { value: 'C001' } });
    fireEvent.change(screen.getByLabelText(/Nome/i), { target: { value: 'Centro A' } });
    fireEvent.click(screen.getByText(/Criar/i));

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith('/administrativo/centros-custo/', expect.objectContaining({ codigo: 'C001' })));
    expect(onClose).toHaveBeenCalled();
  });
});
