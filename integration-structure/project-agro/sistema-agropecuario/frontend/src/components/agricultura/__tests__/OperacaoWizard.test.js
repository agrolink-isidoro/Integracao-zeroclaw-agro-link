import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import OperacaoWizard from '../OperacaoWizard';
import api from '@/services/api';
jest.mock('@/services/api');
const mockedApi = api;
describe('OperacaoWizard', () => {
    let qc;
    beforeEach(() => {
        // Create a fresh QueryClient for each test with no retries to avoid hanging
        qc = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                    gcTime: 0,
                },
                mutations: {
                    retry: false,
                },
            },
        });
        jest.resetAllMocks();
    });
    afterEach(() => {
        qc.clear();
    });
    it('lists equipamentos and allows product search selection', async () => {
        mockedApi.get.mockImplementation((url) => {
            if (url.includes('/talhoes/')) {
                return Promise.resolve({ data: [{ id: 1, name: 'T1', area_hectares: 10 }] });
            }
            if (url.includes('/agricultura/plantios/')) {
                return Promise.resolve({ data: [] });
            }
            if (url.includes('/maquinas/equipamentos/')) {
                return Promise.resolve({ data: [{ id: 100, nome: 'Trator A', tipo_mobilidade: 'autopropelido' }, { id: 101, nome: 'Pulverizador 600L', tipo_implemento: 'pulverizador', largura_trabalho: 6 }] });
            }
            if (url.includes('/estoque/produtos/')) {
                return Promise.resolve({ data: [{ id: 200, nome: 'Herbicida X', codigo: 'HX-1', dosagem_padrao: 2.5, unidade_dosagem: 'kg/ha' }] });
            }
            if (url.includes('/agricultura/operacoes/tipos-por-categoria/')) {
                return Promise.resolve({ data: { tipos: [{ value: 'plantio', label: 'Plantio' }] } });
            }
            return Promise.resolve({ data: [] });
        });
        // Render
        const renderResult = render(_jsx(QueryClientProvider, { client: qc, children: _jsx(MemoryRouter, { children: _jsx(OperacaoWizard, {}) }) }));
        // Step 1: select category and tipo
        const selects = await waitFor(() => screen.findAllByRole('combobox'), { timeout: 3000 });
        const categorySelect = selects[0];
        fireEvent.change(categorySelect, { target: { value: 'plantio' } });
        // Wait for tipo to populate
        await waitFor(() => {
            const selectsAfter = screen.queryAllByRole('combobox');
            expect(selectsAfter.length).toBeGreaterThanOrEqual(2);
        }, { timeout: 3000 });
        const selectsAfter = screen.getAllByRole('combobox');
        const tipoSelect = selectsAfter[1];
        fireEvent.change(tipoSelect, { target: { value: 'plantio' } });
        // Next to step 2
        const nextBtn = screen.getByText(/Próximo/);
        fireEvent.click(nextBtn);
        // Step 2: set data_inicio
        const { container } = renderResult;
        const dataInicio = container.querySelector('input[type="datetime-local"]');
        if (dataInicio) {
            fireEvent.change(dataInicio, { target: { value: '2025-12-31T08:00' } });
        }
        // Next to step 3
        fireEvent.click(nextBtn);
        // Step 3: select talhao checkbox
        await waitFor(async () => {
            const checkboxes = screen.queryAllByRole('checkbox');
            expect(checkboxes.length).toBeGreaterThan(0);
        }, { timeout: 3000 });
        const talhaoCheckbox = screen.getAllByRole('checkbox')[0];
        fireEvent.click(talhaoCheckbox);
        // Next to step 4
        fireEvent.click(nextBtn);
        // Step 4: equipamentos should be available in selects
        await waitFor(() => {
            const comboboxes = screen.queryAllByRole('combobox');
            expect(comboboxes.length).toBeGreaterThanOrEqual(2);
        }, { timeout: 3000 });
        // Add a product row
        const addBtn = screen.getByText('+ Adicionar Produto');
        fireEvent.click(addBtn);
        // Type in product search
        const prodInput = await waitFor(() => screen.findByPlaceholderText(/Buscar produto/i), { timeout: 3000 });
        fireEvent.change(prodInput, { target: { value: 'Herb' } });
        // Wait for search results
        const resultItem = await waitFor(() => screen.findByText(/Herbicida X/), { timeout: 3000 });
        expect(resultItem).toBeInTheDocument();
        // Click the result
        fireEvent.click(resultItem);
        // The product name should be in the input now
        await waitFor(() => {
            expect(prodInput.value).toMatch(/Herbicida X/);
        }, { timeout: 2000 });
        // The total usage should be calculated: dosagem 2.5 * area 10 = 25.000 kg
        const totalInput = await waitFor(() => screen.findByLabelText(/Quantidade total/i), { timeout: 3000 });
        expect(totalInput.value).toMatch(/25(\.0+)?/);
        // Verify unit and area helper text (e.g., KG/HA and 10 ha)
        expect(screen.getByText(/KG\/HA/i)).toBeInTheDocument();
        expect(screen.getByText(/10(\.0+)?\s*ha/i)).toBeInTheDocument();
        // Changing the total should update dosagem (two-way binding)
        fireEvent.change(totalInput, { target: { value: '40' } });
        const dosInput = screen.getByLabelText(/Dosagem/i);
        await waitFor(() => expect(dosInput.value).toMatch(/4(\.0+)?/));
    }, 20000); // Set 20s timeout for this complex integration test
});
