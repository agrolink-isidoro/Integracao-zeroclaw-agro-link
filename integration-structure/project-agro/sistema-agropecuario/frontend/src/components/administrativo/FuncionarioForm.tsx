import React, { useState, useEffect } from 'react';
import { useApiCreate, useApiUpdate } from '@/hooks/useApi';

interface Funcionario {
  id?: number;
  nome?: string;
  cpf?: string;
  cargo?: string;
  salario_bruto?: number;
  diaria_valor?: number;
  tipo?: 'registrado' | 'temporario';
  dependentes?: number;
  ativo?: boolean;
  banco?: string;
  agencia?: string;
  conta?: string;
  tipo_conta?: 'corrente' | 'poupanca';
  pix_key?: string;
  recebe_por?: 'pix' | 'transferencia' | 'boleto';
  nome_titular?: string;
  cpf_cnpj?: string;
}

const FuncionarioForm: React.FC<{ onClose?: () => void; initialData?: Partial<Funcionario> | null }> = ({ onClose, initialData }) => {
  const create = useApiCreate('/administrativo/funcionarios/', [['funcionarios']]);
  const update = useApiUpdate('/administrativo/funcionarios/', [['funcionarios']]);

  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [cargo, setCargo] = useState('');
  const [salario, setSalario] = useState('');
  const [tipo, setTipo] = useState<'registrado'|'temporario'>('registrado');
  const [diaria, setDiaria] = useState('');
  const [dependentes, setDependentes] = useState<number>(0);
  const [ativo, setAtivo] = useState(true);

  // banking fields
  const [banco, setBanco] = useState('');
  const [agencia, setAgencia] = useState('');
  const [conta, setConta] = useState('');
  const [tipoConta, setTipoConta] = useState<'corrente'|'poupanca'|undefined>(undefined);
  const [pixKey, setPixKey] = useState('');
  const [recebePor, setRecebePor] = useState<'pix'|'transferencia'|'boleto'>('pix');
  const [nomeTitular, setNomeTitular] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setNome(initialData.nome || '');
      setCpf(initialData.cpf || '');
      setCargo(initialData.cargo || '');
      setSalario(initialData.salario_bruto ? String(initialData.salario_bruto) : '');
      setTipo(initialData.tipo || 'registrado');
      setDiaria(initialData.diaria_valor ? String(initialData.diaria_valor) : '');
      setDependentes(initialData.dependentes ?? 0);
      setAtivo(initialData.ativo ?? true);

      // banking
      setBanco(initialData.banco || '');
      setAgencia(initialData.agencia || '');
      setConta(initialData.conta || '');
      setTipoConta(initialData.tipo_conta || undefined);
      setPixKey(initialData.pix_key || '');
      setRecebePor((initialData.recebe_por as any) || 'pix');
      setNomeTitular(initialData.nome_titular || '');
      setCpfCnpj(initialData.cpf_cnpj || '');
    }
  }, [initialData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      // client-side validation for pix
      if (recebePor === 'pix' && !pixKey) {
        alert('Chave PIX obrigatória quando o funcionário recebe por PIX.');
        setSubmitting(false);
        return;
      }

      const payload: Partial<Funcionario> = { nome, cpf, cargo, dependentes, ativo, banco, agencia, conta, tipo_conta: tipoConta, pix_key: pixKey, recebe_por: recebePor, nome_titular: nomeTitular, cpf_cnpj: cpfCnpj };
      if (tipo === 'temporario') {
        payload.tipo = 'temporario';
        payload.diaria_valor = diaria ? Number(diaria) : undefined;
      } else {
        payload.tipo = 'registrado';
        payload.salario_bruto = salario ? Number(salario) : undefined;
      }
      if (initialData && initialData.id) {
        await update.mutateAsync({ id: initialData.id, ...(payload as Record<string, unknown>) });
        alert('Funcionário atualizado');
      } else {
        await create.mutateAsync(payload as Record<string, unknown>);
        alert('Funcionário criado');
      }
      onClose?.();
    } catch (err: unknown) {
      const extractDetail = (e: unknown) => {
        if (!e || typeof e !== 'object') return String(e);
        const ae = e as { response?: { data?: unknown }; message?: string };
        if (ae.response && typeof ae.response.data === 'object' && ae.response.data !== null && 'detail' in (ae.response.data as Record<string, unknown>)) {
          const d = (ae.response.data as Record<string, unknown>)['detail'];
          return typeof d === 'string' ? d : JSON.stringify(d);
        }
        return JSON.stringify(ae.response?.data) || ae.message || 'Erro desconhecido';
      };
      const serverMsg = extractDetail(err);
      const ae2 = err as { response?: { data?: unknown } };
      console.error('Erro ao salvar funcionário:', ae2.response?.data);
      alert(`Erro ao salvar funcionário: ${serverMsg}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-success text-white d-flex align-items-center">
        <i className="bi bi-person-badge me-2"></i>
        <h5 className="mb-0">{initialData?.id ? 'Editar Funcionário' : 'Novo Funcionário'}</h5>
      </div>
      <div className="card-body p-3 p-md-4">
        <form onSubmit={handleSubmit}>
          <div className="row g-2 g-md-3">
            <div className="col-12 col-md-6">
              <label htmlFor="nome" className="form-label">
                <i className="bi bi-person me-1"></i>Nome
              </label>
              <input id="nome" className="form-control" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
            <div className="col-12 col-md-6">
              <label htmlFor="cpf" className="form-label">
                <i className="bi bi-card-text me-1"></i>CPF
              </label>
              <input id="cpf" className="form-control" value={cpf} onChange={(e) => setCpf(e.target.value)} />
            </div>
            <div className="col-12 col-md-6">
              <label htmlFor="cargo" className="form-label">
                <i className="bi bi-briefcase me-1"></i>Cargo
              </label>
              <input id="cargo" className="form-control" value={cargo} onChange={(e) => setCargo(e.target.value)} />
            </div>
            <div className="col-12 col-md-6">
              <label htmlFor="tipo" className="form-label">
                <i className="bi bi-tags me-1"></i>Tipo
              </label>
              <select id="tipo" className="form-select" value={tipo} onChange={(e) => setTipo(e.target.value as 'registrado' | 'temporario')}>
                <option value="registrado">Registrado</option>
                <option value="temporario">Temporário</option>
              </select>
            </div>

            {tipo === 'registrado' ? (
              <div className="col-12 col-md-6">
                <label htmlFor="salario" className="form-label">
                  <i className="bi bi-cash me-1"></i>Salário mensal
                </label>
                <input id="salario" type="number" step="0.01" className="form-control" value={salario} onChange={(e) => setSalario(e.target.value)} />
              </div>
            ) : (
              <div className="col-12 col-md-6">
                <label htmlFor="diaria" className="form-label">
                  <i className="bi bi-cash-coin me-1"></i>Valor diário (R$)
                </label>
                <input id="diaria" type="number" step="0.01" className="form-control" value={diaria} onChange={(e) => setDiaria(e.target.value)} />
              </div>
            )}

            {/* Banking section */}
            <div className="col-12"><hr className="my-3" /></div>
            <div className="col-12 col-md-6">
              <label className="form-label">
                <i className="bi bi-credit-card me-1"></i>Recebe por
              </label>
              <select className="form-select" value={recebePor} onChange={(e) => setRecebePor(e.target.value as any)}>
                <option value="pix">PIX</option>
                <option value="transferencia">Transferência Bancária</option>
                <option value="boleto">Boleto</option>
              </select>
            </div>

            <div className="col-12 col-md-6">
              <label htmlFor="pix" className="form-label">
                <i className="bi bi-qr-code me-1"></i>Chave PIX
              </label>
              <input id="pix" className="form-control" value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="CPF/Tel/Email/EVP" />
            </div>

            <div className="col-12 col-md-6">
              <label htmlFor="banco" className="form-label">
                <i className="bi bi-bank me-1"></i>Banco
              </label>
              <input id="banco" className="form-control" value={banco} onChange={(e) => setBanco(e.target.value)} />
            </div>
            <div className="col-12 col-md-3">
              <label htmlFor="agencia" className="form-label">
                <i className="bi bi-hash me-1"></i>Agência
              </label>
              <input id="agencia" className="form-control" value={agencia} onChange={(e) => setAgencia(e.target.value)} />
            </div>
            <div className="col-12 col-md-3">
              <label htmlFor="conta" className="form-label">
                <i className="bi bi-hash me-1"></i>Conta
              </label>
              <input id="conta" className="form-control" value={conta} onChange={(e) => setConta(e.target.value)} />
            </div>

            <div className="col-12 col-md-6">
              <label htmlFor="tipo_conta" className="form-label">
                <i className="bi bi-wallet2 me-1"></i>Tipo de Conta
              </label>
              <select id="tipo_conta" className="form-select" value={tipoConta} onChange={(e) => setTipoConta(e.target.value as any)}>
                <option value="">(não informado)</option>
                <option value="corrente">Corrente</option>
                <option value="poupanca">Poupança</option>
              </select>
            </div>

            <div className="col-12 col-md-6">
              <label htmlFor="nome_titular" className="form-label">
                <i className="bi bi-person-vcard me-1"></i>Nome do titular
              </label>
              <input id="nome_titular" className="form-control" value={nomeTitular} onChange={(e) => setNomeTitular(e.target.value)} />
            </div>

            <div className="col-12 col-md-6">
              <label htmlFor="cpf_cnpj" className="form-label">
                <i className="bi bi-file-earmark-text me-1"></i>CPF / CNPJ do titular
              </label>
              <input id="cpf_cnpj" className="form-control" value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} />
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label">
                <i className="bi bi-people me-1"></i>Número de dependentes
              </label>
              <input type="number" min="0" className="form-control" value={dependentes} onChange={(e) => setDependentes(Number(e.target.value))} />
            </div>

            <div className="col-12">
              <div className="form-check mt-2">
                <input className="form-check-input" type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} id="ativo" />
                <label className="form-check-label" htmlFor="ativo">
                  <i className="bi bi-toggle-on me-1"></i>Ativo
                </label>
              </div>
            </div>

            <div className="col-12">
              <div className="d-flex flex-column flex-sm-row gap-2 justify-content-end mt-3">
                <button type="button" className="btn btn-outline-secondary" onClick={() => onClose && onClose()} disabled={submitting}>
                  <i className="bi bi-x-circle me-2"></i>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-success" disabled={submitting}>
                  <i className="bi bi-check-circle me-2"></i>
                  {submitting ? 'Enviando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FuncionarioForm;
