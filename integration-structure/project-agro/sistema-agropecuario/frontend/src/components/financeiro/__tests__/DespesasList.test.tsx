import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DespesasList from '../DespesasList';
import api from '@/services/api';

jest.mock('@/services/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('DespesasList', () => {
  const qc = new QueryClient();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders despesas and calls preview/create rateio actions', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [{ id: 1, titulo: 'Despesa A', valor: '123.45', data: '2025-12-01', centro_nome: 'Centro A', pendente_rateio: true }] } as any);

    render(
      <QueryClientProvider client={qc}>
        <DespesasList />
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText(/Despesa A/)).toBeInTheDocument());

    // mock preview and create endpoints
    mockedApi.post.mockResolvedValueOnce({ data: { preview: true, parts: [{ talhao_nome: 'T1', area: 10, proporcao: 0.5, valor_rateado: 50 }] } } as any);

    fireEvent.click(screen.getByText(/Preview/));

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith('/administrativo/despesas/1/preview_rateio/'));

    // modal should be shown with preview content
    await waitFor(() => expect(screen.getByText(/Preview de Rateio/)).toBeInTheDocument());
    expect(screen.getByText(/T1/)).toBeInTheDocument();

    // create rateio via Create button inside modal
    mockedApi.post.mockResolvedValueOnce({ data: { id: 10 } } as any);
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByText(/Criar Rateio/));

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith('/administrativo/despesas/1/create_rateio/'));
    await waitFor(() => expect(screen.queryByText(/Preview de Rateio/)).not.toBeInTheDocument());
  });
});
