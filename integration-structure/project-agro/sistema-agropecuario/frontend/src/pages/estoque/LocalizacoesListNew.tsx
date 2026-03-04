import React, { useState, useEffect } from 'react';
import localizacoesService from '../../services/localizacoes';
import LocalizacaoForm from './LocalizacaoForm';
import type { Localizacao, TipoLocalizacao } from '../../types/estoque_maquinas';

const LocalizacoesListNew: React.FC = () => {
  const [localizacoes, setLocalizacoes] = useState<Localizacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<TipoLocalizacao | ''>('');
  const [ativaFilter, setAtivaFilter] = useState<boolean | ''>('');
  
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedLocalizacao, setSelectedLocalizacao] = useState<Localizacao | undefined>();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [localizacaoToDelete, setLocalizacaoToDelete] = useState<Localizacao | null>(null);

  useEffect(() => {
    console.log('LocalizacoesListNew: componente montado');
    carregarLocalizacoes();
  }, [page, rowsPerPage, searchTerm, tipoFilter, ativaFilter]);

  const carregarLocalizacoes = async () => {
    console.log('Carregando localizações...');
    setLoading(true);
    setError(null);
    try {
      console.log('Chamando API...');
      const response = await localizacoesService.listar({
        page: page + 1,
        page_size: rowsPerPage,
        search: searchTerm || undefined,
        tipo: tipoFilter || undefined,
        ativa: ativaFilter === '' ? undefined : ativaFilter,
        ordering: '-id',
      });
      console.log('Resposta da API:', response);
      setLocalizacoes(response.results);
      setTotalCount(response.count);
    } catch (err: any) {
      console.error('Erro ao carregar localizações:', err);
      setError(err.response?.data?.message || err.message || 'Erro ao carregar localizações');
      setLocalizacoes([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (localizacao?: Localizacao) => {
    setSelectedLocalizacao(localizacao);
    setShowFormModal(true);
  };

  const handleCloseForm = () => {
    setSelectedLocalizacao(undefined);
    setShowFormModal(false);
  };

  const handleSave = async (data: Partial<Localizacao>) => {
    try {
      if (selectedLocalizacao?.id) {
        await localizacoesService.atualizarParcial(selectedLocalizacao.id, data);
        setSuccess('Localização atualizada com sucesso!');
      } else {
        await localizacoesService.criar(data);
        setSuccess('Localização criada com sucesso!');
      }
      handleCloseForm();
      carregarLocalizacoes();
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Erro ao salvar localização');
    }
  };

  const handleOpenDelete = (localizacao: Localizacao) => {
    setLocalizacaoToDelete(localizacao);
    setShowDeleteModal(true);
  };

  const handleCloseDelete = () => {
    setLocalizacaoToDelete(null);
    setShowDeleteModal(false);
  };

  const handleDelete = async () => {
    if (!localizacaoToDelete) return;
    try {
      await localizacoesService.deletar(localizacaoToDelete.id);
      setSuccess('Localização excluída com sucesso!');
      handleCloseDelete();
      carregarLocalizacoes();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao excluir localização');
      handleCloseDelete();
    }
  };

  const getOcupacaoColor = (percentual: number): string => {
    if (percentual < 70) return 'success';
    if (percentual < 90) return 'warning';
    return 'danger';
  };

  const totalPages = Math.ceil(totalCount / rowsPerPage);
  const startItem = page * rowsPerPage + 1;
  const endItem = Math.min((page + 1) * rowsPerPage, totalCount);

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2><i className="bi bi-geo-alt me-2"></i>Localizações de Estoque</h2>
          <p className="text-muted mb-0">Gerenciamento de locais de armazenamento</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenForm()}>
          <i className="bi bi-plus-circle me-2"></i>Nova Localização
        </button>
      </div>

      {loading && !error && localizacoes.length === 0 && (
        <div className="alert alert-info">
          <i className="bi bi-hourglass-split me-2"></i>
          Carregando localizações...
        </div>
      )}

      {error && (
        <div className="alert alert-danger alert-dismissible fade show">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}
      {success && (
        <div className="alert alert-success alert-dismissible fade show">
          {success}
          <button type="button" className="btn-close" onClick={() => setSuccess(null)}></button>
        </div>
      )}

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <input type="text" className="form-control" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="col-md-3">
              <select className="form-select" value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value as TipoLocalizacao | '')}>
                <option value="">Todos os tipos</option>
                <option value="interna">Interna</option>
                <option value="externa">Externa</option>
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={String(ativaFilter)} onChange={(e) => setAtivaFilter(e.target.value === '' ? '' : e.target.value === 'true')}>
                <option value="">Todos os status</option>
                <option value="true">Ativa</option>
                <option value="false">Inativa</option>
              </select>
            </div>
            <div className="col-md-2">
              <button className="btn btn-outline-secondary w-100" onClick={carregarLocalizacoes}>
                <i className="bi bi-arrow-clockwise me-2"></i>Atualizar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading && <div className="progress mb-3" style={{ height: '3px' }}><div className="progress-bar progress-bar-striped progress-bar-animated w-100"></div></div>}
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Endereço</th>
                  <th className="text-end">Capacidade</th>
                  <th>Ocupação</th>
                  <th>Status</th>
                  <th className="text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {localizacoes.length === 0 && !loading ? (
                  <tr><td colSpan={7} className="text-center py-4 text-muted">Nenhuma localização encontrada</td></tr>
                ) : (
                  localizacoes.map((loc) => (
                    <tr key={loc.id}>
                      <td><strong>{loc.nome}</strong></td>
                      <td><span className={`badge bg-${loc.tipo === 'interna' ? 'primary' : 'secondary'}`}>{loc.tipo === 'interna' ? 'Interna' : 'Externa'}</span></td>
                      <td><small className="text-muted">{loc.endereco || '-'}</small></td>
                      <td className="text-end">{loc.capacidade_total.toLocaleString('pt-BR')}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="progress flex-grow-1" style={{ height: '8px', minWidth: '100px' }}>
                            <div className={`progress-bar bg-${getOcupacaoColor(loc.percentual_ocupacao)}`} style={{ width: `${loc.percentual_ocupacao}%` }}></div>
                          </div>
                          <small style={{ minWidth: '45px' }}>{loc.percentual_ocupacao.toFixed(1)}%</small>
                        </div>
                      </td>
                      <td><span className={`badge bg-${loc.ativa ? 'success' : 'secondary'}`}>{loc.ativa ? 'Ativa' : 'Inativa'}</span></td>
                      <td className="text-center">
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-outline-primary" onClick={() => handleOpenForm(loc)}><i className="bi bi-pencil"></i></button>
                          <button className="btn btn-outline-danger" onClick={() => handleOpenDelete(loc)}><i className="bi bi-trash"></i></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalCount > 0 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div className="text-muted">Mostrando {startItem} a {endItem} de {totalCount}</div>
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${page === 0 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage(page - 1)}>Anterior</button>
                  </li>
                  <li className={`page-item ${page >= totalPages - 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage(page + 1)}>Próximo</button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      </div>

      {showFormModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{selectedLocalizacao ? 'Editar Localização' : 'Nova Localização'}</h5>
                <button type="button" className="btn-close" onClick={handleCloseForm}></button>
              </div>
              <div className="modal-body">
                <LocalizacaoForm localizacao={selectedLocalizacao} onSave={handleSave} onCancel={handleCloseForm} />
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirmar Exclusão</h5>
                <button type="button" className="btn-close" onClick={handleCloseDelete}></button>
              </div>
              <div className="modal-body">
                <p>Tem certeza que deseja excluir a localização <strong>{localizacaoToDelete?.nome}</strong>?</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={handleCloseDelete}>Cancelar</button>
                <button className="btn btn-danger" onClick={handleDelete}><i className="bi bi-trash me-2"></i>Excluir</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocalizacoesListNew;
