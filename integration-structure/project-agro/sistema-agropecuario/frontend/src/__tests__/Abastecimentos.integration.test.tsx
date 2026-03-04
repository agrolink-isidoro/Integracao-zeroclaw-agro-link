import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Abastecimentos from '../pages/maquinas/Abastecimentos';
import api from '../services/api';

jest.mock('../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('Abastecimentos page', () => {
  const queryClient = new QueryClient();

  beforeEach(() => jest.resetAllMocks());

  it('lists and creates abastecimentos and shows totals/widgets', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/maquinas/abastecimentos/') {
        return Promise.resolve({ data: { count: 0, next: null, previous: null, results: [] } });
      }
      if (url === '/maquinas/equipamentos/') {
        return Promise.resolve({ data: { results: [{ id: 1, nome: 'Equip A' }], count: 1, next: null, previous: null }});
      }
      if (url === '/maquinas/abastecimentos/dashboard/') {
        return Promise.resolve({ data: { total_abastecimentos_mes: 0, custo_total_abastecimentos_mes: 0, consumo_medio_litros_dia: 0 } });
      }
      if (typeof url === 'string' && url.startsWith('/maquinas/abastecimentos/por_equipamento')) {
        return Promise.resolve({ data: [] });
      }
      // after create, listing returns the created abastecimento with total
      return Promise.resolve({ data: { count: 1, next: null, previous: null, results: [{ id: 10, quantidade_litros: 5, valor_unitario: 2, valor_total: 10, equipamento_detail: { nome: 'Equip A' }, data_abastecimento: new Date().toISOString() }] } });
    });

    let created = false;
    mockedApi.post = jest.fn().mockImplementation(() => {
      created = true;
      return Promise.resolve({ data: { id: 10 } });
    });

    // adjust get mock to return created item after post
    // adjust get mock to return created item after post
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/maquinas/abastecimentos/') {
        if (!created) {
          return Promise.resolve({ data: { count: 0, next: null, previous: null, results: [] } });
        }
        return Promise.resolve({ data: { count: 1, next: null, previous: null, results: [{ id: 10, quantidade_litros: 5, valor_unitario: 2, valor_total: 10, equipamento_detail: { nome: 'Equip A' }, data_abastecimento: new Date().toISOString() }] } });
      }
      if (url === '/maquinas/equipamentos/') {
        return Promise.resolve({ data: { results: [{ id: 1, nome: 'Equip A' }], count: 1, next: null, previous: null }});
      }
      if (url === '/maquinas/abastecimentos/dashboard/') {
        return Promise.resolve({ data: { total_abastecimentos_mes: 0, custo_total_abastecimentos_mes: 0, consumo_medio_litros_dia: 0 } });
      }
      if (typeof url === 'string' && url.startsWith('/maquinas/abastecimentos/por_equipamento')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <QueryClientProvider client={queryClient}>
        <Abastecimentos />
      </QueryClientProvider>
    );

    // open form
    fireEvent.click(screen.getByText(/Novo Abastecimento/i));

    // select equipamento
    await waitFor(() => expect(screen.getByLabelText(/Equipamento/i)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Equipamento/i), { target: { value: '1' } });

    // change quantities and assert computed total shows in form
    fireEvent.change(screen.getByLabelText(/Quantidade \(L\)/i), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/Valor Unit\./i), { target: { value: '2' } });

    // computed total should be visible in the form
    expect((screen.getByDisplayValue('10.00') as HTMLInputElement)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Data/i), { target: { value: new Date().toISOString().slice(0,16) } });

    fireEvent.click(screen.getByRole('button', { name: /Salvar/i }));

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalled());

    // expect created item to appear in list with total
    await waitFor(() => expect(screen.getByText(/R\$ 10\.00/)).toBeInTheDocument());

    // widgets: dashboard and top machine
    expect(screen.getByText(/Abastecimentos no mês/i)).toBeInTheDocument();
    expect(screen.getByText(/Top máquina/i)).toBeInTheDocument();
  });
});