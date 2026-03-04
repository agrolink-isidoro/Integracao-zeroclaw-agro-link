import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Produto, CategoriaProduto, LocalArmazenagem } from '../../types/estoque_maquinas';
import { produtosService, categoriasService, locaisService } from '../../services/produtos';
import DataTable from '../common/DataTable';
import ModalForm from '../common/ModalForm';
import ConfirmDialog from '../common/ConfirmDialog';
import ProdutoForm from './ProdutoForm';
import { getUnitLabel } from '../../utils/units';

const ProdutosList: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [deleteProduto, setDeleteProduto] = useState<Produto | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    categoria: '',
    principio_ativo: '',
    fornecedor: '',
    status: '',
    local_armazenamento: '',
    ordering: '-criado_em'
  });
  const [categorias, setCategorias] = useState<CategoriaProduto[]>([]);
  const [locaisComSaldo, setLocaisComSaldo] = useState<LocalArmazenagem[]>([]);

  // Queries
  const { data: produtosResponse, isLoading, refetch } = useQuery({
    queryKey: ['produtos', JSON.stringify(filters)],
    queryFn: () => produtosService.listar(filters),
    enabled: true
  });

  const produtos: Produto[] = produtosResponse?.results || [];

  const queryClient = useQueryClient();

  useEffect(() => {
    // Carregar categorias
    const loadCategorias = async () => {
      try {
        const cats = await categoriasService.listar();
        setCategorias(cats);
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
      }
    };
    // Carregar locais com saldo > 0 para o filtro
    const loadLocaisComSaldo = async () => {
      try {
        const locais = await locaisService.listarComSaldo();
        setLocaisComSaldo(locais);
      } catch (error) {
        console.error('Erro ao carregar locais com saldo:', error);
      }
    };
    loadCategorias();
    loadLocaisComSaldo();
  }, []);

  const handleEdit = (produto: Produto) => {
    setEditingProduto(produto);
  };

  const handleDelete = (produto: Produto) => {
    setDeleteProduto(produto);
  };

  const confirmDelete = async () => {
    if (deleteProduto) {
      try {
        await produtosService.deletar(deleteProduto.id);
        queryClient.invalidateQueries({ queryKey: ['produtos'], exact: false });
        setDeleteProduto(null);
      } catch (error) {
        console.error('Erro ao excluir produto:', error);
      }
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingProduto(null);
  };

  const handleSaveProduto = async (produtoData: Omit<Produto, 'id'> | Partial<Produto>) => {
    try {
      // Empty payload = movimentação já registrada pelo ProdutoForm (modo produto existente)
      // Apenas refetch + fecha o modal sem tentar criar/atualizar o produto novamente
      if (!('nome' in produtoData) || !(produtoData as Partial<Produto>).nome) {
        refetch();
        handleCloseModal();
        return;
      }
      if (editingProduto) {
        await produtosService.atualizar(editingProduto.id, produtoData);
      } else {
        await produtosService.criar(produtoData as Omit<Produto, 'id'>);
      }
      refetch();
      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      throw error;
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      categoria: '',
      principio_ativo: '',
      fornecedor: '',
      status: '',
      local_armazenamento: '',
      ordering: '-criado_em'
    });
  };

  const getCategoriaBadgeColor = (categoriaKey: number | string) => {
    // categoria can be stored as tag (string) or id (number)
    const categoria = categorias.find(c => c.id === Number(categoriaKey) || c.tag === String(categoriaKey));
    if (!categoria) return 'bg-secondary';

    const nome = categoria.nome.toLowerCase();
    const colors: Record<string, string> = {
      'semente': 'bg-success',
      'fertilizante': 'bg-info',
      'corretivo': 'bg-warning',
      'herbicida': 'bg-danger',
      'fungicida': 'bg-primary',
      'inseticida': 'bg-dark',
      'acaricida': 'bg-secondary',
      'adjuvante': 'bg-light text-dark'
    };
    return colors[nome] || 'bg-secondary';
  };

  const getCategoriaNome = (categoriaKey: number | string) => {
    const categoria = categorias.find(c => c.id === Number(categoriaKey) || c.tag === String(categoriaKey));
    return categoria?.nome || 'N/A';
  };

  // Função para padronizar unidades
  const padronizarUnidade = (unidade: string) => {
    const mapaUnidades: { [key: string]: string } = {
      'LT': 'L',
      'TON': 't'
    };
    return mapaUnidades[unidade] || unidade;
  };

  // Map display labels for units (helper imported at top)

  const columns = [
    {
      key: 'codigo',
      header: 'Código',
      sortable: true,
      render: (value: string) => (
        <span className="fw-semibold text-primary">
          <i className="bi bi-upc me-1"></i>
          {value}
        </span>
      )
    },
    {
      key: 'nome',
      header: 'Nome',
      sortable: true,
      render: (value: string, item: Produto) => (
        <div>
          <div className="fw-semibold">{value}</div>
          {item.principio_ativo && (
            <small className="text-muted">
              <i className="bi bi-capsule me-1"></i>
              {item.principio_ativo}
            </small>
          )}
        </div>
      )
    },
    {
      key: 'categoria',
      header: 'Categoria',
      render: (value: number) => (
        <span className={`badge ${getCategoriaBadgeColor(value)}`}>
          {getCategoriaNome(value)}
        </span>
      ),
      sortable: true
    },
    {
      key: 'quantidade_estoque',
      header: 'Qtd em estoque',
      render: (_value: any, item: Produto) => {
        const estoque = item.quantidade_estoque || 0;
        const minimo = item.estoque_minimo || 0;
        const isLow = estoque <= minimo;

        return (
          <span className={`fw-semibold ${isLow ? 'text-danger' : 'text-success'}`}>
            <i className={`bi bi-${isLow ? 'exclamation-triangle' : 'check-circle'} me-1`}></i>
            {estoque.toLocaleString('pt-BR')}
            {isLow && <small className="d-block text-muted">{estoque.toLocaleString('pt-BR')} disponível</small>}
          </span>
        );
      },
      sortable: true
    },
    {
      key: 'custo_unitario',
      header: 'Custo Unit.',
      render: (value: number) => value ? (
        <span className="text-muted">
          R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      ) : '-',
      sortable: true
    },
    {
      key: 'unidade',
      header: 'Unidade de medida',
      render: (value: string) => (
        <span className="badge bg-light text-dark">
          <i className="bi bi-rulers me-1"></i>
          {getUnitLabel(padronizarUnidade(value)) || 'N/A'}
        </span>
      ),
      sortable: true
    },
    {
      key: 'fornecedor_nome',
      header: 'Fornecedor',
      render: (value: string) => value || '-',
      sortable: true
    },
    {
      key: 'local_armazenamento_nome',
      header: 'Local Armazenagem',
      render: (value: string) => value ? (
        <span className="text-muted">
          <i className="bi bi-box-seam me-1"></i>
          {value}
        </span>
      ) : '-',
      sortable: false
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: string) => {
        const statusConfig = {
          ativo: { color: 'success', icon: 'check-circle' },
          inativo: { color: 'secondary', icon: 'pause-circle' },
          vencido: { color: 'danger', icon: 'x-circle' }
        };
        const config = statusConfig[value as keyof typeof statusConfig] || statusConfig.ativo;
        return (
          <span className={`badge bg-${config.color}`}>
            <i className={`bi bi-${config.icon} me-1`}></i>
            {value}
          </span>
        );
      },
      sortable: true
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (_value: any, item: Produto) => (
        <div className="btn-group btn-group-sm">
          <button
            className="btn btn-outline-primary"
            onClick={() => handleEdit(item)}
            title="Editar"
          >
            <i className="bi bi-pencil"></i>
          </button>
          <button
            className="btn btn-outline-danger"
            onClick={() => handleDelete(item)}
            title="Excluir"
          >
            <i className="bi bi-trash"></i>
          </button>
        </div>
      )
    }
  ];

  const totalProdutos = produtos.length;
  const produtosAtivos = produtos.filter(p => p.status === 'ativo').length;
  const produtosBaixoEstoque = produtos.filter(p => (p.quantidade_estoque || 0) <= (p.estoque_minimo || 0)).length;
  const valorTotalEstoque = produtos.reduce((sum, p) => sum + ((p.quantidade_estoque || 0) * (p.custo_unitario || 0)), 0);

  return (
    <div className="p-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h1 className="h2 mb-1">
            <i className="bi bi-box-seam text-primary me-2"></i>
            Produtos
          </h1>
          <p className="text-muted mb-0">Gerencie produtos e controle de estoque</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-success btn-lg shadow-sm"
        >
          <i className="bi bi-plus-circle me-2"></i>
          Novo Produto
        </button>
      </div>

      {/* Filtros Avançados */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-light">
          <h6 className="mb-0">
            <i className="bi bi-funnel me-2"></i>
            Filtros Avançados
          </h6>
        </div>
        <div className="card-body">
          <div className="row g-2 g-md-3">
            <div className="col-12 col-md-3">
              <label className="form-label">
                <i className="bi bi-search me-2"></i>
                Buscar
              </label>
              <input
                type="text"
                className="form-control"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Nome, código ou princípio ativo..."
              />
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label">
                <i className="bi bi-folder me-2"></i>
                Categoria
              </label>
              <select
                className="form-select"
                name="categoria"
                value={filters.categoria}
                onChange={handleFilterChange}
              >
                <option value="">Todas</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nome}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label">
                <i className="bi bi-capsule me-2"></i>
                Princípio Ativo
              </label>
              <input
                type="text"
                className="form-control"
                name="principio_ativo"
                value={filters.principio_ativo}
                onChange={handleFilterChange}
                placeholder="Ex: Glifosato..."
              />
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label">
                <i className="bi bi-shop me-2"></i>
                Fornecedor
              </label>
              <input
                type="text"
                className="form-control"
                name="fornecedor"
                value={filters.fornecedor}
                onChange={handleFilterChange}
                placeholder="Nome do fornecedor..."
              />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label">
                <i className="bi bi-toggle-on me-2"></i>
                Status
              </label>
              <select
                className="form-select"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="">Todos</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="vencido">Vencido</option>
              </select>
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label">
                <i className="bi bi-geo-alt me-2"></i>
                Local de Armazenagem
              </label>
              <select
                className="form-select"
                name="local_armazenamento"
                value={filters.local_armazenamento}
                onChange={handleFilterChange}
              >
                <option value="">Todos os locais</option>
                {locaisComSaldo.map(local => (
                  <option key={local.id} value={local.id}>{local.nome}</option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-1 d-flex align-items-end">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={clearFilters}
                title="Limpar filtros"
              >
                <i className="bi bi-x-circle"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm h-100 bg-primary bg-gradient text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-white-50 mb-1 small">TOTAL</p>
                  <h3 className="mb-0 fw-bold">{totalProdutos}</h3>
                  <small className="text-white-50">produto{totalProdutos !== 1 ? 's' : ''}</small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-box-seam fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm h-100 bg-success bg-gradient text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-white-50 mb-1 small">ATIVOS</p>
                  <h3 className="mb-0 fw-bold">{produtosAtivos}</h3>
                  <small className="text-white-50">em uso</small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-check-circle fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm h-100 bg-warning bg-gradient text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-white-50 mb-1 small">BAIXO ESTOQUE</p>
                  <h3 className="mb-0 fw-bold">{produtosBaixoEstoque}</h3>
                  <small className="text-white-50">atenção necessária</small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-exclamation-triangle fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm h-100 bg-info bg-gradient text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-white-50 mb-1 small">VALOR TOTAL</p>
                  <h3 className="mb-0 fw-bold">R$ {valorTotalEstoque.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</h3>
                  <small className="text-white-50">em estoque</small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-cash-coin fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-primary text-white py-3">
          <h5 className="mb-0">
            <i className="bi bi-list-ul me-2"></i>
            Lista de Produtos
            <span className="badge bg-white text-primary ms-2">{produtos.length}</span>
          </h5>
        </div>
        <div className="card-body p-0">
          <DataTable
            data={produtos}
            columns={columns}
            loading={isLoading}
            emptyMessage="Nenhum produto encontrado com os filtros aplicados"
          />
        </div>
      </div>

      {/* Modal de Criação/Edição */}
      <ModalForm
        isOpen={showCreateModal || !!editingProduto}
        title={editingProduto ? 'Editar Produto' : 'Novo Produto'}
        onClose={handleCloseModal}
      >
        <ProdutoForm
          produto={editingProduto || undefined}
          onSave={handleSaveProduto}
          onCancel={handleCloseModal}
        />
      </ModalForm>

      {/* Dialog de Confirmação de Exclusão */}
      <ConfirmDialog
        isOpen={!!deleteProduto}
        title="Excluir Produto"
        message={`Tem certeza que deseja excluir o produto "${deleteProduto?.nome}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteProduto(null)}
      />
    </div>
  );
};

export default ProdutosList;