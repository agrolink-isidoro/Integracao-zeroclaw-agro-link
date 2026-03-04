import React, { useEffect, useState } from 'react';
import { useApiCreate, useApiUpdate, useApiQuery } from '@/hooks/useApi';
import SelectDropdown from '@/components/common/SelectDropdown';
import ComercialService from '@/services/comercial';

interface Props {
  initialData?: any;
  onClose: () => void;
  onSaved?: (data: any) => void;
}

const ContaForm: React.FC<Props> = ({ initialData, onClose, onSaved }) => {
  const isEdit = !!initialData;
  const [banco, setBanco] = useState(initialData?.banco || '');
  const [bancoId, setBancoId] = useState<number | null>(initialData?.instituicao || null);
  const [bancoOptions, setBancoOptions] = useState<any[]>([]);
  const [agencia, setAgencia] = useState(initialData?.agencia || '');
  const [conta, setConta] = useState(initialData?.conta || '');

  const { data: insts = [] } = useApiQuery<any[]>(['instituicoes'], '/comercial/instituicoes-financeiras/?page_size=1000');
  
  // Sincronizar bancoOptions com insts quando carregar
  React.useEffect(() => {
    if (insts.length > 0) {
      setBancoOptions(insts);
    }
  }, [insts]);
  
  const [tipo, setTipo] = useState(initialData?.tipo || 'corrente');
  const [moeda, setMoeda] = useState(initialData?.moeda || 'BRL');
  const [saldoInicial, setSaldoInicial] = useState(initialData?.saldo_inicial ?? '0.00');
  const [ativo, setAtivo] = useState<boolean>(initialData?.ativo ?? true);
  const [errors, setErrors] = useState<{ banco?: string; conta?: string }>({});

  const create = useApiCreate('/financeiro/contas/', [['contas-bancarias']]);
  const update = useApiUpdate('/financeiro/contas/', [['contas-bancarias']]);

  useEffect(() => {
    if (initialData) {
      setBanco(initialData.banco || '');
      setBancoId(initialData.instituicao || null);
      setAgencia(initialData.agencia || '');
      setConta(initialData.conta || '');
      setTipo(initialData.tipo || 'corrente');
      setMoeda(initialData.moeda || 'BRL');
      setSaldoInicial(initialData.saldo_inicial ?? '0.00');
      setAtivo(initialData.ativo ?? true);
    }
  }, [initialData]);

  const validate = () => {
    const e: any = {};
    if (!banco || !banco.trim()) e.banco = 'Banco é obrigatório';
    if (!conta || !conta.trim()) e.conta = 'Conta é obrigatória';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    // Validate decimal separator: require dot as decimal separator for cents
    if (String(saldoInicial).includes(',')) {
      alert('A digitar centavos usar ponto(.) como separador');
      return;
    }

    const payload = {
      banco, 
      agencia, 
      conta, 
      tipo, 
      moeda, 
      saldo_inicial: saldoInicial, 
      ativo,
      instituicao: bancoId
    } as any;

    try {
      if (isEdit && initialData?.id) {
        await update.mutateAsync({ id: initialData.id, ...payload });
        if (onSaved) onSaved({ id: initialData.id, ...payload });
      } else {
        const created = await create.mutateAsync(payload);
        if (onSaved) onSaved(created);
      }
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar conta:', err);
      // More user-friendly message when backend returns 400 for invalid saldo format
      if (err?.response?.status === 400 && err?.response?.data) {
        alert('Falha ao salvar: valor inválido. Use ponto (.) como separador decimal ao digitar centavos.');
      } else {
        alert('Falha ao salvar: ' + (err?.response?.data?.detail || err?.message || 'erro desconhecido'));
      }
    }
  };

  return (
    <div>
          <div className="mb-3">
        <label className="form-label">
          <i className="bi bi-bank me-2"></i>Banco
        </label>
        <SelectDropdown
          options={bancoOptions.map((i: any) => ({ value: i.id, label: `${i.codigo_bacen} — ${i.nome}` }))}
          value={bancoId ?? ''}
          onChange={(v) => {
            const id = v === '' ? null : Number(v);
            setBancoId(id);
            const sel = bancoOptions.find((it: any) => it.id === id);
            setBanco(sel ? `${sel.codigo_bacen} — ${sel.nome}` : '');
          }}
          placeholder="Selecione instituição (nome ou código)"
          searchable={true}
          onSearch={async (term: string) => {
            const results = await ComercialService.getInstituicoes({ busca: term });
            // Adicionar resultados ao cache
            setBancoOptions(prev => {
              const map = new Map(prev.map(item => [item.id, item]));
              results.forEach((r: any) => map.set(r.id, r));
              return Array.from(map.values());
            });
            return results.map((r: any) => ({ value: r.id, label: `${r.codigo_bacen} — ${r.nome}` }));
          }}
        />
        {errors.banco && <div className="invalid-feedback">{errors.banco}</div>}
      </div>
      <div className="mb-3">
        <label className="form-label">Agência</label>
        <input name="agencia" className="form-control" value={agencia} onChange={(e) => setAgencia(e.target.value)} />
      </div>
      <div className="mb-3">
        <label className="form-label">Conta</label>
        <input name="conta" className={`form-control ${errors.conta ? 'is-invalid' : ''}`} value={conta} onChange={(e) => setConta(e.target.value)} />
        {errors.conta && <div className="invalid-feedback">{errors.conta}</div>}
      </div>
      <div className="row g-2 mb-3">
        <div className="col">
          <label className="form-label">Tipo</label>
          <select className="form-select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="corrente">Conta Corrente</option>
            <option value="poupanca">Poupança</option>
          </select>
        </div>
        <div className="col">
          <label className="form-label">Moeda</label>
          <input className="form-control" value={moeda} onChange={(e) => setMoeda(e.target.value)} />
        </div>
      </div>
      <div className="mb-3">
        <label className="form-label">
          <i className="bi bi-cash me-2"></i>Saldo Inicial
        </label>
        <input className="form-control" value={String(saldoInicial)} onChange={(e) => setSaldoInicial(e.target.value)} onBlur={(e) => setSaldoInicial(String(e.target.value).replace(/,/g, '.'))} />
      </div>
      <div className="form-check mb-3">
        <input className="form-check-input" type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} id="conta-ativo" />
        <label className="form-check-label" htmlFor="conta-ativo">Ativo</label>
      </div>

      <div className="d-flex justify-content-end gap-2">
        <button className="btn btn-outline-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave}>{isEdit ? 'Salvar' : 'Criar'}</button>
      </div>
    </div>
  );
};

export default ContaForm;
