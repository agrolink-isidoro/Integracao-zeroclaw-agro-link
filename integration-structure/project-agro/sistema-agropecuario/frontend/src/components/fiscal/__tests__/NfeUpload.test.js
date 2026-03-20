import { jsx as _jsx } from "react/jsx-runtime";
import { render, fireEvent, waitFor } from '@testing-library/react';
import NfeUpload from '../NfeUpload';
import * as fiscal from '../../../services/fiscal';
jest.mock('../../../services/fiscal');
describe('NfeUpload', () => {
    afterEach(() => jest.clearAllMocks());
    test('calls uploadXml on submit and shows success', async () => {
        fiscal.uploadXml.mockResolvedValue({ data: { id: 1 } });
        const { container, getByText } = render(_jsx(NfeUpload, {}));
        const input = container.querySelector('input[type="file"]');
        const file = new File(['<xml/>'], 'nota.xml', { type: 'text/xml' });
        // select file
        fireEvent.change(input, { target: { files: [file] } });
        // submit
        fireEvent.click(getByText('Enviar XML'));
        await waitFor(() => expect(fiscal.uploadXml).toHaveBeenCalled());
    });
    test('displays bad_fields when validation error returned', async () => {
        fiscal.uploadXml.mockRejectedValue({ response: { data: { error: 'validation_error', bad_fields: [{ field: 'emitente_nome', message: 'excede' }] } } });
        const { container, getByText, findByText } = render(_jsx(NfeUpload, {}));
        const input = container.querySelector('input[type="file"]');
        const file = new File(['<xml/>'], 'nota.xml', { type: 'text/xml' });
        fireEvent.change(input, { target: { files: [file] } });
        fireEvent.click(getByText('Enviar XML'));
        expect(await findByText(/Erros de validação/i)).toBeTruthy();
        expect(await findByText(/emitente_nome/)).toBeTruthy();
    });
    test('clear button removes selected file and upload clears after success', async () => {
        fiscal.uploadXml.mockResolvedValue({ data: { id: 1 } });
        const { container, getByText } = render(_jsx(NfeUpload, {}));
        const input = container.querySelector('input[type="file"]');
        const file = new File(['<xml/>'], 'nota.xml', { type: 'text/xml' });
        // select file
        fireEvent.change(input, { target: { files: [file] } });
        expect(getByText('nota.xml')).toBeTruthy();
        // clear
        fireEvent.click(getByText('Limpar'));
        expect(container.querySelector('input[type="file"]').value).toBe('');
        // select again and submit
        fireEvent.change(input, { target: { files: [file] } });
        fireEvent.click(getByText('Enviar XML'));
        await waitFor(() => expect(fiscal.uploadXml).toHaveBeenCalled());
        // after success, file input should be cleared
        await waitFor(() => expect(container.querySelector('input[type="file"]').value).toBe(''));
    });
});
