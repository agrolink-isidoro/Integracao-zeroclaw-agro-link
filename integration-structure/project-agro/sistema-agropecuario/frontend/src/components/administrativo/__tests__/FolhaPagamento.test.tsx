jest.mock('@/services/api');
import api from '@/services/api';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FolhaPagamento } from '../FolhaPagamento';

const mockedApi = api as jest.Mocked<typeof api>;

describe('FolhaPagamento', () => {
  const qc = new QueryClient();

  beforeEach(() => { jest.resetAllMocks(); window.alert = jest.fn(); });

  it('generates preview and runs', async () => {
    // preview response includes computed fields we'll expose for editing
    mockedApi.post.mockResolvedValueOnce({ data: { id: 1, descricao: 'Folha 1/2026', valor_total: 1500, itens: [{ id: 1, funcionario: { id: 1, nome: 'João' }, salario_bruto: 1000, hora_extra: 50, dsr: 10, inss: 80, ir: 0, descontos_outro: 0, liquido: 970 }] } } as any);
    // run endpoint
    mockedApi.post.mockResolvedValueOnce({ data: { status: 'executed', id: 1 } } as any);
    // when run completes we fetch the persisted folha
    mockedApi.get.mockResolvedValueOnce({ data: [{ id: 1, nome: 'João' }] } as any);
    // summary call for previous month (auto-loaded)
    mockedApi.get.mockResolvedValueOnce({ data: { total_horas_extra_cost: 0, total_inss: 0, total_folha: 0 } } as any);
    mockedApi.get.mockResolvedValueOnce({ data: { id: 1, descricao: 'Folha 1/2026', periodo_mes: 1, periodo_ano: 2026, itens: [{ id: 1, funcionario: { id: 1, nome: 'João' }, salario_bruto: 1000, hora_extra: 50, dsr: 10, inss: 80, ir: 0, descontos_outro: 0, liquido: 970 }] } } as any);

    render(
      <QueryClientProvider client={qc}>
        <FolhaPagamento />
      </QueryClientProvider>
    );

    await waitFor(() => expect(mockedApi.get).toHaveBeenCalledWith('/administrativo/funcionarios/'));

    // Select funcionario and add an overtime entry
    await waitFor(() => expect(mockedApi.get).toHaveBeenCalledWith('/administrativo/funcionarios/'));
    fireEvent.click(screen.getByText('João'));
    // add an overtime entry
    fireEvent.click(screen.getByText('+ Adicionar Hora Extra'));
    const hoursInput = await screen.findByLabelText('Horas extra João #1');
    const typeSelect = await screen.findByLabelText('Tipo horas João #1');
    fireEvent.change(hoursInput, { target: { value: '10' } });
    fireEvent.change(typeSelect, { target: { value: 'normal' } });

    // set holidays count
    const holidaysInput = screen.getByLabelText('Número de feriados no mês');
    fireEvent.change(holidaysInput, { target: { value: '2' } });

    // add an outro desconto
    fireEvent.click(screen.getByText('+ Adicionar Outro'));
    const labelInput = screen.getAllByPlaceholderText('Etiqueta')[0];
    const valueInput = screen.getAllByPlaceholderText('Valor')[0];
    fireEvent.change(labelInput, { target: { value: 'Vale' } });
    fireEvent.change(valueInput, { target: { value: '5.5' } });

    // Set per-employee include DSR and click generate
    const perInclude = await screen.findByLabelText('Incluir DSR João');
    fireEvent.click(perInclude);
    fireEvent.click(screen.getByText('Gerar Preview'));

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith('/administrativo/folha-pagamento/', expect.objectContaining({
      periodo_mes: expect.any(Number), periodo_ano: expect.any(Number), per_employee_horas: [{ id: 1, entries: [{ hours: 10, type: 'normal' }], include_dsr: true }], holidays_count: 2, dias_uteis: 26, include_dsr: null, outros_descontos: [{ label: 'Vale', amount: 5.5 }]
    })));

    await waitFor(() => expect(screen.getByText(/Preview:/i)).toBeInTheDocument());

    // Run: edit INSS value manually before running and expect the override to be sent
    const inssInput = await screen.findByLabelText('INSS João');
    fireEvent.change(inssInput, { target: { value: '7.00' } });

    window.confirm = jest.fn(() => true);
    const fakeWindow: any = { document: { write: jest.fn(), close: jest.fn() }, focus: jest.fn(), print: jest.fn() };
    (window as any).open = jest.fn(() => fakeWindow);

    fireEvent.click(screen.getByText('Executar Folha'));

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith('/administrativo/folha-pagamento/1/run/', { per_employee_overrides: [{ id: 1, inss: 7 }] }));
    // report window should open
    await waitFor(() => expect((window as any).open).toHaveBeenCalled());

  });

  it('automatically includes DSR when hours > 0 and holidays > 0', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [{ id: 1, nome: 'João' }] } as any);
    mockedApi.post.mockResolvedValueOnce({ data: { id: 2, descricao: 'Folha 1/2026', valor_total: 1500, itens: [{ id: 2, funcionario: { id: 1, nome: 'João' }, salario_bruto: 1000, hora_extra: 68.18, hora_extra_hours: 10, dsr: 5.23, inss: 80, ir: 0, descontos_outro: 0, liquido: 920 }] } } as any);

    render(
      <QueryClientProvider client={qc}>
        <FolhaPagamento />
      </QueryClientProvider>
    );

    await waitFor(() => expect(mockedApi.get).toHaveBeenCalledWith('/administrativo/funcionarios/'));

    // wait for the employee button to appear and click it
    await waitFor(() => expect(screen.getByText('João')).toBeInTheDocument());
    fireEvent.click(await screen.findByText('João'));
    // add an overtime entry
    fireEvent.click(screen.getByText('+ Adicionar Hora Extra'));
    const hoursInput = await screen.findByLabelText('Horas extra João #1');
    fireEvent.change(hoursInput, { target: { value: '10' } });

    const holidaysInput = screen.getByLabelText('Número de feriados no mês');
    fireEvent.change(holidaysInput, { target: { value: '2' } });

    // Click automatic calculation
    fireEvent.click(screen.getByText('Calcular Automaticamente'));

    // DSR input should be filled with the computed value and checkbox should be checked
    const dsrInput = await screen.findByLabelText('DSR João');
    expect((dsrInput as HTMLInputElement).value).toBe('5.230');
    const perInclude = await screen.findByLabelText('Incluir DSR João');
    expect((perInclude as HTMLInputElement).checked).toBe(true);
  });

  it('auto-fills 9 hours when selecting diária Domingo or Feriado', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [{ id: 1, nome: 'João' }] } as any);

    render(
      <QueryClientProvider client={qc}>
        <FolhaPagamento />
      </QueryClientProvider>
    );

    await waitFor(() => expect(mockedApi.get).toHaveBeenCalledWith('/administrativo/funcionarios/'));
    // select employee and add an overtime entry
    fireEvent.click(await screen.findByText('João'));
    fireEvent.click(screen.getByText('+ Adicionar Hora Extra'));

    // change kind to diaria and day to domingo
    const kindSelect = await screen.findByLabelText('Kind horas João #1');
    fireEvent.change(kindSelect, { target: { value: 'diaria' } });
    const daySelect = await screen.findByLabelText('Dia da diária João #1');
    fireEvent.change(daySelect, { target: { value: 'domingo' } });

    // hours input should be auto-filled with 9
    const hoursInput = await screen.findByLabelText('Horas extra João #1');
    expect((hoursInput as HTMLInputElement).value).toBe('9');
  });

  it('shows dias trabalhados for temporario and includes it in payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [{ id: 1, nome: 'TEMP', tipo: 'temporario', diaria_valor: 100 }] } as any);
    mockedApi.post.mockResolvedValueOnce({ data: { id: 2, descricao: 'Folha 1/2026', valor_total: 100, itens: [{ id: 2, funcionario: { id: 1, nome: 'TEMP' }, salario_bruto: 300, hora_extra: 0, dsr: 0, inss: 0, ir: 0, descontos_outro: 0, liquido: 300 }] } } as any);

    render(
      <QueryClientProvider client={qc}>
        <FolhaPagamento />
      </QueryClientProvider>
    );

    await waitFor(() => expect(mockedApi.get).toHaveBeenCalledWith('/administrativo/funcionarios/'));
    await waitFor(() => expect(screen.getByText('TEMP')).toBeInTheDocument());
    fireEvent.click(screen.getByText('TEMP'));

    const daysInput = await screen.findByLabelText('Dias trabalhados TEMP');
    fireEvent.change(daysInput, { target: { value: '3' } });

    fireEvent.click(screen.getByText('Gerar Preview'));

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith('/administrativo/folha-pagamento/', expect.objectContaining({ per_employee_horas: expect.arrayContaining([expect.objectContaining({ id: 1, dias_trabalhados: 3 })]) })));
  });

  it('handles string decimal fields when building report (no crash)', async () => {
    // Setup: same flow as run, but persisted folha returns numeric fields as strings
    mockedApi.post.mockResolvedValueOnce({ data: { id: 3, descricao: 'Folha 1/2026', valor_total: 200, itens: [{ id: 3, funcionario: { id: 1, nome: 'Carlos' }, salario_bruto: '1000.50', hora_extra: '20.5', dsr: '5.25', inss: '80', ir: '0', descontos_outro: '0', liquido: '945.75' }] } } as any);
    mockedApi.post.mockResolvedValueOnce({ data: { status: 'executed', id: 3 } } as any);
    // mock GETs: funcionarios and later persisted folha
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/administrativo/funcionarios/') return Promise.resolve({ data: [{ id: 1, nome: 'Carlos' }] } as any);
      if (url.startsWith('/administrativo/folha-pagamento/') && url.includes('/')) return Promise.resolve({ data: { id: 3, descricao: 'Folha 1/2026', periodo_mes: 1, periodo_ano: 2026, itens: [{ id: 3, funcionario: { id: 1, nome: 'Carlos' }, salario_bruto: '1000.50', hora_extra: '20.5', dsr: '5.25', inss: '80', ir: '0', descontos_outro: '0', liquido: '945.75' }] } } as any);
      return Promise.resolve({ data: {} } as any);
    });

    render(
      <QueryClientProvider client={qc}>
        <FolhaPagamento />
      </QueryClientProvider>
    );

    await waitFor(() => expect(mockedApi.get).toHaveBeenCalledWith('/administrativo/funcionarios/'));
    fireEvent.click(screen.getByText('Carlos'));

    // Run flow: we don't need extras; set confirm and fake window
    window.confirm = jest.fn(() => true);
    const fakeWindow: any = { document: { write: jest.fn(), close: jest.fn() }, focus: jest.fn(), print: jest.fn() };
    (window as any).open = jest.fn(() => fakeWindow);

    // Trigger run - component expects a preview with id; fake preview first
    // Set preview via mocking post preview response
    mockedApi.post.mockResolvedValueOnce({ data: { id: 3, descricao: 'Folha 1/2026', valor_total: 200, itens: [{ id: 3, funcionario: { id: 1, nome: 'Carlos' }}] } } as any);

    // click generate and then run
    fireEvent.click(screen.getByText('Gerar Preview'));

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith('/administrativo/folha-pagamento/', expect.anything()));

    // Wait for the preview to be set and Executar button to appear
    await waitFor(() => expect(screen.getByText('Executar Folha')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Executar Folha'));

    // Expect the run endpoint called and report window opened without throwing
    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith('/administrativo/folha-pagamento/3/run/', expect.any(Object)));
    await waitFor(() => expect((window as any).open).toHaveBeenCalled());
  });
});
