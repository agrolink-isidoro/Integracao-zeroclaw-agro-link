import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ComercialService from '@/services/comercial';
import FileUpload from '@/components/common/FileUpload';

const Documentos: React.FC = () => {
  const qc = useQueryClient();
  const { data: documentos = [], isLoading } = useQuery({ queryKey: ['documentos'], queryFn: () => ComercialService.getDocumentos() as Promise<any[]> });
  const { data: fornecedores = [] } = useQuery({ queryKey: ['fornecedores'], queryFn: () => ComercialService.getFornecedores() as Promise<any[]> });

  const [form, setForm] = useState({ fornecedor: '', titulo: '', tipo: 'outros', data_vencimento: '' });
  const [arquivo, setArquivo] = useState<File | null>(null);

  const createDoc = useMutation({
    mutationFn: async (fd: FormData) => await ComercialService.createDocumento(fd),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documentos'] })
  });

  const deleteDoc = useMutation({
    mutationFn: async (id: number) => await ComercialService.deleteDocumento(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documentos'] })
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('fornecedor', form.fornecedor);
    fd.append('titulo', form.titulo);
    fd.append('tipo', form.tipo);
    if (form.data_vencimento) fd.append('data_vencimento', form.data_vencimento);
    if (arquivo) fd.append('arquivo', arquivo);
    await createDoc.mutateAsync(fd as any);
    setForm({ fornecedor: '', titulo: '', tipo: 'outros', data_vencimento: '' });
    setArquivo(null);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-0">Documentos de Fornecedores</h1>
          <p className="text-muted">Gerencie documentos, vencimentos e arquivos</p>
        </div>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="card mb-4">
            <div className="card-header">Enviar Documento</div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="fornecedor" className="form-label">Fornecedor</label>
                  <select id="fornecedor" className="form-select" value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}>
                    <option value="">Selecione</option>
                    {fornecedores && fornecedores.map((f: any) => (
                      <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label htmlFor="titulo" className="form-label">Título</label>
                  <input id="titulo" className="form-control" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label htmlFor="tipo" className="form-label">Tipo</label>
                  <select id="tipo" className="form-select" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                    <option value="contrato">Contrato</option>
                    <option value="certificado">Certificado</option>
                    <option value="licenca">Licença</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label htmlFor="data_vencimento" className="form-label">Data de Vencimento</label>
                  <input id="data_vencimento" type="date" className="form-control" value={form.data_vencimento} onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Arquivo</label>
                  <FileUpload onFileSelect={(files) => setArquivo(files?.[0] ?? null)} />
                </div>
                <button className="btn btn-primary" type="submit" disabled={Boolean((createDoc as any).isLoading)}>Enviar</button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card mb-4">
            <div className="card-header">Lista de Documentos</div>
            <div className="card-body">
              {isLoading ? (
                <div>Carregando...</div>
              ) : documentos && documentos.length ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Título</th>
                        <th>Fornecedor</th>
                        <th>Vencimento</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documentos.map((d: any) => (
                        <tr key={d.id}>
                          <td>{d.titulo}</td>
                          <td>{d.fornecedor_nome}</td>
                          <td>{d.data_vencimento || '-'}</td>
                          <td>{d.status_calculado}</td>
                          <td>
                            {d.arquivo_url ? <a className="btn btn-sm btn-outline-secondary me-2" href={d.arquivo_url} target="_blank" rel="noreferrer">Baixar</a> : null}
                            <button className="btn btn-sm btn-danger" onClick={() => deleteDoc.mutate(d.id)}>Remover</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted">Nenhum documento encontrado.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentos;
