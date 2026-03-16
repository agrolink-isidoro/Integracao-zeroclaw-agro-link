import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * DynamicSearchSelect.tsx
 *
 * Campo de busca dinâmica (autocomplete) para o TaskModal.
 * Faz busca na API com debounce e exibe dropdown com resultados.
 * Estilizado com Bootstrap (form-control / dropdown-menu).
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../../services/api';
const DynamicSearchSelect = ({ config, value, onChange, disabled = false, placeholder = 'Digite para buscar…', }) => {
    const [inputValue, setInputValue] = useState(value || '');
    const [options, setOptions] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const containerRef = useRef(null);
    const debounceRef = useRef(null);
    const debounceMs = config.debounceMs ?? 300;
    const pageSize = config.pageSize ?? 15;
    // Sync input when value prop changes externally
    useEffect(() => {
        setInputValue(value || '');
    }, [value]);
    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const doSearch = useCallback(async (term) => {
        if (!term || term.length < 2) {
            setOptions([]);
            setHasSearched(false);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const params = {
                [config.searchParam]: term,
                page_size: pageSize,
            };
            const response = await api.get(config.endpoint, { params });
            const data = response.data;
            const items = data?.results ?? (Array.isArray(data) ? data : []);
            const mapped = items.map((item) => {
                const val = String(item[config.valueField] || item.nome || item.name || item.id || '');
                let label;
                if (config.formatLabel) {
                    label = config.formatLabel(item);
                }
                else {
                    label = String(item[config.displayField] || val);
                }
                return { value: val, label };
            });
            setOptions(mapped);
            setHasSearched(true);
            setIsOpen(true);
        }
        catch {
            setOptions([]);
            setHasSearched(true);
        }
        finally {
            setIsLoading(false);
        }
    }, [config, pageSize]);
    const handleInputChange = (e) => {
        const term = e.target.value;
        setInputValue(term);
        // Clear existing debounce
        if (debounceRef.current)
            clearTimeout(debounceRef.current);
        if (!term || term.length < 2) {
            setOptions([]);
            setIsOpen(false);
            setHasSearched(false);
            // If user clears the field, clear the value
            if (!term)
                onChange('');
            return;
        }
        debounceRef.current = setTimeout(() => {
            doSearch(term);
        }, debounceMs);
    };
    const handleSelect = (opt) => {
        onChange(opt.value);
        setInputValue(opt.label !== opt.value ? `${opt.label}` : opt.value);
        setIsOpen(false);
        setHasSearched(false);
    };
    const handleFocus = () => {
        // If there are already options and user re-focuses, show them
        if (options.length > 0) {
            setIsOpen(true);
        }
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };
    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current)
                clearTimeout(debounceRef.current);
        };
    }, []);
    return (_jsxs("div", { ref: containerRef, style: { position: 'relative' }, children: [_jsxs("div", { className: "input-group input-group-sm", children: [_jsx("input", { type: "text", className: "form-control form-control-sm", value: inputValue, onChange: handleInputChange, onFocus: handleFocus, onKeyDown: handleKeyDown, disabled: disabled, placeholder: placeholder, autoComplete: "off" }), _jsx("span", { className: "input-group-text", style: { padding: '0 6px' }, children: isLoading ? (_jsx("span", { className: "spinner-border spinner-border-sm", role: "status", style: { width: '0.85rem', height: '0.85rem' } })) : (_jsx("i", { className: "bi bi-search", style: { fontSize: '0.75rem' } })) })] }), isOpen && (_jsx("div", { className: "dropdown-menu show", style: {
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 1050,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    marginTop: '2px',
                }, children: options.length === 0 && hasSearched && !isLoading ? (_jsx("span", { className: "dropdown-item-text text-muted small", children: "Nenhum resultado encontrado" })) : (options.map((opt, idx) => (_jsx("button", { type: "button", className: `dropdown-item small${opt.value === value ? ' active' : ''}`, onClick: () => handleSelect(opt), children: opt.label }, `${opt.value}-${idx}`)))) }))] }));
};
export default DynamicSearchSelect;
