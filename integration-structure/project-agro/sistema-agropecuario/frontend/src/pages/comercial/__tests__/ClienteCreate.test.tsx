import { render, screen } from '@testing-library/react';
import ClienteCreate from '@/pages/comercial/ClienteCreate';
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
describe('ClienteCreate form', () => {
  it('renders inscrição estadual input', () => {
    renderWithClient(<ClienteCreate />);
    expect(screen.getByText(/Inscrição Estadual \(IE\)/i)).toBeInTheDocument();
  });
});