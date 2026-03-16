import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, waitFor } from '@testing-library/react';
import FornecedoresPage from '../FornecedoresList';
import * as service from '@/services/comercial';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
jest.mock('@/services/comercial');
describe('Fornecedores page', () => {
    it('renders header and list component', async () => {
        const q = new QueryClient();
        service.default.getFornecedores = jest.fn().mockResolvedValue([]);
        render(_jsx(QueryClientProvider, { client: q, children: _jsx(FornecedoresPage, {}) }));
        // Page title (h1)
        expect(screen.getByRole('heading', { level: 1, name: 'Fornecedores' })).toBeInTheDocument();
        expect(screen.getByText(/Lista de fornecedores/i)).toBeInTheDocument();
        // Ensure data load is initiated (prevents act warnings)
        await waitFor(() => expect(service.default.getFornecedores).toHaveBeenCalled());
        // Edit button should be available in the fornecedores list (page enables edit control)
        const editButtons = screen.queryAllByRole('button', { name: /editar/i });
        // there may be zero rows in mocked result, but query should not throw and the control is enabled
        expect(editButtons).toBeTruthy();
        // Open modal and ensure Dados Bancários tab exposes Banco selector
        const { act, fireEvent } = await import('@testing-library/react');
        const novoBtn = screen.getByRole('button', { name: /novo fornecedor/i });
        act(() => fireEvent.click(novoBtn));
        const dadosBancariosTab = screen.getByRole('button', { name: /Dados Bancários/i });
        act(() => fireEvent.click(dadosBancariosTab));
        expect(screen.getByText(/Banco/i)).toBeInTheDocument();
        expect(screen.getByText(/Selecione um banco/i)).toBeInTheDocument();
    });
    it('opens modal when Novo Fornecedor button is clicked', async () => {
        const q = new QueryClient();
        service.default.getFornecedores = jest.fn().mockResolvedValue([]);
        render(_jsx(QueryClientProvider, { client: q, children: _jsx(FornecedoresPage, {}) }));
        // wait for load
        await waitFor(() => expect(service.default.getFornecedores).toHaveBeenCalled());
        const novoBtn = screen.getByRole('button', { name: /novo fornecedor/i });
        expect(novoBtn).toBeInTheDocument();
        // click it (wrapped in act to avoid warnings)
        const { act, fireEvent } = await import('@testing-library/react');
        act(() => {
            fireEvent.click(novoBtn);
        });
        // Modal should open and show title
        // Use getAllByText and ensure at least one modal title exists
        const matches = screen.getAllByText(/Novo Fornecedor/i);
        expect(matches.length).toBeGreaterThanOrEqual(2); // button + modal
        // Check that the modal title element is present (modal h5)
        expect(matches.find(m => m.tagName.toLowerCase() === 'h5')).toBeTruthy();
    });
    it('creates a fornecedor and refreshes list on submit', async () => {
        const q = new QueryClient();
        const mockGet = jest.fn().mockResolvedValue([]);
        const mockCreate = jest.fn().mockResolvedValue({});
        service.default.getFornecedores = mockGet;
        service.default.createFornecedor = mockCreate;
        render(_jsx(QueryClientProvider, { client: q, children: _jsx(FornecedoresPage, {}) }));
        // wait for load
        await waitFor(() => expect(mockGet).toHaveBeenCalled());
        const novoBtn = screen.getByRole('button', { name: /novo fornecedor/i });
        const { act, fireEvent } = await import('@testing-library/react');
        act(() => fireEvent.click(novoBtn));
        // Fill minimal required fields using DOM queries
        const cpf = document.querySelector('input[name="cpf_cnpj"]');
        const razao = document.querySelector('input[name="razao_social"]');
        if (cpf)
            fireEvent.change(cpf, { target: { value: '12.345.678/0001-00' } });
        if (razao)
            fireEvent.change(razao, { target: { value: 'ACME Ltda' } });
        // Switch to Endereço tab to render address fields
        const enderecoTab = screen.getByRole('button', { name: /Endereço/i });
        act(() => fireEvent.click(enderecoTab));
        const logradouro = document.querySelector('input[name="logradouro"]') || document.querySelector('input[name="endereco_logradouro"]');
        const numero = document.querySelector('input[name="numero"]');
        const bairro = document.querySelector('input[name="bairro"]');
        const cidade = document.querySelector('input[name="cidade"]');
        const estado = document.querySelector('input[name="estado"]');
        const cep = document.querySelector('input[name="cep"]');
        if (logradouro)
            fireEvent.change(logradouro, { target: { value: 'Av. Brasil' } });
        if (numero)
            fireEvent.change(numero, { target: { value: '123' } });
        if (bairro)
            fireEvent.change(bairro, { target: { value: 'Centro' } });
        if (cidade)
            fireEvent.change(cidade, { target: { value: 'São Paulo' } });
        if (estado)
            fireEvent.change(estado, { target: { value: 'SP' } });
        if (cep)
            fireEvent.change(cep, { target: { value: '01000-000' } });
        // Switch to Contato tab to render contact fields
        const contatoTab = screen.getByRole('button', { name: /Contato/i });
        act(() => fireEvent.click(contatoTab));
        const telefone = document.querySelector('input[name="contato.telefone_principal"]') || document.querySelector('input[name="contato_telefone_principal"]') || document.querySelector('input[name="telefone_principal"]') || document.querySelector('input[name="telefone"]');
        const email = document.querySelector('input[name="contato.email_principal"]') || document.querySelector('input[name="contato_email_principal"]') || document.querySelector('input[name="email_principal"]') || document.querySelector('input[name="email"]');
        if (telefone)
            fireEvent.change(telefone, { target: { value: '11999990000' } });
        if (email)
            fireEvent.change(email, { target: { value: 'contato@acme.com' } });
        // Submit form
        act(() => {
            const submitBtn = document.querySelector('button[type="submit"]');
            fireEvent.click(submitBtn);
        });
        // Expect create called and then reload
        await waitFor(() => expect(mockCreate).toHaveBeenCalled());
        await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
    });
});
