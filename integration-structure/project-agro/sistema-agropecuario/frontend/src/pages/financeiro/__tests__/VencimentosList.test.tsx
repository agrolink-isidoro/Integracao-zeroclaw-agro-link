import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import VencimentosList from '../VencimentosList';
import financeiroService from '@/services/financeiro';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Vencimento } from '@/types/financeiro';

jest.mock('@/services/financeiro');
jest.mock('@/hooks/useApi', () => ({ useApiQuery: jest.fn() }));
jest.mock('@/contexts/AuthContext', () => ({ useAuthContext: jest.fn() }));
import * as useApi from '@/hooks/useApi';
import * as authCtx from '@/contexts/AuthContext';
const mocked = financeiroService as jest.Mocked<typeof financeiroService>;

const renderWithClient = (ui: React.ReactElement) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

beforeEach(() => {
  // Ensure permissions default to none for tests
  (useApi.useApiQuery as jest.Mock).mockReturnValue({ data: [] });
  // Default auth context: non-admin
  (authCtx.useAuthContext as jest.Mock).mockReturnValue({ user: { is_staff: false }, loading: false, isAuthenticated: true, login: jest.fn(), logout: jest.fn(), register: jest.fn(), refreshToken: jest.fn() });
});

describe('VencimentosList', () => {
  it('renders vencimentos and calls marcarVencimentoPago when clicking the button', async () => {
    const sample: Vencimento[] = [{ id: 10, titulo: 'V1', descricao: 'd', talhao_nome: 'T1', valor: 250, data_vencimento: '2026-01-05', status: 'pendente', tipo: 'despesa', criado_em: '2026-01-01', atualizado_em: '2026-01-01' }];
    mocked.getVencimentos.mockResolvedValue(sample);
    mocked.marcarVencimentoPago.mockResolvedValue({ id: 10, titulo: 'V1', descricao: 'd', talhao_nome: 'T1', valor: 250, data_vencimento: '2026-01-05', data_pagamento: '2026-01-06', status: 'pago', tipo: 'despesa', criado_em: '2026-01-01', atualizado_em: '2026-01-01' } as Vencimento);

    renderWithClient(<VencimentosList />);

    expect(await screen.findByText('V1')).toBeInTheDocument();

    // Click 'Marcar como pago' should call the quick action API
    (mocked.marcarVencimentoPago as jest.Mock).mockResolvedValue({ id: 10, titulo: 'V1', descricao: 'd', talhao_nome: 'T1', valor: 250, data_vencimento: '2026-01-05', data_pagamento: '2026-01-06', status: 'pago', tipo: 'despesa', criado_em: '2026-01-01', atualizado_em: '2026-01-01' } as Vencimento);

    fireEvent.click(screen.getByRole('button', { name: 'Marcar como pago' }));

    // ensure quick API was called
    expect(mocked.marcarVencimentoPago).toHaveBeenCalledWith(10);

    // Now test the Quitar modal flow opens and calls quitarVencimento
    (mocked.quitarVencimento as jest.Mock).mockResolvedValue({});
    fireEvent.click(screen.getByRole('button', { name: 'Quitar' }));
    expect(await screen.findByRole('heading', { name: /Quitar Vencimento/ })).toBeInTheDocument();

    // Tooltip explaining "Reconciliar agora" should be present
    const tooltip = screen.getByLabelText('reconciliar-tooltip');
    expect(tooltip).toHaveAttribute('data-tooltip', 'Marca o lançamento como reconciliado imediatamente (define reconciled = true e registra reconciled_at). Use quando o pagamento já consta no extrato bancário.');

    const valorInput = screen.getByLabelText(/Valor pago/);
    fireEvent.change(valorInput, { target: { value: '150.00' } });
    fireEvent.click(screen.getByText('Confirmar quitação'));

    // ensure quitar endpoint was called
    await (() => new Promise((res) => setTimeout(res, 10)))();
    expect(mocked.quitarVencimento).toHaveBeenCalled();
  });

  it('hides delete button when user lacks delete permission and shows when allowed', async () => {
    const sample: Vencimento[] = [{ id: 11, titulo: 'V2', descricao: 'd', talhao_nome: 'T1', valor: 250, data_vencimento: '2026-01-05', status: 'pendente', tipo: 'despesa', criado_em: '2026-01-01', atualizado_em: '2026-01-01' }];
    mocked.getVencimentos.mockResolvedValue(sample);

    // mock useApiQuery for permissions
    (useApi.useApiQuery as jest.Mock).mockReturnValue({ data: [] });

    renderWithClient(<VencimentosList />);

    expect(await screen.findByText('V2')).toBeInTheDocument();
    // Delete button should be present but disabled (no permission)
    expect(screen.getByText('Deletar')).toBeDisabled();

    // Now simulate admin user (is_staff)
    (authCtx.useAuthContext as jest.Mock).mockReturnValue({ user: { is_staff: true }, loading: false, isAuthenticated: true, login: jest.fn(), logout: jest.fn(), register: jest.fn(), refreshToken: jest.fn() });

    // re-render to pick up admin context
    cleanup();
    renderWithClient(<VencimentosList />);
    expect(await screen.findByText('V2')).toBeInTheDocument();
    expect(screen.getByText('Deletar')).toBeEnabled();
  });
});
