import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import ClienteCreate from '@/pages/comercial/ClienteCreate';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
const renderWithClient = (ui) => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(_jsx(MemoryRouter, { children: _jsx(QueryClientProvider, { client: qc, children: ui }) }));
};
describe('ClienteCreate form', () => {
    it('renders inscrição estadual input', () => {
        renderWithClient(_jsx(ClienteCreate, {}));
        expect(screen.getByText(/Inscrição Estadual \(IE\)/i)).toBeInTheDocument();
    });
});
