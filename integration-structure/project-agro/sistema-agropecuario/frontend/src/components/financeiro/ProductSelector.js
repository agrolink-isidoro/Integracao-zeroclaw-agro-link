import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useApiQuery } from '@/hooks/useApi';
import SelectDropdown from '@/components/common/SelectDropdown';
import ProdutosService from '@/services/produtos';
const ProductSelector = ({ onAddItem, maxQuantity }) => {
    const [selectedProdutoId, setSelectedProdutoId] = useState(null);
    const [quantidade, setQuantidade] = useState('1');
    const [valorUnitario, setValorUnitario] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const [erro, setErro] = useState('');
    // Fetch all produtos
    const { data: produtos = [] } = useApiQuery(['produtos'], '/estoque/produtos/?page_size=1000');
    const handleProdutoSearch = async (term) => {
        try {
            const response = await ProdutosService.listar({ search: term, page_size: 100 });
            return (response.results || []).map(p => ({
                value: p.id,
                label: `${p.nome} (${p.quantidade_estoque} ${p.unidade} disponível)`
            }));
        }
        catch (e) {
            console.warn('Produtos search failed:', e);
            return [];
        }
    };
    const selectedProduto = produtos.find(p => p.id === selectedProdutoId);
    const handleAddItem = () => {
        setErro('');
        // Validation
        if (!selectedProdutoId || !selectedProduto) {
            setErro('Selecione um produto');
            return;
        }
        const qtd = parseFloat(quantidade);
        if (isNaN(qtd) || qtd <= 0) {
            setErro('Quantidade deve ser maior que zero');
            return;
        }
        if (selectedProduto.quantidade_estoque && qtd > selectedProduto.quantidade_estoque) {
            setErro(`Quantidade insuficiente. Disponível: ${selectedProduto.quantidade_estoque}`);
            return;
        }
        const valorUnit = parseFloat(valorUnitario);
        if (isNaN(valorUnit) || valorUnit < 0) {
            setErro('Valor unitário inválido');
            return;
        }
        // Create item
        const newItem = {
            emprestimo: 0, // Will be set by parent
            produto: selectedProdutoId,
            produto_nome: selectedProduto.nome,
            produto_unidade: selectedProduto.unidade,
            quantidade: String(qtd),
            unidade: selectedProduto.unidade,
            valor_unitario: String(valorUnit),
            valor_total: String(qtd * valorUnit),
            observacoes: observacoes || undefined
        };
        onAddItem(newItem);
        // Reset form
        setSelectedProdutoId(null);
        setQuantidade('1');
        setValorUnitario('');
        setObservacoes('');
    };
    return (_jsxs("div", { className: "card p-3 mb-3 bg-light", children: [_jsxs("h5", { className: "mb-3", children: [_jsx("i", { className: "bi bi-plus-circle me-2" }), "Adicionar Produto"] }), erro && _jsx("div", { className: "alert alert-danger alert-dismissible fade show", children: erro }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-box me-2" }), "Produto"] }), _jsx(SelectDropdown, { options: produtos.map(p => ({
                            value: p.id,
                            label: `${p.nome} (${p.quantidade_estoque} ${p.unidade})`
                        })), value: selectedProdutoId ?? '', onChange: (v) => {
                            setSelectedProdutoId(v ? Number(v) : null);
                            // Auto-fill valor_unitario from product price
                            const prod = produtos.find(p => p.id === Number(v));
                            if (prod) {
                                // Tenta preencher com preco_unitario, custo_unitario, ou deixa vazio
                                const preco = prod.preco_unitario || prod.custo_unitario || 0;
                                if (preco && preco > 0) {
                                    setValorUnitario(String(preco));
                                }
                                else {
                                    setValorUnitario('');
                                }
                            }
                            else {
                                setValorUnitario('');
                            }
                        }, placeholder: "Selecione produto...", searchable: true, onSearch: handleProdutoSearch }), selectedProduto && (_jsxs("small", { className: "text-muted d-block mt-2", children: [_jsx("strong", { children: "Dispon\u00EDvel:" }), " ", selectedProduto.quantidade_estoque, " ", selectedProduto.unidade] }))] }), _jsxs("div", { className: "row g-3", children: [_jsxs("div", { className: "col-md-6", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-hash me-2" }), "Quantidade"] }), _jsxs("div", { className: "input-group", children: [_jsx("input", { type: "number", className: "form-control", value: quantidade, onChange: (e) => setQuantidade(e.target.value), placeholder: "Digite a quantidade", min: "0", step: "0.01", disabled: !selectedProduto }), _jsx("span", { className: "input-group-text", children: selectedProduto?.unidade || '---' })] }), selectedProduto && (_jsxs("small", { className: "text-muted d-block mt-2", children: [_jsx("i", { className: "bi bi-info-circle me-1" }), "Estoque dispon\u00EDvel: ", selectedProduto.quantidade_estoque] }))] }), _jsxs("div", { className: "col-md-6", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-currency-dollar me-2" }), "Valor Unit\u00E1rio"] }), _jsx("input", { type: "number", className: "form-control", value: valorUnitario, onChange: (e) => setValorUnitario(e.target.value), placeholder: "Auto-preenchido ou digite manualmente", min: "0", step: "0.01", disabled: !selectedProduto, style: {
                                    backgroundColor: !selectedProduto ? '#e9ecef' : (valorUnitario && parseFloat(valorUnitario) > 0 ? '#e8f5e9' : '#fff')
                                } }), _jsx("small", { className: "text-muted d-block mt-2", children: valorUnitario && parseFloat(valorUnitario) > 0
                                    ? '✓ Preço carregado do produto'
                                    : selectedProduto
                                        ? '⚠️ Digite o valor unitário'
                                        : '⚠️ Selecione um produto primeiro' })] })] }), _jsx("div", { className: "mt-3 p-3 bg-white border rounded", children: _jsxs("div", { className: "row g-2", children: [_jsx("div", { className: "col-auto", children: _jsx("strong", { children: "Valor Total:" }) }), _jsx("div", { className: "col-auto", children: _jsxs("h6", { className: "mb-0 text-success", children: ["R$ ", quantidade && valorUnitario
                                        ? (parseFloat(quantidade) * parseFloat(valorUnitario)).toFixed(2)
                                        : '0.00'] }) })] }) }), _jsxs("div", { className: "mb-3 mt-3", children: [_jsx("label", { className: "form-label", children: "Observa\u00E7\u00F5es (opcional)" }), _jsx("textarea", { className: "form-control", rows: 2, value: observacoes, onChange: (e) => setObservacoes(e.target.value), placeholder: "Ex: Condi\u00E7\u00F5es especiais de entrega" })] }), _jsxs("div", { className: "d-flex gap-2", children: [_jsxs("button", { className: "btn btn-sm btn-primary", onClick: handleAddItem, disabled: !selectedProdutoId, children: [_jsx("i", { className: "bi bi-check me-2" }), "Adicionar"] }), _jsxs("button", { className: "btn btn-sm btn-outline-secondary", onClick: () => {
                            setSelectedProdutoId(null);
                            setQuantidade('1');
                            setValorUnitario('');
                            setObservacoes('');
                            setErro('');
                        }, children: [_jsx("i", { className: "bi bi-arrow-counterclockwise me-2" }), "Limpar"] })] })] }));
};
export default ProductSelector;
