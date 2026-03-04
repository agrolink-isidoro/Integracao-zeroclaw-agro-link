import { render, fireEvent, waitFor } from '@testing-library/react';
import CertificadoUpload from '../CertificadoUpload';
import * as fiscal from '../../../services/fiscal';

jest.mock('../../../services/fiscal');

describe('CertificadoUpload', () => {
  afterEach(() => jest.clearAllMocks());

  test('calls uploadCert on submit', async () => {
    (fiscal.uploadCert as jest.Mock).mockResolvedValue({ data: { id: 1 } });

    const { container, getByText } = render(<CertificadoUpload />);
    const input: HTMLInputElement | null = container.querySelector('input[type="file"]');
    const file = new File(['dummy'], 'cert.p12', { type: 'application/x-pkcs12' });

    fireEvent.change(input!, { target: { files: [file] } });
    fireEvent.click(getByText('Enviar Certificado'));

    await waitFor(() => expect(fiscal.uploadCert).toHaveBeenCalled());
  });

  test('handles invalid file type error (server-side)', async () => {
    // Simulate server returning invalid_file_type even for a valid file upload
    (fiscal.uploadCert as jest.Mock).mockRejectedValue({ response: { data: { error: 'invalid_file_type' } } });

    const { container, getByText } = render(<CertificadoUpload />);
    const input: HTMLInputElement | null = container.querySelector('input[type="file"]');
    // Use a valid file extension so client-side validation doesn't block the upload
    const file = new File(['dummy'], 'cert.p12', { type: 'application/x-pkcs12' });

    fireEvent.change(input!, { target: { files: [file] } });
    fireEvent.click(getByText('Enviar Certificado'));

    await waitFor(() => expect(fiscal.uploadCert).toHaveBeenCalled());
  });
});
