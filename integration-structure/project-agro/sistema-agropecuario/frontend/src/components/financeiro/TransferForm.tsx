import React, { useEffect, useMemo, useState } from 'react';
import { useApiCreate, useApiQuery } from '@/hooks/useApi';

interface Props {
  onClose: () => void;
  onSaved?: (data: any) => void;
}

/** Check if a string-like value is meaningful (not empty, null, undefined). */
const filled = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

const TransferForm: React.FC<Props> = ({ onClose, onSaved }) => {
  const { data: contas = [] } = useApiQuery<any[]>(['contas-bancarias'], '/financeiro/contas/?page_size=1000');
  const { data: fornecedores = [], isLoading: loadingFornecedores, error: errorFornecedores } = useApiQuery<any[]>(['fornecedores'], '/comercial/fornecedores/?page_size=1000&status=ativo');

  const [contaOrigem, setContaOrigem] = useState<number | ''>('');
  const [contaDestino, setContaDestino] = useState<number | ''>('');
  const [tipo, setTipo] = useState<string>('interno');
  const [valor, setValor] = useState<string>('0.00');
  const [descricao, setDescricao] = useState<string>('');
  const [pixOrigem, setPixOrigem] = useState<string>('');
  const [pixDestino, setPixDestino] = useState<string>('');
  const [fornecedorId, setFornecedorId] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isPix = tipo === 'pix';
  const isExternal = tipo === 'doc' || tipo === 'ted';
  const showFornecedor = tipo !== 'interno';
  const requireContaDestino = !isPix;

  const createTransfer = useApiCreate('/financeiro/transferencias/', [['transferencias']]);

  // --- Derive selected fornecedor's payment capabilities ---
  const selectedFornecedor = fornecedorId ? fornecedores.find((f: any) => f.id === fornecedorId) : null;
  const fornBankData = selectedFornecedor?.dados_bancarios;

  const fornHasBank = useMemo(() => {
    if (!fornBankData) return false;
    return filled(fornBankData.banco) && filled(fornBankData.agencia) && filled(fornBankData.conta);
  }, [fornBankData]);

  const fornHasPix = useMemo(() => {
    if (!fornBankData) return false;
    return filled(fornBankData.chave_pix);
  }, [fornBankData]);

  // True when a fornecedor is selected but has NO payment data at all
  const fornMissingData = !!fornecedorId && !fornHasBank && !fornHasPix;

  // --- Reset errors on field change ---
  useEffect(() => {
    setErrors({});
  }, [tipo, pixOrigem, pixDestino, contaOrigem, contaDestino, valor, fornecedorId]);

  // --- When a fornecedor is selected, auto-detect payment method ---
  useEffect(() => {
    if (!fornecedorId || !fornBankData) return;

    const hasBank = filled(fornBankData.banco) && filled(fornBankData.agencia) && filled(fornBankData.conta);
    const hasPix = filled(fornBankData.chave_pix);

    if (hasBank && !hasPix) {
      // Only bank data → switch to TED
      setTipo('ted');
    } else if (hasPix && !hasBank) {
      // Only PIX → switch to PIX and auto-fill key
      setTipo('pix');
      setPixDestino(fornBankData.chave_pix);
    } else if (hasPix && hasBank) {
      // Both available → default to TED if currently interno
      if (tipo === 'interno') {
        setTipo('ted');
      }
      if (tipo === 'pix') {
        setPixDestino(fornBankData.chave_pix);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fornecedorId]);

  // When switching to PIX and fornecedor has pix, auto-fill
  useEffect(() => {
    if (isPix && fornBankData && filled(fornBankData.chave_pix) && !pixDestino) {
      setPixDestino(fornBankData.chave_pix);
    }
  }, [isPix, fornBankData, pixDestino]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!contaOrigem) e.conta_origem = 'Conta de origem obrigatória';
    if (requireContaDestino && !contaDestino) e.conta_destino = 'Conta de destino obrigatória';
    if (contaOrigem && contaDestino && contaOrigem === contaDestino) e.conta_destino = 'Conta de destino deve ser diferente da origem';
    if (!valor || isNaN(Number(String(valor))) || Number(String(valor)) <= 0) e.valor = 'Valor inválido';
    if (isPix) {
      if (!pixOrigem) e.pix_key_origem = 'Chave PIX de origem obrigatória para transferências PIX';
      if (!pixDestino) e.pix_key_destino = 'Chave PIX de destino obrigatória para transferências PIX';
    }
    if (isExternal && !fornecedorId) {
      e.fornecedor_id = 'Fornecedor é obrigatório para transferências DOC/TED';
    }
    // Block if fornecedor has no payment data
    if (fornMissingData && showFornecedor) {
      e.fornecedor_id = 'Dados bancários não disponíveis. Favor informar no cadastro do fornecedor.';
    }
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        conta_origem: contaOrigem,
        tipo_transferencia: tipo,
        valor: Number(String(valor)),
        descricao: descricao || undefined,
      };
      if (contaDestino) {
        payload.conta_destino = contaDestino;
      } else {
        payload.conta_destino = null;
      }
      if (isPix) {
        payload.pix_key_origem = pixOrigem;
        payload.pix_key_destino = pixDestino;
      }
      if (fornecedorId) {
        payload.fornecedor_id = fornecedorId;
      }
      const res = await createTransfer.mutateAsync(payload);
      if (onSaved) onSaved(res);
      onClose();
    } catch (err: any) {
      const data = err?.response?.data || err?.data || null;
      if (data && typeof data === 'object') {
        const eMap: Record<string, string> = {};
        Object.entries(data).forEach(([k, v]) => { eMap[k] = String(v); });
        setErrors(eMap);
      } else {
        alert('Erro ao criar transferência: ' + (err?.message || String(err)));
      }
    } finally {
      setSaving(false);
    }
  };

  // --- Determine which tipo options are available based on fornecedor data ---
  const tipoOptions = useMemo(() => {
    const base = [
      { value: 'interno', label: 'Interno' },
      { value: 'doc', label: 'DOC' },
      { value: 'ted', label: 'TED' },
      { value: 'pix', label: 'PIX' },
    ];
    if (!fornecedorId) return base;
    // When fornecedor is selected, filter to available methods
    const available: typeof base = [];
    if (fornHasBank) {
      available.push({ value: 'doc', label: 'DOC' });
      available.push({ value: 'ted', label: 'TED' });
    }
    if (fornHasPix) {
      available.push({ value: 'pix', label: 'PIX' });
    }
    // If nothing available, show all (validation will block)
    if (available.length === 0) return base;
    return available;
  }, [fornecedorId, fornHasBank, fornHasPix]);

  return (
    <div className="modal show d-block" tabIndex={-1} role="dialog">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Nova Transferência</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">
                <i className="bi bi-tag me-2"></i>Tipo
              </label>
              <select name="tipo" className="form-select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {tipoOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">
                <i className="bi bi-bank me-2"></i>Conta Origem
              </label>
              <select name="conta_origem" className="form-select" value={contaOrigem} onChange={(e) => setContaOrigem(e.target.value ? Number(e.target.value) : '')}>
                <option value="">Selecione...</option>
                {contas.map(c => <option key={c.id} value={c.id}>{c.banco} - {c.conta}</option>)}
              </select>
              {errors.conta_origem && <div className="text-danger small">{errors.conta_origem}</div>}
            </div>

            {showFornecedor && (
              <div className="mb-3">
                <label className="form-label">
                  <i className="bi bi-people me-2"></i>Fornecedor {isExternal && <span className="text-danger">*</span>}
                </label>
                <select name="fornecedor_id" className="form-select" value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">
                    {loadingFornecedores ? 'Carregando fornecedores...' : 'Selecione um fornecedor...'}
                  </option>
                  {fornecedores.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}{f.cpf_cnpj ? ` (${f.cpf_cnpj})` : ''}
                    </option>
                  ))}
                </select>
                {errorFornecedores && (
                  <div className="text-danger small">Erro ao carregar fornecedores. Tente recarregar a página.</div>
                )}
                {errors.fornecedor_id && <div className="text-danger small">{errors.fornecedor_id}</div>}

                {/* Alert: fornecedor selected but has NO payment data */}
                {fornMissingData && (
                  <div className="alert alert-warning mt-2 mb-0 py-2 small">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    <strong>Dados bancários não disponíveis.</strong> Favor informar no cadastro do fornecedor antes de realizar a transferência.
                  </div>
                )}

                {!fornecedorId && isExternal && (
                  <div className="form-text text-muted small mt-1">
                    <i className="bi bi-info-circle me-1"></i>
                    Transferências DOC/TED exigem vínculo com um fornecedor cadastrado.
                  </div>
                )}
                {!fornecedorId && isPix && (
                  <div className="form-text text-muted small mt-1">
                    <i className="bi bi-info-circle me-1"></i>
                    Vincular fornecedor é opcional para PIX, mas facilita o rastreamento.
                  </div>
                )}

                {/* Show fornecedor bank data when available */}
                {fornecedorId && !fornMissingData && fornBankData && (
                  <div className="border rounded p-2 mt-2 bg-light small">
                    <strong><i className="bi bi-credit-card me-1"></i>Dados bancários do fornecedor:</strong>
                    {fornHasBank && (
                      <>
                        <div>Banco: {fornBankData.banco} | Ag: {fornBankData.agencia} | Cc: {fornBankData.conta}</div>
                        {filled(fornBankData.tipo_conta) && <div>Tipo: {fornBankData.tipo_conta}</div>}
                        {filled(fornBankData.titular) && <div>Titular: {fornBankData.titular}</div>}
                      </>
                    )}
                    {fornHasPix && (
                      <div>
                        <i className="bi bi-qr-code me-1"></i>
                        PIX ({fornBankData.tipo_chave_pix || 'chave'}): {fornBankData.chave_pix}
                      </div>
                    )}
                    {fornHasBank && fornHasPix && (
                      <div className="text-success mt-1">
                        <i className="bi bi-check-circle me-1"></i>
                        Dados bancários e chave PIX disponíveis. Selecione o tipo desejado acima.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Conta Destino: required for interno/DOC/TED, optional for PIX */}
            {!isPix && (
              <div className="mb-3">
                <label className="form-label">
                  <i className="bi bi-bank me-2"></i>Conta Destino <span className="text-danger">*</span>
                </label>
                <select name="conta_destino" className="form-select" value={contaDestino} onChange={(e) => setContaDestino(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">Selecione...</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.banco} - {c.conta}</option>)}
                </select>
                {errors.conta_destino && <div className="text-danger small">{errors.conta_destino}</div>}
              </div>
            )}

            {isPix && (
              <div className="mb-3">
                <label className="form-label">
                  <i className="bi bi-bank me-2"></i>Conta Destino <span className="text-muted small">(opcional)</span>
                </label>
                <select name="conta_destino" className="form-select" value={contaDestino} onChange={(e) => setContaDestino(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">Nenhuma (saída via PIX)</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.banco} - {c.conta}</option>)}
                </select>
                <div className="form-text text-muted small mt-1">
                  <i className="bi bi-info-circle me-1"></i>
                  PIX não exige conta de destino interna — o dinheiro sai pela chave PIX.
                </div>
                {errors.conta_destino && <div className="text-danger small">{errors.conta_destino}</div>}
              </div>
            )}

            <div className="mb-3">
              <label className="form-label">
                <i className="bi bi-cash me-2"></i>Valor
              </label>
              <input name="valor" placeholder="Valor" className="form-control" value={valor} onChange={(e) => setValor(e.target.value)} />
              {errors.valor && <div className="text-danger small">{errors.valor}</div>}
            </div>
            <div className="mb-3">
              <label className="form-label">Descrição (opcional)</label>
              <input className="form-control" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>

            {isPix && (
              <div className="border rounded p-2 mb-3">
                <div className="mb-2"><strong>Chaves PIX (obrigatórias para PIX)</strong></div>
                <div className="mb-3">
                  <label className="form-label">Chave PIX Origem</label>
                  <input name="pix_key_origem" placeholder="Chave PIX Origem" className="form-control" value={pixOrigem} onChange={(e) => setPixOrigem(e.target.value)} />
                  {errors.pix_key_origem && <div className="text-danger small">{errors.pix_key_origem}</div>}
                </div>
                <div className="mb-3">
                  <label className="form-label">Chave PIX Destino</label>
                  <input name="pix_key_destino" placeholder="Chave PIX Destino" className="form-control" value={pixDestino} onChange={(e) => setPixDestino(e.target.value)} />
                  {errors.pix_key_destino && <div className="text-danger small">{errors.pix_key_destino}</div>}
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer d-flex flex-column flex-sm-row gap-2">
            <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={saving || (fornMissingData && showFornecedor)}
            >
              {saving ? 'Enviando...' : 'Enviar Transferência'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransferForm;
