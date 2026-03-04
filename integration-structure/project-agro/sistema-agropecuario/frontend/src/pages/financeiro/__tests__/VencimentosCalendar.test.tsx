import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VencimentosCalendar from '../VencimentosCalendar';
import financeiroService from '@/services/financeiro';
import * as csvUtils from '@/utils/csv';
import type { Vencimento } from '@/types/financeiro';

jest.mock('@/services/financeiro');
const mockedService = financeiroService as jest.Mocked<typeof financeiroService>;

const renderWithClient = (ui: React.ReactElement) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

describe('VencimentosCalendar', () => {
  it('renders badges and opens modal on day click', async () => {
    const sample: Vencimento[] = [
      { id: 1, titulo: 'Teste 1', descricao: 'Desc 1', valor: 100.0, data_vencimento: '2026-01-10', status: 'pendente', tipo: 'despesa', criado_em: '2026-01-01', atualizado_em: '2026-01-01' },
      { id: 2, titulo: 'Pago', descricao: 'Desc 2', valor: 200.0, data_vencimento: '2026-01-10', status: 'pago', tipo: 'despesa', criado_em: '2026-01-01', atualizado_em: '2026-01-01' }
    ];

    // Ensure calendar month includes our test date
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-15'));

    mockedService.getVencimentos.mockResolvedValue(sample);

    renderWithClient(<VencimentosCalendar />);

    await waitFor(() => expect(mockedService.getVencimentos).toHaveBeenCalled());

    // check month label and totals
    expect(await screen.findByText(/2026/)).toBeInTheDocument();
    const monthSummary = screen.getByText(/Total mês:/).parentElement;
    expect(monthSummary).toBeTruthy();
    expect(monthSummary && within(monthSummary).getByText(/R\$\s*300\.00/)).toBeTruthy();

    // wait for a badge with the sample amount (allow flexible decimal formatting)
    const badge = await screen.findByText(/R\$ 100(\.00)?/);

    // ensure export and filter controls exist
    expect(screen.getByTestId('export-csv')).toBeInTheDocument();
    expect(screen.getByTestId('export-pdf')).toBeInTheDocument();
    const select = screen.getByLabelText(/Filtrar status/i);
    expect(select).toBeInTheDocument();

    // legend & tooltip help
    const legend = screen.getByTestId('legend');
    expect(within(legend).getByText('Pendente')).toBeInTheDocument();
    expect(within(legend).getByText('Pago')).toBeInTheDocument();
    expect(within(legend).getByText('Atrasado')).toBeInTheDocument();

    const helpBtn = screen.getByLabelText('Ajuda legenda');
    expect(helpBtn).toHaveAttribute('title');
    expect(helpBtn.getAttribute('title')).toContain('Badges mostram');

    // footer legend exists
    const footer = screen.getByTestId('footer-legend');
    expect(within(footer).getByText('Pendente')).toBeInTheDocument();

    // clicking help opens modal
    fireEvent.click(helpBtn);
    expect(await screen.findByText(/Ajuda - Legenda/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Fechar'));

    // CSV export - mock downloadCSV
    const csvSpy = jest.spyOn(csvUtils, 'downloadCSV').mockImplementation(() => {});
    const csvBtn = screen.getByTestId('export-csv');
    fireEvent.click(csvBtn);
    expect(csvSpy).toHaveBeenCalled();
    csvSpy.mockRestore();

    // PDF export - mock window.open
    const winMock = { document: { open: jest.fn(), write: jest.fn(), close: jest.fn() }, focus: jest.fn(), print: jest.fn() } as unknown as Window;
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => winMock);
    const pdfBtn = screen.getByTestId('export-pdf');
    fireEvent.click(pdfBtn);
    expect(openSpy).toHaveBeenCalled();
    openSpy.mockRestore();

    // click the inner clickable div inside the day cell
    const cell = badge.closest('td');
    expect(cell).toBeTruthy();
    const clickTarget = cell!.querySelector('div[style]');
    expect(clickTarget).toBeTruthy();
    fireEvent.click(clickTarget!);

    // the modal should appear with list items
    expect(await screen.findByText(/Teste 1/)).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Pago/)).toBeInTheDocument();

    // Now test marking as paid: mock marcarVencimentoPago
    mockedService.marcarVencimentoPago.mockResolvedValue({ id: 1, titulo: 'Teste 1', descricao: 'Desc 1', valor: 100.0, data_vencimento: '2026-01-10', data_pagamento: '2026-01-10', status: 'pago', tipo: 'despesa', criado_em: '2026-01-01', atualizado_em: '2026-01-01' } as Vencimento);

    const markButton = screen.getByTestId('mark-1');
    fireEvent.click(markButton);

    // confirm modal should appear
    expect(await screen.findByText(/Confirmar pagamento/)).toBeInTheDocument();

    const confirmBtn = screen.getByTestId('confirm-mark-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => expect(mockedService.marcarVencimentoPago).toHaveBeenCalledWith(1));

    // After marking, the button should no longer be present for that item
    expect(screen.queryByTestId('mark-1')).not.toBeInTheDocument();

    // close modal, then filter by 'pago' and assert only the paid amount remains
    const closeBtn = screen.getByLabelText('Close');
    fireEvent.click(closeBtn);

    fireEvent.change(select, { target: { value: 'pago' } });
    // There should be at least one visible paid amount in the calendar
    const paidBadges = await screen.findAllByText(/R\$ 200\.00/);
    expect(paidBadges.length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/R\$ 100\.00/)).not.toBeInTheDocument();

    // restore timers
    jest.useRealTimers();
  });
});