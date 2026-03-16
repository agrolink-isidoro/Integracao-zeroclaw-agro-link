import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useMemo } from 'react';
import { useApiQuery, useApiDelete } from '../../hooks/useApi';
import DataTable from '../../components/common/DataTable';
import ModalForm from '../../components/common/ModalForm';
import ErrorMessage from '../../components/common/ErrorMessage';
import AreasForm from './AreasForm';
const AreasList = () => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingArea, setEditingArea] = useState();
    // Queries
    const { data: areasData, isLoading, error, refetch } = useApiQuery(['areas'], '/areas/');
    // Extract features array from GeoJSON FeatureCollection and convert to Area objects
    const areas = (areasData?.features || []).map(feature => ({
        ...feature.properties,
        id: feature.id
    }));
    const deleteMutation = useApiDelete('/areas/', [['areas']]);
    // Separar áreas próprias e arrendadas
    const { areasProprias, areasArrendadas, stats } = useMemo(() => {
        const proprias = areas.filter(a => a.tipo === 'propria' || !a.tipo);
        const arrendadas = areas.filter(a => a.tipo === 'arrendada');
        const totalProprias = proprias.reduce((sum, a) => sum + (a.area_hectares || 0), 0);
        const totalArrendadas = arrendadas.reduce((sum, a) => sum + (a.area_hectares || 0), 0);
        const totalGeral = totalProprias + totalArrendadas;
        return {
            areasProprias: proprias,
            areasArrendadas: arrendadas,
            stats: {
                totalProprias,
                totalArrendadas,
                totalGeral,
                countProprias: proprias.length,
                countArrendadas: arrendadas.length
            }
        };
    }, [areas]);
    const handleDelete = async (area) => {
        if (!window.confirm(`Tem certeza que deseja remover a área "${area.name}"?`)) {
            return;
        }
        // Coerce/validate id before sending delete request and provide better logs
        const rawId = area.id;
        const numericId = Number(rawId);
        const idToSend = Number.isFinite(numericId) ? numericId : String(rawId);
        console.debug('Deleting area', { name: area.name, rawId, idToSend });
        try {
            await deleteMutation.mutateAsync(idToSend);
        }
        catch (error) {
            // Try to surface more details from Axios error (status, payload)
            console.error('Error deleting area:', {
                message: error?.message,
                status: error?.response?.status,
                data: error?.response?.data,
                original: error
            });
            alert('Erro ao remover área. Tente novamente.');
        }
    };
    const getColumns = (tipo) => [
        {
            key: 'name',
            header: 'Nome',
            sortable: true,
            render: (value) => (_jsxs("span", { className: "fw-semibold text-dark", children: [_jsx("i", { className: "bi bi-geo-alt-fill me-2 text-primary" }), value] }))
        },
        {
            key: 'fazenda',
            header: 'Fazenda',
            render: (value, _item) => (_jsxs("span", { className: "badge bg-info text-dark", children: [_jsx("i", { className: "bi bi-house-door me-1" }), "Fazenda ", value] })),
            sortable: true
        },
        {
            key: 'proprietario',
            header: 'Proprietário',
            render: (value, _item) => (_jsxs("span", { className: "text-muted", children: [_jsx("i", { className: "bi bi-person me-1" }), "Propriet\u00E1rio ", value] })),
            sortable: true
        },
        {
            key: 'area_hectares',
            header: 'Área',
            render: (value) => value ? (_jsxs("span", { className: "badge bg-success-subtle text-success fs-6", children: [_jsx("i", { className: "bi bi-rulers me-1" }), Number(value).toFixed(2), " ha"] })) : 'N/A',
            sortable: true
        },
        ...(tipo === 'arrendada' ? [{
                key: 'custo_arrendamento',
                header: 'Custo Arrendamento',
                render: (value) => value ? (_jsxs("span", { className: "text-success fw-semibold", children: [_jsx("i", { className: "bi bi-cash-coin me-1" }), "R$ ", Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })] })) : 'N/A',
                sortable: true
            }] : []),
        {
            key: 'actions',
            header: 'Ações',
            render: (_value, item) => (_jsxs("div", { className: "d-flex gap-2", children: [_jsx("button", { onClick: () => setEditingArea(item), className: "btn btn-sm btn-primary", title: "Editar \u00E1rea", children: _jsx("i", { className: "bi bi-pencil" }) }), _jsx("button", { onClick: () => handleDelete(item), className: "btn btn-sm btn-danger", title: "Remover \u00E1rea", children: _jsx("i", { className: "bi bi-trash" }) })] }))
        }
    ];
    const handleModalClose = () => {
        setShowCreateModal(false);
        setEditingArea(undefined);
    };
    const handleFormSuccess = async () => {
        await refetch();
        handleModalClose();
    };
    if (error) {
        return (_jsx("div", { className: "p-6", children: _jsx(ErrorMessage, { message: "Erro ao carregar \u00E1reas" }) }));
    }
    return (_jsxs("div", { className: "p-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-4", children: [_jsxs("div", { children: [_jsxs("h1", { className: "h2 mb-1", children: [_jsx("i", { className: "bi bi-map text-primary me-2" }), "Gest\u00E3o de \u00C1reas"] }), _jsx("p", { className: "text-muted mb-0", children: "Gerencie \u00E1reas pr\u00F3prias e arrendadas" })] }), _jsxs("button", { onClick: () => setShowCreateModal(true), className: "btn btn-success btn-lg shadow-sm", children: [_jsx("i", { className: "bi bi-plus-circle me-2" }), "Nova \u00C1rea"] })] }), _jsxs("div", { className: "row g-3 mb-4", children: [_jsx("div", { className: "col-6 col-md-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100 bg-primary bg-gradient text-white", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white-50 mb-1 small", children: "TOTAL GERAL" }), _jsxs("h3", { className: "mb-0 fw-bold", children: [stats.totalGeral.toFixed(2), " ha"] }), _jsxs("small", { className: "text-white-50", children: [stats.countProprias + stats.countArrendadas, " \u00E1reas"] })] }), _jsx("div", { className: "bg-white bg-opacity-25 rounded-3 p-2", children: _jsx("i", { className: "bi bi-globe fs-3" }) })] }) }) }) }), _jsx("div", { className: "col-6 col-md-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100 bg-success bg-gradient text-white", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white-50 mb-1 small", children: "\u00C1REAS PR\u00D3PRIAS" }), _jsxs("h3", { className: "mb-0 fw-bold", children: [stats.totalProprias.toFixed(2), " ha"] }), _jsxs("small", { className: "text-white-50", children: [stats.countProprias, " \u00E1rea", stats.countProprias !== 1 ? 's' : ''] })] }), _jsx("div", { className: "bg-white bg-opacity-25 rounded-3 p-2", children: _jsx("i", { className: "bi bi-house-check fs-3" }) })] }) }) }) }), _jsx("div", { className: "col-6 col-md-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100 bg-warning bg-gradient text-white", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white-50 mb-1 small", children: "ARRENDADAS" }), _jsxs("h3", { className: "mb-0 fw-bold", children: [stats.totalArrendadas.toFixed(2), " ha"] }), _jsxs("small", { className: "text-white-50", children: [stats.countArrendadas, " \u00E1rea", stats.countArrendadas !== 1 ? 's' : ''] })] }), _jsx("div", { className: "bg-white bg-opacity-25 rounded-3 p-2", children: _jsx("i", { className: "bi bi-arrow-left-right fs-3" }) })] }) }) }) }), _jsx("div", { className: "col-6 col-md-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100 bg-info bg-gradient text-white", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white-50 mb-1 small", children: "PERCENTUAL" }), _jsxs("h3", { className: "mb-0 fw-bold", children: [stats.totalGeral > 0 ? ((stats.totalProprias / stats.totalGeral) * 100).toFixed(1) : 0, "%"] }), _jsx("small", { className: "text-white-50", children: "pr\u00F3prias" })] }), _jsx("div", { className: "bg-white bg-opacity-25 rounded-3 p-2", children: _jsx("i", { className: "bi bi-pie-chart fs-3" }) })] }) }) }) })] }), _jsxs("div", { className: "card border-0 shadow-sm mb-4", children: [_jsx("div", { className: "card-header bg-success text-white py-3", children: _jsxs("h5", { className: "mb-0", children: [_jsx("i", { className: "bi bi-house-check me-2" }), "\u00C1reas Pr\u00F3prias", _jsx("span", { className: "badge bg-white text-success ms-2", children: stats.countProprias })] }) }), _jsx("div", { className: "card-body p-0", children: _jsx(DataTable, { data: areasProprias, columns: getColumns('propria'), loading: isLoading, emptyMessage: "Nenhuma \u00E1rea pr\u00F3pria cadastrada" }) }), areasProprias.length > 0 && (_jsx("div", { className: "card-footer bg-light border-top", children: _jsxs("div", { className: "d-flex justify-content-between align-items-center", children: [_jsxs("span", { className: "text-muted", children: [_jsx("i", { className: "bi bi-info-circle me-1" }), "Total de \u00E1reas pr\u00F3prias"] }), _jsxs("div", { className: "d-flex align-items-center gap-3", children: [_jsxs("span", { className: "text-muted", children: [stats.countProprias, " \u00E1rea", stats.countProprias !== 1 ? 's' : ''] }), _jsxs("span", { className: "badge bg-success fs-6 px-3 py-2", children: [_jsx("i", { className: "bi bi-rulers me-2" }), stats.totalProprias.toFixed(2), " ha"] })] })] }) }))] }), _jsxs("div", { className: "card border-0 shadow-sm mb-4", children: [_jsx("div", { className: "card-header bg-warning text-white py-3", children: _jsxs("h5", { className: "mb-0", children: [_jsx("i", { className: "bi bi-arrow-left-right me-2" }), "\u00C1reas Arrendadas", _jsx("span", { className: "badge bg-white text-warning ms-2", children: stats.countArrendadas })] }) }), _jsx("div", { className: "card-body p-0", children: _jsx(DataTable, { data: areasArrendadas, columns: getColumns('arrendada'), loading: isLoading, emptyMessage: "Nenhuma \u00E1rea arrendada cadastrada" }) }), areasArrendadas.length > 0 && (_jsx("div", { className: "card-footer bg-light border-top", children: _jsxs("div", { className: "d-flex justify-content-between align-items-center", children: [_jsxs("span", { className: "text-muted", children: [_jsx("i", { className: "bi bi-info-circle me-1" }), "Total de \u00E1reas arrendadas"] }), _jsxs("div", { className: "d-flex align-items-center gap-3", children: [_jsxs("span", { className: "text-muted", children: [stats.countArrendadas, " \u00E1rea", stats.countArrendadas !== 1 ? 's' : ''] }), _jsxs("span", { className: "badge bg-warning fs-6 px-3 py-2", children: [_jsx("i", { className: "bi bi-rulers me-2" }), stats.totalArrendadas.toFixed(2), " ha"] })] })] }) }))] }), _jsx(ModalForm, { isOpen: showCreateModal, title: "Nova \u00C1rea", onClose: handleModalClose, children: _jsx(AreasForm, { onSuccess: handleFormSuccess, onCancel: handleModalClose }) }), _jsx(ModalForm, { isOpen: !!editingArea, title: "Editar \u00C1rea", onClose: handleModalClose, children: editingArea && (_jsx(AreasForm, { area: editingArea, onSuccess: handleFormSuccess, onCancel: handleModalClose })) })] }));
};
export default AreasList;
