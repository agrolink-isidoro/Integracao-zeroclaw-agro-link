/**
 * DynamicSearchSelect.tsx
 *
 * Campo de busca dinâmica (autocomplete) para o TaskModal.
 * Faz busca na API com debounce e exibe dropdown com resultados.
 * Estilizado com Bootstrap (form-control / dropdown-menu).
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../../services/api';

export interface DynamicFieldConfig {
  /** Endpoint relativo da API (ex: '/estoque/produtos/') */
  endpoint: string;
  /** Parâmetro de busca (ex: 'search') */
  searchParam: string;
  /** Campo da resposta a usar como label (ex: 'nome') */
  displayField: string;
  /** Campo da resposta a usar como value (ex: 'nome') */
  valueField: string;
  /** Número máximo de resultados por busca */
  pageSize?: number;
  /** Tempo de debounce em ms */
  debounceMs?: number;
  /** Formatar label customizado */
  formatLabel?: (item: Record<string, unknown>) => string;
}

interface DynamicSearchSelectProps {
  config: DynamicFieldConfig;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

interface SearchOption {
  value: string;
  label: string;
}

const DynamicSearchSelect: React.FC<DynamicSearchSelectProps> = ({
  config,
  value,
  onChange,
  disabled = false,
  placeholder = 'Digite para buscar…',
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [options, setOptions] = useState<SearchOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debounceMs = config.debounceMs ?? 300;
  const pageSize = config.pageSize ?? 15;

  // Sync input when value prop changes externally
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const doSearch = useCallback(
    async (term: string) => {
      if (!term || term.length < 2) {
        setOptions([]);
        setHasSearched(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const params: Record<string, string | number> = {
          [config.searchParam]: term,
          page_size: pageSize,
        };
        const response = await api.get(config.endpoint, { params });
        const data = response.data;
        const items: Record<string, unknown>[] = data?.results ?? (Array.isArray(data) ? data : []);

        const mapped: SearchOption[] = items.map((item) => {
          const val = String(item[config.valueField] || item.nome || item.name || item.id || '');
          let label: string;
          if (config.formatLabel) {
            label = config.formatLabel(item);
          } else {
            label = String(item[config.displayField] || val);
          }
          return { value: val, label };
        });

        setOptions(mapped);
        setHasSearched(true);
        setIsOpen(true);
      } catch {
        setOptions([]);
        setHasSearched(true);
      } finally {
        setIsLoading(false);
      }
    },
    [config, pageSize]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setInputValue(term);

    // Clear existing debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!term || term.length < 2) {
      setOptions([]);
      setIsOpen(false);
      setHasSearched(false);
      // If user clears the field, clear the value
      if (!term) onChange('');
      return;
    }

    debounceRef.current = setTimeout(() => {
      doSearch(term);
    }, debounceMs);
  };

  const handleSelect = (opt: SearchOption) => {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div className="input-group input-group-sm">
        <input
          type="text"
          className="form-control form-control-sm"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
        />
        <span className="input-group-text" style={{ padding: '0 6px' }}>
          {isLoading ? (
            <span
              className="spinner-border spinner-border-sm"
              role="status"
              style={{ width: '0.85rem', height: '0.85rem' }}
            />
          ) : (
            <i className="bi bi-search" style={{ fontSize: '0.75rem' }} />
          )}
        </span>
      </div>

      {isOpen && (
        <div
          className="dropdown-menu show"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1050,
            maxHeight: '200px',
            overflowY: 'auto',
            marginTop: '2px',
          }}
        >
          {options.length === 0 && hasSearched && !isLoading ? (
            <span className="dropdown-item-text text-muted small">
              Nenhum resultado encontrado
            </span>
          ) : (
            options.map((opt, idx) => (
              <button
                key={`${opt.value}-${idx}`}
                type="button"
                className={`dropdown-item small${opt.value === value ? ' active' : ''}`}
                onClick={() => handleSelect(opt)}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default DynamicSearchSelect;
