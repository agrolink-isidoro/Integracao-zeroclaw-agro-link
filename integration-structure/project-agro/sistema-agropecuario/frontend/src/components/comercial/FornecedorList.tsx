import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Eye, Plus, Filter } from 'lucide-react';
import type { Fornecedor, FiltrosComerciais } from '../../types/comercial';
import DataTable from '../common/DataTable';
import Button from '../Button';
import Input from '../common/Input';
import SelectDropdown from '../common/SelectDropdown';
import ConfirmDialog from '../common/ConfirmDialog';
import FornecedorForm from './FornecedorForm';
import comercialService from '../../services/comercial';

interface FornecedorListProps {
  onView?: (fornecedor: Fornecedor) => void;
  onEdit?: (fornecedor: Fornecedor) => void;
}

const FornecedorList: React.FC<FornecedorListProps> = ({ onView, onEdit }) => {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | undefined>();
  const [deletingFornecedor, setDeletingFornecedor] = useState<Fornecedor | null>(null);
  const [viewingFornecedor, setViewingFornecedor] = useState<Fornecedor | null>(null);
  const [filtros, setFiltros] = useState<FiltrosComerciais>({});
  const [showFilters, setShowFilters] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadFornecedores();
  }, [filtros]);

  const loadFornecedores = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await comercialService.getFornecedores(filtros);
      setFornecedores(data);
    } catch (error: unknown) {
      console.error('Erro ao carregar fornecedores:', error);
      const err = error as { message?: string; code?: unknown } | undefined;
      const msg = err?.message || err?.code ? `Erro ${String(err?.code || '')}: ${err?.message || ''}` : 'Erro ao carregar fornecedores';
      setErrorMsg(msg);
      setFornecedores([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    // Debug: trace clicks for investigation when users report unresponsive button
    if (process.env.NODE_ENV === 'development') {
      console.debug('FornecedorList.handleCreate invoked');
    }
    setEditingFornecedor(undefined);
    setShowForm(true);
  };

  const handleView = (fornecedor: Fornecedor) => {
    if (onView) onView(fornecedor);
    else setViewingFornecedor(fornecedor);
  };

  const handleEdit = (fornecedor: Fornecedor) => {
    setEditingFornecedor(fornecedor);
    setShowForm(true);
  };

  const handleDelete = async (fornecedor: Fornecedor) => {
    setDeletingFornecedor(fornecedor);
  };

  const confirmDelete = async () => {
    if (!deletingFornecedor) return;

    try {
      await comercialService.deleteFornecedor(deletingFornecedor.id!);
      await loadFornecedores();
      setDeletingFornecedor(null);
    } catch (error) {
      console.error('Erro ao deletar fornecedor:', error);
    }
  };

  const handleSubmit = async (data: Omit<Fornecedor, 'id'>) => {
    try {
      console.debug('[FornecedorList] handleSubmit called. editingFornecedor=', !!editingFornecedor, 'data keys=', Object.keys(data).slice(0,10));
      if (editingFornecedor) {
        console.debug('[FornecedorList] calling updateFornecedor');
        await comercialService.updateFornecedor(editingFornecedor.id!, data);
        console.debug('[FornecedorList] updateFornecedor resolved');
      } else {
        console.debug('[FornecedorList] calling createFornecedor');
        await comercialService.createFornecedor(data);
        console.debug('[FornecedorList] createFornecedor resolved');
      }
      await loadFornecedores();
      setShowForm(false);
    } catch (error) {
      console.error('Erro ao salvar fornecedor:', error);
      throw error;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-green-100 text-green-800';
      case 'inativo': return 'bg-yellow-100 text-yellow-800';
      case 'bloqueado': return 'bg-red-100 text-red-800';
      case 'pendente': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoPessoaColor = (tipo: string) => {
    return tipo === 'pj' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
  };

  const getCategoriaColor = (categoria: string) => {
    const colors: { [key: string]: string } = {
      'insumos': 'bg-green-100 text-green-800',
      'maquinas': 'bg-orange-100 text-orange-800',
      'servicos': 'bg-blue-100 text-blue-800',
      'outros': 'bg-gray-100 text-gray-800'
    };
    return colors[categoria] || colors['outros'];
  };

  const columns = [
    {
      key: 'nome',
      header: 'Nome/Razão Social',
      render: (_value: any, item: Fornecedor) => (
        <div>
          <div className="font-medium text-gray-900">
            {item.tipo_pessoa === 'pf' ? item.nome_completo : item.razao_social}
          </div>
          {item.nome_fantasia && (
            <div className="text-sm text-gray-500">{item.nome_fantasia}</div>
          )}
        </div>
      )
    },
    {
      key: 'cpf_cnpj',
      header: 'CPF/CNPJ',
      render: (value?: string) => (
        <span className="font-mono text-sm">{value || '—'}</span>
      )
    },
    {
      key: 'categoria_fornecedor',
      header: 'Categoria',
      render: (value?: string) => {
        const label = value ? (value.charAt(0).toUpperCase() + value.slice(1)) : '—';
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoriaColor(value || 'outros')}`}>
            {label}
          </span>
        );
      }
    },
    {
      key: 'tipo_pessoa',
      header: 'Tipo',
      render: (value?: string) => {
        const label = value === 'pj' ? 'Jurídica' : (value === 'pf' ? 'Física' : '—');
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTipoPessoaColor(value || 'pf')}`}>
            {label}
          </span>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (value?: string) => {
        const label = value ? (value.charAt(0).toUpperCase() + value.slice(1)) : '—';
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(value || '')}`}>
            {label}
          </span>
        );
      }
    },
    {
      key: 'contato.email_principal',
      header: 'Contato',
      render: (_value: unknown, item: Fornecedor) => (
        <div className="text-sm">
          <div>{item.contato?.telefone_principal}</div>
          <div className="text-gray-500">{item.contato?.email_principal}</div>
        </div>
      )
    },
    {
      key: 'endereco.cidade',
      header: 'Localização',
      render: (_value: unknown, item: Fornecedor) => (
        <div className="text-sm">
          <div>{item.endereco?.cidade}</div>
          <div className="text-gray-500">{item.endereco?.estado}</div>
        </div>
      )
    }
  ];

  const actions = (item: Fornecedor) => (
    <div className="flex space-x-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => handleView(item)}
        title="Visualizar"
      >
        <Eye size={16} />
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => handleEdit(item)}
        title="Editar"
      >
        <Edit size={16} />
      </Button>
      <Button
        variant="danger"
        size="sm"
        onClick={() => handleDelete(item)}
        title="Excluir"
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Fornecedores</h2>
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} className="me-2" />
            Filtros
          </Button>
          <Button onClick={handleCreate}>
            <Plus size={16} className="me-2" />
            Novo Fornecedor
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              label="Buscar"
              placeholder="Nome, CPF/CNPJ..."
              value={filtros.busca || ''}
              onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <SelectDropdown
                value={filtros.status?.[0] || ''}
                onChange={(value) => setFiltros({
                  ...filtros,
                  status: value ? [value as string] : undefined
                })}
                options={[
                  { value: '', label: 'Todos' },
                  { value: 'ativo', label: 'Ativo' },
                  { value: 'inativo', label: 'Inativo' },
                  { value: 'bloqueado', label: 'Bloqueado' },
                  { value: 'pendente', label: 'Pendente' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo Pessoa
              </label>
              <SelectDropdown
                value={filtros.tipo_pessoa?.[0] || ''}
                onChange={(value) => setFiltros({
                  ...filtros,
                  tipo_pessoa: value ? [value as string] : undefined
                })}
                options={[
                  { value: '', label: 'Todos' },
                  { value: 'pf', label: 'Pessoa Física' },
                  { value: 'pj', label: 'Pessoa Jurídica' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <SelectDropdown
                value={filtros.categoria?.[0] || ''}
                onChange={(value) => setFiltros({
                  ...filtros,
                  categoria: value ? [value as string] : undefined
                })}
                options={[
                  { value: '', label: 'Todas' },
                  { value: 'insumos', label: 'Insumos' },
                  { value: 'maquinas', label: 'Máquinas' },
                  { value: 'servicos', label: 'Serviços' },
                  { value: 'outros', label: 'Outros' },
                ]}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => setFiltros({})}
            >
              Limpar Filtros
            </Button>
          </div>
        </div>
      )}

      {/* Table */}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-md flex items-center justify-between">
          <div>{errorMsg}</div>
          <div>
            <Button variant="secondary" onClick={loadFornecedores}>Tentar Novamente</Button>
          </div>
        </div>
      )}

      <DataTable
        data={fornecedores.filter(f => f.id !== undefined) as (Fornecedor & { id: number })[]}
        columns={columns}
        loading={loading}
        actions={actions}
        emptyMessage="Nenhum fornecedor encontrado"
      />

      {/* Form Modal */}
      <FornecedorForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmit}
        fornecedor={editingFornecedor}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingFornecedor}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir o fornecedor "${deletingFornecedor?.nome_completo || deletingFornecedor?.razao_social}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingFornecedor(null)}
        confirmText="Excluir"
        cancelText="Cancelar"
      />

      {/* View Modal */}
      {viewingFornecedor && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="bi bi-building me-2"></i>Fornecedor: {viewingFornecedor.razao_social || viewingFornecedor.nome_completo}</h5>
                <button type="button" className="btn-close" onClick={() => setViewingFornecedor(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6"><strong>Nome/Razão Social:</strong> {viewingFornecedor.razao_social || viewingFornecedor.nome_completo || '-'}</div>
                  <div className="col-md-6"><strong>Nome Fantasia:</strong> {viewingFornecedor.nome_fantasia || '-'}</div>
                  <div className="col-md-6"><strong>CPF/CNPJ:</strong> {viewingFornecedor.cpf_cnpj || '-'}</div>
                  <div className="col-md-6"><strong>Tipo:</strong> {viewingFornecedor.tipo_pessoa === 'pj' ? 'Pessoa Jurídica' : 'Pessoa Física'}</div>
                  <div className="col-md-6"><strong>Categoria:</strong> {viewingFornecedor.categoria_fornecedor || '-'}</div>
                  <div className="col-md-6"><strong>Status:</strong> {viewingFornecedor.status || '-'}</div>
                  <div className="col-md-6"><strong>Telefone:</strong> {viewingFornecedor.contato?.telefone_principal || '-'}</div>
                  <div className="col-md-6"><strong>E-mail:</strong> {viewingFornecedor.contato?.email_principal || '-'}</div>
                  <div className="col-md-6"><strong>Cidade:</strong> {viewingFornecedor.endereco?.cidade || '-'}</div>
                  <div className="col-md-6"><strong>Estado:</strong> {viewingFornecedor.endereco?.estado || '-'}</div>
                  {viewingFornecedor.observacoes && <div className="col-12"><strong>Observações:</strong> {viewingFornecedor.observacoes}</div>}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setViewingFornecedor(null)}>Fechar</button>
                <button className="btn btn-warning" onClick={() => { handleEdit(viewingFornecedor); setViewingFornecedor(null); }}>
                  <Edit size={16} className="me-1" /> Editar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FornecedorList;