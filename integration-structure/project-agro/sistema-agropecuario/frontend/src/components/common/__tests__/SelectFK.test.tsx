import { render, screen, waitFor } from '@testing-library/react';
import SelectFK from '../SelectFK';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../../../services/api', () => ({
  get: jest.fn(() => Promise.reject(new Error('Network error')))
}));

describe('SelectFK', () => {
  test('renders fallback input when API fails', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: 0 } } });
    render(
      <QueryClientProvider client={qc}>
        <SelectFK endpoint="/comercial/fornecedores/" value={undefined} onChange={() => {}} />
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByTestId('selectfk-fallback')).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByTestId('selectfk-fallback')).toHaveAttribute('placeholder', expect.stringContaining('Erro ao carregar opções'));
  });
});