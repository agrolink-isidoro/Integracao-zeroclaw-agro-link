import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Eye, Plus, Filter } from 'lucide-react';
import DataTable from '../common/DataTable';
import Button from '../Button';
import Input from '../common/Input';
import SelectDropdown from '../common/SelectDropdown';
import ConfirmDialog from '../common/ConfirmDialog';
import FornecedorForm from './FornecedorForm';
import comercialService from '../../services/comercial';
const FornecedorList = ({ onView, onEdit }) => {
    const [fornecedores, setFornecedores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingFornecedor, setEditingFornecedor] = useState();
    const [deletingFornecedor, setDeletingFornecedor] = useState(null);
    const [viewingFornecedor, setViewingFornecedor] = useState(null);
    const [filtros, setFiltros] = useState({});
    const [showFilters, setShowFilters] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    useEffect(() => {
        loadFornecedores();
    }, [filtros]);
    const loadFornecedores = async () => {
        try {
            setLoading(true);
            setErrorMsg(null);
            const data = await comercialService.getFornecedores(filtros);
            setFornecedores(data);
        }
        catch (error) {
            console.error('Erro ao carregar fornecedores:', error);
            const err = error;
            const msg = err?.message || err?.code ? `Erro ${String(err?.code || '')}: ${err?.message || ''}` : 'Erro ao carregar fornecedores';
            setErrorMsg(msg);
            setFornecedores([]);
        }
        finally {
            setLoading(false);
        }
    };
    const handleCreate = () => {
        // Debug: trace clicks for investigation when users report unresponsive button
        if (process.env.NODE_ENV === 'development') {
            console.debug('FornecedorList.handleCreate invoked');
        }
        setEditingFornecedor(undefined);
        setShowForm(true);
    };
    const handleView = (fornecedor) => {
        if (onView)
            onView(fornecedor);
        else
            setViewingFornecedor(fornecedor);
    };
    const handleEdit = (fornecedor) => {
        setEditingFornecedor(fornecedor);
        setShowForm(true);
    };
    const handleDelete = async (fornecedor) => {
        setDeletingFornecedor(fornecedor);
    };
    const confirmDelete = async () => {
        if (!deletingFornecedor)
            return;
        try {
            await comercialService.deleteFornecedor(deletingFornecedor.id);
            await loadFornecedores();
            setDeletingFornecedor(null);
        }
        catch (error) {
            console.error('Erro ao deletar fornecedor:', error);
        }
    };
    const handleSubmit = async (data) => {
        try {
            console.debug('[FornecedorList] handleSubmit called. editingFornecedor=', !!editingFornecedor, 'data keys=', Object.keys(data).slice(0, 10));
            if (editingFornecedor) {
                console.debug('[FornecedorList] calling updateFornecedor');
                await comercialService.updateFornecedor(editingFornecedor.id, data);
                console.debug('[FornecedorList] updateFornecedor resolved');
            }
            else {
                console.debug('[FornecedorList] calling createFornecedor');
                await comercialService.createFornecedor(data);
                console.debug('[FornecedorList] createFornecedor resolved');
            }
            await loadFornecedores();
            setShowForm(false);
        }
        catch (error) {
            console.error('Erro ao salvar fornecedor:', error);
            throw error;
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'ativo': return 'bg-green-100 text-green-800';
            case 'inativo': return 'bg-yellow-100 text-yellow-800';
            case 'bloqueado': return 'bg-red-100 text-red-800';
            case 'pendente': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    const getTipoPessoaColor = (tipo) => {
        return tipo === 'pj' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
    };
    const getCategoriaColor = (categoria) => {
        const colors = {
            'insumos': 'bg-green-100 text-green-800',
            'maquinas': 'bg-orange-100 text-orange-800',
            'servicos': 'bg-blue-100 text-blue-800',
            'outros': 'bg-gray-100 text-gray-800'
        };
        return colors[categoria] || colors['outros'];
    };
    const columns = [
        {
            key: 'nome',
            header: 'Nome/Razão Social',
            render: (_value, item) => (_jsxs("div", { children: [_jsx("div", { className: "font-medium text-gray-900", children: item.tipo_pessoa === 'pf' ? item.nome_completo : item.razao_social }), item.nome_fantasia && (_jsx("div", { className: "text-sm text-gray-500", children: item.nome_fantasia }))] }))
        },
        {
            key: 'cpf_cnpj',
            header: 'CPF/CNPJ',
            render: (value) => (_jsx("span", { className: "font-mono text-sm", children: value || '—' }))
        },
        {
            key: 'categoria_fornecedor',
            header: 'Categoria',
            render: (value) => {
                const label = value ? (value.charAt(0).toUpperCase() + value.slice(1)) : '—';
                return (_jsx("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${getCategoriaColor(value || 'outros')}`, children: label }));
            }
        },
        {
            key: 'tipo_pessoa',
            header: 'Tipo',
            render: (value) => {
                const label = value === 'pj' ? 'Jurídica' : (value === 'pf' ? 'Física' : '—');
                return (_jsx("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${getTipoPessoaColor(value || 'pf')}`, children: label }));
            }
        },
        {
            key: 'status',
            header: 'Status',
            render: (value) => {
                const label = value ? (value.charAt(0).toUpperCase() + value.slice(1)) : '—';
                return (_jsx("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(value || '')}`, children: label }));
            }
        },
        {
            key: 'contato.email_principal',
            header: 'Contato',
            render: (_value, item) => (_jsxs("div", { className: "text-sm", children: [_jsx("div", { children: item.contato?.telefone_principal }), _jsx("div", { className: "text-gray-500", children: item.contato?.email_principal })] }))
        },
        {
            key: 'endereco.cidade',
            header: 'Localização',
            render: (_value, item) => (_jsxs("div", { className: "text-sm", children: [_jsx("div", { children: item.endereco?.cidade }), _jsx("div", { className: "text-gray-500", children: item.endereco?.estado })] }))
        }
    ];
    const actions = (item) => (_jsxs("div", { className: "flex space-x-2", children: [_jsx(Button, { variant: "secondary", size: "sm", onClick: () => handleView(item), title: "Visualizar", children: _jsx(Eye, { size: 16 }) }), _jsx(Button, { variant: "secondary", size: "sm", onClick: () => handleEdit(item), title: "Editar", children: _jsx(Edit, { size: 16 }) }), _jsx(Button, { variant: "danger", size: "sm", onClick: () => handleDelete(item), title: "Excluir", children: _jsx(Trash2, { size: 16 }) })] }));
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("h2", { className: "text-xl font-semibold", children: "Fornecedores" }), _jsxs("div", { className: "flex space-x-2", children: [_jsxs(Button, { variant: "secondary", onClick: () => setShowFilters(!showFilters), children: [_jsx(Filter, { size: 16, className: "me-2" }), "Filtros"] }), _jsxs(Button, { onClick: handleCreate, children: [_jsx(Plus, { size: 16, className: "me-2" }), "Novo Fornecedor"] })] })] }), showFilters && (_jsxs("div", { className: "bg-gray-50 p-4 rounded-lg space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsx(Input, { label: "Buscar", placeholder: "Nome, CPF/CNPJ...", value: filtros.busca || '', onChange: (e) => setFiltros({ ...filtros, busca: e.target.value }) }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Status" }), _jsx(SelectDropdown, { value: filtros.status?.[0] || '', onChange: (value) => setFiltros({
                                            ...filtros,
                                            status: value ? [value] : undefined
                                        }), options: [
                                            { value: '', label: 'Todos' },
                                            { value: 'ativo', label: 'Ativo' },
                                            { value: 'inativo', label: 'Inativo' },
                                            { value: 'bloqueado', label: 'Bloqueado' },
                                            { value: 'pendente', label: 'Pendente' },
                                        ] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Tipo Pessoa" }), _jsx(SelectDropdown, { value: filtros.tipo_pessoa?.[0] || '', onChange: (value) => setFiltros({
                                            ...filtros,
                                            tipo_pessoa: value ? [value] : undefined
                                        }), options: [
                                            { value: '', label: 'Todos' },
                                            { value: 'pf', label: 'Pessoa Física' },
                                            { value: 'pj', label: 'Pessoa Jurídica' },
                                        ] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Categoria" }), _jsx(SelectDropdown, { value: filtros.categoria?.[0] || '', onChange: (value) => setFiltros({
                                            ...filtros,
                                            categoria: value ? [value] : undefined
                                        }), options: [
                                            { value: '', label: 'Todas' },
                                            { value: 'insumos', label: 'Insumos' },
                                            { value: 'maquinas', label: 'Máquinas' },
                                            { value: 'servicos', label: 'Serviços' },
                                            { value: 'outros', label: 'Outros' },
                                        ] })] })] }), _jsx("div", { className: "flex justify-end", children: _jsx(Button, { variant: "secondary", onClick: () => setFiltros({}), children: "Limpar Filtros" }) })] })), errorMsg && (_jsxs("div", { className: "bg-red-50 border border-red-200 text-red-800 p-3 rounded-md flex items-center justify-between", children: [_jsx("div", { children: errorMsg }), _jsx("div", { children: _jsx(Button, { variant: "secondary", onClick: loadFornecedores, children: "Tentar Novamente" }) })] })), _jsx(DataTable, { data: fornecedores.filter(f => f.id !== undefined), columns: columns, loading: loading, actions: actions, emptyMessage: "Nenhum fornecedor encontrado" }), _jsx(FornecedorForm, { isOpen: showForm, onClose: () => setShowForm(false), onSubmit: handleSubmit, fornecedor: editingFornecedor }), _jsx(ConfirmDialog, { isOpen: !!deletingFornecedor, title: "Confirmar Exclus\u00E3o", message: `Tem certeza que deseja excluir o fornecedor "${deletingFornecedor?.nome_completo || deletingFornecedor?.razao_social}"?`, onConfirm: confirmDelete, onCancel: () => setDeletingFornecedor(null), confirmText: "Excluir", cancelText: "Cancelar" }), viewingFornecedor && (_jsx("div", { className: "modal d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }, tabIndex: -1, children: _jsx("div", { className: "modal-dialog modal-dialog-centered modal-lg", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsxs("h5", { className: "modal-title", children: [_jsx("i", { className: "bi bi-building me-2" }), "Fornecedor: ", viewingFornecedor.razao_social || viewingFornecedor.nome_completo] }), _jsx("button", { type: "button", className: "btn-close", onClick: () => setViewingFornecedor(null) })] }), _jsx("div", { className: "modal-body", children: _jsxs("div", { className: "row g-3", children: [_jsxs("div", { className: "col-md-6", children: [_jsx("strong", { children: "Nome/Raz\u00E3o Social:" }), " ", viewingFornecedor.razao_social || viewingFornecedor.nome_completo || '-'] }), _jsxs("div", { className: "col-md-6", children: [_jsx("strong", { children: "Nome Fantasia:" }), " ", viewingFornecedor.nome_fantasia || '-'] }), _jsxs("div", { className: "col-md-6", children: [_jsx("strong", { children: "CPF/CNPJ:" }), " ", viewingFornecedor.cpf_cnpj || '-'] }), _jsxs("div", { className: "col-md-6", children: [_jsx("strong", { children: "Tipo:" }), " ", viewingFornecedor.tipo_pessoa === 'pj' ? 'Pessoa Jurídica' : 'Pessoa Física'] }), _jsxs("div", { className: "col-md-6", children: [_jsx("strong", { children: "Categoria:" }), " ", viewingFornecedor.categoria_fornecedor || '-'] }), _jsxs("div", { className: "col-md-6", children: [_jsx("strong", { children: "Status:" }), " ", viewingFornecedor.status || '-'] }), _jsxs("div", { className: "col-md-6", children: [_jsx("strong", { children: "Telefone:" }), " ", viewingFornecedor.contato?.telefone_principal || '-'] }), _jsxs("div", { className: "col-md-6", children: [_jsx("strong", { children: "E-mail:" }), " ", viewingFornecedor.contato?.email_principal || '-'] }), _jsxs("div", { className: "col-md-6", children: [_jsx("strong", { children: "Cidade:" }), " ", viewingFornecedor.endereco?.cidade || '-'] }), _jsxs("div", { className: "col-md-6", children: [_jsx("strong", { children: "Estado:" }), " ", viewingFornecedor.endereco?.estado || '-'] }), viewingFornecedor.observacoes && _jsxs("div", { className: "col-12", children: [_jsx("strong", { children: "Observa\u00E7\u00F5es:" }), " ", viewingFornecedor.observacoes] })] }) }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { className: "btn btn-secondary", onClick: () => setViewingFornecedor(null), children: "Fechar" }), _jsxs("button", { className: "btn btn-warning", onClick: () => { handleEdit(viewingFornecedor); setViewingFornecedor(null); }, children: [_jsx(Edit, { size: 16, className: "me-1" }), " Editar"] })] })] }) }) }))] }));
};
export default FornecedorList;
