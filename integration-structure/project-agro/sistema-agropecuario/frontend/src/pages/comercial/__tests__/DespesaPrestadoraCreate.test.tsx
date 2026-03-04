import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DespesaPrestadoraCreate from '../DespesaPrestadoraCreate';
import ComercialService from '@/services/comercial';
import api from '@/services/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

jest.mock('@/services/comercial');
jest.mock('@/services/api');

const mockedComercial = (ComercialService as any);
const mockedApi = (api as any);

describe('DespesaPrestadoraCreate', () => {
  beforeEach(() => {
    mockedComercial.createDespesaPrestadora = jest.fn().mockResolvedValue({ id: 1, empresa: 1 });
    mockedApi.get = jest.fn().mockResolvedValue({ data: [{ id: 1, nome: 'Empresa A' }, { id: 2, nome: 'Empresa B' }] });
  });

  it('submits a new despesa prestadora and navigates to empresa', async () => {
    const q = new QueryClient();

    render(
      <QueryClientProvider client={q}>
        <MemoryRouter initialEntries={["/comercial/despesas-prestadoras/new?empresa=1"]}>
          <Routes>
            <Route path="/comercial/despesas-prestadoras/new" element={<DespesaPrestadoraCreate />} />
            <Route path="/comercial/empresas/1" element={<div>Empresa 1</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // ensure empresa is prefilled by checking that option exists and is clickable
    const empresaPlaceholder = await screen.findByText('Selecione uma empresa');
    fireEvent.click(empresaPlaceholder);
    const empresaOption = await screen.findByText('Empresa A');
    fireEvent.click(empresaOption);

    const categoriaInput = document.querySelector('input[name="categoria"]') as HTMLInputElement;
    fireEvent.change(categoriaInput, { target: { value: 'Serviço' } });

    const valorInput = document.querySelector('input[name="valor"]') as HTMLInputElement;
    fireEvent.change(valorInput, { target: { value: '200.00' } });

    const submit = screen.getByRole('button', { name: /salvar despesa/i });
    fireEvent.click(submit);

    await waitFor(() => expect(mockedComercial.createDespesaPrestadora).toHaveBeenCalled());
    expect(mockedComercial.createDespesaPrestadora).toHaveBeenCalledWith(expect.objectContaining({ categoria: 'Serviço', empresa: 1 }));
    // valor may be sent as number or string depending on input handling; assert numeric equivalence
    const payload = (mockedComercial.createDespesaPrestadora as jest.Mock).mock.calls[0][0];
    expect(Number(payload.valor)).toBeCloseTo(200);

    await waitFor(() => expect(screen.getByText('Empresa 1')).toBeInTheDocument());
  });
});