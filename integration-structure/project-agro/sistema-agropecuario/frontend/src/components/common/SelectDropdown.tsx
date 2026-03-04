import React, { useState, useEffect, useRef } from 'react';

interface Option {
  value: string | number;
  label: string;
  disabled?: boolean;
  group?: string | null; // optional grouping key (e.g., fazenda name)
}

interface SelectDropdownProps {
  options: Option[];
  value?: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null | undefined;
  className?: string;
  searchable?: boolean;
  allowCreate?: boolean;
  onCreate?: (label: string) => void;
  // Remote search callback: when provided, the dropdown will call this with the search term
  // and show results returned by the promise. Expected to return Option[].
  onSearch?: (term: string) => Promise<Option[]>;
  debounceMs?: number;
  // Optional test id to make E2E tests less brittle
  testId?: string;
}

const SelectDropdown: React.FC<SelectDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  disabled = false,
  loading = false,
  error,
  className = '',
  searchable = false,
  allowCreate = false,
  onCreate,
  onSearch,
  debounceMs,
  testId
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [remoteOptions, setRemoteOptions] = React.useState<Option[] | null>(null);
  const [remoteLoading, setRemoteLoading] = React.useState(false);

  // Trigger remote search when onSearch is provided and user types
  React.useEffect(() => {
    if (!searchable || !onSearch) {
      setRemoteOptions(null);
      setRemoteLoading(false);
      return;
    }

    if (!searchTerm) {
      setRemoteOptions(null);
      setRemoteLoading(false);
      return;
    }

    const ms = debounceMs ?? 300;
    const id = setTimeout(() => {
      setRemoteLoading(true);
      onSearch(searchTerm)
        .then(res => {
          setRemoteOptions(res || []);
        })
        .catch(() => setRemoteOptions([]))
        .finally(() => setRemoteLoading(false));
    }, ms);

    return () => clearTimeout(id);
  }, [searchTerm, onSearch, searchable, debounceMs]);

  const filteredOptions = React.useMemo(() => {
    // If remote search is active, prefer those results while typing
    if (searchable && searchTerm && onSearch) {
      return remoteOptions || [];
    }

    if (searchable && searchTerm) {
      return options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return options;
  }, [options, searchTerm, searchable, remoteOptions, onSearch]);

  // Group options by `group` property for display (if any option has group)
  const groupedOptions = React.useMemo(() => {
    const hasGroups = filteredOptions.some(o => !!o.group);
    if (!hasGroups) return { '': filteredOptions };
    const map = new Map<string, Option[]>();
    filteredOptions.forEach(o => {
      const key = o.group || '';
      const arr = map.get(key) || [];
      arr.push(o);
      map.set(key, arr);
    });
    return Object.fromEntries(map);
  }, [filteredOptions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // When remote search is used, selected option may come from remoteOptions which are not present
  // in the original `options` prop. Combine both sets to reliably find the selected option.
  const combinedOptions = React.useMemo(() => {
    if (remoteOptions && remoteOptions.length) {
      const map = new Map<number | string, Option>();
      options.forEach(o => map.set(o.value, o));
      remoteOptions.forEach(o => map.set(o.value, o));
      return Array.from(map.values());
    }
    return options;
  }, [options, remoteOptions]);

  const selectedOption = combinedOptions.find(option => option.value === value);

  const handleSelect = (option: Option) => {
    if (!option.disabled) {
      onChange(option.value);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const handleCreate = () => {
    if (onCreate && searchTerm.trim()) {
      onCreate(searchTerm.trim());
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const showCreateOption = allowCreate && onCreate && searchTerm.trim() &&
    // If remote search is enabled, check remoteOptions uniqueness, otherwise local options
    !((onSearch && remoteOptions ? remoteOptions : options).some(option => option.label.toLowerCase() === searchTerm.toLowerCase()));

  return (
    <div className={`relative ${className}`} ref={dropdownRef} data-testid={testId || undefined}>
      <div
        className={`relative w-full bg-white border rounded-md shadow-sm cursor-pointer ${
          error ? 'border-red-300' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {searchable && isOpen ? (
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 border-none outline-none rounded-md"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <div className="px-3 py-2 text-gray-900">
            {selectedOption ? selectedOption.label : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </div>
        )}
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          {loading || remoteLoading ? (
            <div className="w-4 h-4 border border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredOptions.length === 0 && !showCreateOption ? (
            <div className="px-3 py-2 text-gray-500 text-sm">
              Nenhum resultado encontrado
            </div>
          ) : (
            <>
              {Object.entries(groupedOptions).map(([group, opts]) => (
                <div key={group || 'nogroup'}>
                  {group && (
                    <div className="px-3 py-1 text-xs text-gray-400 border-b border-gray-200">{group}</div>
                  )}
                  {opts.map((option) => (
                    <div
                      key={option.value}
                      data-testid={testId ? `${testId}-option-${option.value}` : undefined}
                      className={`px-3 py-2 cursor-pointer ${
                        option.disabled ? 'text-gray-400 cursor-not-allowed' : ''
                      } ${option.value === value ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                      style={{ 
                        color: option.value === value ? undefined : (option.disabled ? undefined : '#1f2937'),
                        backgroundColor: option.value === value ? undefined : '#ffffff'
                      }}
                      onClick={() => handleSelect(option)}
                    >
                      {option.label}
                    </div>
                  ))}
                </div>
              ))}

              {showCreateOption && (
                <div
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-blue-600 border-t border-gray-200"
                  onClick={handleCreate}
                >
                  + Criar "{searchTerm}"
                </div>
              )}
            </>
          )}
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default SelectDropdown;