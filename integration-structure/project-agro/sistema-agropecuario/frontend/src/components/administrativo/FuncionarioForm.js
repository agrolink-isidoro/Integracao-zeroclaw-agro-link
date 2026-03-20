import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useApiCreate, useApiUpdate } from '@/hooks/useApi';
const FuncionarioForm = ({ onClose, initialData }) => {
    const create = useApiCreate('/administrativo/funcionarios/', [['funcionarios']]);
    const update = useApiUpdate('/administrativo/funcionarios/', [['funcionarios']]);
    const [nome, setNome] = useState('');
    const [cpf, setCpf] = useState('');
    const [cargo, setCargo] = useState('');
    const [salario, setSalario] = useState('');
    const [tipo, setTipo] = useState('registrado');
    const [diaria, setDiaria] = useState('');
    const [dependentes, setDependentes] = useState(0);
    const [ativo, setAtivo] = useState(true);
    // banking fields
    const [banco, setBanco] = useState('');
    const [agencia, setAgencia] = useState('');
    const [conta, setConta] = useState('');
    const [tipoConta, setTipoConta] = useState(undefined);
    const [pixKey, setPixKey] = useState('');
    const [recebePor, setRecebePor] = useState('pix');
    const [nomeTitular, setNomeTitular] = useState('');
    const [cpfCnpj, setCpfCnpj] = useState('');
    const [submitting, setSubmitting] = useState(false);
    useEffect(() => {
        if (initialData) {
            setNome(initialData.nome || '');
            setCpf(initialData.cpf || '');
            setCargo(initialData.cargo || '');
            setSalario(initialData.salario_bruto ? String(initialData.salario_bruto) : '');
            setTipo(initialData.tipo || 'registrado');
            setDiaria(initialData.diaria_valor ? String(initialData.diaria_valor) : '');
            setDependentes(initialData.dependentes ?? 0);
            setAtivo(initialData.ativo ?? true);
            // banking
            setBanco(initialData.banco || '');
            setAgencia(initialData.agencia || '');
            setConta(initialData.conta || '');
            setTipoConta(initialData.tipo_conta || undefined);
            setPixKey(initialData.pix_key || '');
            setRecebePor(initialData.recebe_por || 'pix');
            setNomeTitular(initialData.nome_titular || '');
            setCpfCnpj(initialData.cpf_cnpj || '');
        }
    }, [initialData]);
    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);
        try {
            // client-side validation for pix
            if (recebePor === 'pix' && !pixKey) {
                alert('Chave PIX obrigatória quando o funcionário recebe por PIX.');
                setSubmitting(false);
                return;
            }
            const payload = { nome, cpf, cargo, dependentes, ativo, banco, agencia, conta, tipo_conta: tipoConta, pix_key: pixKey, recebe_por: recebePor, nome_titular: nomeTitular, cpf_cnpj: cpfCnpj };
            if (tipo === 'temporario') {
                payload.tipo = 'temporario';
                payload.diaria_valor = diaria ? Number(diaria) : undefined;
            }
            else {
                payload.tipo = 'registrado';
                payload.salario_bruto = salario ? Number(salario) : undefined;
            }
            if (initialData && initialData.id) {
                await update.mutateAsync({ id: initialData.id, ...payload });
                alert('Funcionário atualizado');
            }
            else {
                await create.mutateAsync(payload);
                alert('Funcionário criado');
            }
            onClose?.();
        }
        catch (err) {
            const extractDetail = (e) => {
                if (!e || typeof e !== 'object')
                    return String(e);
                const ae = e;
                if (ae.response && typeof ae.response.data === 'object' && ae.response.data !== null && 'detail' in ae.response.data) {
                    const d = ae.response.data['detail'];
                    return typeof d === 'string' ? d : JSON.stringify(d);
                }
                return JSON.stringify(ae.response?.data) || ae.message || 'Erro desconhecido';
            };
            const serverMsg = extractDetail(err);
            const ae2 = err;
            console.error('Erro ao salvar funcionário:', ae2.response?.data);
            alert(`Erro ao salvar funcionário: ${serverMsg}`);
        }
        finally {
            setSubmitting(false);
        }
    }
    return (_jsxs("div", { className: "card border-0 shadow-sm", children: [_jsxs("div", { className: "card-header bg-success text-white d-flex align-items-center", children: [_jsx("i", { className: "bi bi-person-badge me-2" }), _jsx("h5", { className: "mb-0", children: initialData?.id ? 'Editar Funcionário' : 'Novo Funcionário' })] }), _jsx("div", { className: "card-body p-3 p-md-4", children: _jsx("form", { onSubmit: handleSubmit, children: _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "nome", className: "form-label", children: [_jsx("i", { className: "bi bi-person me-1" }), "Nome"] }), _jsx("input", { id: "nome", className: "form-control", value: nome, onChange: (e) => setNome(e.target.value), required: true })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "cpf", className: "form-label", children: [_jsx("i", { className: "bi bi-card-text me-1" }), "CPF"] }), _jsx("input", { id: "cpf", className: "form-control", value: cpf, onChange: (e) => setCpf(e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "cargo", className: "form-label", children: [_jsx("i", { className: "bi bi-briefcase me-1" }), "Cargo"] }), _jsx("input", { id: "cargo", className: "form-control", value: cargo, onChange: (e) => setCargo(e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "tipo", className: "form-label", children: [_jsx("i", { className: "bi bi-tags me-1" }), "Tipo"] }), _jsxs("select", { id: "tipo", className: "form-select", value: tipo, onChange: (e) => setTipo(e.target.value), children: [_jsx("option", { value: "registrado", children: "Registrado" }), _jsx("option", { value: "temporario", children: "Tempor\u00E1rio" })] })] }), tipo === 'registrado' ? (_jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "salario", className: "form-label", children: [_jsx("i", { className: "bi bi-cash me-1" }), "Sal\u00E1rio mensal"] }), _jsx("input", { id: "salario", type: "number", step: "0.01", className: "form-control", value: salario, onChange: (e) => setSalario(e.target.value) })] })) : (_jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "diaria", className: "form-label", children: [_jsx("i", { className: "bi bi-cash-coin me-1" }), "Valor di\u00E1rio (R$)"] }), _jsx("input", { id: "diaria", type: "number", step: "0.01", className: "form-control", value: diaria, onChange: (e) => setDiaria(e.target.value) })] })), _jsx("div", { className: "col-12", children: _jsx("hr", { className: "my-3" }) }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-credit-card me-1" }), "Recebe por"] }), _jsxs("select", { className: "form-select", value: recebePor, onChange: (e) => setRecebePor(e.target.value), children: [_jsx("option", { value: "pix", children: "PIX" }), _jsx("option", { value: "transferencia", children: "Transfer\u00EAncia Banc\u00E1ria" }), _jsx("option", { value: "boleto", children: "Boleto" })] })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "pix", className: "form-label", children: [_jsx("i", { className: "bi bi-qr-code me-1" }), "Chave PIX"] }), _jsx("input", { id: "pix", className: "form-control", value: pixKey, onChange: (e) => setPixKey(e.target.value), placeholder: "CPF/Tel/Email/EVP" })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "banco", className: "form-label", children: [_jsx("i", { className: "bi bi-bank me-1" }), "Banco"] }), _jsx("input", { id: "banco", className: "form-control", value: banco, onChange: (e) => setBanco(e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-3", children: [_jsxs("label", { htmlFor: "agencia", className: "form-label", children: [_jsx("i", { className: "bi bi-hash me-1" }), "Ag\u00EAncia"] }), _jsx("input", { id: "agencia", className: "form-control", value: agencia, onChange: (e) => setAgencia(e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-3", children: [_jsxs("label", { htmlFor: "conta", className: "form-label", children: [_jsx("i", { className: "bi bi-hash me-1" }), "Conta"] }), _jsx("input", { id: "conta", className: "form-control", value: conta, onChange: (e) => setConta(e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "tipo_conta", className: "form-label", children: [_jsx("i", { className: "bi bi-wallet2 me-1" }), "Tipo de Conta"] }), _jsxs("select", { id: "tipo_conta", className: "form-select", value: tipoConta, onChange: (e) => setTipoConta(e.target.value), children: [_jsx("option", { value: "", children: "(n\u00E3o informado)" }), _jsx("option", { value: "corrente", children: "Corrente" }), _jsx("option", { value: "poupanca", children: "Poupan\u00E7a" })] })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "nome_titular", className: "form-label", children: [_jsx("i", { className: "bi bi-person-vcard me-1" }), "Nome do titular"] }), _jsx("input", { id: "nome_titular", className: "form-control", value: nomeTitular, onChange: (e) => setNomeTitular(e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "cpf_cnpj", className: "form-label", children: [_jsx("i", { className: "bi bi-file-earmark-text me-1" }), "CPF / CNPJ do titular"] }), _jsx("input", { id: "cpf_cnpj", className: "form-control", value: cpfCnpj, onChange: (e) => setCpfCnpj(e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-people me-1" }), "N\u00FAmero de dependentes"] }), _jsx("input", { type: "number", min: "0", className: "form-control", value: dependentes, onChange: (e) => setDependentes(Number(e.target.value)) })] }), _jsx("div", { className: "col-12", children: _jsxs("div", { className: "form-check mt-2", children: [_jsx("input", { className: "form-check-input", type: "checkbox", checked: ativo, onChange: (e) => setAtivo(e.target.checked), id: "ativo" }), _jsxs("label", { className: "form-check-label", htmlFor: "ativo", children: [_jsx("i", { className: "bi bi-toggle-on me-1" }), "Ativo"] })] }) }), _jsx("div", { className: "col-12", children: _jsxs("div", { className: "d-flex flex-column flex-sm-row gap-2 justify-content-end mt-3", children: [_jsxs("button", { type: "button", className: "btn btn-outline-secondary", onClick: () => onClose && onClose(), disabled: submitting, children: [_jsx("i", { className: "bi bi-x-circle me-2" }), "Cancelar"] }), _jsxs("button", { type: "submit", className: "btn btn-success", disabled: submitting, children: [_jsx("i", { className: "bi bi-check-circle me-2" }), submitting ? 'Enviando...' : 'Salvar'] })] }) })] }) }) })] }));
};
export default FuncionarioForm;
