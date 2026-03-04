import React from 'react';
import { useApiCreate, useApiUpdate, useApiQuery } from '@/hooks/useApi';

const BANDEIRA_OPTIONS = [
  { value: '01', label: 'Visa' },
  { value: '02', label: 'Mastercard' },
  { value: '03', label: 'American Express' },
  { value: '04', label: 'Sorocred' },
  { value: '05', label: 'Diners Club' },
  { value: '06', label: 'Elo' },
  { value: '07', label: 'Hipercard' },
  { value: '08', label: 'Aura' },
  { value: '09', label: 'Cabal' },
  { value: '99', label: 'Outros' },
];

const CartaoForm: React.FC<{ initialData?: any; onClose: () => void; onSaved?: () => void }> = ({ initialData, onClose, onSaved }) => {
  const [bandeiraCodigo, setBandeiraCodigo] = React.useState(initialData?.bandeira_codigo || '');
  const [bandeira, setBandeira] = React.useState(initialData?.bandeira || '');
  const [numero, setNumero] = React.useState(initialData?.numero_masked || '');
  const [conta, setConta] = React.useState<number | null>(initialData?.conta || null);
  const [agencia, setAgencia] = React.useState(initialData?.agencia || '');
  const [validade, setValidade] = React.useState(initialData?.validade || '');
  const [diaVencimento, setDiaVencimento] = React.useState<number | string>(initialData?.dia_vencimento_fatura || '');
  const { data: contas = [] } = useApiQuery<any[]>(['contas-bancarias'], '/financeiro/contas/');

  const create = useApiCreate('/financeiro/cartoes/', [['cartoes']]);
  const update = useApiUpdate('/financeiro/cartoes/', [['cartoes']]);

  // Auto-set bandeira name when codigo changes
  React.useEffect(() => {
    if (bandeiraCodigo) {
      const opt = BANDEIRA_OPTIONS.find(o => o.value === bandeiraCodigo);
      if (opt) setBandeira(opt.label);
    }
  }, [bandeiraCodigo]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    // Basic frontend validation
    if (!numero || numero.length < 4) {
      alert('Informe um número de cartão válido (últimos 4 dígitos)');
      return;
    }
    const last4 = String(numero).slice(-4);
    if (last4.length !== 4 || !/^[0-9]{4}$/.test(last4)) {
      alert('Os últimos 4 caracteres do cartão devem ser números');
      return;
    }

    const payload: any = { 
      bandeira, 
      bandeira_codigo: bandeiraCodigo || null,
      numero_masked: numero, 
      numero_last4: last4, 
      conta, 
      agencia, 
      validade,
      dia_vencimento_fatura: diaVencimento ? Number(diaVencimento) : null
    };
    try {
      if (initialData?.id) {
        await update.mutateAsync({ id: initialData.id, data: payload });
      } else {
        await create.mutateAsync(payload);
      }
      onSaved && onSaved();
    } catch (err) {
      console.error('Erro salvando cartão', err);
      alert('Falha ao salvar cartão');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label className="form-label">
          <i className="bi bi-credit-card me-2"></i>Bandeira (código NFe)
        </label>
        <select className="form-select" value={bandeiraCodigo} onChange={(e) => setBandeiraCodigo(e.target.value)}>
          <option value="">Selecione...</option>
          {BANDEIRA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value} - {o.label}</option>)}
        </select>
        <small className="text-muted">Código usado na NFe para identificar automaticamente o cartão</small>
      </div>
      <div className="mb-3">
        <label className="form-label">
          <i className="bi bi-credit-card me-2"></i>Bandeira (nome)
        </label>
        <input className="form-control" value={bandeira} onChange={(e) => setBandeira(e.target.value)} />
      </div>
      <div className="mb-3">
        <label className="form-label">
          <i className="bi bi-credit-card me-2"></i>Número (mascarado)
        </label>
        <input className="form-control" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="**** **** **** 1234" />
      </div>
      <div className="mb-3">
        <label className="form-label">Conta Bancária</label>
        <select className="form-select" value={conta || ''} onChange={(e) => setConta(e.target.value ? Number(e.target.value) : null)}>
          <option value="">Nenhuma</option>
          {contas.map((c: any) => <option key={c.id} value={c.id}>{c.banco} - {c.conta}</option>)}
        </select>
      </div>
      <div className="mb-3">
        <label className="form-label">Agência</label>
        <input className="form-control" value={agencia} onChange={(e) => setAgencia(e.target.value)} />
      </div>
      <div className="mb-3">
        <label className="form-label">Validade</label>
        <input className="form-control" value={validade} onChange={(e) => setValidade(e.target.value)} placeholder="MM/AAAA" />
      </div>
      <div className="mb-3">
        <label className="form-label">
          <i className="bi bi-calendar-check me-2"></i>Dia do Vencimento da Fatura
        </label>
        <input 
          type="number" 
          min="1" 
          max="31" 
          className="form-control" 
          value={diaVencimento} 
          onChange={(e) => setDiaVencimento(e.target.value)} 
          placeholder="Ex: 10"
        />
        <small className="text-muted">Dia do mês em que a fatura do cartão vence (1-31)</small>
      </div>
      <div className="d-flex flex-column flex-sm-row justify-content-end gap-2">
        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary">Salvar</button>
      </div>
    </form>
  );
};

export default CartaoForm;
