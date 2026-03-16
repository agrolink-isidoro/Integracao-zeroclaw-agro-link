import React, { useState } from 'react';
import useApi from '@/hooks/useApi';
import { useApiQuery } from '@/hooks/useApi';

interface Item {
  funcionario: { id: number; nome: string };
  liquido?: number | string;
}

const FormaOptions = [
  { value: 'pix', label: 'PIX' },
  { value: 'ted', label: 'TED' },
  { value: 'doc', label: 'DOC' },
  { value: 'interno', label: 'Interno' }
];

const FolhaPagarBatchModal: React.FC<{ folhaId: number; items: Item[]; onClose: () => void; onComplete?: () => void }> = ({ folhaId, items, onClose, onComplete }) => {
  const api = useApi();
  const { data: contas = [] } = useApiQuery<any[]>(['contas-bancarias'], '/financeiro/contas/?page_size=1000');

  const [contaOrigem, setContaOrigem] = useState<number | null>(contas && contas.length ? contas[0].id : null);
  const [rows, setRows] = useState(items.map((it) => ({ funcionario_id: it.funcionario.id, valor: Number(it.liquido || 0), forma: 'pix', dados_bancarios_override: {} as Record<string, unknown>, client_tx_id: null })));
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});

  const updateRow = (idx: number, patch: Partial<typeof rows[0]>) => setRows(r => r.map((rr, i) => i === idx ? { ...rr, ...patch } : rr));

  function validateRow(r: typeof rows[0]) {
    // require conta_destino for TED/DOC and for PIX (to avoid null FK)
    if (r.forma === 'pix') {
      if (!r.dados_bancarios_override?.pix_key && !r.dados_bancarios_override?.conta_destino) {
        return 'PIX requer chave PIX ou conta destino';
      }
    }
    if (r.forma === 'ted' || r.forma === 'doc') {
      if (!r.dados_bancarios_override?.conta_destino) {
        return 'TED/DOC requer conta destino';
      }
    }
    if (!r.valor || Number(r.valor) <= 0) return 'Valor deve ser maior que zero';
    return null;
  }

  function validateAll(): boolean {
    const newErrors: Record<number, string> = {};
    rows.forEach((r, idx) => {
      const err = validateRow(r);
      if (err) newErrors[idx] = err;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!contaOrigem) { alert('Selecione uma conta de origem'); return; }
    if (!validateAll()) { alert('Existem erros no formulário. Corrija antes de enviar.'); return; }
    setSubmitting(true);
    try {
      const payload = { conta_origem: contaOrigem, pagamentos: rows };
      const res = await api.post(`/administrativo/folha-pagamento/${folhaId}/pagar_por_transferencia/`, payload);
      setResults((res.data as { results?: any[] }).results || null);
      onComplete?.();
    } catch (err: unknown) {
      console.error('Erro ao enviar lote', err);
      alert('Erro ao enviar lote de pagamentos');
    } finally {
      setSubmitting(false);
    }
  }

  async function reprocessFailed() {
    if (!results) return;
    const failed = results.filter(r => !r.success).map((r: any, i: number) => {
      // find corresponding row by funcionario_id
      const idx = rows.findIndex(rr => rr.funcionario_id === r.funcionario_id);
      return rows[idx];
    }).filter(Boolean);
    if (failed.length === 0) return alert('Nenhuma falha para reprocessar');
    try {
      setSubmitting(true);
      const payload = { conta_origem: contaOrigem, pagamentos: failed };
      const res = await api.post(`/administrativo/folha-pagamento/${folhaId}/pagar_por_transferencia/`, payload);
      // merge results: replace failed with new responses
      const newResults = [...(results || [])];
      ((res.data as { results?: any[] }).results || []).forEach((nr: any) => {
        const pos = newResults.findIndex((x: any) => x.funcionario_id === nr.funcionario_id);
        if (pos >= 0) newResults[pos] = nr;
      });
      setResults(newResults);
      onComplete?.();
    } catch (err) {
      console.error('Erro ao reprocessar', err);
      alert('Erro ao reprocessar falhas');
    } finally {
      setSubmitting(false);
    }
  }

  function downloadCsv() {
    if (!results) return alert('Nenhum resultado para exportar');
    const headers = ['funcionario_id', 'success', 'transfer_id', 'error'];
    const lines = [headers.join(',')];
    results.forEach((r) => lines.push([r.funcionario_id, r.success, r.transfer_id || '', r.error || ''].join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `folha_${folhaId}_results.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  return (
    <div className="modal d-block" role="dialog" tabIndex={-1}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable" role="document">
        <div className="modal-content">
          <div className="modal-header bg-warning">
            <h5 className="modal-title d-flex align-items-center">
              <i className="bi bi-currency-dollar me-2"></i>
              Pagar Folha por Transferência
            </h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>
          <div className="modal-body p-3 p-md-4">
            <div className="row g-2 g-md-3">
              <div className="col-12">
                <label className="form-label">
                  <i className="bi bi-bank me-1"></i>Conta origem
                </label>
                <select className="form-select" value={contaOrigem ?? ''} onChange={(e) => setContaOrigem(Number(e.target.value))}>
                  <option value="">(selecione)</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.banco} {c.agencia}/{c.conta}</option>)}
                </select>
              </div>
            </div>

            <div className="table-responsive mt-3">
              <table className="table table-hover table-sm">
                <thead className="table-light">
                  <tr>
                    <th><i className="bi bi-person me-1"></i>Funcionário</th>
                    <th><i className="bi bi-cash me-1"></i>Valor</th>
                    <th><i className="bi bi-credit-card me-1"></i>Forma</th>
                    <th><i className="bi bi-qr-code me-1"></i>PIX / Override</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => {
                    const rowError = errors[idx];
                    return (
                      <tr key={r.funcionario_id} className={rowError ? 'table-danger' : ''}>
                        <td>
                          {items[idx].funcionario.nome}
                          {rowError && <div className="text-danger small mt-1"><i className="bi bi-exclamation-triangle me-1"></i>{rowError}</div>}
                        </td>
                        <td><input type="number" step="0.01" className={`form-control ${rowError ? 'is-invalid' : ''}`} value={String(r.valor)} onChange={(e) => updateRow(idx, { valor: Number(e.target.value) })} /></td>
                        <td>
                          <select className={`form-select ${rowError ? 'is-invalid' : ''}`} value={r.forma} onChange={(e) => updateRow(idx, { forma: e.target.value })}>
                            {FormaOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </td>
                        <td>
                          <input placeholder="pix_key" className={`form-control mb-1 ${rowError ? 'is-invalid' : ''}`} value={(r.dados_bancarios_override?.pix_key as string) || ''} onChange={(e) => updateRow(idx, { dados_bancarios_override: { ...(r.dados_bancarios_override || {}), pix_key: e.target.value } })} />
                          <select className={`form-select ${rowError ? 'is-invalid' : ''}`} value={(r.dados_bancarios_override?.conta_destino as any) || ''} onChange={(e) => updateRow(idx, { dados_bancarios_override: { ...(r.dados_bancarios_override || {}), conta_destino: e.target.value ? Number(e.target.value) : null } })}>
                            <option value="">(não informar)</option>
                            {contas.map(c => <option key={c.id} value={c.id}>{c.banco} {c.agencia}/{c.conta}</option>)}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {results && (
              <div className="mt-3 p-3 bg-light rounded">
                <h6 className="d-flex align-items-center">
                  <i className="bi bi-list-check me-2"></i>
                  Resultados
                </h6>
                <div className="d-flex flex-column flex-sm-row gap-2 mb-2">
                  <button className="btn btn-sm btn-outline-secondary" onClick={downloadCsv}>
                    <i className="bi bi-download me-1"></i>Download CSV
                  </button>
                  <button className="btn btn-sm btn-outline-primary" onClick={reprocessFailed} disabled={submitting}>
                    <i className="bi bi-arrow-clockwise me-1"></i>Reprocessar falhas
                  </button>
                </div>
                <ul>
                  {results.map((r, i) => (
                    <li key={i} className={r.success ? 'text-success' : 'text-danger'}>{`Funcionario ${r.funcionario_id}: ${r.success ? `Sucesso (Transfer ${r.transfer_id || '-'})` : `Erro: ${r.error}`}`}</li>
                  ))}
                </ul>
              </div>
            )}

          </div>
          <div className="modal-footer bg-light">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={submitting}>
              <i className="bi bi-x-circle me-2"></i>
              Cancelar
            </button>
            <button type="button" className="btn btn-warning" onClick={handleSubmit} disabled={submitting}>
              <i className="bi bi-send me-2"></i>
              {submitting ? 'Enviando...' : 'Enviar Lote'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FolhaPagarBatchModal;
