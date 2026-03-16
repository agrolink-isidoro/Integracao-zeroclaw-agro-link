import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import FornecedoresCharts from '@/components/FornecedoresCharts';
describe('FornecedoresCharts', () => {
    it('renders bar and pie charts when data is provided', () => {
        const top = [
            { id: 1, nome: 'F1', total_compras: '1000' },
            { id: 2, nome: 'F2', total_compras: '2000' },
        ];
        render(_jsx(FornecedoresCharts, { topFornecedores: top, documentosVencendo: 2, documentosVencidos: 1 }));
        // ChartJS renders canvas elements; ensure at least one canvas exists
        const canvases = screen.getAllByRole('img', { hidden: true });
        expect(canvases.length).toBeGreaterThanOrEqual(1);
        // Accessible caption/figcaption and SR table present
        expect(screen.getByText(/Gráficos de fornecedores/i)).toBeInTheDocument();
        const srTable = screen.getByRole('table', { name: /Dados do gráfico de fornecedores/i });
        expect(srTable).toBeInTheDocument();
    });
    it('shows no-data message when no top fornecedores', () => {
        render(_jsx(FornecedoresCharts, { topFornecedores: [], documentosVencendo: 0, documentosVencidos: 0 }));
        expect(screen.getByText(/Nenhum dado disponível para os fornecedores/i)).toBeInTheDocument();
    });
});
