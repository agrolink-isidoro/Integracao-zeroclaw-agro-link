import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EquipamentosList from '../components/maquinas/EquipamentosList';
import api from '../services/api';

jest.mock('../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('Equipamentos create flow', () => {
  const queryClient = new QueryClient();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('calls API to create equipamento and shows it in list', async () => {
    // initial GET returns empty paginated
    mockedApi.get = jest.fn()
      .mockResolvedValueOnce({ data: { count: 0, next: null, previous: null, results: [] } })
      // after creation, GET returns the created item
      .mockResolvedValueOnce({ data: { count: 1, next: null, previous: null, results: [{ id: 500, nome: 'Nova Equip', status: 'ativo' }] } })
      // any subsequent calls also return the created item
      .mockResolvedValue({ data: { count: 1, next: null, previous: null, results: [{ id: 500, nome: 'Nova Equip', status: 'ativo' }] } });

    mockedApi.post = jest.fn().mockResolvedValue({ data: { id: 500, nome: 'Nova Equip', status: 'ativo' } });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <EquipamentosList />
      </QueryClientProvider>
    );

    // Open create modal
    fireEvent.click(screen.getByText(/Novo Equipamento/i));

    // fill form
    fireEvent.change(screen.getByLabelText(/Nome \*/i), { target: { value: 'Nova Equip' } });
    fireEvent.change(screen.getByLabelText(/Categoria \*/i), { target: { value: '1' } });

    // submit
    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalled());

    // Wait for refetch (may be called multiple times by React Query)
    await waitFor(() => expect(mockedApi.get.mock.calls.length).toBeGreaterThanOrEqual(2));

    // Wait for presence in DOM
    await waitFor(() => expect(screen.getByText(/Nova Equip/)).toBeInTheDocument());
  }, 10000);
});