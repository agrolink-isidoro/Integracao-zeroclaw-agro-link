import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import NfeEditModal from '@/components/fiscal/NfeEditModal';
import * as fiscalSvc from '@/services/fiscal';
import produtosService from '@/services/produtos';
import { Toaster } from 'react-hot-toast';
jest.mock('@/services/fiscal');
// Mock toast hook to observe error/success calls
const showErrorMock = jest.fn();
const showSuccessMock = jest.fn();
jest.mock('@/hooks/useToast', () => ({
    useToast: () => ({ showError: showErrorMock, showSuccess: showSuccessMock })
}));
const mockedGetNfe = fiscalSvc.getNfe;
const mockedCreate = fiscalSvc.createItemOverride;
describe('NfeEditModal', () => {
    beforeEach(() => {
        mockedGetNfe.mockReset();
        mockedCreate.mockReset();
        fiscalSvc.getNfeDivergencias?.mockReset?.();
        fiscalSvc.applyItemOverride?.mockReset?.();
    });
    it('shows Refletir action for divergence and applies it', async () => {
        const mockNfe = {
            id: 4,
            numero: '4',
            serie: '1',
            emitente_nome: 'E',
            estoque_confirmado: true,
            itens: [
                { id: 40, numero_item: 1, descricao: 'Prod X', quantidade_comercial: '10', valor_unitario_comercial: '9.00', effective_quantidade: '10', effective_valor_unitario: '9.00', codigo_produto: 'CODE-X' }
            ]
        };
        mockedGetNfe.mockResolvedValue({ data: mockNfe });
        fiscalSvc.getNfeDivergencias.mockResolvedValue({ data: [{ item_id: 40, override_id: 123, quantidade_delta: '-2' }] });
        fiscalSvc.applyItemOverride.mockResolvedValue({ data: {} });
        render(_jsxs(_Fragment, { children: [_jsx(NfeEditModal, { open: true, nfeId: 4, onClose: () => { }, onSaved: () => { } }), _jsx(Toaster, {})] }));
        await waitFor(() => expect(mockedGetNfe).toHaveBeenCalledWith(4));
        await waitFor(() => expect(screen.getByText('Prod X')).toBeInTheDocument());
        // Refletir button should appear (server-provided divergence)
        const refletirBtn = await screen.findByText('Refletir no Estoque');
        expect(refletirBtn).toBeInTheDocument();
        // Click to apply
        fireEvent.click(refletirBtn);
        await waitFor(() => expect(fiscalSvc.applyItemOverride).toHaveBeenCalledWith(123));
        // After apply, getNfe should be called again to refresh
        await waitFor(() => expect(mockedGetNfe).toHaveBeenCalledTimes(2));
        expect(showSuccessMock).toHaveBeenCalledWith('Override aplicado no estoque');
    });
    it('creates and applies override when no server divergence exists (reflect from stock mismatch)', async () => {
        const mockNfe = {
            id: 5,
            numero: '5',
            serie: '1',
            emitente_nome: 'E',
            estoque_confirmado: true,
            itens: [
                { id: 50, numero_item: 1, descricao: 'Prod Y', quantidade_comercial: '12', valor_unitario_comercial: '3.00', effective_quantidade: '12', effective_valor_unitario: '3.00', codigo_produto: 'CODE-Y' }
            ]
        };
        mockedGetNfe.mockResolvedValue({ data: mockNfe });
        fiscalSvc.getNfeDivergencias.mockResolvedValue({ data: [] });
        // Mock product search to return a product with differing stock quantity
        jest.spyOn(produtosService, 'buscarSimples').mockResolvedValue([{ id: 99, codigo: 'CODE-Y', quantidade_estoque: 5 }]);
        mockedCreate.mockResolvedValue({ data: {} });
        render(_jsxs(_Fragment, { children: [_jsx(NfeEditModal, { open: true, nfeId: 5, onClose: () => { }, onSaved: () => { } }), _jsx(Toaster, {})] }));
        await waitFor(() => expect(mockedGetNfe).toHaveBeenCalledWith(5));
        await waitFor(() => expect(screen.getByText('Prod Y')).toBeInTheDocument());
        // Refletir button should appear because stock mismatch detected
        const refletirBtn = await screen.findByText('Refletir no Estoque');
        expect(refletirBtn).toBeInTheDocument();
        fireEvent.click(refletirBtn);
        // Should create an override with aplicado=true to apply synchronously
        await waitFor(() => expect(mockedCreate).toHaveBeenCalled());
        const calls = mockedCreate.mock.calls;
        expect(calls.some(c => c[0].item === 50 && c[0].aplicado === true)).toBeTruthy();
        expect(showSuccessMock).toHaveBeenCalledWith('Override criado e aplicado no estoque');
    });
    it('renders items and saves overrides (non-confirmed NFe)', async () => {
        const mockNfe = {
            id: 1,
            numero: '1',
            serie: '1',
            emitente_nome: 'E',
            estoque_confirmado: false,
            itens: [
                { id: 10, numero_item: 1, descricao: 'Prod A', quantidade_comercial: '10', valor_unitario_comercial: '9.00', effective_quantidade: '10', effective_valor_unitario: '9.00' },
                { id: 11, numero_item: 2, descricao: 'Prod B', quantidade_comercial: '5', valor_unitario_comercial: '4.00', effective_quantidade: '5', effective_valor_unitario: '4.00' }
            ]
        };
        // Ensure getNfe returns initial state, then after save return updated NFe showing changes
        const updated = JSON.parse(JSON.stringify(mockNfe));
        updated.itens[0].effective_quantidade = '7';
        updated.itens[1].effective_valor_unitario = '4.50';
        mockedGetNfe.mockResolvedValueOnce({ data: mockNfe });
        mockedGetNfe.mockResolvedValueOnce({ data: updated });
        mockedCreate.mockResolvedValue({ data: {} });
        const onSaved = jest.fn();
        render(_jsxs(_Fragment, { children: [_jsx(NfeEditModal, { open: true, nfeId: 1, onClose: () => { }, onSaved: onSaved }), _jsx(Toaster, {})] }));
        await waitFor(() => expect(mockedGetNfe).toHaveBeenCalledWith(1));
        // Wait for rows to render (loading -> content transition)
        await waitFor(() => expect(screen.getByText('Prod A')).toBeInTheDocument());
        await waitFor(() => expect(screen.getByText('Prod B')).toBeInTheDocument());
        // Change quantity of item 10 and unit value of item 11
        const qtyInputs = screen.getAllByDisplayValue('10');
        expect(qtyInputs.length).toBeGreaterThan(0);
        fireEvent.change(qtyInputs[0], { target: { value: '7' } });
        const valInput = screen.getByDisplayValue('4.00');
        fireEvent.change(valInput, { target: { value: '4.50' } });
        // Click save
        const saveBtn = screen.getByText('Salvar');
        fireEvent.click(saveBtn);
        await waitFor(() => expect(mockedCreate).toHaveBeenCalled());
        // After saving, we should have refreshed the NFe and see updated effective values
        await waitFor(() => expect(mockedGetNfe).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(screen.getByText('7')).toBeInTheDocument());
        await waitFor(() => expect(screen.getByText('4.50')).toBeInTheDocument());
        // Verify that createItemOverride was called with normalized 2-decimal valor_unitario
        const calls = mockedCreate.mock.calls;
        expect(calls.some(c => c[0].item === 10 && c[0].quantidade === '7')).toBeTruthy();
        expect(calls.some(c => c[0].item === 11 && c[0].valor_unitario === '4.50')).toBeTruthy();
        expect(onSaved).toHaveBeenCalled();
    });
    it('does NOT create override when only formatting differs (99.50 vs 99.5)', async () => {
        const mockNfe = {
            id: 8,
            numero: '8',
            serie: '1',
            emitente_nome: 'E',
            estoque_confirmado: false,
            itens: [
                { id: 80, numero_item: 1, descricao: 'Prod Z', quantidade_comercial: '2', valor_unitario_comercial: '99.50', effective_quantidade: '2', effective_valor_unitario: '99.50', codigo_produto: 'CODE-Z' }
            ]
        };
        // Mock getNfe to return an item with effective_valor_unitario '99.50'
        mockedGetNfe.mockResolvedValueOnce({ data: mockNfe });
        mockedCreate.mockResolvedValue({ data: {} });
        render(_jsxs(_Fragment, { children: [_jsx(NfeEditModal, { open: true, nfeId: 8, onClose: () => { }, onSaved: () => { } }), _jsx(Toaster, {})] }));
        await waitFor(() => expect(mockedGetNfe).toHaveBeenCalledWith(8));
        await waitFor(() => expect(screen.getByText('Prod Z')).toBeInTheDocument());
        // User types '99.5' (formatting difference only)
        const valInput = screen.getByDisplayValue('99.50');
        fireEvent.change(valInput, { target: { value: '99.5' } });
        // Click save (non-confirmed NFe -> direct save)
        const saveBtn = screen.getByText('Salvar');
        fireEvent.click(saveBtn);
        // No override should be created (formatting-only change)
        await waitFor(() => expect(mockedCreate).not.toHaveBeenCalled());
        expect(showSuccessMock).toHaveBeenCalledWith('Nenhuma alteração detectada');
    });
    it('disables Refletir no Estoque when local unsaved edits exist or when NFe equals stock', async () => {
        const mockNfe = {
            id: 9,
            numero: '9',
            serie: '1',
            emitente_nome: 'E',
            estoque_confirmado: true,
            itens: [
                { id: 90, numero_item: 1, descricao: 'Prod W', quantidade_comercial: '2', valor_unitario_comercial: '50.00', effective_quantidade: '2', effective_valor_unitario: '50.00', codigo_produto: 'CODE-W' }
            ]
        };
        mockedGetNfe.mockResolvedValueOnce({ data: mockNfe });
        fiscalSvc.getNfeDivergencias.mockResolvedValue({ data: [] });
        // Mock product search to return matching stock (no divergence)
        jest.spyOn(produtosService, 'buscarSimples').mockResolvedValueOnce([{ id: 100, codigo: 'CODE-W', quantidade_estoque: 2, custo_medio: 50.00 }]);
        render(_jsxs(_Fragment, { children: [_jsx(NfeEditModal, { open: true, nfeId: 9, onClose: () => { }, onSaved: () => { } }), _jsx(Toaster, {})] }));
        await waitFor(() => expect(mockedGetNfe).toHaveBeenCalledWith(9));
        await waitFor(() => expect(screen.getByText('Prod W')).toBeInTheDocument());
        // The Refletir button should be present but disabled because NFe equals estoque
        const refletirBtn = await screen.findByText('Refletir no Estoque');
        expect(refletirBtn).toBeInTheDocument();
        expect(refletirBtn).toBeDisabled();
        // Now type an unsaved edit (change local input) - button must remain disabled
        const qtyInput = screen.getByDisplayValue('2');
        fireEvent.change(qtyInput, { target: { value: '3' } });
        expect(refletirBtn).toBeDisabled();
    });
    it('shows confirmation dialog when NFe is confirmed and applies only after confirm', async () => {
        const mockNfe = {
            id: 2,
            numero: '2',
            serie: '1',
            emitente_nome: 'E',
            estoque_confirmado: true,
            itens: [
                { id: 20, numero_item: 1, descricao: 'Prod C', quantidade_comercial: '5', valor_unitario_comercial: '2.00', effective_quantidade: '5', effective_valor_unitario: '2.00' }
            ]
        };
        mockedGetNfe.mockResolvedValue({ data: mockNfe });
        mockedCreate.mockResolvedValue({ data: {} });
        const onSaved = jest.fn();
        render(_jsxs(_Fragment, { children: [_jsx(NfeEditModal, { open: true, nfeId: 2, onClose: () => { }, onSaved: onSaved }), _jsx(Toaster, {})] }));
        await waitFor(() => expect(mockedGetNfe).toHaveBeenCalledWith(2));
        await waitFor(() => expect(screen.getByText('Prod C')).toBeInTheDocument());
        // Change the quantity
        const qtyInput = screen.getByDisplayValue('5');
        fireEvent.change(qtyInput, { target: { value: '3' } });
        const saveBtn = screen.getByText('Salvar');
        fireEvent.click(saveBtn);
        // Expect confirmation dialog with new simple text
        await waitFor(() => expect(screen.getByText(/As alterações serão salvas\./i)).toBeInTheDocument());
        // Confirm
        const confirmBtn = screen.getByText('Confirmar');
        fireEvent.click(confirmBtn);
        await waitFor(() => expect(mockedCreate).toHaveBeenCalled());
        // Ensure created overrides are not applied to stock (aplicado should be false)
        const calls = mockedCreate.mock.calls;
        expect(calls.every(c => c[0].aplicado === false)).toBeTruthy();
        expect(onSaved).toHaveBeenCalled();
    });
    it('handles 403 permission error gracefully', async () => {
        const mockNfe = {
            id: 3,
            numero: '3',
            serie: '1',
            emitente_nome: 'E',
            estoque_confirmado: true,
            itens: [
                { id: 30, numero_item: 1, descricao: 'Prod D', quantidade_comercial: '2', valor_unitario_comercial: '2.00', effective_quantidade: '2', effective_valor_unitario: '2.00' }
            ]
        };
        mockedGetNfe.mockResolvedValue({ data: mockNfe });
        // Simulate 403 response
        const err = { response: { status: 403, data: { detail: 'Você não tem permissão para aplicar overrides em NF-e confirmadas.' } } };
        mockedCreate.mockRejectedValue(err);
        const onSaved = jest.fn();
        render(_jsxs(_Fragment, { children: [_jsx(NfeEditModal, { open: true, nfeId: 3, onClose: () => { }, onSaved: onSaved }), _jsx(Toaster, {})] }));
        await waitFor(() => expect(mockedGetNfe).toHaveBeenCalledWith(3));
        await waitFor(() => expect(screen.getByText('Prod D')).toBeInTheDocument());
        // Change quantity
        const qtyInput = screen.getByDisplayValue('2');
        fireEvent.change(qtyInput, { target: { value: '1' } });
        const saveBtn = screen.getByText('Salvar');
        fireEvent.click(saveBtn);
        // Confirm
        await waitFor(() => expect(screen.getByText(/As alterações serão salvas\./i)).toBeInTheDocument());
        fireEvent.click(screen.getByText('Confirmar'));
        // Expect toast to have been called with error from create
        await waitFor(() => expect(showErrorMock).toHaveBeenCalledWith(err.response.data.detail || expect.any(String)));
        expect(onSaved).not.toHaveBeenCalled();
    });
    it('calls onRefresh after saving overrides', async () => {
        const mockNfe = {
            id: 2,
            numero: '2',
            serie: '1',
            emitente_nome: 'E',
            estoque_confirmado: false,
            itens: [
                { id: 20, numero_item: 1, descricao: 'Prod C', quantidade_comercial: '10', valor_unitario_comercial: '9.00', effective_quantidade: '10', effective_valor_unitario: '9.00' }
            ]
        };
        const updated = JSON.parse(JSON.stringify(mockNfe));
        updated.itens[0].effective_quantidade = '7';
        mockedGetNfe.mockResolvedValueOnce({ data: mockNfe });
        mockedGetNfe.mockResolvedValueOnce({ data: updated });
        mockedCreate.mockResolvedValue({ data: {} });
        const onRefresh = jest.fn();
        render(_jsxs(_Fragment, { children: [_jsx(NfeEditModal, { open: true, nfeId: 2, onClose: () => { }, onSaved: () => { }, onRefresh: onRefresh }), _jsx(Toaster, {})] }));
        await waitFor(() => expect(mockedGetNfe).toHaveBeenCalledWith(2));
        await waitFor(() => expect(screen.getByText('Prod C')).toBeInTheDocument());
        // Change quantity
        const qtyInputs = screen.getAllByDisplayValue('10');
        fireEvent.change(qtyInputs[0], { target: { value: '7' } });
        // Click save
        const saveBtn = screen.getByText('Salvar');
        fireEvent.click(saveBtn);
        await waitFor(() => expect(mockedCreate).toHaveBeenCalled());
        // After saving, onRefresh should be called
        await waitFor(() => expect(onRefresh).toHaveBeenCalled());
    });
});
