import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo } from 'react';
export const TalhoesMultiSelect = ({ talhoes, selectedIds, onChange, disabled = false, }) => {
    // Agrupar talhões por fazenda
    const talhoesPorFazenda = useMemo(() => {
        const grupos = {};
        talhoes.forEach(talhao => {
            const key = `${talhao.fazenda_id ?? 'unknown'}`;
            if (!grupos[key]) {
                grupos[key] = {
                    fazenda_id: talhao.fazenda_id ?? 0,
                    fazenda_nome: talhao.fazenda_nome ?? 'Desconhecida',
                    talhoes: [],
                };
            }
            grupos[key].talhoes.push(talhao);
        });
        return Object.values(grupos).sort((a, b) => a.fazenda_nome.localeCompare(b.fazenda_nome));
    }, [talhoes]);
    // Calcular área total selecionada
    const areaTotal = useMemo(() => {
        return talhoes
            .filter(t => selectedIds.includes(t.id))
            .reduce((sum, t) => sum + (t.area_hectares || 0), 0);
    }, [talhoes, selectedIds]);
    const handleToggle = (talhaoId) => {
        if (disabled)
            return;
        if (selectedIds.includes(talhaoId)) {
            onChange(selectedIds.filter(id => id !== talhaoId));
        }
        else {
            onChange([...selectedIds, talhaoId]);
        }
    };
    const handleToggleFazenda = (fazendaId) => {
        if (disabled)
            return;
        const talhoesDestaFazenda = talhoes
            .filter(t => t.fazenda_id === fazendaId)
            .map(t => t.id);
        const todosSelecionados = talhoesDestaFazenda.every(id => selectedIds.includes(id));
        if (todosSelecionados) {
            // Desmarcar todos desta fazenda
            onChange(selectedIds.filter(id => !talhoesDestaFazenda.includes(id)));
        }
        else {
            // Marcar todos desta fazenda
            const novosIds = [...selectedIds];
            talhoesDestaFazenda.forEach(id => {
                if (!novosIds.includes(id)) {
                    novosIds.push(id);
                }
            });
            onChange(novosIds);
        }
    };
    return (_jsxs("div", { children: [_jsx("div", { className: "border rounded p-3", style: { maxHeight: '300px', overflowY: 'auto' }, children: talhoesPorFazenda.length === 0 ? (_jsxs("div", { className: "text-muted text-center py-3", children: [_jsx("i", { className: "bi bi-info-circle me-2" }), "Nenhum talh\u00E3o dispon\u00EDvel"] })) : (talhoesPorFazenda.map(grupo => {
                    const talhoesIds = grupo.talhoes.map(t => t.id);
                    const todosSelecionados = talhoesIds.every(id => selectedIds.includes(id));
                    const algunsSelecionados = talhoesIds.some(id => selectedIds.includes(id)) && !todosSelecionados;
                    return (_jsxs("div", { className: "mb-3", children: [_jsxs("div", { className: "d-flex align-items-center mb-2 p-2 bg-light rounded cursor-pointer", onClick: () => handleToggleFazenda(grupo.fazenda_id), style: { cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }, children: [_jsx("input", { type: "checkbox", className: "form-check-input me-2", checked: todosSelecionados, ref: input => {
                                            if (input)
                                                input.indeterminate = algunsSelecionados;
                                        }, onChange: () => handleToggleFazenda(grupo.fazenda_id), disabled: disabled, style: { cursor: disabled ? 'not-allowed' : 'pointer' } }), _jsx("strong", { children: grupo.fazenda_nome }), _jsxs("span", { className: "ms-auto text-muted small", children: [grupo.talhoes.length, " talh\u00E3o(\u00F5es)"] })] }), _jsx("div", { className: "ps-4", children: grupo.talhoes.map(talhao => (_jsxs("div", { className: "form-check mb-1", style: { cursor: disabled ? 'not-allowed' : 'pointer' }, children: [_jsx("input", { type: "checkbox", className: "form-check-input", id: `talhao-${talhao.id}`, checked: selectedIds.includes(talhao.id), onChange: () => handleToggle(talhao.id), disabled: disabled, style: { cursor: disabled ? 'not-allowed' : 'pointer' } }), _jsxs("label", { className: "form-check-label w-100", htmlFor: `talhao-${talhao.id}`, style: { cursor: disabled ? 'not-allowed' : 'pointer' }, children: [_jsx("span", { children: talhao.name }), _jsxs("span", { className: "text-muted small ms-2", children: ["(", talhao.area_hectares?.toFixed(2) || '?', " ha)"] })] })] }, talhao.id))) })] }, grupo.fazenda_id));
                })) }), selectedIds.length > 0 && (_jsx("div", { className: "mt-2 p-2 bg-light rounded", children: _jsxs("small", { className: "text-muted", children: [_jsx("i", { className: "bi bi-check-circle me-1" }), _jsx("strong", { children: selectedIds.length }), " talh\u00E3o(\u00F5es) selecionado(s)", ' • ', _jsxs("strong", { children: [areaTotal.toFixed(2), " ha"] }), " total"] }) }))] }));
};
