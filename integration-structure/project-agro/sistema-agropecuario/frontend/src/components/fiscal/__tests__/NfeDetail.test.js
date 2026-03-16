import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import NfeDetail from '../NfeDetail';
jest.mock('@/hooks/useToast');
const mockGetNfe = jest.fn();
const mockConfirmarEstoque = jest.fn();
// Mock using absolute path to ensure the module is resolved regardless of test CWD
jest.mock('/home/felip/projeto-agro/sistema-agropecuario/frontend/src/services/fiscal', () => ({
    getNfe: (...args) => mockGetNfe(...args),
    confirmarEstoque: (...args) => mockConfirmarEstoque(...args),
}));
const mockGetStoredUser = jest.fn();
jest.mock('/home/felip/projeto-agro/sistema-agropecuario/frontend/src/hooks/useAuth', () => ({
    getStoredUser: () => mockGetStoredUser(),
}));
describe('NfeDetail - Force Confirm button visibility', () => {
    beforeEach(() => {
        mockGetNfe.mockReset();
        mockConfirmarEstoque.mockReset();
        mockGetStoredUser.mockReset();
    });
    it('shows the prominent Forçar Confirmação button for staff users and opens dialog', async () => {
        const sampleNfe = {
            id: 1,
            numero: '123',
            serie: '1',
            chave_acesso: '000',
            emitente_nome: 'Emitente X',
            valor: '100.00',
            itens: [{ id: 1, numero_item: '1', descricao: 'Produto', quantidade_comercial: '2.000', unidade_comercial: 'UN' }],
            estoque_confirmado: false,
            manifestacoes: [{ id: 1, tipo: 'confirmacao', status_envio: 'sent', criado_em: new Date().toISOString() }],
        };
        mockGetNfe.mockResolvedValue({ data: sampleNfe });
        mockGetStoredUser.mockReturnValue({ is_staff: true });
        render(_jsx(NfeDetail, { id: 1, onClose: () => { } }));
        // Wait for the component to load and render the button
        const forceBtn = await screen.findByText(/Forçar Confirmação/i);
        expect(forceBtn).toBeInTheDocument();
        // Click and expect dialog
        fireEvent.click(forceBtn);
        await waitFor(() => expect(screen.getByText(/Forçar Confirmação de Estoque\?/i)).toBeInTheDocument());
        // Click the confirm button in dialog and expect API called with force
        const confirmDialogBtn = screen.getByRole('button', { name: /Forçar Confirmação/i });
        fireEvent.click(confirmDialogBtn);
        await waitFor(() => expect(mockConfirmarEstoque).toHaveBeenCalledWith(1, { force: true }));
    });
    it('does not show the button for non-staff users', async () => {
        const sampleNfe = {
            id: 2,
            numero: '321',
            serie: '1',
            chave_acesso: '111',
            emitente_nome: 'Emitente Y',
            valor: '200.00',
            itens: [],
            estoque_confirmado: false,
            manifestacoes: [{ id: 1, tipo: 'confirmacao', status_envio: 'sent', criado_em: new Date().toISOString() }],
        };
        mockGetNfe.mockResolvedValue({ data: sampleNfe });
        mockGetStoredUser.mockReturnValue({ is_staff: false });
        render(_jsx(NfeDetail, { id: 2, onClose: () => { } }));
        await waitFor(async () => {
            const maybe = screen.queryByText(/Forçar Confirmação/i);
            expect(maybe).toBeNull();
        });
    });
    it('shows the button when dev force flag is enabled even for non-staff', async () => {
        import.meta.env = { VITE_FISCAL_SIMULATE_SEFAZ_SUCCESS: 'true' };
        const sampleNfe = {
            id: 3,
            numero: '555',
            serie: '1',
            chave_acesso: '222',
            emitente_nome: 'Emitente Z',
            valor: '300.00',
            itens: [],
            estoque_confirmado: false,
            manifestacoes: [{ id: 1, tipo: 'confirmacao', status_envio: 'sent', criado_em: new Date().toISOString() }],
        };
        mockGetNfe.mockResolvedValue({ data: sampleNfe });
        mockGetStoredUser.mockReturnValue({ is_staff: false });
        render(_jsx(NfeDetail, { id: 3, onClose: () => { } }));
        const forceBtn = await screen.findByText(/Forçar Confirmação/i);
        expect(forceBtn).toBeInTheDocument();
    });
});
