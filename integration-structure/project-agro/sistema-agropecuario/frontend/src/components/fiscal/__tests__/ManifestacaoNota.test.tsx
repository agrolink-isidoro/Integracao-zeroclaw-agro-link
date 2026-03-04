import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ManifestacaoNota from '../ManifestacaoNota';
import * as fiscal from '../../../services/fiscal';
import { useToast } from '@/hooks/useToast';

jest.mock('../../../services/fiscal');
jest.mock('@/hooks/useToast');

describe('ManifestacaoNota', () => {
  const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
  beforeEach(() => {
    mockUseToast.mockReturnValue({ showSuccess: jest.fn(), showError: jest.fn(), showInfo: jest.fn() } as any);
  });

  it('does not render when feature flag off', () => {
    // Simulate env variable not enabled
    (import.meta as any).env = { VITE_FISCAL_MANIFESTACAO_ENABLED: 'false' };
    const { container } = render(<ManifestacaoNota nfeId={1} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders and submits when enabled and shows success', async () => {
    (import.meta as any).env = { VITE_FISCAL_MANIFESTACAO_ENABLED: 'true' };
    const toastMocks = { showSuccess: jest.fn(), showError: jest.fn(), showInfo: jest.fn() };
    mockUseToast.mockReturnValue(toastMocks as any);

    (fiscal.postManifestacao as jest.Mock).mockResolvedValue({ data: {} });
    (fiscal.listManifestacoesForNfe as jest.Mock).mockResolvedValue({ data: { results: [] } });
    render(<ManifestacaoNota nfeId={1} />);
    expect(screen.getByText('Manifestação')).toBeInTheDocument();

    const button = screen.getByText('Manifestar');
    fireEvent.click(button);

    await waitFor(() => expect(fiscal.postManifestacao).toHaveBeenCalled());
    expect(toastMocks.showSuccess).toHaveBeenCalledWith('Manifestação registrada com sucesso');
  });

  it('shows enqueued info when backend responds enqueued', async () => {
    (import.meta as any).env = { VITE_FISCAL_MANIFESTACAO_ENABLED: 'true' };
    const toastMocks = { showSuccess: jest.fn(), showError: jest.fn(), showInfo: jest.fn() };
    mockUseToast.mockReturnValue(toastMocks as any);

    (fiscal.postManifestacao as jest.Mock).mockResolvedValue({ status: 201, data: { enqueued: true } });
    (fiscal.listManifestacoesForNfe as jest.Mock).mockResolvedValue({ data: { results: [] } });

    render(<ManifestacaoNota nfeId={1} />);
    const button = screen.getByText('Manifestar');
    fireEvent.click(button);

    await waitFor(() => expect(fiscal.postManifestacao).toHaveBeenCalled());
    expect(toastMocks.showInfo).toHaveBeenCalledWith('Manifestação enfileirada para envio');
  });

  it('shows error toast on failure', async () => {
    (import.meta as any).env = { VITE_FISCAL_MANIFESTACAO_ENABLED: 'true' };
    const toastMocks = { showSuccess: jest.fn(), showError: jest.fn(), showInfo: jest.fn() };
    mockUseToast.mockReturnValue(toastMocks as any);

    (fiscal.postManifestacao as jest.Mock).mockRejectedValue({ response: { data: { detail: 'Not allowed' } } });
    (fiscal.listManifestacoesForNfe as jest.Mock).mockResolvedValue({ data: { results: [] } });

    render(<ManifestacaoNota nfeId={1} />);
    const button = screen.getByText('Manifestar');
    fireEvent.click(button);

    await waitFor(() => expect(fiscal.postManifestacao).toHaveBeenCalled());
    expect(toastMocks.showError).toHaveBeenCalledWith('Not allowed');
  });
});
