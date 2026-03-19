import React from 'react';
import type { ColheitaTransporte } from '../types/agricultura';

interface Props {
  value?: Partial<ColheitaTransporte>;
  onChange: (v: Partial<ColheitaTransporte>) => void;
  readOnly?: boolean;
  showMotorista?: boolean;
  showDescontos?: boolean;
  showCusto?: boolean;
}

const TransportFields: React.FC<Props> = ({ value = {}, onChange, readOnly = false, showMotorista = true, showDescontos = true, showCusto = true }) => {
  const v = value || {};

  const set = <K extends keyof ColheitaTransporte>(k: K, val: ColheitaTransporte[K]) => {
    const next = { ...v, [k]: val } as Partial<ColheitaTransporte>;
    // compute peso_liquido when possible — guard against bad numeric inputs
    try {
      const pb = Number(next.peso_bruto ?? v.peso_bruto ?? 0);
      const ta = Number(next.tara ?? v.tara ?? 0);
      const ds = Number(next.descontos ?? v.descontos ?? 0);
      if (!Number.isNaN(pb) && !Number.isNaN(ta)) next.peso_liquido = Math.max(0, pb - ta - ds);
    } catch (err: unknown) {
      // If something unexpected happens, log for diagnostics but continue

      console.error('TransportFields: error computing peso_liquido', err);
    }
    onChange(next);
  };

  // O Total é o próprio Custo Transporte (valor total já declarado)
  const obterCustoTotal = (): number | null => {
    const custo = v.custo_transporte;
    if (custo === undefined || custo === null) return null;
    return Number(custo);
  };

  return (
    <div>
      <div className="row">
        <div className="col-md-4 mb-3">
          <label className="form-label">Placa</label>
          <input aria-label="Placa" className="form-control" value={v.placa || ''} onChange={(e) => set('placa', e.target.value)} readOnly={readOnly} />
        </div>
        {showMotorista && (
          <div className="col-md-4 mb-3">
            <label className="form-label">Motorista (nome livre)</label>
            <input aria-label="Motorista (nome livre)" className="form-control" value={v.motorista || ''} onChange={(e) => set('motorista', e.target.value)} readOnly={readOnly} />
          </div>
        )}
        <div className="col-md-4 mb-3">
          <label className="form-label">Tara (kg)</label>
          <input aria-label="Tara (kg)" type="number" step="0.001" className="form-control" value={v.tara ?? ''} onChange={(e) => set('tara', e.target.value === '' ? undefined : Number(e.target.value))} readOnly={readOnly} />
        </div>
      </div>

      <div className="row">
        <div className="col-md-4 mb-3">
          <label className="form-label">Peso Bruto (kg)</label>
          <input aria-label="Peso Bruto (kg)" type="number" step="0.001" className="form-control" value={v.peso_bruto ?? ''} onChange={(e) => set('peso_bruto', e.target.value === '' ? undefined : Number(e.target.value))} readOnly={readOnly} />
        </div>
        {showDescontos && (
          <div className="col-md-4 mb-3">
            <label className="form-label">Descontos (kg)</label>
            <input aria-label="Descontos (kg)" type="number" step="0.01" className="form-control" value={(v.descontos ?? 0) as number} onChange={(e) => set('descontos', e.target.value === '' ? undefined : Number(e.target.value))} readOnly={readOnly} />
          </div>
        )}
        <div className="col-md-4 mb-3">
          <label className="form-label">Peso Líquido (kg)</label>
          <input aria-label="Peso Líquido (kg)" className="form-control" value={v.peso_liquido ?? ''} readOnly />
        </div>
      </div>

      {showCusto && (
        <div className="row">
          <div className="col-md-4 mb-3">
            <label className="form-label">Custo Transporte</label>
            <input aria-label="Custo Transporte" type="number" step="0.01" className="form-control" value={v.custo_transporte ?? ''} onChange={(e) => set('custo_transporte', e.target.value === '' ? undefined : Number(e.target.value))} readOnly={readOnly} />
          </div>
          <div className="col-md-4 mb-3">
            <label className="form-label">Unidade do custo</label>
            <select
              aria-label="Unidade do custo de transporte"
              className="form-select"
              value={v.custo_transporte_unidade ?? 'total'}
              onChange={(e) => set('custo_transporte_unidade', e.target.value as 'unidade' | 'saca' | 'tonelada' | 'total')}
              disabled={readOnly}
            >
              <option value="total">R$ Total</option>
              <option value="tonelada">R$ por Tonelada</option>
              <option value="saca">R$ por Saca</option>
              <option value="unidade">R$ por Unidade</option>
            </select>
          </div>
          <div className="col-md-4 mb-3">
            <label className="form-label">Total</label>
            <div className="form-control bg-light d-flex align-items-center" style={{ minHeight: '38px' }}>
              {obterCustoTotal() !== null ? (
                <strong>R$ {obterCustoTotal()?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              ) : (
                <span className="text-muted">—</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransportFields;
