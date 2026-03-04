import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EquipamentoForm from '../EquipamentoForm';

jest.mock('@/services/api');
import mockedApi from '@/services/api';

beforeEach(() => {
  // Ensure categories are available so select can be chosen and form submits
  mockedApi.get = jest.fn().mockResolvedValue({ data: [{ id: 1, nome: 'Trator', tipo_mobilidade: 'autopropelido' }] });
});

describe('EquipamentoForm', () => {
  it('displays server validation errors returned by API', async () => {
    const mockOnSave = jest.fn().mockRejectedValue({ response: { data: { marca: ['This field is required.'] } } });
    const mockOnCancel = jest.fn();

    render(<EquipamentoForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    // Fill required visible fields
    fireEvent.change(screen.getByLabelText(/Nome/i), { target: { value: 'Teste' } });

    // Wait for categories to load (fallback or API) so select is enabled
    await waitFor(() => expect(screen.getByLabelText(/Categoria/i)).not.toBeDisabled());

    // select a valid category so form validation passes and onSave is called
    fireEvent.change(screen.getByLabelText(/Categoria/i), { target: { value: '1' } });

    // fill marca, modelo and data_aquisicao so browser validation doesn't block submission
    fireEvent.change(screen.getByLabelText(/Marca \\*/i), { target: { value: 'MarcaX' } });
    fireEvent.change(screen.getByLabelText(/Modelo \\*/i), { target: { value: 'ModelX' } });
    fireEvent.change(screen.getByLabelText(/Data de Aquisição \\*/i), { target: { value: '2025-01-01' } });

    fireEvent.click(screen.getByText(/Cadastrar/i));

    await waitFor(() => expect(mockOnSave).toHaveBeenCalled());

    // Expect server error message to be shown
    expect(await screen.findByText(/This field is required\./i)).toBeInTheDocument();
  });
});