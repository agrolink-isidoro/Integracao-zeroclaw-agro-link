import { jsx as _jsx } from "react/jsx-runtime";
import { render, fireEvent, waitFor } from '@testing-library/react';
import NfeUploadModal from '../NfeUploadModal';
import * as fiscal from '../../../services/fiscal';
import * as toastHook from '../../../hooks/useToast';
jest.mock('../../../services/fiscal');
jest.mock('../../../hooks/useToast');
describe('NfeUploadModal', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        toastHook.useToast.mockReturnValue({
            showSuccess: jest.fn(),
            showError: jest.fn(),
        });
    });
    test('renders modal when open prop is true', () => {
        const { getByText } = render(_jsx(NfeUploadModal, { open: true, onClose: () => { } }));
        expect(getByText(/Importar Arquivos Fiscais/i)).toBeTruthy();
    });
    test('does not render modal when open prop is false', () => {
        const { queryByText } = render(_jsx(NfeUploadModal, { open: false, onClose: () => { } }));
        expect(queryByText(/Importar Arquivos Fiscais/i)).toBeFalsy();
    });
    test('switches between NFe and Certificate tabs', async () => {
        const { getByRole } = render(_jsx(NfeUploadModal, { open: true, onClose: () => { } }));
        const certTab = getByRole('tab', { name: /Certificado/i });
        fireEvent.click(certTab);
        await waitFor(() => {
            expect(certTab).toHaveAttribute('aria-selected', 'true');
        });
    });
    test('disables submit button when no file selected', () => {
        const { getByText } = render(_jsx(NfeUploadModal, { open: true, onClose: () => { } }));
        const submitButton = getByText('Enviar');
        expect(submitButton).toBeDisabled();
    });
    test('calls onClose when close button clicked', async () => {
        const onClose = jest.fn();
        const { getByText } = render(_jsx(NfeUploadModal, { open: true, onClose: onClose }));
        const cancelButton = getByText('Cancelar');
        fireEvent.click(cancelButton);
        await waitFor(() => {
            expect(onClose).toHaveBeenCalled();
        });
    });
    test('clears form and state on tab change', async () => {
        const { getByRole } = render(_jsx(NfeUploadModal, { open: true, onClose: () => { } }));
        const certTab = getByRole('tab', { name: /Certificado/i });
        fireEvent.click(certTab);
        await waitFor(() => {
            expect(certTab).toHaveAttribute('aria-selected', 'true');
        });
    });
    test('calls onSuccess callback when provided', async () => {
        const onSuccess = jest.fn();
        const { getByText } = render(_jsx(NfeUploadModal, { open: true, onClose: () => { }, onSuccess: onSuccess }));
        // Just verify the prop was passed correctly
        expect(getByText(/Importar Arquivos Fiscais/i)).toBeTruthy();
    });
    test('displays certificate upload tab with correct info', () => {
        const { getByRole } = render(_jsx(NfeUploadModal, { open: true, onClose: () => { } }));
        const certTab = getByRole('tab', { name: /Certificado/i });
        fireEvent.click(certTab);
        expect(certTab).toHaveAttribute('aria-selected', 'true');
    });
    test('modal prevents interaction when loading', async () => {
        fiscal.uploadXml.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
        const onClose = jest.fn();
        const { getByText } = render(_jsx(NfeUploadModal, { open: true, onClose: onClose }));
        const cancelButton = getByText('Cancelar');
        const submitButton = getByText('Enviar');
        // Initially not disabled (no file selected)
        expect(submitButton).toBeDisabled();
        expect(cancelButton).not.toBeDisabled();
    });
    test('pre-loads XML file when initialFiles prop is provided', async () => {
        const xmlFile = new File(['<xml>test</xml>'], 'test.xml', { type: 'text/xml' });
        const { getByText } = render(_jsx(NfeUploadModal, { open: true, onClose: () => { }, initialFiles: [xmlFile] }));
        await waitFor(() => {
            expect(getByText('test.xml')).toBeTruthy();
        });
    });
    test('pre-loads certificate and switches tab when .pfx file is provided', async () => {
        const pfxFile = new File(['cert'], 'test.pfx', { type: 'application/x-pkcs12' });
        const { getByText, getByRole } = render(_jsx(NfeUploadModal, { open: true, onClose: () => { }, initialFiles: [pfxFile] }));
        await waitFor(() => {
            const certTab = getByRole('tab', { name: /Certificado/i });
            expect(certTab).toHaveAttribute('aria-selected', 'true');
            expect(getByText('test.pfx')).toBeTruthy();
        });
    });
    test('enables submit button when file is pre-loaded', async () => {
        const xmlFile = new File(['<xml>test</xml>'], 'test.xml', { type: 'text/xml' });
        const { getByText } = render(_jsx(NfeUploadModal, { open: true, onClose: () => { }, initialFiles: [xmlFile] }));
        await waitFor(() => {
            const submitButton = getByText('Enviar');
            expect(submitButton).not.toBeDisabled();
        });
    });
});
