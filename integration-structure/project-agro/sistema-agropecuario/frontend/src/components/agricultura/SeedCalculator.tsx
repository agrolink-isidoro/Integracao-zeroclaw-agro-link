import React, { useState, useEffect } from 'react';

interface SeedCalculatorProps {
  areaHa: number;
  onCalculate: (result: { sementes_ha: number; kg_ha: number; kg_total: number }) => void;
}

/**
 * Componente para cálculo de sementes em operações de plantio
 * 
 * Fórmula:
 * - Sementes/ha = Estande Desejado / (Pureza % × Germinação %)
 * - Kg/ha = (Sementes/ha × PMS) / 1000
 * - Kg Total = Kg/ha × Área Total
 */
export const SeedCalculator: React.FC<SeedCalculatorProps> = ({ areaHa, onCalculate }) => {
  const [estande, setEstande] = useState<number>(65000); // plantas/ha
  const [pureza, setPureza] = useState<number>(98); // %
  const [germinacao, setGerminacao] = useState<number>(90); // %
  const [pms, setPms] = useState<number>(350); // gramas (Peso de Mil Sementes)

  useEffect(() => {
    // Validação básica
    if (pureza <= 0 || pureza > 100 || germinacao <= 0 || germinacao > 100 || pms <= 0 || estande <= 0) {
      return;
    }

    // Cálculo de sementes por hectare
    const sementes_ha = estande / ((pureza / 100) * (germinacao / 100));

    // Cálculo de kg por hectare
    const kg_ha = (sementes_ha * pms) / 1000 / 1000; // PMS em gramas, converter para kg

    // Total em kg para a área selecionada
    const kg_total = kg_ha * areaHa;

    onCalculate({ sementes_ha, kg_ha, kg_total });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estande, pureza, germinacao, pms, areaHa]);

  // Cálculo para exibição
  const sementes_ha = pureza > 0 && germinacao > 0 ? estande / ((pureza / 100) * (germinacao / 100)) : 0;
  const kg_ha = sementes_ha > 0 && pms > 0 ? (sementes_ha * pms) / 1000 / 1000 : 0;
  const kg_total = kg_ha * areaHa;

  return (
    <div className="bg-light border border-primary rounded p-3 p-md-4">
      <h3 className="fs-5 fw-semibold text-primary d-flex align-items-center gap-2 mb-3">
        <i className="bi bi-calculator-fill" aria-hidden="true"></i>
        <span className="text-nowrap">Calculadora de Sementes</span>
      </h3>
      
      <div className="row g-2 g-md-3 mb-3">
        <div className="col-12 col-sm-6">
          <label className="form-label">
            Estande Desejado (plantas/ha)
          </label>
          <input
            type="number"
            value={estande}
            onChange={(e) => setEstande(Number(e.target.value))}
            className="form-control"
            min="0"
            step="1000"
          />
        </div>

        <div className="col-12 col-sm-6">
          <label className="form-label">
            PMS - Peso de Mil Sementes (g)
          </label>
          <input
            type="number"
            value={pms}
            onChange={(e) => setPms(Number(e.target.value))}
            className="form-control"
            min="0"
            step="10"
          />
        </div>

        <div className="col-12 col-sm-6">
          <label className="form-label">
            Pureza (%)
          </label>
          <input
            type="number"
            value={pureza}
            onChange={(e) => setPureza(Number(e.target.value))}
            className="form-control"
            min="0"
            max="100"
            step="0.1"
          />
        </div>

        <div className="col-12 col-sm-6">
          <label className="form-label">
            Germinação (%)
          </label>
          <input
            type="number"
            value={germinacao}
            onChange={(e) => setGerminacao(Number(e.target.value))}
            className="form-control"
            min="0"
            max="100"
            step="0.1"
          />
        </div>
      </div>

      <div className="bg-white rounded p-3 mb-3">
        <h4 className="fw-semibold text-dark small mb-2">Resultados:</h4>
        <div className="row g-2 g-md-3 small">
          <div className="col-12 col-md-4">
            <span className="text-muted">Sementes/ha:</span>
            <p className="fw-bold text-primary mb-0">{sementes_ha.toFixed(0)}</p>
          </div>
          <div className="col-12 col-md-4">
            <span className="text-muted">Kg/ha:</span>
            <p className="fw-bold text-primary mb-0">{kg_ha.toFixed(2)}</p>
          </div>
          <div className="col-12 col-md-4">
            <span className="text-muted">Total ({areaHa.toFixed(1)} ha):</span>
            <p className="fw-bold text-success mb-0">{kg_total.toFixed(2)} kg</p>
          </div>
        </div>
      </div>

      <div className="small text-muted">
        <p><strong>Fórmula:</strong></p>
        <p>• Sementes/ha = Estande ÷ (Pureza × Germinação)</p>
        <p>• Kg/ha = (Sementes/ha × PMS) ÷ 1.000.000</p>
        <p>• Total = Kg/ha × Área Total</p>
      </div>
    </div>
  );
};
