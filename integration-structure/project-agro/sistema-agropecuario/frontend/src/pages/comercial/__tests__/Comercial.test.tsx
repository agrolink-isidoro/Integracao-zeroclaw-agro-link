import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Comercial from '@/pages/Comercial';
import ComercialService from '@/services/comercial';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

jest.mock('@/services/comercial');
const mockedService = (ComercialService as any);

describe('Comercial dashboard', () => {
  beforeEach(() => {
    mockedService.getVendasCompras = jest.fn().mockResolvedValue([
      { id: 1, cliente_nome: 'Cliente A', valor_total: 5000, data_venda: '2026-01-01' }
    ]);
    mockedService.getContratos = jest.fn().mockResolvedValue([
      { id: 2, titulo: 'Contrato X', valor_total: 12000, status: 'Ativo', partes: [{ entidade_nome: 'Cliente A' }] }
    ]);
    mockedService.getClientes = jest.fn().mockResolvedValue([
      { id: 3, nome: 'Cliente A', cnpj: '12.345.678/0001-99', telefone: '55 9999-9999' }
    ]);

    mockedService.getFornecedoresDashboard = jest.fn().mockResolvedValue({
      total_fornecedores: 5,
      documentos_vencendo_count: 2,
      documentos_vencidos_count: 1,
      top_fornecedores_gastos: [{ id: 1, nome: 'Fornecedor Teste', total_compras: '1234.56' }]
    });
  });

  it('renders dashboard and loads contracts on tab switch', async () => {
    const q = new QueryClient();
    render(
      <QueryClientProvider client={q}>
        <MemoryRouter>
          <Comercial />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // dashboard visible
    expect(screen.getByText(/Comercial/i)).toBeInTheDocument();

    // ensure fornecedores dashboard data is displayed in the main dashboard
    await waitFor(() => expect(mockedService.getFornecedoresDashboard).toHaveBeenCalled());
    // Top fornecedor should be rendered from the dashboard data
    await waitFor(() => expect(screen.getByText(/Fornecedor Teste/)).toBeInTheDocument());
    const totalStrong = screen.getByText(/Total:/);
    expect(totalStrong.parentElement).toHaveTextContent('5');

    // switch to Contratos tab
    const contratosTab = screen.getByRole('button', { name: /contratos/i });
    fireEvent.click(contratosTab);

    // ensure contratos data appears
    await waitFor(() => expect(mockedService.getContratos).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText(/Contrato X/)).toBeInTheDocument());
  });
});