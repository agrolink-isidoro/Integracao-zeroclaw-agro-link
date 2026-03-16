import { jsx as _jsx } from "react/jsx-runtime";
jest.mock('@/services/api');
import api from '@/services/api';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FuncionariosList from '../FuncionariosList';
const mockedApi = api;
describe('FuncionariosList', () => {
    const qc = new QueryClient();
    beforeEach(() => { jest.resetAllMocks(); window.alert = jest.fn(); });
    it('renders list and deletes item', async () => {
        mockedApi.get.mockResolvedValueOnce({ data: [{ id: 1, nome: 'João', cargo: 'Operador', salario_bruto: 2000, ativo: true }] });
        mockedApi.delete.mockResolvedValueOnce({});
        render(_jsx(QueryClientProvider, { client: qc, children: _jsx(FuncionariosList, {}) }));
        expect(screen.getByText(/Carregando/i)).toBeInTheDocument();
        await waitFor(() => expect(mockedApi.get).toHaveBeenCalledWith('/administrativo/funcionarios/'));
        await waitFor(() => expect(screen.getByText('João')).toBeInTheDocument());
        window.confirm = jest.fn(() => true);
        fireEvent.click(screen.getByText('Remover'));
        await waitFor(() => expect(mockedApi.delete).toHaveBeenCalledWith('/administrativo/funcionarios/1/'));
    });
    it('creates a temporario with daily wage', async () => {
        mockedApi.get.mockResolvedValueOnce({ data: [] });
        mockedApi.post.mockResolvedValueOnce({ data: { id: 5, nome: 'Temp', tipo: 'temporario', diaria_valor: 120.00 } });
        render(_jsx(QueryClientProvider, { client: qc, children: _jsx(FuncionariosList, {}) }));
        await waitFor(() => expect(mockedApi.get).toHaveBeenCalledWith('/administrativo/funcionarios/'));
        // open create modal
        fireEvent.click(screen.getByText('Novo'));
        // fill form
        fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Temp' } });
        fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'temporario' } });
        const diariaInput = screen.getByLabelText('Valor diário (R$)');
        fireEvent.change(diariaInput, { target: { value: '120' } });
        // submit
        fireEvent.click(screen.getByText('Salvar'));
        await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith('/administrativo/funcionarios/', expect.objectContaining({ nome: 'Temp', tipo: 'temporario', diaria_valor: 120 })));
    });
});
