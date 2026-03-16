import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import FiscalDashboard from '../FiscalDashboard';
// Mock fiscal services
jest.mock('../../../services/fiscal', () => ({
    listNfes: jest.fn(),
    listCertificados: jest.fn(),
}));
const { listNfes, listCertificados } = require('../../../services/fiscal');
describe('FiscalDashboard', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });
    test('renders obligations from duplicatas and shows expiring certificates', async () => {
        const dueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
        listNfes.mockResolvedValue({
            data: [
                {
                    id: 1,
                    numero: '100',
                    serie: '1',
                    valor_nota: '1250.00',
                    data_emissao: new Date().toISOString(),
                    itens: [],
                    estoque_confirmado: false,
                    duplicatas: [{ numero: '001', data_vencimento: dueDate, valor: '550.00' }],
                },
            ],
        });
        listCertificados.mockResolvedValue({ data: [{ id: 1, nome: 'cert-test', validade: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() }] });
        render(_jsx(FiscalDashboard, {}));
        // Wait for the obligations table to show the duplicata row
        await waitFor(() => expect(screen.getByText(/Duplicata NF 100\/1/)).toBeInTheDocument());
        // Check that the due date and value are displayed
        expect(screen.getByText(/R\$ 550,00/)).toBeInTheDocument();
        // Certificates expiring (card)
        expect(screen.getByText(/expirando em 30 dias/)).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
    });
});
