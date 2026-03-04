import { render, screen, waitFor } from '@testing-library/react';
import EmpresasList from '../EmpresasList';
import * as service from '@/services/comercial';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

jest.mock('@/services/comercial');

const mockEmpresas = [
  { id: 1, nome: 'Prestadora X', cnpj: '123', contato: '55 9999-9999', endereco: 'Rua A' },
  { id: 2, nome: 'Prestadora Y', cnpj: '456', contato: '', endereco: '' },
];

describe('EmpresasList', () => {
  it('renders list of empresas', async () => {
    (service as any).default.getEmpresas = jest.fn().mockResolvedValue(mockEmpresas);
    const q = new QueryClient();
    render(
      <QueryClientProvider client={q}>
        <MemoryRouter>
          <EmpresasList />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => expect(service.default.getEmpresas).toHaveBeenCalled());

    await waitFor(() => expect(screen.getByText('Prestadora X')).toBeInTheDocument());
    expect(screen.getByText('Prestadora Y')).toBeInTheDocument();
  });
});
