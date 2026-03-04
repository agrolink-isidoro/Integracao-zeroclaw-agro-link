import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import api from '@/services/api';
import FolhaSummaryCards from '@/components/administrativo/FolhaSummaryCards';

jest.mock('@/services/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('FolhaSummaryCards', () => {
  it('displays summary values fetched from API', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { total_horas_extra_cost: 100.123, total_inss: 10.5, total_folha: 500.0 } } as any);

    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <FolhaSummaryCards />
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText('Custo Horas Extras')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('R$ 100.123')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('R$ 10.500')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('R$ 500.000')).toBeInTheDocument());
  });
});
