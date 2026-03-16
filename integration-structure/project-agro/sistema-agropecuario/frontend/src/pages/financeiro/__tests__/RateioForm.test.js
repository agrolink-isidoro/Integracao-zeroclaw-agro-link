import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RateioForm from '../RateioForm';
import { MemoryRouter } from 'react-router-dom';
// Mock hooks
jest.mock('../../../hooks/useApi', () => ({
    useApiQuery: jest.fn(),
    useApiCreate: jest.fn()
}));
import { useApiQuery, useApiCreate } from '../../../hooks/useApi';
describe('RateioForm', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });
    it('validates area driver requires talhoes', async () => {
        useApiQuery.mockReturnValue({ data: [], isLoading: false });
        const mutateAsync = jest.fn().mockResolvedValue({ id: 1 });
        useApiCreate.mockReturnValue({ mutateAsync });
        const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => { });
        const { container } = render(_jsx(MemoryRouter, { children: _jsx(RateioForm, {}) }));
        // set title and required fields
        fireEvent.change(container.querySelector('#titulo'), { target: { value: 'Test R' } });
        fireEvent.change(container.querySelector('#valor'), { target: { value: '120' } });
        fireEvent.change(container.querySelector('#driver'), { target: { value: 'area' } });
        fireEvent.click(screen.getByRole('button', { name: /Criar Rateio/i }));
        await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('requer pelo menos um talhão')));
        expect(mutateAsync).not.toHaveBeenCalled();
        alertSpy.mockRestore();
    });
    it('submits payload when valid', async () => {
        useApiQuery.mockImplementation((...args) => {
            // return sensible data per endpoint
            const key = args[0] && args[0][0];
            if (key === 'centros-custo')
                return { data: [{ id: 5, codigo: 'C1', nome: 'Centro 1' }], isLoading: false };
            if (key === 'plantios')
                return { data: [{ id: 2, cultura_nome: 'Soja' }], isLoading: false };
            return { data: [{ id: 11, name: 'T1', area_hectares: 3 }], isLoading: false };
        });
        const mutateAsync = jest.fn().mockResolvedValue({ id: 99 });
        useApiCreate.mockReturnValue({ mutateAsync });
        const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => { });
        const { container } = render(_jsx(MemoryRouter, { children: _jsx(RateioForm, {}) }));
        // fill fields
        fireEvent.change(container.querySelector('#titulo'), { target: { value: 'API Rateio' } });
        fireEvent.change(container.querySelector('#valor'), { target: { value: '250' } });
        fireEvent.change(container.querySelector('#driver'), { target: { value: 'area' } });
        // select centro
        fireEvent.change(container.querySelector('#centro'), { target: { value: '5' } });
        // select safra
        fireEvent.change(container.querySelector('#safra'), { target: { value: '2' } });
        // Talhoes multi-select: the component renders checkboxes with talhao names
        // find the checkbox and toggle
        await waitFor(() => screen.getByText('T1'));
        fireEvent.click(screen.getByText('T1'));
        // Submit
        fireEvent.click(screen.getByRole('button', { name: /Criar Rateio/i }));
        await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
        const payload = mutateAsync.mock.calls[0][0];
        expect(payload.titulo).toBe('API Rateio');
        expect(payload.valor_total).toBe(250);
        expect(payload.centro_custo).toBe(5);
        expect(payload.safra).toBe(2);
        expect(Array.isArray(payload.talhoes)).toBeTruthy();
        alertSpy.mockRestore();
    });
});
