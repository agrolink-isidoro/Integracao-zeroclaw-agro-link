import React, { useState } from 'react';
import FileUpload from '@/components/common/FileUpload';
import { useApiQuery } from '@/hooks/useApi';
import useApi from '@/hooks/useApi';
import conciliacaoService from '@/services/conciliacao';

const ExtratosUpload: React.FC = () => {
  const { data: contas = [] } = useApiQuery<any[]>(['contas-bancarias'], '/financeiro/contas/');
  const api = useApi();
  const [showModal, setShowModal] = useState(false);
  const [conta, setConta] = useState<number | ''>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [previewErrors, setPreviewErrors] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [loadingConciliacao, setLoadingConciliacao] = useState(false);
  const [lastImportId, setLastImportId] = useState<number | null>(null);
  const [conciliacaoResult, setConciliacaoResult] = useState<any>(null);

  const resetModal = () => {
    setSelectedFiles([]);
    setPreview([]);
    setPreviewErrors([]);
    setConta('');
    setLastImportId(null);
    setConciliacaoResult(null);
    setShowModal(false);
  };

  const handlePreview = async () => {
    if (!conta) return alert('Selecione uma conta bancária');
    if (selectedFiles.length === 0) return alert('Selecione um arquivo CSV');
    const file = selectedFiles[0];
    setLoadingPreview(true);
    try {
      const fd = new FormData();
      fd.append('conta', String(conta));
      fd.append('arquivo', file);
      fd.append('dry_run', 'true');

      const resp = await api.client.post('/financeiro/bank-statements/', fd);
      const data = resp.data as any;
      setPreview(data.preview || []);
      setPreviewErrors(data.errors || []);
    } catch (e: any) {
      console.error('Preview failed', e);
      alert('Falha ao gerar preview: ' + (e?.response?.data?.detail || e?.message || 'erro desconhecido'));
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleImport = async () => {
    if (!conta) return alert('Selecione uma conta bancária');
    if (selectedFiles.length === 0) return alert('Selecione um arquivo CSV');
    const file = selectedFiles[0];
    setLoadingImport(true);
    try {
      const fd = new FormData();
      fd.append('conta', String(conta));
      fd.append('arquivo', file);
      const resp = await api.client.post('/financeiro/bank-statements/', fd);
      const status = resp.status;
      const data = resp.data;

      if (status === 202 && data?.detail === 'enqueued') {
        alert('Importação enfileirada. ID: ' + data.import_id);
        setLastImportId(data.import_id);
      } else if (status === 201) {
        alert('Importação concluída com sucesso');
        setLastImportId(data.id);
      } else {
        alert('Resposta inesperada: ' + JSON.stringify(data));
      }

      // Não resetar modal para permitir conciliação
      setPreview([]);
      setPreviewErrors([]);
      setSelectedFiles([]);
    } catch (e: any) {
      console.error('Import failed', e);
      alert('Falha na importação: ' + (e?.response?.data?.detail || e?.message || 'erro desconhecido'));
    } finally {
      setLoadingImport(false);
    }
  };

  const handleConciliar = async () => {
    if (!lastImportId) {
      alert('Nenhuma importação para conciliar');
      return;
    }

    setLoadingConciliacao(true);
    try {
      const result = await conciliacaoService.conciliarImportacao(lastImportId);
      setConciliacaoResult(result);
      alert(
        `Conciliação concluída!\n\n` +
        `Itens criados: ${result.itens_criados}\n` +
        `Duplicados: ${result.itens_duplicados}\n` +
        `Erros: ${result.erros?.length || 0}`
      );
    } catch (e: any) {
      console.error('Conciliação falhou', e);
      alert('Erro na conciliação: ' + (e?.response?.data?.error || e?.message || 'erro desconhecido'));
    } finally {
      setLoadingConciliacao(false);
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2>
            <i className="bi bi-file-earmark-text me-2"></i>
            Conciliação Bancária
          </h2>
          <p className="text-muted mb-0">Importe extratos em CSV e reconcilie transações.</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <i className="bi bi-upload me-1" /> Novo Extrato
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <p>Use o botão <strong>Novo Extrato</strong> para carregar um CSV de extrato bancário. Você pode gerar um preview antes de confirmar a importação.</p>
        </div>
      </div>

      {showModal && (
        <div className="modal d-block" tabIndex={-1} role="dialog">
          <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Upload de Extrato</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowModal(false)} />
              </div>

              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Conta Bancária</label>
                  <select 
                    className="form-select" 
                    value={conta === '' ? '' : conta} 
                    onChange={(e) => setConta(e.target.value === '' ? '' : Number(e.target.value))}
                  >
                    <option value="">Selecione...</option>
                    {contas.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.banco} - Ag: {c.agencia} - Conta: {c.conta}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <FileUpload accept=".csv,.txt" multiple={false} onFileSelect={(files) => setSelectedFiles(files)} />
                </div>

                <div className="mb-3 d-flex gap-2">
                  <button className="btn btn-outline-primary" onClick={handlePreview} disabled={loadingPreview}>
                    {loadingPreview ? 'Gerando preview...' : 'Preview'}
                  </button>
                  <button className="btn btn-primary" onClick={handleImport} disabled={loadingImport}>
                    {loadingImport ? 'Importando...' : 'Importar'}
                  </button>
                  {lastImportId && (
                    <button className="btn btn-success" onClick={handleConciliar} disabled={loadingConciliacao}>
                      {loadingConciliacao ? 'Conciliando...' : '🔗 Conciliar'}
                    </button>
                  )}
                </div>

                {lastImportId && (
                  <div className="alert alert-success">
                    <i className="bi bi-check-circle me-2"></i>
                    <strong>Importação #{lastImportId} concluída!</strong>
                    {!conciliacaoResult && (
                      <p className="mb-0 mt-1 small">
                        Clique em <strong>Conciliar</strong> para converter as transações e executar matching automático com vencimentos.
                      </p>
                    )}
                  </div>
                )}

                {conciliacaoResult && (
                  <div className="mt-3">
                    <div className="card">
                      <div className="card-header">
                        <h6 className="mb-0">Resultado da Conciliação</h6>
                      </div>
                      <div className="card-body">
                        <div className="row g-3">
                          <div className="col-md-3">
                            <div className="text-center">
                              <div className="display-6 text-primary">{conciliacaoResult.itens_criados}</div>
                              <small className="text-muted">Itens Criados</small>
                            </div>
                          </div>
                          <div className="col-md-3">
                            <div className="text-center">
                              <div className="display-6 text-success">{conciliacaoResult.matches_automaticos?.conciliados || 0}</div>
                              <small className="text-muted">Conciliados Auto</small>
                            </div>
                          </div>
                          <div className="col-md-3">
                            <div className="text-center">
                              <div className="display-6 text-warning">{conciliacaoResult.matches_automaticos?.sugestoes?.length || 0}</div>
                              <small className="text-muted">Sugestões</small>
                            </div>
                          </div>
                          <div className="col-md-3">
                            <div className="text-center">
                              <div className="display-6 text-secondary">{conciliacaoResult.itens_duplicados}</div>
                              <small className="text-muted">Duplicados</small>
                            </div>
                          </div>
                        </div>

                        {conciliacaoResult.matches_automaticos?.sugestoes?.length > 0 && (
                          <div className="mt-3">
                            <h6>Sugestões de Conciliação Manual</h6>
                            <div style={{ maxHeight: 200, overflow: 'auto' }}>
                              <table className="table table-sm">
                                <thead>
                                  <tr>
                                    <th>Data</th>
                                    <th>Extrato</th>
                                    <th>Vencimento</th>
                                    <th>Similaridade</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {conciliacaoResult.matches_automaticos.sugestoes.map((s: any, i: number) => (
                                    <tr key={i}>
                                      <td>{s.item_data}</td>
                                      <td>
                                        <small>{s.item_descricao.substring(0, 30)}...</small>
                                        <br />
                                        <strong>R$ {s.item_valor.toFixed(2)}</strong>
                                      </td>
                                      <td>
                                        <small>{s.vencimento_titulo}</small>
                                        <br />
                                        <strong>R$ {s.vencimento_valor.toFixed(2)}</strong>
                                      </td>
                                      <td>
                                        <span className={`badge ${s.similaridade >= 0.8 ? 'bg-success' : s.similaridade >= 0.6 ? 'bg-warning' : 'bg-secondary'}`}>
                                          {(s.similaridade * 100).toFixed(0)}%
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <p className="small text-muted mt-2">
                              💡 Revise as sugestões e concilie manualmente itens com similaridade &lt; 90%
                            </p>
                          </div>
                        )}

                        {conciliacaoResult.erros && conciliacaoResult.erros.length > 0 && (
                          <div className="mt-3 alert alert-danger">
                            <strong>Erros:</strong>
                            <ul className="mb-0 mt-1">
                              {conciliacaoResult.erros.map((e: string, i: number) => <li key={i}>{e}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {preview && preview.length > 0 && (
                  <div className="mt-3">
                    <h6>Preview ({preview.length} linhas)</h6>
                    <div style={{ maxHeight: 240, overflow: 'auto' }}>
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Valor</th>
                            <th>Descrição</th>
                            <th>ID Externo</th>
                            <th>Saldo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.map((r: any, i: number) => (
                            <tr key={i}>
                              <td>{r.date}</td>
                              <td>{r.amount}</td>
                              <td>{r.description}</td>
                              <td>{r.external_id}</td>
                              <td>{r.balance}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {previewErrors && previewErrors.length > 0 && (
                  <div className="mt-3 alert alert-warning">
                    <strong>Erros no preview:</strong>
                    <ul>
                      {previewErrors.map((e: any, idx: number) => <li key={idx}>Linha {e.row}: {e.error}</li>)}
                    </ul>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtratosUpload;
