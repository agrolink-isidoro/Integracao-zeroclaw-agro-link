import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import OperacoesList from '../OperacoesList';
import operacoesService from '../../../services/operacoes';
jest.mock('../../../services/operacoes');
const mockedService = operacoesService;
describe('OperacoesList', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });
    test('exibe botões Concluir e Cancelar para operações ativas', async () => {
        mockedService.listar.mockResolvedValue([
            { id: 1, categoria_display: 'Plantio', tipo_display: 'Semeadura', data_operacao: '2025-12-30', area_total_ha: 10, status: 'planejada', custo_total: 1000, criado_em: new Date().toISOString() },
            { id: 2, categoria_display: 'Colheita', tipo_display: 'Ceifa', data_operacao: '2025-12-15', area_total_ha: 5, status: 'concluida', custo_total: 500, criado_em: new Date().toISOString() },
            { id: 3, categoria_display: 'Tratos', tipo_display: 'Adubação', data_operacao: '2025-12-20', area_total_ha: 12, status: 'em_andamento', custo_total: 750, criado_em: new Date().toISOString() },
        ]);
        render(_jsx(OperacoesList, {}));
        await waitFor(() => expect(mockedService.listar).toHaveBeenCalled());
        // Para operacao 1 e 3, devem existir botões Concluir e Cancelar
        const concluirButtons = await screen.findAllByTitle('Concluir');
        const cancelarButtons = await screen.findAllByTitle('Cancelar');
        expect(concluirButtons.length).toBe(2);
        expect(cancelarButtons.length).toBe(2);
        // Para operacao concluida (id=2) não deve haver botões Concluir/Cancelar
        // Confirm that there are rows and one of them is concluida
        expect(screen.getByText('#2')).toBeInTheDocument();
        // ensure that there is no button Concluir inside the concluida row by checking counts
    });
    test('clicar em Concluir chama o serviço de atualizar e recarrega a lista', async () => {
        mockedService.listar.mockResolvedValue([
            { id: 1, categoria_display: 'Plantio', tipo_display: 'Semeadura', data_operacao: '2025-12-30', area_total_ha: 10, status: 'planejada', custo_total: 1000, criado_em: new Date().toISOString() },
        ]);
        mockedService.atualizar.mockResolvedValue({});
        // mock confirm to accept
        jest.spyOn(window, 'confirm').mockImplementation(() => true);
        render(_jsx(OperacoesList, {}));
        await waitFor(() => expect(mockedService.listar).toHaveBeenCalled());
        const concluirButton = await screen.findByTitle('Concluir');
        fireEvent.click(concluirButton);
        await waitFor(() => expect(mockedService.atualizar).toHaveBeenCalledWith(1, { status: 'concluida' }));
        // After update we expect a reload
        await waitFor(() => expect(mockedService.listar).toHaveBeenCalledTimes(2));
    });
});
