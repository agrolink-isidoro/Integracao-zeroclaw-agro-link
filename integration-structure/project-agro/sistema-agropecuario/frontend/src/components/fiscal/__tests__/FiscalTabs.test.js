import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import Fiscal from '@/pages/Fiscal';
describe('Fiscal page tabs', () => {
    test('renders new tabs and no longer shows Conformidade', () => {
        render(_jsx(Fiscal, {}));
        // New tabs
        expect(screen.getByRole('button', { name: /Baixar NFes/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Impostos Federais/i })).toBeInTheDocument();
        // Removed tab
        const conformidade = screen.queryByRole('button', { name: /Conformidade/i });
        expect(conformidade).toBeNull();
    });
});
