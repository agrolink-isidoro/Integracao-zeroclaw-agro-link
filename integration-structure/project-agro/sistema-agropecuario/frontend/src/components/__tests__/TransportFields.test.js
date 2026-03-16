import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent } from '@testing-library/react';
import TransportFields from '../TransportFields';
describe('TransportFields', () => {
    it('allows setting custo_transporte to zero', () => {
        const handleChange = jest.fn();
        render(_jsx(TransportFields, { value: {}, onChange: handleChange }));
        const input = screen.getByLabelText('Custo Transporte');
        fireEvent.change(input, { target: { value: '0' } });
        expect(handleChange).toHaveBeenCalled();
        // find last call with custo_transporte 0
        const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
        expect(lastCall.custo_transporte).toBe(0);
    });
});
