import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SafrasList from '../SafrasList';
import api from '@/services/api';

jest.mock('@/services/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('SafrasList', () => {
  const qc = new QueryClient();

  beforeEach(() => jest.resetAllMocks());

  it('renders safra and handles manejo with null cost without crashing', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url.includes('agricultura/plantios/')) {
        return Promise.resolve({ data: [{ id: 1, nome_safra: 'Safra Teste', talhoes: [1], talhoes_info: [{ id: 1, nome: 'T1', area_hectares: 10 }], cultura_nome: 'Milho', data_plantio: '2025-09-24', area_total_ha: 10, status: 'em_andamento' }] } as unknown as { data: unknown });
      }
      if (url.includes('agricultura/manejos/')) {
        return Promise.resolve({ data: [{ id: 1, plantio: 1, tipo: 'adubacao', data_manejo: '2025-10-01', custo: null }] } as unknown as { data: unknown });
      }
      if (url.includes('agricultura/ordens-servico/')) {
        return Promise.resolve({ data: [] } as unknown as { data: unknown });
      }
      return Promise.resolve({ data: [] } as unknown as { data: unknown });
    });

    render(
      <QueryClientProvider client={qc}>
        <SafrasList />
      </QueryClientProvider>
    );

    // Wait for safra title to appear
    const safraTitle = await screen.findByText(/Safra Teste/);
    expect(safraTitle).toBeInTheDocument();

    // Expand the safra
    fireEvent.click(safraTitle.closest('.card-header')!);

    // The manejo with null cost should show as R$ 0.00 and not crash
    const custo = await screen.findByText(/R\$ 0\.00/);
    expect(custo).toBeInTheDocument();
  });

  it('handles paginated plantios response without crashing', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url.includes('agricultura/plantios/')) {
        return Promise.resolve({ data: { count: 1, results: [{ id: 10, nome_safra: 'Safra Paginated', talhoes: [1], talhoes_info: [{ id: 1, nome: 'T1', area_hectares: 5 }], cultura_nome: 'Soja', data_plantio: '2025-09-24', area_total_ha: 5, status: 'planejado' }] } } as unknown as { data: unknown });
      }
      if (url.includes('agricultura/manejos/')) {
        return Promise.resolve({ data: [] } as unknown as { data: unknown });
      }
      if (url.includes('agricultura/ordens-servico/')) {
        return Promise.resolve({ data: [] } as unknown as { data: unknown });
      }
      return Promise.resolve({ data: [] } as unknown as { data: unknown });
    });

    render(
      <QueryClientProvider client={qc}>
        <SafrasList />
      </QueryClientProvider>
    );

    const safraTitle = await screen.findByText(/Safra Paginated/);
    expect(safraTitle).toBeInTheDocument();
  });
});