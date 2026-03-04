import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import TransferenciasList from '@/pages/financeiro/TransferenciasList';
import * as useApi from '@/hooks/useApi';
import financeiroService from '@/services/financeiro';

jest.mock('@/services/financeiro');
jest.mock('@/hooks/useApi');

describe('TransferenciasList', () => {
  it('renders empty state', async () => {
    (useApi.useApiQuery as jest.Mock).mockReturnValue({ data: [], isLoading: false });
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
    const qc = new QueryClient();
    render(<QueryClientProvider client={qc}><TransferenciasList /></QueryClientProvider>);
    expect(screen.getByText(/Transferências Pendentes/i)).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma transferência pendente encontrada/i)).toBeInTheDocument();
  });

  it('calls marcarTransferenciaSettled on click', async () => {
    const mockTransfers = [{ id: 1, tipo_transferencia: 'ted', valor: '100.00', conta_origem_display: 'A', conta_destino_display: 'B', descricao: 'Teste' }];
    // first call -> transfers list
    (useApi.useApiQuery as jest.Mock).mockReturnValueOnce({ data: mockTransfers, isLoading: false });
    // second call (when opening modal) -> contas for transfer form, but not used in this test
    (useApi.useApiQuery as jest.Mock).mockReturnValueOnce({ data: [], isLoading: false });

    const mockedService = financeiroService as jest.Mocked<typeof financeiroService>;
    mockedService.marcarTransferenciaSettled.mockResolvedValue({ id: 1, status: 'settled' });

    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
    const qc = new QueryClient();
    render(<QueryClientProvider client={qc}><TransferenciasList /></QueryClientProvider>);

    const btn = screen.getByText(/Marcar liquidado/i);
    fireEvent.click(btn);

    await waitFor(() => expect(mockedService.marcarTransferenciaSettled).toHaveBeenCalledWith(1, expect.any(Object)));
  });

  it('opens TransferForm modal on Nova Transferência click', async () => {
    // transfers list
    (useApi.useApiQuery as jest.Mock).mockReturnValueOnce({ data: [], isLoading: false });
    // contas for TransferForm
    (useApi.useApiQuery as jest.Mock).mockReturnValueOnce({ data: [{ id: 10, banco: 'B', conta: '123' }], isLoading: false });

    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
    const qc = new QueryClient();
    render(<QueryClientProvider client={qc}><TransferenciasList /></QueryClientProvider>);

    const novaBtn = screen.getByText(/Nova Transferência/i);
    fireEvent.click(novaBtn);

    // Modal dialog should appear and contain the title
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Nova Transferência/i)).toBeInTheDocument();

    // Close modal using Cancel
    const cancel = within(dialog).getByText(/Cancelar/i);
    fireEvent.click(cancel);

    await waitFor(() => expect(screen.queryByText(/Enviar Transferência/i)).not.toBeInTheDocument());
  });
});