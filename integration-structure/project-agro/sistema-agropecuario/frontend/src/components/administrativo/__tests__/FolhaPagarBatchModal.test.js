import { jsx as _jsx } from "react/jsx-runtime";
jest.mock('@/services/api');
import api from '@/services/api';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import FolhaPagarBatchModal from '../FolhaPagarBatchModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const mockedApi = api;
describe('FolhaPagarBatchModal', () => {
    const qc = new QueryClient();
    beforeEach(() => { jest.resetAllMocks(); mockedApi.get.mockResolvedValue({ data: [{ id: 1, banco: 'B', agencia: '01', conta: '123' }] }); });
    it('renders rows and sends payload', async () => {
        mockedApi.post.mockResolvedValueOnce({ data: { results: [{ funcionario_id: 1, success: true, transfer_id: 1 }] } });
        render(_jsx(QueryClientProvider, { client: qc, children: _jsx(FolhaPagarBatchModal, { folhaId: 5, items: [{ funcionario: { id: 1, nome: 'Alice' }, liquido: 150 }], onClose: () => { } }) }));
        expect(screen.getByText('Pagar Folha por Transferência')).toBeInTheDocument();
        // submit
        fireEvent.click(screen.getByText('Enviar Lote'));
        await waitFor(() => expect(mockedApi.post).toHaveBeenCalled());
        expect(mockedApi.post).toHaveBeenCalledWith('/administrativo/folha-pagamento/5/pagar_por_transferencia/', expect.any(Object));
    });
    it('validates pix requires pix_key or conta_destino', async () => {
        render(_jsx(QueryClientProvider, { client: qc, children: _jsx(FolhaPagarBatchModal, { folhaId: 5, items: [{ funcionario: { id: 2, nome: 'Bob' }, liquido: 120 }], onClose: () => { } }) }));
        // make row pix but without pix_key or conta_destino
        fireEvent.change(screen.getByLabelText('Forma'), { target: { value: 'pix' } });
        fireEvent.click(screen.getByText('Enviar Lote'));
        await waitFor(() => expect(screen.getByText(/Existem erros no formulário/)).toBeInTheDocument());
    });
    it('reprocesses failed items', async () => {
        mockedApi.post.mockResolvedValueOnce({ data: { results: [{ funcionario_id: 1, success: false, error: 'Banco inválido' }] } });
        mockedApi.post.mockResolvedValueOnce({ data: { results: [{ funcionario_id: 1, success: true, transfer_id: 3 }] } });
        render(_jsx(QueryClientProvider, { client: qc, children: _jsx(FolhaPagarBatchModal, { folhaId: 5, items: [{ funcionario: { id: 1, nome: 'Alice' }, liquido: 150 }], onClose: () => { } }) }));
        fireEvent.click(screen.getByText('Enviar Lote'));
        await waitFor(() => expect(mockedApi.post).toHaveBeenCalled());
        // click reprocess
        fireEvent.click(screen.getByText('Reprocessar falhas'));
        await waitFor(() => expect(mockedApi.post).toHaveBeenCalledTimes(2));
    });
});
