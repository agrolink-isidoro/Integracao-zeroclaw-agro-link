import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Fiscal from '../Fiscal';
// Mock the fiscal service to avoid real HTTP calls
jest.mock('../../services/fiscal', () => ({
    listNfes: jest.fn(() => Promise.resolve({ data: [] })),
}));
describe('Fiscal page', () => {
    test('renderiza sem estourar e mostra Notas Fiscais ao selecionar aba', async () => {
        render(_jsx(Fiscal, {}));
        // garante que a página principal é renderizada (procurando o heading)
        expect(screen.getByRole('heading', { name: /Fiscal/i })).toBeInTheDocument();
        // clica na aba Notas Fiscais
        fireEvent.click(screen.getByRole('button', { name: /Notas Fiscais/i }));
        // espera o botão 'Importar XML' ficar disponível e clica para abrir o formulário
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Importar XML|Fechar/ })).toBeInTheDocument();
        });
        const btn = screen.getByRole('button', { name: /Importar XML|Fechar/ });
        fireEvent.click(btn);
        await waitFor(() => {
            expect(screen.getByText(/Upload de NF-e/i)).toBeInTheDocument();
        });
    });
});
