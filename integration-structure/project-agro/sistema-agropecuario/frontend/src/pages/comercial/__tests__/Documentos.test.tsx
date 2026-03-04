import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Documentos from '@/pages/comercial/Documentos';
import ComercialService from '@/services/comercial';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/services/comercial');
const mockedService = (ComercialService as any);

describe('Documentos page', () => {
  beforeEach(() => {
    mockedService.getDocumentos = jest.fn().mockResolvedValue([
      { id: 1, titulo: 'Contrato A', fornecedor_nome: 'Fornecedor Teste', data_vencimento: '2026-02-01', status_calculado: 'ativo', arquivo_url: null }
    ]);
    mockedService.getFornecedores = jest.fn().mockResolvedValue([
      { id: 1, nome: 'Fornecedor Teste' }
    ]);
    mockedService.createDocumento = jest.fn().mockResolvedValue({ id: 2 });
    mockedService.deleteDocumento = jest.fn().mockResolvedValue({});
  });

  it('renders list and allows upload', async () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <Documentos />
      </QueryClientProvider>
    );

    await waitFor(() => expect(mockedService.getDocumentos).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText(/Contrato A/)).toBeInTheDocument());

    // Fill form and submit
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Contrato B' } });
    fireEvent.change(screen.getByLabelText(/Fornecedor/), { target: { value: '1' } });

    fireEvent.click(screen.getByRole('button', { name: /Enviar/ }));
    await waitFor(() => expect(mockedService.createDocumento).toHaveBeenCalled());
  });

  it('has accessible form labels associated to inputs', async () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <Documentos />
      </QueryClientProvider>
    );

    await waitFor(() => expect(mockedService.getFornecedores).toHaveBeenCalled());

    expect(screen.getByLabelText(/Título/)).toHaveAttribute('id', 'titulo');
    expect(screen.getByLabelText(/Fornecedor/)).toHaveAttribute('id', 'fornecedor');
    expect(screen.getByLabelText(/Tipo/)).toHaveAttribute('id', 'tipo');
    expect(screen.getByLabelText(/Data de Vencimento/)).toHaveAttribute('id', 'data_vencimento');
  });
});
