import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EmprestimoDetail from '../EmprestimoDetail';
import financeiroService from '@/services/financeiro';
import type { Emprestimo, ParcelaEmprestimo } from '@/types/financeiro';

jest.mock('@/services/financeiro');
const mocked = financeiroService as jest.Mocked<typeof financeiroService>;

const renderWithClientAndRoute = (ui: React.ReactElement, route = '/financeiro/emprestimos/2') => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter></QueryClientProvider>);
};

describe('EmprestimoDetail', () => {
  it('renders emprestimo and parcelas and marks parcela paid', async () => {
    const emp: Emprestimo = { id: 2, descricao: 'Emp 1', valor_emprestado: 500, numero_parcelas: 3, data_contratacao: '2026-02-01', criado_em: '2026-02-01' } as any;
    const parcelas: ParcelaEmprestimo[] = [{ id: 20, numero_parcela: 1, valor_parcela: 166.67, data_vencimento: '2026-03-01', pago: false } as any];

    mocked.getEmprestimoById.mockResolvedValue(emp);
    mocked.getParcelasEmprestimo.mockResolvedValue(parcelas);
    mocked.marcarParcelaEmprestimoPago.mockResolvedValue({ ...parcelas[0], pago: true } as any);

    renderWithClientAndRoute(
      <Routes>
        <Route path="/financeiro/emprestimos/:id" element={<EmprestimoDetail />} />
      </Routes>
    );

    expect(await screen.findByText('Emp 1')).toBeInTheDocument();
    expect(await screen.findByText('R$ 166.67')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Marcar pago'));
    expect(mocked.marcarParcelaEmprestimoPago).toHaveBeenCalledWith(20);
  });

  it('generates parcelas when clicking Gerar Parcelas and confirms', async () => {
    const emp: Emprestimo = { id: 2, descricao: 'Emp 1', valor_emprestado: 500, numero_parcelas: 3, data_contratacao: '2026-02-01', criado_em: '2026-02-01' } as any;
    const parcelas: ParcelaEmprestimo[] = [{ id: 20, numero_parcela: 1, valor_parcela: 166.67, data_vencimento: '2026-03-01', pago: false } as any];

    mocked.getEmprestimoById.mockResolvedValue(emp);
    mocked.getParcelasEmprestimo.mockResolvedValue(parcelas);
    mocked.gerarParcelasEmprestimo.mockResolvedValue(emp as any);

    renderWithClientAndRoute(
      <Routes>
        <Route path="/financeiro/emprestimos/:id" element={<EmprestimoDetail />} />
      </Routes>
    );

    expect(await screen.findByText('Emp 1')).toBeInTheDocument();

    window.confirm = jest.fn().mockReturnValue(true);
    fireEvent.click(screen.getByText('Gerar Parcelas'));
    expect(mocked.gerarParcelasEmprestimo).toHaveBeenCalledWith(2);
  });
});