import React, { useState } from 'react';
import { useApiCreate, useApiQuery } from '@/hooks/useApi';
import { TalhoesMultiSelect } from '@/components/agricultura/TalhoesMultiSelect';

/* ── Tipos auxiliares ── */
interface Centro { id: number; codigo: string; nome: string; categoria: string }
interface Fornecedor { id: number; nome: string; cpf_cnpj?: string }
interface Safra { id: number; cultura_nome?: string; descricao?: string }
interface Talhao { id: number; nome: string; area_ha?: number }

const DRIVER_OPTIONS = [
  { value: 'area', label: 'Área (ha)' },
  { value: 'producao', label: 'Produção (kg)' },
  { value: 'horas_maquina', label: 'Horas de Máquina' },
  { value: 'uniforme', label: 'Uniforme' },
];

const DespesaForm: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  /* ── Queries ── */
  const { data: centros = [] } = useApiQuery<Centro[]>(['centros-custo'], '/administrativo/centros-custo/');
  const { data: fornecedores = [] } = useApiQuery<Fornecedor[]>(['fornecedores'], '/comercial/fornecedores/');
  const { data: safras = [] } = useApiQuery<Safra[]>(['plantios'], '/agricultura/plantios/');
  const { data: todosTalhoes = [] } = useApiQuery<Talhao[]>(['talhoes'], '/talhoes/');

  const createDespesa = useApiCreate('/administrativo/despesas/', [['despesas']]);

  /* ── State ── */
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('0.00');
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [centro, setCentro] = useState<number | ''>('');
  const [fornecedor, setFornecedor] = useState<number | ''>('');
  const [safra, setSafra] = useState<number | ''>('');
  const [talhoes, setTalhoes] = useState<number[]>([]);
  const [documentoReferencia, setDocumentoReferencia] = useState('');
  const [driverRateio, setDriverRateio] = useState('area');
  const [autoRateio, setAutoRateio] = useState(false);
  const [pendenteRateio, setPendenteRateio] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* ── Submit ── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!centro) {
      alert('Selecione um centro de custo');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        titulo,
        descricao: descricao || undefined,
        valor,
        data,
        centro,
        auto_rateio: autoRateio,
        pendente_rateio: pendenteRateio,
        driver_de_rateio: driverRateio,
      };
      if (fornecedor) payload.fornecedor = fornecedor;
      if (safra) payload.safra = safra;
      if (talhoes.length) payload.talhoes = talhoes;
      if (documentoReferencia) payload.documento_referencia = documentoReferencia;

      await createDespesa.mutateAsync(payload);
      alert('Despesa criada com sucesso');
      onClose?.();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao criar despesa: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* ── Título ── */}
      <div className="mb-3">
        <label className="form-label" htmlFor="titulo">
          <i className="bi bi-tag me-2"></i>Título
        </label>
        <input id="titulo" className="form-control" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
      </div>

      {/* ── Descrição ── */}
      <div className="mb-3">
        <label className="form-label" htmlFor="descricao">
          <i className="bi bi-card-text me-2"></i>Descrição
        </label>
        <textarea id="descricao" className="form-control" rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Opcional" />
      </div>

      {/* ── Valor + Data ── */}
      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label" htmlFor="valor">
            <i className="bi bi-cash me-2"></i>Valor (R$)
          </label>
          <input id="valor" type="number" step="0.01" min="0" className="form-control" value={valor} onChange={(e) => setValor(e.target.value)} required />
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label" htmlFor="data">
            <i className="bi bi-calendar me-2"></i>Data
          </label>
          <input id="data" type="date" className="form-control" value={data} onChange={(e) => setData(e.target.value)} required />
        </div>
      </div>

      {/* ── Centro de Custo + Fornecedor ── */}
      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label" htmlFor="centro">
            <i className="bi bi-diagram-3 me-2"></i>Centro de Custo
          </label>
          <select id="centro" className="form-select" value={centro === '' ? '' : String(centro)} onChange={(e) => setCentro(e.target.value ? Number(e.target.value) : '')} required>
            <option value="">-- selecione --</option>
            {centros.map(c => (
              <option value={c.id} key={c.id}>{c.codigo} - {c.nome}</option>
            ))}
          </select>
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label" htmlFor="fornecedor">
            <i className="bi bi-person-lines-fill me-2"></i>Fornecedor
          </label>
          <select id="fornecedor" className="form-select" value={fornecedor === '' ? '' : String(fornecedor)} onChange={(e) => setFornecedor(e.target.value ? Number(e.target.value) : '')}>
            <option value="">-- nenhum --</option>
            {fornecedores.map(f => (
              <option value={f.id} key={f.id}>{f.nome}{f.cpf_cnpj ? ` (${f.cpf_cnpj})` : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Documento Referência ── */}
      <div className="mb-3">
        <label className="form-label" htmlFor="docRef">
          <i className="bi bi-file-earmark-text me-2"></i>Documento de Referência
        </label>
        <input id="docRef" className="form-control" value={documentoReferencia} onChange={(e) => setDocumentoReferencia(e.target.value)} placeholder="NF-e, Fatura, Boleto..." maxLength={100} />
      </div>

      {/* ── Safra + Driver de Rateio ── */}
      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label" htmlFor="safra">
            <i className="bi bi-calendar-range me-2"></i>Safra
          </label>
          <select id="safra" className="form-select" value={safra === '' ? '' : String(safra)} onChange={(e) => setSafra(e.target.value ? Number(e.target.value) : '')}>
            <option value="">-- nenhuma --</option>
            {safras.map(p => (
              <option key={p.id} value={p.id}>Safra #{p.id} - {p.cultura_nome || p.descricao || p.id}</option>
            ))}
          </select>
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label" htmlFor="driver">
            <i className="bi bi-gear me-2"></i>Driver de Rateio
          </label>
          <select id="driver" className="form-select" value={driverRateio} onChange={(e) => setDriverRateio(e.target.value)}>
            {DRIVER_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Talhões (multi-select) ── */}
      <div className="mb-3">
        <label className="form-label">
          <i className="bi bi-grid-3x3 me-2"></i>Talhões
        </label>
        <TalhoesMultiSelect talhoes={todosTalhoes} selectedIds={talhoes} onChange={(ids) => setTalhoes(ids)} />
      </div>

      {/* ── Checkboxes ── */}
      <div className="row mb-3">
        <div className="col-md-6">
          <div className="form-check">
            <input className="form-check-input" type="checkbox" checked={autoRateio} onChange={(e) => setAutoRateio(e.target.checked)} id="autoRateio" />
            <label className="form-check-label" htmlFor="autoRateio">
              <i className="bi bi-lightning me-1"></i>Gerar rateio automaticamente
            </label>
          </div>
        </div>
        <div className="col-md-6">
          <div className="form-check">
            <input className="form-check-input" type="checkbox" checked={pendenteRateio} onChange={(e) => setPendenteRateio(e.target.checked)} id="pendenteRateio" />
            <label className="form-check-label" htmlFor="pendenteRateio">
              <i className="bi bi-hourglass-split me-1"></i>Marcar como pendente de rateio
            </label>
          </div>
        </div>
      </div>

      {/* ── Ações ── */}
      <div className="d-flex flex-column flex-sm-row justify-content-end gap-2">
        <button type="button" className="btn btn-secondary" onClick={() => onClose?.()} disabled={submitting}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          <i className="bi bi-check-lg me-1"></i>{submitting ? 'Enviando...' : 'Criar Despesa'}
        </button>
      </div>
    </form>
  );
};

export default DespesaForm;
