import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LocalArmazenagemForm from '../LocalArmazenagemForm';

// Mock the hooks from useApi
jest.mock('../../../hooks/useApi', () => ({
  useApiCreate: jest.fn(),
  useApiUpdate: jest.fn(),
  useApiQuery: jest.fn()
}));

import { useApiCreate, useApiUpdate, useApiQuery } from '../../../hooks/useApi';

describe('LocalArmazenagemForm', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('shows saca_60kg option and submits create payload', async () => {
    // Mock fazendas query
    (useApiQuery as jest.Mock).mockReturnValue({ data: [{ id: 1, name: 'Fazenda A' }], isLoading: false });

    const mutateAsync = jest.fn().mockResolvedValue({});
    (useApiCreate as jest.Mock).mockReturnValue({ mutateAsync });
    (useApiUpdate as jest.Mock).mockReturnValue({ mutateAsync: jest.fn() });

    const onSuccess = jest.fn();

    const { container } = render(<LocalArmazenagemForm onSuccess={onSuccess} />);

    // Ensure unit option exists (select by name)
    const unidadeSelect = container.querySelector('select[name="unidade_capacidade"]') as HTMLSelectElement;
    expect(unidadeSelect).toBeTruthy();
    expect(Array.from(unidadeSelect.options).some(o => o.value === 'saca_60kg')).toBe(true);
    expect(Array.from(unidadeSelect.options).some(o => o.text === 'Saca (60kg)')).toBe(true);

    // Fill form (inputs selected by name)
    const nomeInput = container.querySelector('input[name="nome"]') as HTMLInputElement;
    const capacidadeInput = container.querySelector('input[name="capacidade_total"]') as HTMLInputElement;

    fireEvent.change(nomeInput, { target: { value: 'Depósito Teste' } });
    fireEvent.change(capacidadeInput, { target: { value: '120' } });
    fireEvent.change(unidadeSelect, { target: { value: 'saca_60kg' } });

    // Select fazenda via SelectDropdown (open and click option)
    const fazendaPlaceholder = screen.getByText(/Selecione uma fazenda/i);
    fireEvent.click(fazendaPlaceholder);
    await waitFor(() => screen.getByText('Fazenda A'));
    fireEvent.click(screen.getByText('Fazenda A'));

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Cadastrar/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());

    const calledWith = mutateAsync.mock.calls[0][0];
    expect(calledWith.nome).toBe('Depósito Teste');
    expect(calledWith.capacidade_total).toBe(120);
    expect(calledWith.unidade_capacidade).toBe('saca_60kg');
    expect(calledWith.fazenda).toBe(1);

    // onSuccess should be called after successful create
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('submits update payload when editing an existing local', async () => {
    (useApiQuery as jest.Mock).mockReturnValue({ data: [{ id: 1, name: 'Fazenda A' }], isLoading: false });

    const updateMutate = jest.fn().mockResolvedValue({});
    (useApiCreate as jest.Mock).mockReturnValue({ mutateAsync: jest.fn() });
    (useApiUpdate as jest.Mock).mockReturnValue({ mutateAsync: updateMutate });

    const onSuccess = jest.fn();

    const local = { id: 5, nome: 'Silo Velho', tipo: 'silo', capacidade_total: 1000, unidade_capacidade: 'kg', fazenda: 1, ativo: true } as any;

    const { container } = render(<LocalArmazenagemForm local={local} onSuccess={onSuccess} />);

    // Ensure initial values are present
    const nomeInput = container.querySelector('input[name="nome"]') as HTMLInputElement;
    const unidadeSelect = container.querySelector('select[name="unidade_capacidade"]') as HTMLSelectElement;

    expect(nomeInput.value).toBe('Silo Velho');
    expect(unidadeSelect.value).toBe('kg');

    // Change unidade to saca_60kg and capacity
    const capacidadeInput = container.querySelector('input[name="capacidade_total"]') as HTMLInputElement;
    fireEvent.change(unidadeSelect, { target: { value: 'saca_60kg' } });
    fireEvent.change(capacidadeInput, { target: { value: '50' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Atualizar/i }));

    await waitFor(() => expect(updateMutate).toHaveBeenCalled());
    const callArg = updateMutate.mock.calls[0][0];
    expect(callArg.id).toBe(5);
    expect(callArg.unidade_capacidade).toBe('saca_60kg');
    expect(callArg.capacidade_total).toBe(50);

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
});
