jest.mock('@/services/api');
import api from '@/services/api';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FuncionarioForm from '../FuncionarioForm';

const mockedApi = api as jest.Mocked<typeof api>;

describe('FuncionarioForm', () => {
  const qc = new QueryClient();

  beforeEach(() => { jest.resetAllMocks(); window.alert = jest.fn(); });

  it('requires pix key when receives by PIX', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { id: 1 } } as any);

    render(
      <QueryClientProvider client={qc}>
        <FuncionarioForm />
      </QueryClientProvider>
    );

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'PixUser' } });
    fireEvent.change(screen.getByLabelText('Recebe por'), { target: { value: 'pix' } });
    // ensure pix is empty
    fireEvent.change(screen.getByLabelText('Chave PIX'), { target: { value: '' } });

    fireEvent.click(screen.getByText('Salvar'));

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Chave PIX obrigatória quando o funcionário recebe por PIX.'));
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('sends banking fields when provided', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { id: 2 } } as any);

    render(
      <QueryClientProvider client={qc}>
        <FuncionarioForm />
      </QueryClientProvider>
    );

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'BankUser' } });
    fireEvent.change(screen.getByLabelText('Recebe por'), { target: { value: 'pix' } });
    fireEvent.change(screen.getByLabelText('Chave PIX'), { target: { value: '12345678900' } });
    fireEvent.change(screen.getByLabelText('Banco'), { target: { value: "001" } });
    fireEvent.change(screen.getByLabelText('Agência'), { target: { value: "0001" } });
    fireEvent.change(screen.getByLabelText('Conta'), { target: { value: "12345-6" } });
    fireEvent.change(screen.getByLabelText('Tipo de Conta'), { target: { value: 'corrente' } });
    fireEvent.change(screen.getByLabelText('Nome do titular'), { target: { value: 'Titular' } });

    fireEvent.click(screen.getByText('Salvar'));

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith('/administrativo/funcionarios/', expect.objectContaining({ nome: 'BankUser', pix_key: '12345678900', banco: '001' })));
  });
});
