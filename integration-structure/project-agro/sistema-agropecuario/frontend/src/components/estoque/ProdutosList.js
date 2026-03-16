import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { produtosService, categoriasService, locaisService } from '../../services/produtos';
import DataTable from '../common/DataTable';
import ModalForm from '../common/ModalForm';
import ConfirmDialog from '../common/ConfirmDialog';
import ProdutoForm from './ProdutoForm';
import { getUnitLabel } from '../../utils/units';
const ProdutosList = () => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingProduto, setEditingProduto] = useState(null);
    const [deleteProduto, setDeleteProduto] = useState(null);
    const [filters, setFilters] = useState({
        search: '',
        categoria: '',
        principio_ativo: '',
        fornecedor: '',
        status: '',
        local_armazenamento: '',
        ordering: '-criado_em'
    });
    const [categorias, setCategorias] = useState([]);
    const [locaisComSaldo, setLocaisComSaldo] = useState([]);
    // Queries
    const { data: produtosResponse, isLoading, refetch } = useQuery({
        queryKey: ['produtos', JSON.stringify(filters)],
        queryFn: () => produtosService.listar(filters),
        enabled: true
    });
    const produtos = produtosResponse?.results || [];
    const queryClient = useQueryClient();
    useEffect(() => {
        // Carregar categorias
        const loadCategorias = async () => {
            try {
                const cats = await categoriasService.listar();
                setCategorias(cats);
            }
            catch (error) {
                console.error('Erro ao carregar categorias:', error);
            }
        };
        // Carregar locais com saldo > 0 para o filtro
        const loadLocaisComSaldo = async () => {
            try {
                const locais = await locaisService.listarComSaldo();
                setLocaisComSaldo(locais);
            }
            catch (error) {
                console.error('Erro ao carregar locais com saldo:', error);
            }
        };
        loadCategorias();
        loadLocaisComSaldo();
    }, []);
    const handleEdit = (produto) => {
        setEditingProduto(produto);
    };
    const handleDelete = (produto) => {
        setDeleteProduto(produto);
    };
    const confirmDelete = async () => {
        if (deleteProduto) {
            try {
                await produtosService.deletar(deleteProduto.id);
                queryClient.invalidateQueries({ queryKey: ['produtos'], exact: false });
                setDeleteProduto(null);
            }
            catch (error) {
                console.error('Erro ao excluir produto:', error);
            }
        }
    };
    const handleCloseModal = () => {
        setShowCreateModal(false);
        setEditingProduto(null);
    };
    const handleSaveProduto = async (produtoData) => {
        try {
            // Empty payload = movimentação já registrada pelo ProdutoForm (modo produto existente)
            // Apenas refetch + fecha o modal sem tentar criar/atualizar o produto novamente
            if (!('nome' in produtoData) || !produtoData.nome) {
                refetch();
                handleCloseModal();
                return;
            }
            if (editingProduto) {
                await produtosService.atualizar(editingProduto.id, produtoData);
            }
            else {
                await produtosService.criar(produtoData);
            }
            refetch();
            handleCloseModal();
        }
        catch (error) {
            console.error('Erro ao salvar produto:', error);
            throw error;
        }
    };
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };
    const clearFilters = () => {
        setFilters({
            search: '',
            categoria: '',
            principio_ativo: '',
            fornecedor: '',
            status: '',
            local_armazenamento: '',
            ordering: '-criado_em'
        });
    };
    const getCategoriaBadgeColor = (categoriaKey) => {
        // categoria can be stored as tag (string) or id (number)
        const categoria = categorias.find(c => c.id === Number(categoriaKey) || c.tag === String(categoriaKey));
        if (!categoria)
            return 'bg-secondary';
        const nome = categoria.nome.toLowerCase();
        const colors = {
            'semente': 'bg-success',
            'fertilizante': 'bg-info',
            'corretivo': 'bg-warning',
            'herbicida': 'bg-danger',
            'fungicida': 'bg-primary',
            'inseticida': 'bg-dark',
            'acaricida': 'bg-secondary',
            'adjuvante': 'bg-light text-dark'
        };
        return colors[nome] || 'bg-secondary';
    };
    const getCategoriaNome = (categoriaKey) => {
        const categoria = categorias.find(c => c.id === Number(categoriaKey) || c.tag === String(categoriaKey));
        return categoria?.nome || 'N/A';
    };
    // Função para padronizar unidades
    const padronizarUnidade = (unidade) => {
        const mapaUnidades = {
            'LT': 'L',
            'TON': 't'
        };
        return mapaUnidades[unidade] || unidade;
    };
    // Map display labels for units (helper imported at top)
    const columns = [
        {
            key: 'codigo',
            header: 'Código',
            sortable: true,
            render: (value) => (_jsxs("span", { className: "fw-semibold text-primary", children: [_jsx("i", { className: "bi bi-upc me-1" }), value] }))
        },
        {
            key: 'nome',
            header: 'Nome',
            sortable: true,
            render: (value, item) => (_jsxs("div", { children: [_jsx("div", { className: "fw-semibold", children: value }), item.principio_ativo && (_jsxs("small", { className: "text-muted", children: [_jsx("i", { className: "bi bi-capsule me-1" }), item.principio_ativo] }))] }))
        },
        {
            key: 'categoria',
            header: 'Categoria',
            render: (value) => (_jsx("span", { className: `badge ${getCategoriaBadgeColor(value)}`, children: getCategoriaNome(value) })),
            sortable: true
        },
        {
            key: 'quantidade_estoque',
            header: 'Qtd em estoque',
            render: (_value, item) => {
                const estoque = item.quantidade_estoque || 0;
                const minimo = item.estoque_minimo || 0;
                const isLow = estoque <= minimo;
                return (_jsxs("span", { className: `fw-semibold ${isLow ? 'text-danger' : 'text-success'}`, children: [_jsx("i", { className: `bi bi-${isLow ? 'exclamation-triangle' : 'check-circle'} me-1` }), estoque.toLocaleString('pt-BR'), isLow && _jsxs("small", { className: "d-block text-muted", children: [estoque.toLocaleString('pt-BR'), " dispon\u00EDvel"] })] }));
            },
            sortable: true
        },
        {
            key: 'custo_unitario',
            header: 'Custo Unit.',
            render: (value) => value ? (_jsxs("span", { className: "text-muted", children: ["R$ ", value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })] })) : '-',
            sortable: true
        },
        {
            key: 'unidade',
            header: 'Unidade de medida',
            render: (value) => (_jsxs("span", { className: "badge bg-light text-dark", children: [_jsx("i", { className: "bi bi-rulers me-1" }), getUnitLabel(padronizarUnidade(value)) || 'N/A'] })),
            sortable: true
        },
        {
            key: 'fornecedor_nome',
            header: 'Fornecedor',
            render: (value) => value || '-',
            sortable: true
        },
        {
            key: 'local_armazenamento_nome',
            header: 'Local Armazenagem',
            render: (value) => value ? (_jsxs("span", { className: "text-muted", children: [_jsx("i", { className: "bi bi-box-seam me-1" }), value] })) : '-',
            sortable: false
        },
        {
            key: 'status',
            header: 'Status',
            render: (value) => {
                const statusConfig = {
                    ativo: { color: 'success', icon: 'check-circle' },
                    inativo: { color: 'secondary', icon: 'pause-circle' },
                    vencido: { color: 'danger', icon: 'x-circle' }
                };
                const config = statusConfig[value] || statusConfig.ativo;
                return (_jsxs("span", { className: `badge bg-${config.color}`, children: [_jsx("i", { className: `bi bi-${config.icon} me-1` }), value] }));
            },
            sortable: true
        },
        {
            key: 'actions',
            header: 'Ações',
            render: (_value, item) => (_jsxs("div", { className: "btn-group btn-group-sm", children: [_jsx("button", { className: "btn btn-outline-primary", onClick: () => handleEdit(item), title: "Editar", children: _jsx("i", { className: "bi bi-pencil" }) }), _jsx("button", { className: "btn btn-outline-danger", onClick: () => handleDelete(item), title: "Excluir", children: _jsx("i", { className: "bi bi-trash" }) })] }))
        }
    ];
    const totalProdutos = produtos.length;
    const produtosAtivos = produtos.filter(p => p.status === 'ativo').length;
    const produtosBaixoEstoque = produtos.filter(p => (p.quantidade_estoque || 0) <= (p.estoque_minimo || 0)).length;
    const valorTotalEstoque = produtos.reduce((sum, p) => sum + ((p.quantidade_estoque || 0) * (p.custo_unitario || 0)), 0);
    return (_jsxs("div", { className: "p-4", children: [_jsxs("div", { className: "d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3", children: [_jsxs("div", { children: [_jsxs("h1", { className: "h2 mb-1", children: [_jsx("i", { className: "bi bi-box-seam text-primary me-2" }), "Produtos"] }), _jsx("p", { className: "text-muted mb-0", children: "Gerencie produtos e controle de estoque" })] }), _jsxs("button", { onClick: () => setShowCreateModal(true), className: "btn btn-success btn-lg shadow-sm", children: [_jsx("i", { className: "bi bi-plus-circle me-2" }), "Novo Produto"] })] }), _jsxs("div", { className: "card border-0 shadow-sm mb-4", children: [_jsx("div", { className: "card-header bg-light", children: _jsxs("h6", { className: "mb-0", children: [_jsx("i", { className: "bi bi-funnel me-2" }), "Filtros Avan\u00E7ados"] }) }), _jsx("div", { className: "card-body", children: _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12 col-md-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-search me-2" }), "Buscar"] }), _jsx("input", { type: "text", className: "form-control", name: "search", value: filters.search, onChange: handleFilterChange, placeholder: "Nome, c\u00F3digo ou princ\u00EDpio ativo..." })] }), _jsxs("div", { className: "col-12 col-md-2", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-folder me-2" }), "Categoria"] }), _jsxs("select", { className: "form-select", name: "categoria", value: filters.categoria, onChange: handleFilterChange, children: [_jsx("option", { value: "", children: "Todas" }), categorias.map(cat => (_jsx("option", { value: cat.id, children: cat.nome }, cat.id)))] })] }), _jsxs("div", { className: "col-12 col-md-2", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-capsule me-2" }), "Princ\u00EDpio Ativo"] }), _jsx("input", { type: "text", className: "form-control", name: "principio_ativo", value: filters.principio_ativo, onChange: handleFilterChange, placeholder: "Ex: Glifosato..." })] }), _jsxs("div", { className: "col-12 col-md-2", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-shop me-2" }), "Fornecedor"] }), _jsx("input", { type: "text", className: "form-control", name: "fornecedor", value: filters.fornecedor, onChange: handleFilterChange, placeholder: "Nome do fornecedor..." })] }), _jsxs("div", { className: "col-6 col-md-2", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-toggle-on me-2" }), "Status"] }), _jsxs("select", { className: "form-select", name: "status", value: filters.status, onChange: handleFilterChange, children: [_jsx("option", { value: "", children: "Todos" }), _jsx("option", { value: "ativo", children: "Ativo" }), _jsx("option", { value: "inativo", children: "Inativo" }), _jsx("option", { value: "vencido", children: "Vencido" })] })] }), _jsxs("div", { className: "col-12 col-md-2", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-geo-alt me-2" }), "Local de Armazenagem"] }), _jsxs("select", { className: "form-select", name: "local_armazenamento", value: filters.local_armazenamento, onChange: handleFilterChange, children: [_jsx("option", { value: "", children: "Todos os locais" }), locaisComSaldo.map(local => (_jsx("option", { value: local.id, children: local.nome }, local.id)))] })] }), _jsx("div", { className: "col-6 col-md-1 d-flex align-items-end", children: _jsx("button", { className: "btn btn-outline-secondary w-100", onClick: clearFilters, title: "Limpar filtros", children: _jsx("i", { className: "bi bi-x-circle" }) }) })] }) })] }), _jsxs("div", { className: "row g-3 mb-4", children: [_jsx("div", { className: "col-6 col-md-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100 bg-primary bg-gradient text-white", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white-50 mb-1 small", children: "TOTAL" }), _jsx("h3", { className: "mb-0 fw-bold", children: totalProdutos }), _jsxs("small", { className: "text-white-50", children: ["produto", totalProdutos !== 1 ? 's' : ''] })] }), _jsx("div", { className: "bg-white bg-opacity-25 rounded-3 p-2", children: _jsx("i", { className: "bi bi-box-seam fs-3" }) })] }) }) }) }), _jsx("div", { className: "col-6 col-md-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100 bg-success bg-gradient text-white", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white-50 mb-1 small", children: "ATIVOS" }), _jsx("h3", { className: "mb-0 fw-bold", children: produtosAtivos }), _jsx("small", { className: "text-white-50", children: "em uso" })] }), _jsx("div", { className: "bg-white bg-opacity-25 rounded-3 p-2", children: _jsx("i", { className: "bi bi-check-circle fs-3" }) })] }) }) }) }), _jsx("div", { className: "col-6 col-md-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100 bg-warning bg-gradient text-white", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white-50 mb-1 small", children: "BAIXO ESTOQUE" }), _jsx("h3", { className: "mb-0 fw-bold", children: produtosBaixoEstoque }), _jsx("small", { className: "text-white-50", children: "aten\u00E7\u00E3o necess\u00E1ria" })] }), _jsx("div", { className: "bg-white bg-opacity-25 rounded-3 p-2", children: _jsx("i", { className: "bi bi-exclamation-triangle fs-3" }) })] }) }) }) }), _jsx("div", { className: "col-6 col-md-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100 bg-info bg-gradient text-white", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white-50 mb-1 small", children: "VALOR TOTAL" }), _jsxs("h3", { className: "mb-0 fw-bold", children: ["R$ ", valorTotalEstoque.toLocaleString('pt-BR', { maximumFractionDigits: 0 })] }), _jsx("small", { className: "text-white-50", children: "em estoque" })] }), _jsx("div", { className: "bg-white bg-opacity-25 rounded-3 p-2", children: _jsx("i", { className: "bi bi-cash-coin fs-3" }) })] }) }) }) })] }), _jsxs("div", { className: "card border-0 shadow-sm", children: [_jsx("div", { className: "card-header bg-primary text-white py-3", children: _jsxs("h5", { className: "mb-0", children: [_jsx("i", { className: "bi bi-list-ul me-2" }), "Lista de Produtos", _jsx("span", { className: "badge bg-white text-primary ms-2", children: produtos.length })] }) }), _jsx("div", { className: "card-body p-0", children: _jsx(DataTable, { data: produtos, columns: columns, loading: isLoading, emptyMessage: "Nenhum produto encontrado com os filtros aplicados" }) })] }), _jsx(ModalForm, { isOpen: showCreateModal || !!editingProduto, title: editingProduto ? 'Editar Produto' : 'Novo Produto', onClose: handleCloseModal, children: _jsx(ProdutoForm, { produto: editingProduto || undefined, onSave: handleSaveProduto, onCancel: handleCloseModal }) }), _jsx(ConfirmDialog, { isOpen: !!deleteProduto, title: "Excluir Produto", message: `Tem certeza que deseja excluir o produto "${deleteProduto?.nome}"? Esta ação não pode ser desfeita.`, confirmText: "Excluir", cancelText: "Cancelar", type: "danger", onConfirm: confirmDelete, onCancel: () => setDeleteProduto(null) })] }));
};
export default ProdutosList;
