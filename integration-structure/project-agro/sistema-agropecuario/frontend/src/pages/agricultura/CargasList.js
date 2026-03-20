import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import cargasService from '../../services/cargas';
const CargasList = () => {
    const [loading, setLoading] = useState(true);
    const [cargas, setCargas] = useState([]);
    const [error, setError] = useState(null);
    // Modal de registro de chegada
    const [modalOpen, setModalOpen] = useState(false);
    const [cargaSelecionada, setCargaSelecionada] = useState(null);
    const [pesoBalanca, setPesoBalanca] = useState('');
    const [salvando, setSalvando] = useState(false);
    useEffect(() => {
        carregarCargas();
    }, []);
    const carregarCargas = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await cargasService.listar();
            setCargas(response.results);
        }
        catch (err) {
            console.error('Erro ao carregar cargas:', err);
            setError('Erro ao carregar cargas');
        }
        finally {
            setLoading(false);
        }
    };
    const abrirModalChegada = (carga) => {
        setCargaSelecionada(carga);
        setPesoBalanca(carga.peso_bruto?.toString() || '');
        setModalOpen(true);
    };
    const fecharModal = () => {
        setModalOpen(false);
        setCargaSelecionada(null);
        setPesoBalanca('');
    };
    const handleRegistrarChegada = async () => {
        if (!cargaSelecionada || !pesoBalanca)
            return;
        setSalvando(true);
        try {
            await cargasService.registrarChegada(cargaSelecionada.id, {
                peso_balanca: parseFloat(pesoBalanca)
            });
            alert('Chegada registrada com sucesso!');
            fecharModal();
            carregarCargas();
        }
        catch (err) {
            console.error('Erro ao registrar chegada:', err);
            alert(err.response?.data?.error || 'Erro ao registrar chegada');
        }
        finally {
            setSalvando(false);
        }
    };
    const getStatusBadge = (reconciled) => {
        return reconciled ? 'badge bg-success' : 'badge bg-warning';
    };
    const getStatusLabel = (reconciled) => {
        return reconciled ? 'Entregue' : 'Em Trânsito';
    };
    if (loading) {
        return (_jsx("div", { className: "container-fluid", children: _jsxs("div", { className: "text-center py-5", children: [_jsx("div", { className: "spinner-border text-primary", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Carregando..." }) }), _jsx("p", { className: "mt-3", children: "Carregando movimenta\u00E7\u00F5es..." })] }) }));
    }
    return (_jsxs("div", { className: "container-fluid", children: [_jsx("div", { className: "row", children: _jsx("div", { className: "col-12", children: _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-header", children: _jsxs("h3", { className: "card-title", children: [_jsx("i", { className: "bi bi-truck me-2" }), "Movimenta\u00E7\u00F5es de Carga"] }) }), _jsxs("div", { className: "card-body", children: [error && (_jsxs("div", { className: "alert alert-danger", role: "alert", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-2" }), error] })), cargas.length === 0 ? (_jsxs("div", { className: "alert alert-info text-center", children: [_jsx("i", { className: "bi bi-info-circle me-2" }), "Nenhuma movimenta\u00E7\u00E3o encontrada"] })) : (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Placa" }), _jsx("th", { children: "Motorista" }), _jsx("th", { className: "text-end", children: "Peso Estimado (kg)" }), _jsx("th", { className: "text-end", children: "Peso Balan\u00E7a (kg)" }), _jsx("th", { className: "text-end", children: "Diferen\u00E7a (kg)" }), _jsx("th", { children: "Destino" }), _jsx("th", { className: "text-center", children: "Status" }), _jsx("th", { className: "text-center", children: "A\u00E7\u00F5es" })] }) }), _jsx("tbody", { children: cargas.map(carga => {
                                                        const diferenca = carga.peso_bruto && carga.peso_liquido
                                                            ? carga.peso_bruto - carga.peso_liquido
                                                            : null;
                                                        return (_jsxs("tr", { children: [_jsx("td", { children: carga.placa || '-' }), _jsx("td", { children: carga.motorista || '-' }), _jsx("td", { className: "text-end", children: carga.peso_liquido?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '-' }), _jsx("td", { className: "text-end", children: carga.peso_bruto?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '-' }), _jsx("td", { className: "text-end", children: diferenca !== null ? (_jsxs("span", { className: diferenca > 0 ? 'text-success' : diferenca < 0 ? 'text-danger' : '', children: [diferenca > 0 ? '+' : '', diferenca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })] })) : '-' }), _jsx("td", { children: carga.local_destino_nome || carga.empresa_destino_nome || '-' }), _jsx("td", { className: "text-center", children: _jsx("span", { className: getStatusBadge(carga.reconciled), children: getStatusLabel(carga.reconciled) }) }), _jsx("td", { className: "text-center", children: !carga.reconciled && (_jsxs("button", { className: "btn btn-sm btn-primary", onClick: () => abrirModalChegada(carga), title: "Registrar Chegada", children: [_jsx("i", { className: "bi bi-check-circle me-1" }), "Registrar Chegada"] })) })] }, carga.id));
                                                    }) })] }) }))] })] }) }) }), modalOpen && cargaSelecionada && (_jsx("div", { className: "modal show d-block", tabIndex: -1, style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog modal-dialog-centered", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsxs("h5", { className: "modal-title", children: [_jsx("i", { className: "bi bi-truck me-2" }), "Registrar Chegada - ", cargaSelecionada.placa] }), _jsx("button", { type: "button", className: "btn-close", onClick: fecharModal })] }), _jsxs("div", { className: "modal-body", children: [_jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Peso Estimado (kg)" }), _jsx("input", { type: "text", className: "form-control", value: cargaSelecionada.peso_liquido?.toLocaleString('pt-BR') || '-', disabled: true, style: { backgroundColor: '#e9ecef' } })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Peso da Balan\u00E7a (kg) *" }), _jsx("input", { type: "number", className: "form-control", value: pesoBalanca, onChange: (e) => setPesoBalanca(e.target.value), step: "0.01", min: "0", required: true, autoFocus: true }), _jsx("small", { className: "text-muted", children: "Informe o peso real medido na balan\u00E7a" })] }), pesoBalanca && cargaSelecionada.peso_liquido && (_jsxs("div", { className: "alert alert-info", children: [_jsx("strong", { children: "Diferen\u00E7a:" }), ' ', (parseFloat(pesoBalanca) - cargaSelecionada.peso_liquido).toLocaleString('pt-BR', { minimumFractionDigits: 2 }), " kg", ' ', "(", ((parseFloat(pesoBalanca) - cargaSelecionada.peso_liquido) / cargaSelecionada.peso_liquido * 100).toFixed(2), "%)"] }))] }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { type: "button", className: "btn btn-secondary", onClick: fecharModal, disabled: salvando, children: "Cancelar" }), _jsx("button", { type: "button", className: "btn btn-primary", onClick: handleRegistrarChegada, disabled: salvando || !pesoBalanca, children: salvando ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "spinner-border spinner-border-sm me-2", role: "status" }), "Salvando..."] })) : (_jsxs(_Fragment, { children: [_jsx("i", { className: "bi bi-check-circle me-2" }), "Registrar"] })) })] })] }) }) }))] }));
};
export default CargasList;
