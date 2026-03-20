import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import contratosService from '../../services/contratos';
import api from '../../services/api';
const ContratoForm = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // Estados para listas
    const [clientes, setClientes] = useState([]);
    const [produtos, setProdutos] = useState([]);
    // Estados do formulário
    const [formData, setFormData] = useState({
        numero_contrato: '',
        cliente: 0,
        produto: 0,
        quantidade_total: 0,
        preco_unitario: 0,
        valor_total: 0,
        tipo: 'PARCELADO',
        data_contrato: new Date().toISOString().split('T')[0],
        data_entrega_prevista: '',
        numero_parcelas: 1,
        periodicidade_parcelas: 'MENSAL',
        observacoes: ''
    });
    useEffect(() => {
        carregarDados();
    }, []);
    const carregarDados = async () => {
        try {
            const [clientesRes, produtosRes] = await Promise.all([
                api.get('/comercial/clientes/'),
                api.get('/estoque/produtos/')
            ]);
            setClientes(Array.isArray(clientesRes.data) ? clientesRes.data : clientesRes.data.results || []);
            setProdutos(Array.isArray(produtosRes.data) ? produtosRes.data : produtosRes.data.results || []);
        }
        catch (err) {
            console.error('Erro ao carregar dados:', err);
            setError('Erro ao carregar clientes e produtos');
        }
    };
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updated = { ...prev, [name]: value };
            // Calcular valor total automaticamente
            if (name === 'quantidade_total' || name === 'preco_unitario') {
                const quantidade = name === 'quantidade_total' ? parseFloat(value) : prev.quantidade_total;
                const preco = name === 'preco_unitario' ? parseFloat(value) : prev.preco_unitario;
                updated.valor_total = quantidade * preco;
            }
            // Se mudar para À VISTA, forçar 1 parcela
            if (name === 'tipo' && value === 'A_VISTA') {
                updated.numero_parcelas = 1;
            }
            return updated;
        });
    };
    const handleProdutoChange = (e) => {
        const produtoId = parseInt(e.target.value);
        const produto = produtos.find(p => p.id === produtoId);
        setFormData(prev => ({
            ...prev,
            produto: produtoId,
            preco_unitario: produto?.preco_unitario || prev.preco_unitario
        }));
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            // Validações básicas
            if (!formData.numero_contrato || !formData.cliente || !formData.produto) {
                throw new Error('Preencha todos os campos obrigatórios');
            }
            if (formData.quantidade_total <= 0 || formData.preco_unitario <= 0) {
                throw new Error('Quantidade e preço devem ser maiores que zero');
            }
            await contratosService.criarComParcelas(formData);
            navigate('/comercial/contratos');
        }
        catch (err) {
            console.error('Erro ao criar contrato:', err);
            setError(err.response?.data?.error || err.message || 'Erro ao criar contrato');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "container-fluid", children: _jsx("div", { className: "row", children: _jsx("div", { className: "col-12", children: _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-header", children: _jsxs("h3", { className: "card-title", children: [_jsx("i", { className: "bi bi-file-earmark-text me-2" }), "Novo Contrato de Venda"] }) }), _jsxs("div", { className: "card-body", children: [error && (_jsxs("div", { className: "alert alert-danger", role: "alert", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-2" }), error] })), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "N\u00FAmero do Contrato *" }), _jsx("input", { type: "text", className: "form-control", name: "numero_contrato", value: formData.numero_contrato, onChange: handleChange, required: true, placeholder: "CONT-001" })] }), _jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "Cliente *" }), _jsxs("select", { className: "form-select", name: "cliente", value: formData.cliente, onChange: handleChange, required: true, children: [_jsx("option", { value: "", children: "Selecione..." }), clientes.map(cliente => (_jsx("option", { value: cliente.id, children: cliente.nome }, cliente.id)))] })] }), _jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "Tipo de Contrato *" }), _jsxs("select", { className: "form-select", name: "tipo", value: formData.tipo, onChange: handleChange, required: true, children: [_jsx("option", { value: "A_VISTA", children: "\u00C0 Vista" }), _jsx("option", { value: "PARCELADO", children: "Parcelado" }), _jsx("option", { value: "ANTECIPADO", children: "Antecipado" }), _jsx("option", { value: "FUTURO", children: "Contrato Futuro" })] })] })] }), _jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Produto *" }), _jsxs("select", { className: "form-select", name: "produto", value: formData.produto, onChange: handleProdutoChange, required: true, children: [_jsx("option", { value: "", children: "Selecione..." }), produtos.map(produto => (_jsx("option", { value: produto.id, children: produto.nome }, produto.id)))] })] }), _jsxs("div", { className: "col-md-3 mb-3", children: [_jsx("label", { className: "form-label", children: "Quantidade Total *" }), _jsx("input", { type: "number", className: "form-control", name: "quantidade_total", value: formData.quantidade_total, onChange: handleChange, required: true, min: "0", step: "0.01" })] }), _jsxs("div", { className: "col-md-3 mb-3", children: [_jsx("label", { className: "form-label", children: "Pre\u00E7o Unit\u00E1rio (R$) *" }), _jsx("input", { type: "number", className: "form-control", name: "preco_unitario", value: formData.preco_unitario, onChange: handleChange, required: true, min: "0", step: "0.01" })] })] }), _jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "Valor Total (R$)" }), _jsx("input", { type: "number", className: "form-control", value: formData.valor_total.toFixed(2), readOnly: true, style: { backgroundColor: '#e9ecef' } })] }), _jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "Data do Contrato *" }), _jsx("input", { type: "date", className: "form-control", name: "data_contrato", value: formData.data_contrato, onChange: handleChange, required: true })] }), _jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "Data de Entrega Prevista" }), _jsx("input", { type: "date", className: "form-control", name: "data_entrega_prevista", value: formData.data_entrega_prevista, onChange: handleChange })] })] }), _jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "N\u00FAmero de Parcelas *" }), _jsx("input", { type: "number", className: "form-control", name: "numero_parcelas", value: formData.numero_parcelas, onChange: handleChange, required: true, min: "1", disabled: formData.tipo === 'A_VISTA' }), formData.tipo === 'A_VISTA' && (_jsx("small", { className: "text-muted", children: "Contratos \u00E0 vista t\u00EAm apenas 1 parcela" }))] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Periodicidade das Parcelas *" }), _jsxs("select", { className: "form-select", name: "periodicidade_parcelas", value: formData.periodicidade_parcelas, onChange: handleChange, required: true, disabled: formData.tipo === 'A_VISTA', children: [_jsx("option", { value: "MENSAL", children: "Mensal" }), _jsx("option", { value: "BIMESTRAL", children: "Bimestral" }), _jsx("option", { value: "TRIMESTRAL", children: "Trimestral" })] })] })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Observa\u00E7\u00F5es" }), _jsx("textarea", { className: "form-control", name: "observacoes", value: formData.observacoes, onChange: handleChange, rows: 3, placeholder: "Informa\u00E7\u00F5es adicionais sobre o contrato..." })] }), _jsxs("div", { className: "d-flex justify-content-end gap-2", children: [_jsxs("button", { type: "button", className: "btn btn-secondary", onClick: () => navigate('/comercial/contratos'), disabled: loading, children: [_jsx("i", { className: "bi bi-x-circle me-2" }), "Cancelar"] }), _jsx("button", { type: "submit", className: "btn btn-primary", disabled: loading, children: loading ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "spinner-border spinner-border-sm me-2", role: "status", "aria-hidden": "true" }), "Criando..."] })) : (_jsxs(_Fragment, { children: [_jsx("i", { className: "bi bi-check-circle me-2" }), "Criar Contrato"] })) })] })] })] })] }) }) }) }));
};
export default ContratoForm;
