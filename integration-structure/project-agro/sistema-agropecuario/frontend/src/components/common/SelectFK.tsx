import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import SelectDropdown from './SelectDropdown';
import api from '../../services/api';

interface SelectFKProps {
  endpoint: string;
  value?: number | string;
  onChange: (value: number | string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  labelKey?: string;
  valueKey?: string;
  filters?: Record<string, unknown>;
  className?: string;
  // Optional test id to make E2E tests more robust
  testId?: string;
}

const SelectFK: React.FC<SelectFKProps> = ({
  endpoint,
  value,
  onChange,
  placeholder = 'Selecione...',
  disabled = false,
  error,
  labelKey = 'nome',
  valueKey = 'id',
  filters = {},
  className = '',
  testId
}) => {
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
      } catch (err) {
        console.error(`[SelectFK] Error loading ${endpoint}`, err);
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  } as any);

  if (queryError) {
    return <input data-testid={testId || 'selectfk-fallback'} className={`form-control ${className}`} placeholder="Erro ao carregar opções - digite manualmente" />;
  }

  // Suporta tanto respostas paginadas ({ results: [...] }) quanto arrays diretos
  const items = Array.isArray(data) ? data : ((data as any)?.results || []);
  
  const options = items.map((item: Record<string, unknown>) => ({
    value: item[valueKey],
    label: (item as any)[labelKey] || (item as any).nome || (item as any).descricao || (item as any)[valueKey]
  }));

  return (
    <SelectDropdown
      testId={testId}
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      loading={isLoading}
      error={error || (queryError as unknown as Error)?.message}
      className={className}
      searchable={true}
    />
  );

  return (
    <SelectDropdown
      testId={testId}
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      loading={isLoading}
      error={error || (queryError as Error)?.message}
      className={className}
      searchable={true}
    />
  );
};

export default SelectFK;