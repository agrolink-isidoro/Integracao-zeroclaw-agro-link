import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import FornecedorForm from '../FornecedorForm';

describe('FornecedorForm', () => {
  it('calls onSubmit with normalized data when form is valid', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const fornecedor = {
      tipo_pessoa: 'pj',
      cpf_cnpj: '12.345.678/0001-00',
      razao_social: 'ACME Ltda',
      categoria_fornecedor: 'insumos',
      status: 'ativo',
      endereco: {
        logradouro: 'Av. Brasil',
        numero: '123',
        bairro: 'Centro',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01000-000'
      },
      contato: {
        telefone_principal: '11999990000',
        email_principal: 'contato@acme.com'
      },
      documentos: []
    };

    const { container } = render(
      <FornecedorForm
        isOpen={true}
        onClose={() => {}}
        onSubmit={onSubmit}
        loading={false}
        fornecedor={fornecedor as any}
      />
    );

    // Use name attributes to find inputs (SelectDropdowns are custom components)
    const cpf = container.querySelector('input[name="cpf_cnpj"]') as HTMLInputElement;
    const razao = container.querySelector('input[name="razao_social"]') as HTMLInputElement;
    const categoria = container.querySelector('select[name="categoria_fornecedor"]') as HTMLSelectElement;
    const status = container.querySelector('select[name="status"]') as HTMLSelectElement;

    expect(cpf).toBeTruthy();
    expect(razao).toBeTruthy();

    fireEvent.change(cpf, { target: { value: '12.345.678/0001-00' } });
    fireEvent.change(razao, { target: { value: 'ACME Ltda' } });
    if (categoria) fireEvent.change(categoria, { target: { value: 'insumos' } });
    if (status) fireEvent.change(status, { target: { value: 'ativo' } });

    // Endereço
    const logradouro = container.querySelector('input[name="endereco.logradouro"]') || container.querySelector('input[name="logradouro"]') || container.querySelector('input[name="endereco_logradouro"]');
    const numero = container.querySelector('input[name="numero"]');
    const bairro = container.querySelector('input[name="bairro"]');
    const cidade = container.querySelector('input[name="cidade"]');
    const estado = container.querySelector('input[name="estado"]');
    const cep = container.querySelector('input[name="cep"]');

    if (logradouro) fireEvent.change(logradouro, { target: { value: 'Av. Brasil' } });
    if (numero) fireEvent.change(numero, { target: { value: '123' } });
    if (bairro) fireEvent.change(bairro, { target: { value: 'Centro' } });
    if (cidade) fireEvent.change(cidade, { target: { value: 'São Paulo' } });
    if (estado) fireEvent.change(estado, { target: { value: 'SP' } });
    if (cep) fireEvent.change(cep, { target: { value: '01000-000' } });

    // Contato
    const telefone = container.querySelector('input[name="contato_telefone_principal"]') || container.querySelector('input[name="telefone_principal"]') || container.querySelector('input[name="telefone"]');
    const email = container.querySelector('input[name="contato_email_principal"]') || container.querySelector('input[name="email_principal"]') || container.querySelector('input[name="email"]');

    if (telefone) fireEvent.change(telefone, { target: { value: '11999990000' } });
    if (email) fireEvent.change(email, { target: { value: 'contato@acme.com' } });

    // Submit (Criar or Atualizar depending on mode)
    fireEvent.click(screen.getByRole('button', { name: /Criar|Atualizar/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());

    const calledWith = onSubmit.mock.calls[0][0];
    expect(calledWith.cpf_cnpj).toBe('12.345.678/0001-00');
    expect(calledWith.razao_social).toBe('ACME Ltda');
    expect(calledWith.endereco?.logradouro || calledWith.endereco).toBe('Av. Brasil');
    expect(calledWith.contato?.email_principal || calledWith.email).toBe('contato@acme.com');
  });
});