import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TablePagination, Dialog, DialogTitle, DialogContent, Box, Button, TextField, Typography, Select, MenuItem, FormControl, InputLabel, CircularProgress, Alert, Tooltip, IconButton, Card, CardContent, Paper, Chip, LinearProgress, } from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon, Edit as EditIcon, Delete as DeleteIcon, Inventory as InventoryIcon } from '@mui/icons-material';
import localizacoesService from '../../services/localizacoes';
import LocalizacaoForm from './LocalizacaoForm';
const LocalizacoesList = () => {
    const [localizacoes, setLocalizacoes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    // Paginação
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [tipoFilter, setTipoFilter] = useState('');
    const [ativaFilter, setAtivaFilter] = useState('');
    // Dialogs
    const [formDialog, setFormDialog] = useState(false);
    const [selectedLocalizacao, setSelectedLocalizacao] = useState();
    const [deleteDialog, setDeleteDialog] = useState(false);
    const [localizacaoToDelete, setLocalizacaoToDelete] = useState(null);
    useEffect(() => {
        carregarLocalizacoes();
    }, [page, rowsPerPage, searchTerm, tipoFilter, ativaFilter]);
    const carregarLocalizacoes = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await localizacoesService.listar({
                page: page + 1,
                page_size: rowsPerPage,
                search: searchTerm || undefined,
                tipo: tipoFilter || undefined,
                ativa: ativaFilter === '' ? undefined : ativaFilter,
                ordering: '-criado_em',
            });
            setLocalizacoes(response.results);
            setTotalCount(response.count);
        }
        catch (err) {
            setError(err.message || 'Erro ao carregar localizações');
        }
        finally {
            setLoading(false);
        }
    };
    const handleOpenForm = (localizacao) => {
        setSelectedLocalizacao(localizacao);
        setFormDialog(true);
    };
    const handleCloseForm = () => {
        setSelectedLocalizacao(undefined);
        setFormDialog(false);
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
        setDeleteDialog(true);
    };
    const handleCloseDelete = () => {
        setLocalizacaoToDelete(null);
        setDeleteDialog(false);
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
        return 'error';
    };
    return (_jsxs(Box, { sx: { p: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }, children: [_jsx(Typography, { variant: "h4", component: "h1", children: "Localiza\u00E7\u00F5es de Estoque" }), _jsx(Button, { variant: "contained", startIcon: _jsx(AddIcon, {}), onClick: () => handleOpenForm(), children: "Nova Localiza\u00E7\u00E3o" })] }), error && (_jsx(Alert, { severity: "error", sx: { mb: 2 }, onClose: () => setError(null), children: error })), success && (_jsx(Alert, { severity: "success", sx: { mb: 2 }, onClose: () => setSuccess(null), children: success })), _jsx(Card, { sx: { mb: 3 }, children: _jsx(CardContent, { children: _jsxs(Box, { sx: { display: 'flex', gap: 2, flexWrap: 'wrap' }, children: [_jsx(TextField, { label: "Buscar", placeholder: "Nome ou endere\u00E7o...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), sx: { minWidth: 300 }, size: "small" }), _jsxs(TextField, { select: true, label: "Tipo", value: tipoFilter, onChange: (e) => setTipoFilter(e.target.value), sx: { minWidth: 150 }, size: "small", children: [_jsx(MenuItem, { value: "", children: "Todos" }), _jsx(MenuItem, { value: "interna", children: "Interna" }), _jsx(MenuItem, { value: "externa", children: "Externa" })] }), _jsxs(TextField, { select: true, label: "Status", value: ativaFilter, onChange: (e) => setAtivaFilter(e.target.value === '' ? '' : e.target.value === 'true'), sx: { minWidth: 150 }, size: "small", children: [_jsx(MenuItem, { value: "", children: "Todos" }), _jsx(MenuItem, { value: "true", children: "Ativa" }), _jsx(MenuItem, { value: "false", children: "Inativa" })] }), _jsx(Button, { variant: "outlined", startIcon: _jsx(RefreshIcon, {}), onClick: carregarLocalizacoes, size: "small", children: "Atualizar" })] }) }) }), _jsxs(TableContainer, { component: Paper, children: [loading && _jsx(LinearProgress, {}), _jsxs(Table, { children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Nome" }), _jsx(TableCell, { children: "Tipo" }), _jsx(TableCell, { children: "Endere\u00E7o" }), _jsx(TableCell, { align: "right", children: "Capacidade Total" }), _jsx(TableCell, { align: "right", children: "Ocupa\u00E7\u00E3o" }), _jsx(TableCell, { children: "Status" }), _jsx(TableCell, { align: "center", children: "A\u00E7\u00F5es" })] }) }), _jsx(TableBody, { children: localizacoes.length === 0 && !loading ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 7, align: "center", children: _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { py: 3 }, children: "Nenhuma localiza\u00E7\u00E3o encontrada" }) }) })) : (localizacoes.map((loc) => (_jsxs(TableRow, { hover: true, children: [_jsx(TableCell, { children: _jsx(Typography, { variant: "body2", fontWeight: "medium", children: loc.nome }) }), _jsx(TableCell, { children: _jsx(Chip, { label: loc.tipo === 'interna' ? 'Interna' : 'Externa', size: "small", color: loc.tipo === 'interna' ? 'primary' : 'secondary' }) }), _jsx(TableCell, { children: _jsx(Typography, { variant: "body2", color: "text.secondary", children: loc.endereco || '-' }) }), _jsx(TableCell, { align: "right", children: _jsx(Typography, { variant: "body2", children: loc.capacidade_total.toLocaleString('pt-BR') }) }), _jsx(TableCell, { align: "right", children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(Box, { sx: { flexGrow: 1, minWidth: 100 }, children: _jsx(LinearProgress, { variant: "determinate", value: loc.percentual_ocupacao, color: getOcupacaoColor(loc.percentual_ocupacao), sx: { height: 8, borderRadius: 1 } }) }), _jsxs(Typography, { variant: "body2", sx: { minWidth: 45 }, children: [loc.percentual_ocupacao.toFixed(1), "%"] })] }) }), _jsx(TableCell, { children: _jsx(Chip, { label: loc.ativa ? 'Ativa' : 'Inativa', size: "small", color: loc.ativa ? 'success' : 'default' }) }), _jsxs(TableCell, { align: "center", children: [_jsx(Tooltip, { title: "Editar", children: _jsx(IconButton, { size: "small", onClick: () => handleOpenForm(loc), color: "primary", children: _jsx(EditIcon, { fontSize: "small" }) }) }), _jsx(Tooltip, { title: "Ver Saldos", children: _jsx(IconButton, { size: "small", color: "info", children: _jsx(InventoryIcon, { fontSize: "small" }) }) }), _jsx(Tooltip, { title: "Hist\u00F3rico", children: _jsx(IconButton, { size: "small", color: "default", children: _jsx(HistoryIcon, { fontSize: "small" }) }) }), _jsx(Tooltip, { title: "Excluir", children: _jsx(IconButton, { size: "small", onClick: () => handleOpenDelete(loc), color: "error", children: _jsx(DeleteIcon, { fontSize: "small" }) }) })] })] }, loc.id)))) })] }), _jsx(TablePagination, { component: "div", count: totalCount, page: page, onPageChange: (_, newPage) => setPage(newPage), rowsPerPage: rowsPerPage, onRowsPerPageChange: (e) => {
                            setRowsPerPage(parseInt(e.target.value, 10));
                            setPage(0);
                        }, labelRowsPerPage: "Linhas por p\u00E1gina:", labelDisplayedRows: ({ from, to, count }) => `${from}-${to} de ${count}` })] }), _jsxs(Dialog, { open: formDialog, onClose: handleCloseForm, maxWidth: "md", fullWidth: true, children: [_jsx(DialogTitle, { children: selectedLocalizacao ? 'Editar Localização' : 'Nova Localização' }), _jsx(DialogContent, { children: _jsx(LocalizacaoForm, { localizacao: selectedLocalizacao, onSave: handleSave, onCancel: handleCloseForm }) })] }), _jsxs(Dialog, { open: deleteDialog, onClose: handleCloseDelete, children: [_jsx(DialogTitle, { children: "Confirmar Exclus\u00E3o" }), _jsxs(DialogContent, { children: [_jsxs(Typography, { children: ["Tem certeza que deseja excluir a localiza\u00E7\u00E3o ", _jsx("strong", { children: localizacaoToDelete?.nome }), "?"] }), _jsxs(Box, { sx: { display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }, children: [_jsx(Button, { onClick: handleCloseDelete, children: "Cancelar" }), _jsx(Button, { onClick: handleDelete, variant: "contained", color: "error", children: "Excluir" })] })] })] })] }));
};
export default LocalizacoesList;
