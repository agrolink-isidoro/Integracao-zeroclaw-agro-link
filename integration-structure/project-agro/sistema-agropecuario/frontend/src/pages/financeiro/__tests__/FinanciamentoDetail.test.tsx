import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FinanciamentoDetail from '../FinanciamentoDetail';
import financeiroService from '@/services/financeiro';
import type { Financiamento, ParcelaFinanciamento } from '@/types/financeiro';

jest.mock('@/services/financeiro');
const mocked = financeiroService as jest.Mocked<typeof financeiroService>;

const renderWithClientAndRoute = (ui: React.ReactElement, route = '/financeiro/financiamentos/1') => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter></QueryClientProvider>);
};

describe('FinanciamentoDetail', () => {
  it('renders financing and parcelas and marks parcela paid', async () => {
    const financ: Financiamento = { id: 1, descricao: 'Fin 1', valor_financiado: 1000, numero_parcelas: 2, data_contratacao: '2026-01-01', criado_em: '2026-01-01' } as any;
    const parcelas: ParcelaFinanciamento[] = [{ id: 10, numero_parcela: 1, valor_parcela: 500, data_vencimento: '2026-02-01', pago: false } as any];

    mocked.getFinanciamentoById.mockResolvedValue(financ);
    mocked.getParcelasFinanciamento.mockResolvedValue(parcelas);
    mocked.marcarParcelaFinanciamentoPago.mockResolvedValue({ ...parcelas[0], pago: true } as any);

    renderWithClientAndRoute(
      <Routes>
        <Route path="/financeiro/financiamentos/:id" element={<FinanciamentoDetail />} />
      </Routes>
    );

    expect(await screen.findByText('Fin 1')).toBeInTheDocument();
    expect(await screen.findByText('R$ 500')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Marcar pago'));
    expect(mocked.marcarParcelaFinanciamentoPago).toHaveBeenCalledWith(10);
  });

  it('generates parcelas when clicking Gerar Parcelas and confirms', async () => {
    const financ: Financiamento = { id: 1, descricao: 'Fin 1', valor_financiado: 1000, numero_parcelas: 2, data_contratacao: '2026-01-01', criado_em: '2026-01-01' } as any;
    const parcelas: ParcelaFinanciamento[] = [{ id: 10, numero_parcela: 1, valor_parcela: 500, data_vencimento: '2026-02-01', pago: false } as any];

    mocked.getFinanciamentoById.mockResolvedValue(financ);
    mocked.getParcelasFinanciamento.mockResolvedValue(parcelas);
    mocked.gerarParcelasFinanciamento.mockResolvedValue(financ as any);

    renderWithClientAndRoute(
      <Routes>
        <Route path="/financeiro/financiamentos/:id" element={<FinanciamentoDetail />} />
      </Routes>
    );

    expect(await screen.findByText('Fin 1')).toBeInTheDocument();

    window.confirm = jest.fn().mockReturnValue(true);
    fireEvent.click(screen.getByText('Gerar Parcelas'));
    expect(mocked.gerarParcelasFinanciamento).toHaveBeenCalledWith(1);
  });
});