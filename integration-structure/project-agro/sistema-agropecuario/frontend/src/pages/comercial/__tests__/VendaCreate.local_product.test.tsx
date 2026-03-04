import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VendaCreate from '@/pages/comercial/VendaCreate';
import ComercialService from '@/services/comercial';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const renderWithClient = (ui: React.ReactElement) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );
}

jest.mock('@/services/comercial');

describe('VendaCreate local -> product', () => {
  beforeEach(() => {
    (ComercialService.getClientes as jest.Mock).mockResolvedValue([]);
    (ComercialService.getLocais as jest.Mock).mockResolvedValue([
      { id: 1, nome: 'Silo A' },
    ]);
    (ComercialService.getProdutosByLocal as jest.Mock).mockResolvedValue([
      { id: 5, nome: 'Milho' },
    ]);
  });

  it('loads products when local is selected and auto-selects single product', async () => {
    renderWithClient(<VendaCreate />);

    await waitFor(() => expect(ComercialService.getLocais).toHaveBeenCalled());

    // choose local - wait for options to render first
    const localLabel = screen.getByText(/Local de Armazenamento/i);
    const localSelect = localLabel.parentElement?.querySelector('select[name="local_armazenamento"]') as HTMLSelectElement;

    await waitFor(() => expect(localSelect.querySelector('option[value="1"]')).toBeInTheDocument());

    fireEvent.change(localSelect, { target: { value: '1' } });

    await waitFor(() => expect(ComercialService.getProdutosByLocal).toHaveBeenCalledWith(1));

    const produtoLabel = screen.getByText(/Produto no Local/i);
    const produtoSelect = produtoLabel.parentElement?.querySelector('select[name="produto"]') as HTMLSelectElement;
    await waitFor(() => expect(produtoSelect.textContent).toContain('5 - Milho'));

  });
});
