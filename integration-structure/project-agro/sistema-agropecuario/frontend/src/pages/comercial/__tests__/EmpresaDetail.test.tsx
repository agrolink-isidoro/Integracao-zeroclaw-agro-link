import { render, screen, waitFor } from '@testing-library/react';
import EmpresaDetail from '../EmpresaDetail';
import * as service from '@/services/comercial';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

jest.mock('@/services/comercial');

const mockEmpresa = { id: 1, nome: 'Prestadora X', cnpj: '123' };
const mockDespesas = [
  { id: 1, data: '2026-01-05', categoria: 'transporte', valor: '1250.50', descricao: 'Frete' }
];
const mockAgregados = { periodo: '2026-01', total: '1250.50', por_categoria: [{ categoria: 'transporte', total: '1250.50' }] };

describe('EmpresaDetail', () => {
  it('renders empresa details, despesas and agregados', async () => {
    (service as any).default.getEmpresaById = jest.fn().mockResolvedValue(mockEmpresa);
    (service as any).default.getEmpresaDespesas = jest.fn().mockResolvedValue(mockDespesas);
    (service as any).default.getEmpresaAgregados = jest.fn().mockResolvedValue(mockAgregados);

    const q = new QueryClient();

    render(
      <QueryClientProvider client={q}>
        <MemoryRouter initialEntries={["/comercial/empresas/1"]}>
          <Routes>
            <Route path="/comercial/empresas/:id" element={<EmpresaDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => expect(service.default.getEmpresaById).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Prestadora X')).toBeInTheDocument());
    expect(screen.getByText('transporte: R$ 1250.50')).toBeInTheDocument();
  });
});
