import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import CompraCreate from '../CompraCreate';
import ComercialService from '@/services/comercial';
import api from '@/services/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

jest.mock('@/services/comercial');
jest.mock('@/services/api');

const mockedComercial = (ComercialService as any);
const mockedApi = (api as any);

describe('CompraCreate', () => {
  beforeEach(() => {
    mockedComercial.createCompra = jest.fn().mockResolvedValue({ id: 1 });
    mockedApi.get = jest.fn().mockResolvedValue({ data: [{ id: 1, nome: 'Fornecedor Y' }] });
  });

  it('submits a new compra', async () => {
    const q = new QueryClient();

    render(
      <QueryClientProvider client={q}>
        <MemoryRouter initialEntries={["/comercial/compras/new"]}>
          <Routes>
            <Route path="/comercial/compras/new" element={<CompraCreate />} />
            <Route path="/comercial/compras" element={<div>Compras List</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Open fornecedor dropdown and select option (click the field then option)
    const fornecedorPlaceholder = await screen.findByText('Selecione um fornecedor');
    fireEvent.click(fornecedorPlaceholder);
    const option = await screen.findByText('Fornecedor Y');
    fireEvent.click(option);

    // Fill other fields (select by name attribute because labels are not linked)
    const dateInput = document.querySelector('input[name="data"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-01-05' } });

    const valorInput = document.querySelector('input[name="valor_total"]') as HTMLInputElement;
    fireEvent.change(valorInput, { target: { value: '1500.00' } });

    const submit = screen.getByRole('button', { name: /salvar compra/i });
    fireEvent.click(submit);

    await waitFor(() => expect(mockedComercial.createCompra).toHaveBeenCalled());
    expect(mockedComercial.createCompra).toHaveBeenCalledWith({ fornecedor: 1, data: '2026-01-05', valor_total: 1500, descricao: '' });

    // After success, should navigate to compras list (our route shows 'Compras List')
    await waitFor(() => expect(screen.getByText('Compras List')).toBeInTheDocument());
  });
});
