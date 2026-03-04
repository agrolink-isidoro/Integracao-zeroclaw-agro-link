import React, { useMemo } from 'react';

interface Talhao {
  id: number;
  name: string;
  fazenda_id?: number;
  fazenda_nome?: string;
  area_hectares?: number;
  area_size?: number;
}

interface TalhoesMultiSelectProps {
  talhoes: Talhao[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}

export const TalhoesMultiSelect: React.FC<TalhoesMultiSelectProps> = ({
  talhoes,
  selectedIds,
  onChange,
  disabled = false,
}) => {
  // Agrupar talhões por fazenda
  const talhoesPorFazenda = useMemo(() => {
    const grupos: Record<string, { fazenda_id: number; fazenda_nome: string; talhoes: Talhao[] }> = {};
    
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
    
    return Object.values(grupos).sort((a, b) => 
      a.fazenda_nome.localeCompare(b.fazenda_nome)
    );
  }, [talhoes]);

  // Calcular área total selecionada
  const areaTotal = useMemo(() => {
    return talhoes
      .filter(t => selectedIds.includes(t.id))
      .reduce((sum, t) => sum + (t.area_hectares || 0), 0);
  }, [talhoes, selectedIds]);

  const handleToggle = (talhaoId: number) => {
    if (disabled) return;
    
    if (selectedIds.includes(talhaoId)) {
      onChange(selectedIds.filter(id => id !== talhaoId));
    } else {
      onChange([...selectedIds, talhaoId]);
    }
  };

  const handleToggleFazenda = (fazendaId: number) => {
    if (disabled) return;
    
    const talhoesDestaFazenda = talhoes
      .filter(t => t.fazenda_id === fazendaId)
      .map(t => t.id);
    
    const todosSelecionados = talhoesDestaFazenda.every(id => selectedIds.includes(id));
    
    if (todosSelecionados) {
      // Desmarcar todos desta fazenda
      onChange(selectedIds.filter(id => !talhoesDestaFazenda.includes(id)));
    } else {
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

  return (
    <div>
      <div 
        className="border rounded p-3" 
        style={{ maxHeight: '300px', overflowY: 'auto' }}
      >
        {talhoesPorFazenda.length === 0 ? (
          <div className="text-muted text-center py-3">
            <i className="bi bi-info-circle me-2"></i>
            Nenhum talhão disponível
          </div>
        ) : (
          talhoesPorFazenda.map(grupo => {
            const talhoesIds = grupo.talhoes.map(t => t.id);
            const todosSelecionados = talhoesIds.every(id => selectedIds.includes(id));
            const algunsSelecionados = talhoesIds.some(id => selectedIds.includes(id)) && !todosSelecionados;
            
            return (
              <div key={grupo.fazenda_id} className="mb-3">
                {/* Cabeçalho da Fazenda */}
                <div 
                  className="d-flex align-items-center mb-2 p-2 bg-light rounded cursor-pointer"
                  onClick={() => handleToggleFazenda(grupo.fazenda_id)}
                  style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}
                >
                  <input
                    type="checkbox"
                    className="form-check-input me-2"
                    checked={todosSelecionados}
                    ref={input => {
                      if (input) input.indeterminate = algunsSelecionados;
                    }}
                    onChange={() => handleToggleFazenda(grupo.fazenda_id)}
                    disabled={disabled}
                    style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                  />
                  <strong>{grupo.fazenda_nome}</strong>
                  <span className="ms-auto text-muted small">
                    {grupo.talhoes.length} talhão(ões)
                  </span>
                </div>

                {/* Talhões da Fazenda */}
                <div className="ps-4">
                  {grupo.talhoes.map(talhao => (
                    <div 
                      key={talhao.id} 
                      className="form-check mb-1"
                      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`talhao-${talhao.id}`}
                        checked={selectedIds.includes(talhao.id)}
                        onChange={() => handleToggle(talhao.id)}
                        disabled={disabled}
                        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                      />
                      <label 
                        className="form-check-label w-100" 
                        htmlFor={`talhao-${talhao.id}`}
                        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                      >
                        <span>{talhao.name}</span>
                        <span className="text-muted small ms-2">
                          ({talhao.area_hectares?.toFixed(2) || '?'} ha)
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Resumo */}
      {selectedIds.length > 0 && (
        <div className="mt-2 p-2 bg-light rounded">
          <small className="text-muted">
            <i className="bi bi-check-circle me-1"></i>
            <strong>{selectedIds.length}</strong> talhão(ões) selecionado(s)
            {' • '}
            <strong>{areaTotal.toFixed(2)} ha</strong> total
          </small>
        </div>
      )}
    </div>
  );
};
