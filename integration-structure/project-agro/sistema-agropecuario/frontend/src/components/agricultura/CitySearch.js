import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import weatherService from '../../services/weather';
export const CitySearch = ({ onCitySelect, placeholder = 'Buscar cidade...' }) => {
    const [query, setQuery] = useState('');
    const [cities, setCities] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [noResults, setNoResults] = useState(false);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);
    // Mutation para buscar cidades
    const searchMutation = useMutation({
        mutationFn: async (searchQuery) => {
            if (searchQuery.length < 2) {
                setCities([]);
                setNoResults(false);
                return [];
            }
            console.log('[CitySearch] Searching cities:', searchQuery);
            try {
                const results = await weatherService.searchCities(searchQuery, 10);
                console.log('[CitySearch] Results received:', results);
                return results;
            }
            catch (error) {
                console.error('[CitySearch] Error searching cities:', error);
                throw error;
            }
        },
        onSuccess: (data) => {
            console.log('[CitySearch] onSuccess called with:', data);
            setCities(data);
            setNoResults(data.length === 0 && query.length >= 2);
            setSelectedIndex(-1);
            setIsOpen(true);
        },
        onError: (error) => {
            console.error('[CitySearch] onError:', error);
            setCities([]);
            setNoResults(true);
        }
    });
    // Debounce search
    const handleInputChange = useCallback((value) => {
        setQuery(value);
        setIsOpen(true);
        searchMutation.mutate(value);
    }, [searchMutation]);
    // Selecionar cidade
    const handleSelectCity = (city) => {
        onCitySelect(city);
        setQuery(city.display_name);
        setCities([]);
        setIsOpen(false);
        setNoResults(false);
    };
    // Navegação com teclado
    const handleKeyDown = (e) => {
        if (!isOpen || cities.length === 0) {
            if (e.key === 'Enter' && query.length >= 2) {
                handleInputChange(query);
            }
            return;
        }
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => prev < cities.length - 1 ? prev + 1 : 0);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : cities.length - 1);
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0) {
                    handleSelectCity(cities[selectedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                break;
            default:
                break;
        }
    };
    // Fechar dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current &&
                !dropdownRef.current.contains(e.target) &&
                inputRef.current &&
                !inputRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    return (_jsxs("div", { className: "position-relative", children: [_jsxs("div", { className: "input-group", children: [_jsx("span", { className: "input-group-text", children: _jsx("i", { className: "bi bi-search" }) }), _jsx("input", { ref: inputRef, type: "text", className: "form-control", placeholder: placeholder, value: query, onChange: (e) => handleInputChange(e.target.value), onKeyDown: handleKeyDown, autoComplete: "off" }), searchMutation.isPending && (_jsx("span", { className: "input-group-text", children: _jsx("span", { className: "spinner-border spinner-border-sm", role: "status", "aria-hidden": "true" }) }))] }), isOpen && (_jsx("div", { ref: dropdownRef, className: "dropdown-menu show w-100 mt-1", style: {
                    maxHeight: '300px',
                    overflowY: 'auto',
                    position: 'absolute',
                    zIndex: 10000,
                    display: 'block',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #dee2e6',
                    borderRadius: '0.25rem',
                    boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)'
                }, children: searchMutation.isPending ? (_jsx("div", { className: "dropdown-item disabled text-center py-2", children: _jsx("span", { className: "spinner-border spinner-border-sm", role: "status" }) })) : noResults ? (_jsx("div", { className: "dropdown-item disabled text-muted text-center py-2", children: "Nenhuma cidade encontrada" })) : cities.length > 0 ? (cities.map((city, index) => (_jsxs("button", { className: `dropdown-item ${selectedIndex === index ? 'active' : ''}`, onClick: () => handleSelectCity(city), onMouseEnter: () => setSelectedIndex(index), style: { cursor: 'pointer', textAlign: 'left' }, children: [_jsxs("div", { children: [_jsx("strong", { children: city.name }), city.state && _jsxs("span", { className: "text-muted ms-2", children: ["(", city.state, ")"] })] }), _jsx("small", { className: "text-muted", children: city.country })] }, `${city.name}-${city.country}`)))) : (_jsx("div", { className: "dropdown-item disabled text-muted text-center py-2", children: "Digite algo para buscar..." })) }))] }));
};
export default CitySearch;
