import { jsx as _jsx } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import SelectDropdown from './SelectDropdown';
import api from '../../services/api';
const SelectFK = ({ endpoint, value, onChange, placeholder = 'Selecione...', disabled = false, error, labelKey = 'nome', valueKey = 'id', filters = {}, className = '', testId }) => {
    const [searchTerm] = useState('');
    const { data, isLoading, error: queryError } = useQuery({
        queryKey: [endpoint, searchTerm, filters],
        queryFn: async () => {
            try {
                const response = await api.get(endpoint, {
                    params: {
                        search: searchTerm,
                        ...filters
                    }
                });
                return response.data;
            }
            catch (err) {
                console.error(`[SelectFK] Error loading ${endpoint}`, err);
                throw err;
            }
        },
        staleTime: 5 * 60 * 1000, // 5 minutos
    });
    if (queryError) {
        return _jsx("input", { "data-testid": testId || 'selectfk-fallback', className: `form-control ${className}`, placeholder: "Erro ao carregar op\u00E7\u00F5es - digite manualmente" });
    }
    // Suporta tanto respostas paginadas ({ results: [...] }) quanto arrays diretos
    const items = Array.isArray(data) ? data : (data?.results || []);
    const options = items.map((item) => ({
        value: item[valueKey],
        label: item[labelKey] || item.nome || item.descricao || item[valueKey]
    }));
    return (_jsx(SelectDropdown, { testId: testId, options: options, value: value, onChange: onChange, placeholder: placeholder, disabled: disabled, loading: isLoading, error: error || queryError?.message, className: className, searchable: true }));
    return (_jsx(SelectDropdown, { testId: testId, options: options, value: value, onChange: onChange, placeholder: placeholder, disabled: disabled, loading: isLoading, error: error || queryError?.message, className: className, searchable: true }));
};
export default SelectFK;
