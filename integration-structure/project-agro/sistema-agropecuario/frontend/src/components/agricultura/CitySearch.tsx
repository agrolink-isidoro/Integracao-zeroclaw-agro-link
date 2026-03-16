import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import weatherService from '../../services/weather';
import type { City } from '../../services/weather';

interface CitySearchProps {
  onCitySelect: (city: City) => void;
  placeholder?: string;
}

export const CitySearch: React.FC<CitySearchProps> = ({
  onCitySelect,
  placeholder = 'Buscar cidade...'
}) => {
  const [query, setQuery] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [noResults, setNoResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mutation para buscar cidades
  const searchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
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
      } catch (error) {
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
  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    setIsOpen(true);
    searchMutation.mutate(value);
  }, [searchMutation]);

  // Selecionar cidade
  const handleSelectCity = (city: City) => {
    onCitySelect(city);
    setQuery(city.display_name);
    setCities([]);
    setIsOpen(false);
    setNoResults(false);
  };

  // Navegação com teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || cities.length === 0) {
      if (e.key === 'Enter' && query.length >= 2) {
        handleInputChange(query);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < cities.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : cities.length - 1
        );
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
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="position-relative">
      <div className="input-group">
        <span className="input-group-text">
          <i className="bi bi-search"></i>
        </span>
        <input
          ref={inputRef}
          type="text"
          className="form-control"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {searchMutation.isPending && (
          <span className="input-group-text">
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          </span>
        )}
      </div>

      {/* Dropdown de cidades */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="dropdown-menu show w-100 mt-1"
          style={{ 
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
          }}
        >
          {searchMutation.isPending ? (
            <div className="dropdown-item disabled text-center py-2">
              <span className="spinner-border spinner-border-sm" role="status"></span>
            </div>
          ) : noResults ? (
            <div className="dropdown-item disabled text-muted text-center py-2">
              Nenhuma cidade encontrada
            </div>
          ) : cities.length > 0 ? (
            cities.map((city, index) => (
              <button
                key={`${city.name}-${city.country}`}
                className={`dropdown-item ${selectedIndex === index ? 'active' : ''}`}
                onClick={() => handleSelectCity(city)}
                onMouseEnter={() => setSelectedIndex(index)}
                style={{ cursor: 'pointer', textAlign: 'left' }}
              >
                <div>
                  <strong>{city.name}</strong>
                  {city.state && <span className="text-muted ms-2">({city.state})</span>}
                </div>
                <small className="text-muted">{city.country}</small>
              </button>
            ))
          ) : (
            <div className="dropdown-item disabled text-muted text-center py-2">
              Digite algo para buscar...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CitySearch;
