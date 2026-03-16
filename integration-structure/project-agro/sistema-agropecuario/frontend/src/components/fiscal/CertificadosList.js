import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, IconButton, Button, Chip, Alert, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SecurityIcon from '@mui/icons-material/Security';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import { listCertificados, deleteCertificado, setCertificadoPassword, uploadCert, syncNFesFromSefaz } from '../../services/fiscal';
import { useToast } from '../../hooks/useToast';
import TextField from '@mui/material/TextField';
import DialogContentText from '@mui/material/DialogContentText';
import LockIcon from '@mui/icons-material/Lock';
const CertificadosList = () => {
    const [certificados, setCertificados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [certificadoToDelete, setCertificadoToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [syncing, setSyncing] = useState({});
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [certToEdit, setCertToEdit] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);
    const { showSuccess, showError } = useToast();
    // Upload form state
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadName, setUploadName] = useState('');
    const [uploadPassword, setUploadPassword] = useState('');
    const [uploadTipo, setUploadTipo] = useState('p12');
    const fetchCertificados = async () => {
        try {
            setLoading(true);
            const response = await listCertificados();
            const certs = response.data?.results || response.data || [];
            setCertificados(certs);
        }
        catch (error) {
            console.error('Erro ao buscar certificados:', error);
            showError('Erro ao carregar certificados');
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchCertificados();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const handleDeleteClick = (certificado) => {
        setCertificadoToDelete(certificado);
        setDeleteDialogOpen(true);
    };
    const handleDeleteConfirm = async () => {
        if (!certificadoToDelete)
            return;
        try {
            setDeleting(true);
            await deleteCertificado(certificadoToDelete.id);
            showSuccess('Certificado excluído com sucesso');
            setDeleteDialogOpen(false);
            setCertificadoToDelete(null);
            await fetchCertificados();
        }
        catch (error) {
            console.error('Erro ao deletar certificado:', error);
            showError(error?.response?.data?.detail || 'Erro ao excluir certificado');
        }
        finally {
            setDeleting(false);
        }
    };
    const handleDeleteCancel = () => {
        setDeleteDialogOpen(false);
        setCertificadoToDelete(null);
    };
    const handleSyncClick = async (cert) => {
        // Verificar se tem senha cadastrada
        if (!cert.has_password) {
            showError('Configure a senha do certificado antes de sincronizar');
            return;
        }
        try {
            setSyncing((prev) => ({ ...prev, [cert.id]: true }));
            await syncNFesFromSefaz(cert.id);
            showSuccess('Sincronização iniciada! As NF-es serão baixadas em segundo plano.');
            // Opcional: polling ou websocket para atualizar status
            setTimeout(() => {
                fetchCertificados();
            }, 3000);
        }
        catch (error) {
            console.error('Erro ao sincronizar NF-es:', error);
            showError(error?.response?.data?.message || 'Erro ao iniciar sincronização');
        }
        finally {
            setSyncing((prev) => ({ ...prev, [cert.id]: false }));
        }
    };
    const isExpired = (validade) => {
        if (!validade)
            return false;
        const validadeDate = new Date(validade);
        return validadeDate < new Date();
    };
    const formatDate = (date) => {
        if (!date)
            return 'N/A';
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };
    const getDaysRemaining = (validade) => {
        if (!validade)
            return null;
        const validadeDate = new Date(validade);
        const hoje = new Date();
        const diffTime = validadeDate.getTime() - hoje.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };
    if (loading) {
        return (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }, children: _jsx(CircularProgress, {}) }));
    }
    return (_jsxs(Box, { children: [_jsx(Card, { sx: { mb: 3 }, children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }, children: [_jsxs(Box, { children: [_jsxs(Typography, { variant: "h5", sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(SecurityIcon, {}), "Certificados Digitais A3/A1"] }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "Gerencie os certificados digitais utilizados para manifesta\u00E7\u00E3o de NF-e" })] }), _jsx(Button, { variant: "contained", color: "primary", startIcon: _jsx("i", { className: "bi bi-plus-circle" }), onClick: () => setUploadOpen(true), children: "Novo Certificado" })] }), certificados.length === 0 && (_jsxs(Alert, { severity: "info", sx: { mt: 2 }, children: [_jsx("strong", { children: "Nenhum certificado cadastrado" }), _jsx("br", {}), "Adicione um certificado digital A3 (.pfx ou .p12) para poder manifestar NF-e junto \u00E0 SEFAZ."] }))] }) }), certificados.length > 0 && (_jsx(TableContainer, { component: Paper, children: _jsxs(Table, { children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Titular" }), _jsx(TableCell, { children: "CNPJ" }), _jsx(TableCell, { children: "Tipo" }), _jsx(TableCell, { children: "Validade" }), _jsx(TableCell, { children: "Status" }), _jsx(TableCell, { children: "Emiss\u00E3o" }), _jsx(TableCell, { align: "right", children: "A\u00E7\u00F5es" })] }) }), _jsx(TableBody, { children: certificados.map((cert) => {
                                const expired = isExpired(cert.validade);
                                const daysRemaining = getDaysRemaining(cert.validade);
                                const expiringSoon = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 30;
                                return (_jsxs(TableRow, { sx: { '&:hover': { bgcolor: 'action.hover' } }, children: [_jsxs(TableCell, { children: [_jsx(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: _jsxs(Typography, { variant: "body2", sx: { fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }, children: [cert.nome, cert.has_password ? (_jsx(Tooltip, { title: "Senha cadastrada", children: _jsx(LockIcon, { fontSize: "small", color: "action" }) })) : (_jsx(Tooltip, { title: "Sem senha cadastrada", children: _jsx(LockIcon, { fontSize: "small", color: "disabled" }) }))] }) }), cert.arquivo_name && (_jsx(Typography, { variant: "caption", color: "text.secondary", sx: { display: 'block' }, children: cert.arquivo_name }))] }), _jsx(TableCell, { children: _jsx(Typography, { variant: "body2", sx: { fontFamily: 'monospace' }, children: cert.a3_cnpj || cert.a3_cpf || 'N/A' }) }), _jsx(TableCell, { children: _jsxs(Box, { sx: { display: 'flex', gap: 0.5, flexWrap: 'wrap' }, children: [_jsx(Chip, { label: cert.tipo === 'a3' ? 'A3' : 'A1 (P12)', size: "small" }), cert.tipo_certificado && (_jsx(Chip, { label: cert.tipo_certificado, size: "small", color: cert.tipo_certificado === 'e-CNPJ' ? 'primary' : 'default', variant: "outlined" })), cert.apto_manifestacao === true && (_jsx(Tooltip, { title: "Apto para manifesta\u00E7\u00E3o de NF-e na SEFAZ", children: _jsx(Chip, { label: "Manifesta\u00E7\u00E3o", size: "small", color: "success", icon: _jsx(CheckCircleIcon, {}) }) })), cert.apto_manifestacao === false && (_jsx(Tooltip, { title: "Certificado e-CPF n\u00E3o pode manifestar. Use e-CNPJ.", children: _jsx(Chip, { label: "Sem Manifesta\u00E7\u00E3o", size: "small", color: "warning", icon: _jsx(WarningIcon, {}), variant: "outlined" }) }))] }) }), _jsxs(TableCell, { children: [_jsx(Typography, { variant: "body2", children: formatDate(cert.validade) }), daysRemaining !== null && daysRemaining > 0 && (_jsxs(Typography, { variant: "caption", color: "text.secondary", children: ["(", daysRemaining, " dias restantes)"] }))] }), _jsx(TableCell, { children: expired ? (_jsx(Chip, { label: "Expirado", color: "error", size: "small", icon: _jsx(WarningIcon, {}) })) : expiringSoon ? (_jsx(Chip, { label: "Expira em breve", color: "warning", size: "small", icon: _jsx(WarningIcon, {}) })) : (_jsx(Chip, { label: "V\u00E1lido", color: "success", size: "small", icon: _jsx(CheckCircleIcon, {}) })) }), _jsx(TableCell, { children: _jsx(Typography, { variant: "caption", color: "text.secondary", children: formatDate(cert.created_at) }) }), _jsxs(TableCell, { align: "right", children: [_jsx(Tooltip, { title: "Sincronizar NF-es da SEFAZ", children: _jsx("span", { children: _jsx(IconButton, { color: "info", size: "small", onClick: () => handleSyncClick(cert), disabled: syncing[cert.id], children: syncing[cert.id] ? _jsx(CircularProgress, { size: 20 }) : _jsx(CloudSyncIcon, {}) }) }) }), _jsx(Tooltip, { title: "Editar senha", children: _jsx(IconButton, { color: "primary", size: "small", onClick: () => { setCertToEdit(cert); setEditDialogOpen(true); setNewPassword(''); }, children: _jsx(EditIcon, {}) }) }), _jsx(Tooltip, { title: "Excluir certificado", children: _jsx(IconButton, { color: "error", size: "small", onClick: () => handleDeleteClick(cert), children: _jsx(DeleteIcon, {}) }) })] })] }, cert.id));
                            }) })] }) })), _jsxs(Dialog, { open: deleteDialogOpen, onClose: handleDeleteCancel, children: [_jsx(DialogTitle, { children: "Confirmar Exclus\u00E3o" }), _jsxs(DialogContent, { children: [_jsxs(Typography, { children: ["Tem certeza que deseja excluir o certificado ", _jsx("strong", { children: certificadoToDelete?.nome }), "?"] }), _jsx(Alert, { severity: "warning", sx: { mt: 2 }, children: "Esta a\u00E7\u00E3o n\u00E3o pode ser desfeita. Manifesta\u00E7\u00F5es j\u00E1 enviadas com este certificado n\u00E3o ser\u00E3o afetadas." })] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: handleDeleteCancel, disabled: deleting, children: "Cancelar" }), _jsx(Button, { onClick: handleDeleteConfirm, color: "error", variant: "contained", disabled: deleting, startIcon: deleting ? _jsx(CircularProgress, { size: 16 }) : _jsx(DeleteIcon, {}), children: deleting ? 'Excluindo...' : 'Excluir' })] })] }), _jsxs(Dialog, { open: editDialogOpen, onClose: () => setEditDialogOpen(false), children: [_jsx(DialogTitle, { children: "Editar Senha do Certificado" }), _jsxs(DialogContent, { children: [_jsx(DialogContentText, { children: "Informe a senha do certificado P12 para que o sistema possa usar o certificado para autentica\u00E7\u00E3o mTLS. A senha ser\u00E1 armazenada com criptografia." }), _jsx(TextField, { label: "Senha", type: "password", fullWidth: true, value: newPassword, onChange: (e) => setNewPassword(e.target.value), sx: { mt: 2 }, InputProps: { startAdornment: _jsx(LockIcon, { sx: { mr: 1 } }) } }), _jsx(TextField, { label: "Confirmar senha", type: "password", fullWidth: true, value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), sx: { mt: 2 } }), confirmPassword && newPassword !== confirmPassword && (_jsx(Alert, { severity: "error", sx: { mt: 2 }, children: "As senhas n\u00E3o conferem. Por favor, verifique." }))] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setEditDialogOpen(false), disabled: savingPassword, children: "Cancelar" }), _jsx(Button, { onClick: async () => {
                                    if (!certToEdit)
                                        return;
                                    if (!newPassword) {
                                        showError('Informe uma senha válida');
                                        return;
                                    }
                                    if (newPassword !== confirmPassword) {
                                        showError('As senhas não conferem');
                                        return;
                                    }
                                    try {
                                        setSavingPassword(true);
                                        await setCertificadoPassword(certToEdit.id, newPassword);
                                        // auditoria será criada no backend
                                        showSuccess('Senha atualizada com sucesso');
                                        setEditDialogOpen(false);
                                        setNewPassword('');
                                        setConfirmPassword('');
                                        await fetchCertificados();
                                    }
                                    catch (err) {
                                        showError(err?.response?.data?.message || 'Erro ao salvar senha');
                                    }
                                    finally {
                                        setSavingPassword(false);
                                    }
                                }, variant: "contained", disabled: savingPassword || newPassword !== confirmPassword, children: savingPassword ? 'Salvando...' : 'Salvar' })] })] }), _jsxs(Dialog, { open: uploadOpen, onClose: () => setUploadOpen(false), children: [_jsx(DialogTitle, { children: "Upload de Certificado" }), _jsxs(DialogContent, { children: [_jsx(DialogContentText, { children: "Fa\u00E7a upload de um certificado P12 (.p12/.pfx). Se o certificado estiver protegido por senha, informe a senha abaixo." }), _jsx(TextField, { label: "Nome do certificado", fullWidth: true, value: uploadName, onChange: (e) => setUploadName(e.target.value), sx: { mt: 2 } }), _jsx("input", { type: "file", accept: ".p12,.pfx", onChange: (e) => setUploadFile(e.target.files?.[0] ?? null), style: { marginTop: 12 } }), _jsx(TextField, { label: "Senha (se aplic\u00E1vel)", type: "password", fullWidth: true, value: uploadPassword, onChange: (e) => setUploadPassword(e.target.value), sx: { mt: 2 } }), _jsxs(TextField, { select: true, label: "Tipo", value: uploadTipo, onChange: (e) => setUploadTipo(e.target.value), SelectProps: { native: true }, sx: { mt: 2 }, children: [_jsx("option", { value: "p12", children: "A1 (P12)" }), _jsx("option", { value: "a3", children: "A3 (Token/HSM)" })] })] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setUploadOpen(false), disabled: uploading, children: "Cancelar" }), _jsx(Button, { onClick: async () => {
                                    if (!uploadFile) {
                                        showError('Selecione um arquivo');
                                        return;
                                    }
                                    try {
                                        setUploading(true);
                                        const fd = new FormData();
                                        fd.append('nome', uploadName || uploadFile.name);
                                        fd.append('arquivo', uploadFile);
                                        fd.append('password', uploadPassword);
                                        fd.append('tipo', uploadTipo);
                                        await uploadCert(fd);
                                        showSuccess('Certificado enviado com sucesso');
                                        setUploadOpen(false);
                                        setUploadFile(null);
                                        setUploadName('');
                                        setUploadPassword('');
                                        await fetchCertificados();
                                    }
                                    catch (err) {
                                        showError(err?.response?.data?.detail || err?.response?.data?.message || 'Erro ao enviar certificado');
                                    }
                                    finally {
                                        setUploading(false);
                                    }
                                }, variant: "contained", disabled: uploading, children: uploading ? 'Enviando...' : 'Enviar' })] })] })] }));
};
export default CertificadosList;
