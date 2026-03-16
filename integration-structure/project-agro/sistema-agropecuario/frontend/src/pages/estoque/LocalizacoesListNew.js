import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import localizacoesService from '../../services/localizacoes';
import LocalizacaoForm from './LocalizacaoForm';
const LocalizacoesListNew = () => {
    const [localizacoes, setLocalizacoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [tipoFilter, setTipoFilter] = useState('');
    const [ativaFilter, setAtivaFilter] = useState('');
    const [showFormModal, setShowFormModal] = useState(false);
    const [selectedLocalizacao, setSelectedLocalizacao] = useState();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [localizacaoToDelete, setLocalizacaoToDelete] = useState(null);
    useEffect(() => {
        console.log('LocalizacoesListNew: componente montado');
        carregarLocalizacoes();
    }, [page, rowsPerPage, searchTerm, tipoFilter, ativaFilter]);
    const carregarLocalizacoes = async () => {
        console.log('Carregando localizações...');
        setLoading(true);
        setError(null);
        try {
            console.log('Chamando API...');
            const response = await localizacoesService.listar({
                page: page + 1,
                page_size: rowsPerPage,
                search: searchTerm || undefined,
                tipo: tipoFilter || undefined,
                ativa: ativaFilter === '' ? undefined : ativaFilter,
                ordering: '-id',
            });
            console.log('Resposta da API:', response);
            setLocalizacoes(response.results);
            setTotalCount(response.count);
        }
        catch (err) {
            console.error('Erro ao carregar localizações:', err);
            setError(err.response?.data?.message || err.message || 'Erro ao carregar localizações');
            setLocalizacoes([]);
            setTotalCount(0);
        }
        finally {
            setLoading(false);
        }
    };
    const handleOpenForm = (localizacao) => {
        setSelectedLocalizacao(localizacao);
        setShowFormModal(true);
    };
    const handleCloseForm = () => {
        setSelectedLocalizacao(undefined);
        setShowFormModal(false);
    };
    const handleSave = async (data) => {
        try {
            if (selectedLocalizacao?.id) {
                await localizacoesService.atualizarParcial(selectedLocalizacao.id, data);
                setSuccess('Localização atualizada com sucesso!');
            }
            else {
                await localizacoesService.criar(data);
                setSuccess('Localização criada com sucesso!');
            }
            handleCloseForm();
            carregarLocalizacoes();
        }
        catch (err) {
            throw new Error(err.response?.data?.message || 'Erro ao salvar localização');
        }
    };
    const handleOpenDelete = (localizacao) => {
        setLocalizacaoToDelete(localizacao);
        setShowDeleteModal(true);
    };
    const handleCloseDelete = () => {
        setLocalizacaoToDelete(null);
        setShowDeleteModal(false);
    };
    const handleDelete = async () => {
        if (!localizacaoToDelete)
            return;
        try {
            await localizacoesService.deletar(localizacaoToDelete.id);
            setSuccess('Localização excluída com sucesso!');
            handleCloseDelete();
            carregarLocalizacoes();
        }
        catch (err) {
            setError(err.response?.data?.message || 'Erro ao excluir localização');
            handleCloseDelete();
        }
    };
    const getOcupacaoColor = (percentual) => {
        if (percentual < 70)
            return 'success';
        if (percentual < 90)
            return 'warning';
        return 'danger';
    };
    const totalPages = Math.ceil(totalCount / rowsPerPage);
    const startItem = page * rowsPerPage + 1;
    const endItem = Math.min((page + 1) * rowsPerPage, totalCount);
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-4", children: [_jsxs("div", { children: [_jsxs("h2", { children: [_jsx("i", { className: "bi bi-geo-alt me-2" }), "Localiza\u00E7\u00F5es de Estoque"] }), _jsx("p", { className: "text-muted mb-0", children: "Gerenciamento de locais de armazenamento" })] }), _jsxs("button", { className: "btn btn-primary", onClick: () => handleOpenForm(), children: [_jsx("i", { className: "bi bi-plus-circle me-2" }), "Nova Localiza\u00E7\u00E3o"] })] }), loading && !error && localizacoes.length === 0 && (_jsxs("div", { className: "alert alert-info", children: [_jsx("i", { className: "bi bi-hourglass-split me-2" }), "Carregando localiza\u00E7\u00F5es..."] })), error && (_jsxs("div", { className: "alert alert-danger alert-dismissible fade show", children: [error, _jsx("button", { type: "button", className: "btn-close", onClick: () => setError(null) })] })), success && (_jsxs("div", { className: "alert alert-success alert-dismissible fade show", children: [success, _jsx("button", { type: "button", className: "btn-close", onClick: () => setSuccess(null) })] })), _jsx("div", { className: "card mb-3", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "row g-3", children: [_jsx("div", { className: "col-md-4", children: _jsx("input", { type: "text", className: "form-control", placeholder: "Buscar...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value) }) }), _jsx("div", { className: "col-md-3", children: _jsxs("select", { className: "form-select", value: tipoFilter, onChange: (e) => setTipoFilter(e.target.value), children: [_jsx("option", { value: "", children: "Todos os tipos" }), _jsx("option", { value: "interna", children: "Interna" }), _jsx("option", { value: "externa", children: "Externa" })] }) }), _jsx("div", { className: "col-md-3", children: _jsxs("select", { className: "form-select", value: String(ativaFilter), onChange: (e) => setAtivaFilter(e.target.value === '' ? '' : e.target.value === 'true'), children: [_jsx("option", { value: "", children: "Todos os status" }), _jsx("option", { value: "true", children: "Ativa" }), _jsx("option", { value: "false", children: "Inativa" })] }) }), _jsx("div", { className: "col-md-2", children: _jsxs("button", { className: "btn btn-outline-secondary w-100", onClick: carregarLocalizacoes, children: [_jsx("i", { className: "bi bi-arrow-clockwise me-2" }), "Atualizar"] }) })] }) }) }), _jsx("div", { className: "card", children: _jsxs("div", { className: "card-body", children: [loading && _jsx("div", { className: "progress mb-3", style: { height: '3px' }, children: _jsx("div", { className: "progress-bar progress-bar-striped progress-bar-animated w-100" }) }), _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Nome" }), _jsx("th", { children: "Tipo" }), _jsx("th", { children: "Endere\u00E7o" }), _jsx("th", { className: "text-end", children: "Capacidade" }), _jsx("th", { children: "Ocupa\u00E7\u00E3o" }), _jsx("th", { children: "Status" }), _jsx("th", { className: "text-center", children: "A\u00E7\u00F5es" })] }) }), _jsx("tbody", { children: localizacoes.length === 0 && !loading ? (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: "text-center py-4 text-muted", children: "Nenhuma localiza\u00E7\u00E3o encontrada" }) })) : (localizacoes.map((loc) => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("strong", { children: loc.nome }) }), _jsx("td", { children: _jsx("span", { className: `badge bg-${loc.tipo === 'interna' ? 'primary' : 'secondary'}`, children: loc.tipo === 'interna' ? 'Interna' : 'Externa' }) }), _jsx("td", { children: _jsx("small", { className: "text-muted", children: loc.endereco || '-' }) }), _jsx("td", { className: "text-end", children: loc.capacidade_total.toLocaleString('pt-BR') }), _jsx("td", { children: _jsxs("div", { className: "d-flex align-items-center gap-2", children: [_jsx("div", { className: "progress flex-grow-1", style: { height: '8px', minWidth: '100px' }, children: _jsx("div", { className: `progress-bar bg-${getOcupacaoColor(loc.percentual_ocupacao)}`, style: { width: `${loc.percentual_ocupacao}%` } }) }), _jsxs("small", { style: { minWidth: '45px' }, children: [loc.percentual_ocupacao.toFixed(1), "%"] })] }) }), _jsx("td", { children: _jsx("span", { className: `badge bg-${loc.ativa ? 'success' : 'secondary'}`, children: loc.ativa ? 'Ativa' : 'Inativa' }) }), _jsx("td", { className: "text-center", children: _jsxs("div", { className: "btn-group btn-group-sm", children: [_jsx("button", { className: "btn btn-outline-primary", onClick: () => handleOpenForm(loc), children: _jsx("i", { className: "bi bi-pencil" }) }), _jsx("button", { className: "btn btn-outline-danger", onClick: () => handleOpenDelete(loc), children: _jsx("i", { className: "bi bi-trash" }) })] }) })] }, loc.id)))) })] }) }), totalCount > 0 && (_jsxs("div", { className: "d-flex justify-content-between align-items-center mt-3", children: [_jsxs("div", { className: "text-muted", children: ["Mostrando ", startItem, " a ", endItem, " de ", totalCount] }), _jsx("nav", { children: _jsxs("ul", { className: "pagination pagination-sm mb-0", children: [_jsx("li", { className: `page-item ${page === 0 ? 'disabled' : ''}`, children: _jsx("button", { className: "page-link", onClick: () => setPage(page - 1), children: "Anterior" }) }), _jsx("li", { className: `page-item ${page >= totalPages - 1 ? 'disabled' : ''}`, children: _jsx("button", { className: "page-link", onClick: () => setPage(page + 1), children: "Pr\u00F3ximo" }) })] }) })] }))] }) }), showFormModal && (_jsx("div", { className: "modal show d-block", tabIndex: -1, style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog modal-lg", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: selectedLocalizacao ? 'Editar Localização' : 'Nova Localização' }), _jsx("button", { type: "button", className: "btn-close", onClick: handleCloseForm })] }), _jsx("div", { className: "modal-body", children: _jsx(LocalizacaoForm, { localizacao: selectedLocalizacao, onSave: handleSave, onCancel: handleCloseForm }) })] }) }) })), showDeleteModal && (_jsx("div", { className: "modal show d-block", tabIndex: -1, style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: "Confirmar Exclus\u00E3o" }), _jsx("button", { type: "button", className: "btn-close", onClick: handleCloseDelete })] }), _jsx("div", { className: "modal-body", children: _jsxs("p", { children: ["Tem certeza que deseja excluir a localiza\u00E7\u00E3o ", _jsx("strong", { children: localizacaoToDelete?.nome }), "?"] }) }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { className: "btn btn-secondary", onClick: handleCloseDelete, children: "Cancelar" }), _jsxs("button", { className: "btn btn-danger", onClick: handleDelete, children: [_jsx("i", { className: "bi bi-trash me-2" }), "Excluir"] })] })] }) }) }))] }));
};
export default LocalizacoesListNew;
