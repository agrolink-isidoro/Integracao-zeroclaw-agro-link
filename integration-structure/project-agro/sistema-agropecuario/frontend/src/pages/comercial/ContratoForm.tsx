import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import contratosService from '../../services/contratos';
import api from '../../services/api';
import type { 
  CriarContratoRequest, 
  TipoContrato, 
  PeriodicidadeParcela 
} from '../../types/estoque_maquinas';

interface Cliente {
  id: number;
  nome: string;
}

interface Produto {
  id: number;
  nome: string;
  preco_unitario?: number;
}

const ContratoForm: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para listas
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  
  // Estados do formulário
  const [formData, setFormData] = useState<CriarContratoRequest>({
    numero_contrato: '',
    cliente: 0,
    produto: 0,
    quantidade_total: 0,
    preco_unitario: 0,
    valor_total: 0,
    tipo: 'PARCELADO' as TipoContrato,
    data_contrato: new Date().toISOString().split('T')[0],
    data_entrega_prevista: '',
    numero_parcelas: 1,
    periodicidade_parcelas: 'MENSAL' as PeriodicidadeParcela,
    observacoes: ''
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [clientesRes, produtosRes] = await Promise.all([
        api.get('/comercial/clientes/'),
        api.get('/estoque/produtos/')
      ]);
      
      setClientes(Array.isArray(clientesRes.data) ? clientesRes.data : clientesRes.data.results || []);
      setProdutos(Array.isArray(produtosRes.data) ? produtosRes.data : produtosRes.data.results || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Erro ao carregar clientes e produtos');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Calcular valor total automaticamente
      if (name === 'quantidade_total' || name === 'preco_unitario') {
        const quantidade = name === 'quantidade_total' ? parseFloat(value) : prev.quantidade_total;
        const preco = name === 'preco_unitario' ? parseFloat(value) : prev.preco_unitario;
        updated.valor_total = quantidade * preco;
      }
      
      // Se mudar para À VISTA, forçar 1 parcela
      if (name === 'tipo' && value === 'A_VISTA') {
        updated.numero_parcelas = 1;
      }
      
      return updated;
    });
  };

  const handleProdutoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const produtoId = parseInt(e.target.value);
    const produto = produtos.find(p => p.id === produtoId);
    
    setFormData(prev => ({
      ...prev,
      produto: produtoId,
      preco_unitario: produto?.preco_unitario || prev.preco_unitario
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validações básicas
      if (!formData.numero_contrato || !formData.cliente || !formData.produto) {
        throw new Error('Preencha todos os campos obrigatórios');
      }

      if (formData.quantidade_total <= 0 || formData.preco_unitario <= 0) {
        throw new Error('Quantidade e preço devem ser maiores que zero');
      }

      await contratosService.criarComParcelas(formData);
      navigate('/comercial/contratos');
    } catch (err: any) {
      console.error('Erro ao criar contrato:', err);
      setError(err.response?.data?.error || err.message || 'Erro ao criar contrato');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="bi bi-file-earmark-text me-2"></i>
                Novo Contrato de Venda
              </h3>
            </div>
            <div className="card-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="row">
                  {/* Número do Contrato */}
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Número do Contrato *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="numero_contrato"
                      value={formData.numero_contrato}
                      onChange={handleChange}
                      required
                      placeholder="CONT-001"
                    />
                  </div>

                  {/* Cliente */}
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Cliente *</label>
                    <select
                      className="form-select"
                      name="cliente"
                      value={formData.cliente}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Selecione...</option>
                      {clientes.map(cliente => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tipo */}
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Tipo de Contrato *</label>
                    <select
                      className="form-select"
                      name="tipo"
                      value={formData.tipo}
                      onChange={handleChange}
                      required
                    >
                      <option value="A_VISTA">À Vista</option>
                      <option value="PARCELADO">Parcelado</option>
                      <option value="ANTECIPADO">Antecipado</option>
                      <option value="FUTURO">Contrato Futuro</option>
                    </select>
                  </div>
                </div>

                <div className="row">
                  {/* Produto */}
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Produto *</label>
                    <select
                      className="form-select"
                      name="produto"
                      value={formData.produto}
                      onChange={handleProdutoChange}
                      required
                    >
                      <option value="">Selecione...</option>
                      {produtos.map(produto => (
                        <option key={produto.id} value={produto.id}>
                          {produto.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantidade */}
                  <div className="col-md-3 mb-3">
                    <label className="form-label">Quantidade Total *</label>
                    <input
                      type="number"
                      className="form-control"
                      name="quantidade_total"
                      value={formData.quantidade_total}
                      onChange={handleChange}
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>

                  {/* Preço Unitário */}
                  <div className="col-md-3 mb-3">
                    <label className="form-label">Preço Unitário (R$) *</label>
                    <input
                      type="number"
                      className="form-control"
                      name="preco_unitario"
                      value={formData.preco_unitario}
                      onChange={handleChange}
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="row">
                  {/* Valor Total (calculado) */}
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Valor Total (R$)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.valor_total.toFixed(2)}
                      readOnly
                      style={{ backgroundColor: '#e9ecef' }}
                    />
                  </div>

                  {/* Data do Contrato */}
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Data do Contrato *</label>
                    <input
                      type="date"
                      className="form-control"
                      name="data_contrato"
                      value={formData.data_contrato}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {/* Data de Entrega */}
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Data de Entrega Prevista</label>
                    <input
                      type="date"
                      className="form-control"
                      name="data_entrega_prevista"
                      value={formData.data_entrega_prevista}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="row">
                  {/* Número de Parcelas */}
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Número de Parcelas *</label>
                    <input
                      type="number"
                      className="form-control"
                      name="numero_parcelas"
                      value={formData.numero_parcelas}
                      onChange={handleChange}
                      required
                      min="1"
                      disabled={formData.tipo === 'A_VISTA'}
                    />
                    {formData.tipo === 'A_VISTA' && (
                      <small className="text-muted">Contratos à vista têm apenas 1 parcela</small>
                    )}
                  </div>

                  {/* Periodicidade */}
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Periodicidade das Parcelas *</label>
                    <select
                      className="form-select"
                      name="periodicidade_parcelas"
                      value={formData.periodicidade_parcelas}
                      onChange={handleChange}
                      required
                      disabled={formData.tipo === 'A_VISTA'}
                    >
                      <option value="MENSAL">Mensal</option>
                      <option value="BIMESTRAL">Bimestral</option>
                      <option value="TRIMESTRAL">Trimestral</option>
                    </select>
                  </div>
                </div>

                {/* Observações */}
                <div className="mb-3">
                  <label className="form-label">Observações</label>
                  <textarea
                    className="form-control"
                    name="observacoes"
                    value={formData.observacoes}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Informações adicionais sobre o contrato..."
                  />
                </div>

                {/* Botões */}
                <div className="d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate('/comercial/contratos')}
                    disabled={loading}
                  >
                    <i className="bi bi-x-circle me-2"></i>
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Criando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>
                        Criar Contrato
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContratoForm;
