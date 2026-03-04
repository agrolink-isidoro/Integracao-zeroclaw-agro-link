import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContaForm from '../ContaForm';

jest.mock('@/hooks/useApi', () => ({
  useApiCreate: jest.fn(),
  useApiUpdate: jest.fn(),
  useApiQuery: jest.fn()
}));

import * as useApi from '@/hooks/useApi';

describe('ContaForm', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('alerts when saldo uses comma as decimal separator and does not call create', async () => {
    const mockCreate = { mutateAsync: jest.fn() };
    (useApi.useApiCreate as jest.Mock).mockReturnValue(mockCreate);
    (useApi.useApiQuery as jest.Mock).mockReturnValue({ data: [], isLoading: false });

    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    const insts = [{ id: 5, codigo_bacen: '555', nome: 'Banco T' }];
    (useApi.useApiQuery as jest.Mock).mockImplementation((key: any) => {
      if (Array.isArray(key) && key[0] === 'instituicoes') return { data: insts, isLoading: false };
      return { data: [], isLoading: false };
    });

    const { container } = render(<ContaForm onClose={() => {}} onSaved={() => {}} />);

    // Select a bank so validation passes
    const dropdown = screen.getByText('Selecione instituição (nome ou código)');
    fireEvent.click(dropdown);
    const optionLabel = `${insts[0].codigo_bacen} — ${insts[0].nome}`;
    const option = await screen.findByText(optionLabel);
    fireEvent.click(option);

    const contaInput = container.querySelector('input[name="conta"]') as HTMLInputElement;
    expect(contaInput).toBeTruthy();
    fireEvent.change(contaInput, { target: { value: '12345' } });

    const saldoInput = screen.getByDisplayValue('0.00');
    fireEvent.change(saldoInput, { target: { value: '123,45' } });

    fireEvent.click(screen.getByText('Criar'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('A digitar centavos usar ponto(.) como separador'));
    expect(mockCreate.mutateAsync).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('selecting banco shows the selected label', async () => {
    const insts = [{ id: 5, codigo_bacen: '555', nome: 'Banco T' }];
    (useApi.useApiQuery as jest.Mock).mockImplementation((key: any) => {
      if (Array.isArray(key) && key[0] === 'instituicoes') return { data: insts, isLoading: false };
      return { data: [], isLoading: false };
    });
    (useApi.useApiCreate as jest.Mock).mockReturnValue({ mutateAsync: jest.fn() });

    render(<ContaForm onClose={() => {}} onSaved={() => {}} />);

    // Open dropdown
    const dropdown = screen.getByText('Selecione instituição (nome ou código)');
    fireEvent.click(dropdown);

    // The option text should be visible
    const optionLabel = `${insts[0].codigo_bacen} — ${insts[0].nome}`;
    const option = await screen.findByText(optionLabel);
    fireEvent.click(option);

    // After selection, the dropdown should display the selected label
    expect(screen.getByText(optionLabel)).toBeInTheDocument();
  });
});
