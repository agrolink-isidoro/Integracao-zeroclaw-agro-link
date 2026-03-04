import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useEmpresa, useEmpresaDespesas, useEmpresaAgregados } from '@/hooks/useEmpresa';

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const EmpresaDetail: React.FC = () => {
  const { id } = useParams();
  const empresaId = Number(id);
  const [periodo, setPeriodo] = useState<string>(new Date().toISOString().slice(0,7)); // YYYY-MM

  const { data: empresa, isLoading: loadingEmpresa } = useEmpresa(empresaId);
  const { data: despesas } = useEmpresaDespesas(empresaId, { periodo });
  const { data: agregados, refetch: refetchAgregados } = useEmpresaAgregados(empresaId, periodo);

  const empresaObj = empresa as any;
  const despesasArr = Array.isArray(despesas) ? (despesas as any[]) : [];
  const agregadosObj = agregados as any;

  const handleDownload = async () => {
    try {
      // try to fetch CSV from backend
      const resp = await fetch(`/api/comercial/empresas/${empresaId}/agregados/?periodo=${periodo}&format=csv`);
      if (resp.ok && resp.headers.get('content-type')?.includes('text/csv')) {
        const text = await resp.text();
        downloadCSV(`agregados_empresa_${empresaId}_${periodo}.csv`, text);
        return;
      }
    } catch (e) {
      // ignore and fallback to client-side CSV
    }

    // fallback: build CSV from agregados JSON
    if (agregadosObj && agregadosObj.por_categoria) {
      const lines = ['categoria,total'];
      agregadosObj.por_categoria.forEach((r: any) => lines.push(`${r.categoria},${r.total}`));
      lines.push(`TOTAL,${agregadosObj.total}`);
      downloadCSV(`agregados_empresa_${empresaId}_${periodo}.csv`, lines.join('\n'));
    }
  };

  if (loadingEmpresa) return <div>Carregando...</div>;
  if (!empresaObj) return <div className="alert alert-warning">Empresa não encontrada.</div>;

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2>{empresaObj.nome}</h2>
          <small className="text-muted">CNPJ: {empresaObj.cnpj}</small>
        </div>
        <div>
          <input type="month" value={periodo} onChange={(e) => { setPeriodo(e.target.value); refetchAgregados(); }} className="form-control d-inline-block me-2" style={{ width: 180 }} />
          <button className="btn btn-outline-primary" onClick={handleDownload}>Baixar Agregados (.csv)</button>
          <Link to={`/comercial/despesas-prestadoras/new?empresa=${empresaId}`} className="btn btn-outline-success ms-2">Adicionar Despesa</Link>
        </div>
      </div>

      <div className="row">
        <div className="col-md-6 mb-4">
          <div className="card">
            <div className="card-header">Agregados ({periodo})</div>
            <div className="card-body">
              {agregadosObj ? (
                <ul>
                  {agregadosObj.por_categoria.map((p: any) => (
                    <li key={p.categoria}>{p.categoria}: R$ {Number(p.total).toFixed(2)}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted">Nenhum agregado disponível para o período.</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-6 mb-4">
          <div className="card">
            <div className="card-header">Despesas ({despesasArr.length || 0})</div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Categoria</th>
                      <th>Valor</th>
                      <th>Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {despesasArr && despesasArr.length ? despesasArr.map((d: any) => (
                      <tr key={d.id}>
                        <td>{d.data}</td>
                        <td>{d.categoria}</td>
                        <td>R$ {Number(d.valor).toFixed(2)}</td>
                        <td>{d.descricao}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="text-center">Nenhuma despesa encontrada.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmpresaDetail;
