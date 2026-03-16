import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, waitFor } from '@testing-library/react';
import NfeList from '../NfeList';
import * as fiscalService from '../../../services/fiscal';
jest.mock('../../../services/fiscal');
const mockedList = fiscalService;
describe('NfeList', () => {
    it('renders list and opens detail', async () => {
        mockedList.listNfes.mockResolvedValue({ data: [{ id: 1, chave_acesso: '123', numero: '1', serie: '1', emitente_nome: 'X', valor_nota: '100', data_emissao: '2025-01-01' }] });
        render(_jsx(NfeList, {}));
        await waitFor(() => expect(screen.getByText(/Notas Fiscais/i)).toBeInTheDocument());
        expect(screen.getByText(/123/)).toBeInTheDocument();
    });
});
