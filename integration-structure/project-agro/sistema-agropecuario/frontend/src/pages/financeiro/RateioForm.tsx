import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApiCreate, useApiQuery } from '@/hooks/useApi';
import { TalhoesMultiSelect } from '@/components/agricultura/TalhoesMultiSelect';

interface RateioFormProps {
  onClose?: () => void;
}

const RateioForm: React.FC<RateioFormProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { data: centros = [] } = useApiQuery<any[]>(['centros-custo'], '/administrativo/centros-custo/');
  const { data: plantios = [] } = useApiQuery<any[]>(['plantios'], '/agricultura/plantios/');
  const { data: todosTalhoes = [] } = useApiQuery<any[]>(['talhoes'], '/talhoes/');

  const createRateio = useApiCreate('/financeiro/rateios/', [['financeiro', 'rateios']]);

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('0.00');
  const [dataRateio, setDataRateio] = useState(new Date().toISOString().slice(0, 10));
  const [destino, setDestino] = useState('operacional');
  const [driver, setDriver] = useState('area');
  const [centro, setCentro] = useState<number | ''>('');
  const [safra, setSafra] = useState<number | ''>('');
  const [talhoes, setTalhoes] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // validations
    if (driver === 'area' && talhoes.length === 0) {
      alert('Driver "area" requer pelo menos um talhão selecionado.');
      return;
    }

    if ((destino === 'despesa_adm' || destino === 'financeiro') && !centro) {
      alert('Centro de custo obrigatório para despesas administrativas/financeiras.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        titulo,
        descricao,
        valor_total: Number(valor),
        data_rateio: dataRateio,
        destino,
        driver_de_rateio: driver,
        talhoes,
      };
      if (centro) payload.centro_custo = Number(centro);
      if (safra) payload.safra = Number(safra);

      const res: any = await createRateio.mutateAsync(payload);
      alert('Rateio criado com sucesso');
      if (onClose) {
        onClose();
      } else if (res && res.id) {
        navigate(`/financeiro/rateios/${res.id}`);
      } else {
        navigate('/financeiro');
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro ao criar rateio: ' + (err.response?.data?.detail || err.message || err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label className="form-label" htmlFor="titulo">
          <i className="bi bi-tag me-2"></i>Título
        </label>
        <input id="titulo" className="form-control" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="descricao">
          <i className="bi bi-tag me-2"></i>Descrição
        </label>
        <textarea id="descricao" className="form-control" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </div>

      <div className="row">
        <div className="col-md-4 mb-3">
          <label className="form-label" htmlFor="valor">
            <i className="bi bi-cash me-2"></i>Valor total (R$)
          </label>
          <input id="valor" type="number" step="0.01" className="form-control" value={valor} onChange={(e) => setValor(e.target.value)} required />
        </div>
        <div className="col-md-4 mb-3">
          <label className="form-label" htmlFor="dataRateio">
            <i className="bi bi-calendar me-2"></i>Data do rateio
          </label>
          <input id="dataRateio" type="date" className="form-control" value={dataRateio} onChange={(e) => setDataRateio(e.target.value)} required />
        </div>
        <div className="col-md-4 mb-3">
          <label className="form-label" htmlFor="destino">Destino</label>
          <select id="destino" className="form-select" value={destino} onChange={(e) => setDestino(e.target.value)}>
            <option value="operacional">Operacional / Lavoura</option>
            <option value="manutencao">Manutenção</option>
            <option value="despesa_adm">Despesa Administrativa</option>
            <option value="investimento">Investimento</option>
            <option value="benfeitoria">Benfeitoria</option>
            <option value="financeiro">Financeiro / Juros</option>
          </select>
        </div>
      </div>

      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label" htmlFor="driver">Driver de rateio</label>
          <select id="driver" className="form-select" value={driver} onChange={(e) => setDriver(e.target.value)}>
            <option value="area">Área (ha)</option>
            <option value="producao">Produção (kg)</option>
            <option value="horas_maquina">Horas de Máquina</option>
            <option value="uniforme">Uniforme</option>
          </select>
        </div>

        <div className="col-md-6 mb-3">
          <label className="form-label" htmlFor="centro">Centro de Custo (opcional)</label>
          <select id="centro" className="form-select" value={String(centro === '' ? '' : centro)} onChange={(e) => setCentro(e.target.value ? Number(e.target.value) : '')}>
            <option value="">-- selecione --</option>
            {centros.map(c => (
              <option key={c.id} value={c.id}>{c.codigo} - {c.nome}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="safra">Safra (opcional)</label>
        <select id="safra" className="form-select" value={String(safra === '' ? '' : safra)} onChange={(e) => setSafra(e.target.value ? Number(e.target.value) : '')}>
          <option value="">-- selecione --</option>
          {plantios.map(p => (
            <option key={p.id} value={p.id}>Safra #{p.id} - {p.cultura_nome || p.descricao || p.id}</option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="form-label">Talhões</label>
        <TalhoesMultiSelect talhoes={todosTalhoes} selectedIds={talhoes} onChange={(ids) => setTalhoes(ids)} />
      </div>

      <div className="d-flex flex-column flex-sm-row justify-content-end gap-2">
        <button type="button" className="btn btn-secondary" onClick={() => onClose ? onClose() : navigate('/financeiro')} disabled={submitting}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Enviando...' : 'Criar Rateio'}</button>
      </div>
    </form>
  );
};

export default RateioForm;
