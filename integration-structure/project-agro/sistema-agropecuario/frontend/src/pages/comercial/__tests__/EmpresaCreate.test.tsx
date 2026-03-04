import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import EmpresaCreate from '../EmpresaCreate';
import ComercialService from '@/services/comercial';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

jest.mock('@/services/comercial');

const mockedComercial = (ComercialService as any);

describe('EmpresaCreate', () => {
  beforeEach(() => {
    mockedComercial.createEmpresa = jest.fn().mockResolvedValue({ id: 42 });
  });

  it('submits a new empresa', async () => {
    const q = new QueryClient();

    render(
      <QueryClientProvider client={q}>
        <MemoryRouter initialEntries={["/comercial/empresas/new"]}>
          <Routes>
            <Route path="/comercial/empresas/new" element={<EmpresaCreate />} />
            <Route path="/comercial/empresas/42" element={<div>Empresa 42</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const nomeInput = document.querySelector('input[name="nome"]') as HTMLInputElement;
    const cnpjInput = document.querySelector('input[name="cnpj"]') as HTMLInputElement;

    fireEvent.change(nomeInput, { target: { value: 'ACME Ltda' } });
    fireEvent.change(cnpjInput, { target: { value: '12.345.678/0001-99' } });

    const submit = screen.getByRole('button', { name: /salvar empresa/i });
    fireEvent.click(submit);

    await waitFor(() => expect(mockedComercial.createEmpresa).toHaveBeenCalled());
    expect(mockedComercial.createEmpresa).toHaveBeenCalledWith({ nome: 'ACME Ltda', cnpj: '12.345.678/0001-99', contato: '', endereco: '' });

    await waitFor(() => expect(screen.getByText('Empresa 42')).toBeInTheDocument());
  });
});