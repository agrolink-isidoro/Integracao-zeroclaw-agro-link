import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OrdemServicoForm from '../OrdemServicoFormMaquinas';
import api from '../../../services/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
jest.mock('../../../services/api');
const mockedApi = api;
describe('OrdemServicoFormMaquinas', () => {
    const queryClient = new QueryClient();
    beforeEach(() => {
        mockedApi.get.mockImplementation((url) => {
            if (url === '/maquinas/equipamentos/') {
                return Promise.resolve({ data: [{ id: 1, nome: 'Trator A' }] });
            }
            if (url.startsWith('/estoque/produtos/')) {
                return Promise.resolve({ data: { results: [{ id: 5, codigo: 'P001', nome: 'Parafuso', unidade: 'un', custo_unitario: 1.5 }] } });
            }
            if (url === '/core/users/') {
                return Promise.resolve({ data: [{ id: 2, username: 'tech' }] });
            }
            if (url === '/comercial/prestadores-servico/') {
                return Promise.resolve({ data: [{ id: 9, nome: 'Prestador X' }] });
            }
            if (url === '/comercial/fornecedores/') {
                return Promise.resolve({ data: [{ id: 10, nome: 'Fornecedor Y' }] });
            }
            return Promise.resolve({ data: [] });
        });
        mockedApi.post.mockResolvedValue({ data: { id: 10, numero_os: 'OS10' } });
        mockedApi.put.mockResolvedValue({ data: { id: 10 } });
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    it('submits create payload and calls API', async () => {
        const onClose = jest.fn();
        const onSuccess = jest.fn();
        const { container } = render(_jsx(QueryClientProvider, { client: queryClient, children: _jsx(OrdemServicoForm, { onClose: onClose, onSuccess: onSuccess }) }));
        // Wait for equipamentos to load
        await waitFor(() => expect(mockedApi.get).toHaveBeenCalledWith('/maquinas/equipamentos/'));
        // Select equipamento
        const equipamentoSelect = screen.getByLabelText(/Equipamento/i);
        // try to set select value; some environments require directly assigning value before firing change
        equipamentoSelect.value = '1';
        fireEvent.change(equipamentoSelect, { target: { value: '1' } });
        // try clicking the option as well
        const equipamentoOption = screen.getByText('Trator A');
        equipamentoOption.selected = true;
        fireEvent.change(equipamentoSelect);
        // Fill description
        const descricao = screen.getByLabelText(/Descrição do Problema/i);
        fireEvent.change(descricao, { target: { value: 'Quebra do eixo' } });
        // sanity check state reflected in DOM (allow async update)
        await waitFor(() => expect(equipamentoSelect.value).toBe('1'));
        expect(descricao.value).toBe('Quebra do eixo');
        // Adicionar um insumo
        const search = container.querySelector('input[type="search"]');
        // ensure preview is clean when search is empty
        expect(screen.queryByText(/Parafuso/)).toBeNull();
        // type to search
        fireEvent.change(search, { target: { value: 'Parafuso' } });
        // wait for products to resolve
        await waitFor(() => expect(mockedApi.get).toHaveBeenCalledWith(expect.stringContaining('/estoque/produtos/')));
        // Suggestions dropdown should appear (type + results)
        const suggestion = await screen.findByTestId('produto-suggestion-5');
        expect(suggestion).toBeTruthy();
        // Add button should be disabled until a quantidade is provided
        const addBtn = screen.getByText(/Adicionar/i);
        expect(addBtn.disabled).toBe(true);
        // --- allow adding WITHOUT explicit suggestion selection ---
        // type quantidade while suggestion is visible (no click on suggestion)
        const quantidadeInput = container.querySelector('input[name="quantidade_insumo"]');
        fireEvent.change(quantidadeInput, { target: { value: '2' } });
        // add becomes enabled because quantity is present (we use first search result implicitly)
        expect(addBtn.disabled).toBe(false);
        // click Add to add insumo (without selecting suggestion explicitly)
        fireEvent.click(addBtn);
        // Now select suggestion explicitly and add another quantity
        fireEvent.click(suggestion);
        // Now select suggestion explicitly and add another quantity
        fireEvent.click(suggestion);
        const labels = screen.getAllByText(/Parafuso/);
        expect(labels.length).toBeGreaterThan(0);
        // set quantidade -> Add becomes enabled
        fireEvent.change(quantidadeInput, { target: { value: '3' } });
        expect(addBtn.disabled).toBe(false);
        fireEvent.click(addBtn);
        // clear search and ensure preview becomes clean again
        fireEvent.change(search, { target: { value: '' } });
        const preview = screen.getByTestId('produto-preview');
        expect(preview.textContent?.trim()).toBe('');
        // Submit (OS já contém o insumo adicionado acima)
        const form = container.querySelector('form');
        fireEvent.submit(form);
        await waitFor(() => expect(mockedApi.post).toHaveBeenCalled());
        // Verify payload fields
        const payload = mockedApi.post.mock.calls[0][1];
        expect(payload.equipamento).toBe(1);
        expect(payload.descricao_problema).toBe('Quebra do eixo');
        expect(Array.isArray(payload.insumos)).toBe(true);
        expect(payload.insumos[0].produto_id).toBe(5);
        // first added via implicit-first-result (quantidade 2), second added after explicit select (quantidade 3)
        expect(Number(payload.insumos[0].quantidade)).toBe(2);
        expect(Number(payload.insumos[1].quantidade)).toBe(3);
        expect(onSuccess).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });
    it('converts numeric inputs to numbers before sending', async () => {
        const onClose = jest.fn();
        const onSuccess = jest.fn();
        const { container } = render(_jsx(QueryClientProvider, { client: queryClient, children: _jsx(OrdemServicoForm, { onClose: onClose, onSuccess: onSuccess }) }));
        await waitFor(() => expect(mockedApi.get).toHaveBeenCalled());
        fireEvent.change(screen.getByLabelText(/Equipamento/i), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText(/Descrição do Problema/i), { target: { value: 'Teste custo' } });
        fireEvent.change(screen.getByLabelText(/Custo Mão de Obra/i), { target: { value: '10' } });
        const form = container.querySelector('form');
        fireEvent.submit(form);
        await waitFor(() => expect(mockedApi.post).toHaveBeenCalled());
        const payload = mockedApi.post.mock.calls[0][1];
        expect(typeof payload.custo_mao_obra).toBe('number');
        expect(payload.custo_mao_obra).toBe(10);
    });
    it('does not add insumo when no product matches the search', async () => {
        // override produtos endpoint to return empty results
        mockedApi.get.mockImplementation((url) => {
            if (url.startsWith('/estoque/produtos/')) {
                return Promise.resolve({ data: { results: [] } });
            }
            return Promise.resolve({ data: [] });
        });
        const onClose = jest.fn();
        const onSuccess = jest.fn();
        const { container } = render(_jsx(QueryClientProvider, { client: queryClient, children: _jsx(OrdemServicoForm, { onClose: onClose, onSuccess: onSuccess }) }));
        await waitFor(() => expect(mockedApi.get).toHaveBeenCalled());
        const search = container.querySelector('input[type="search"]');
        const quantidadeInput = container.querySelector('input[name="quantidade_insumo"]');
        const addBtn = screen.getByText(/Adicionar/i);
        // type search that returns no products
        fireEvent.change(search, { target: { value: 'XXXXX' } });
        fireEvent.change(quantidadeInput, { target: { value: '2' } });
        // click Add -> should NOT add because there is no resolved product
        fireEvent.click(addBtn);
        const emptyMessage = await screen.findByText(/Nenhuma peça adicionada/i);
        expect(emptyMessage).toBeTruthy();
    });
    it('shows server validation error on API 400', async () => {
        const onClose = jest.fn();
        const onSuccess = jest.fn();
        // mock POST to reject with a DRF-style validation error
        mockedApi.post.mockRejectedValueOnce({ response: { data: { insumos: 'produto não encontrado' } }, message: 'Bad Request' });
        window.alert = jest.fn();
        const { container } = render(_jsx(QueryClientProvider, { client: queryClient, children: _jsx(OrdemServicoForm, { onClose: onClose, onSuccess: onSuccess }) }));
        await waitFor(() => expect(mockedApi.get).toHaveBeenCalled());
        fireEvent.change(screen.getByLabelText(/Equipamento/i), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText(/Descrição do Problema/i), { target: { value: 'Teste erro' } });
        const form = container.querySelector('form');
        fireEvent.submit(form);
        await waitFor(() => expect(mockedApi.post).toHaveBeenCalled());
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('insumos'));
    });
    it('sends existing ordemServico.nfes in the update payload', async () => {
        const onClose = jest.fn();
        const onSuccess = jest.fn();
        const ordem = { id: 99, equipamento: 1, descricao_problema: 'Teste', nfes: [123], insumos: [] };
        const { container } = render(_jsx(QueryClientProvider, { client: queryClient, children: _jsx(OrdemServicoForm, { ordemServico: ordem, onClose: onClose, onSuccess: onSuccess }) }));
        // Submit (edit mode should call PUT)
        const form = container.querySelector('form');
        fireEvent.submit(form);
        await waitFor(() => expect(mockedApi.put).toHaveBeenCalled());
        const payload = mockedApi.put.mock.calls[mockedApi.put.mock.calls.length - 1][1];
        expect(Array.isArray(payload.nfes)).toBeTruthy();
        expect(payload.nfes).toContain(123);
    });
});
