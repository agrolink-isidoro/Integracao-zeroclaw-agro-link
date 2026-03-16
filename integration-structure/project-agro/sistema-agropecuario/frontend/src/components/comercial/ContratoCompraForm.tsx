import React, { useState, useEffect } from 'react';
import ModalForm from '../common/ModalForm';
import comercialService from '../../services/comercial';
import type { Fornecedor } from '../../types/comercial';

interface ContratoCompraFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
}

const ContratoCompraForm: React.FC<ContratoCompraFormProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('identificacao');

  const [formData, setFormData] = useState({
    // TAB 1: Identificação
    numero_contrato: '',
    titulo: '',
    fornecedor_id: '',
    status: 'ativo',
    data_inicio: '',
    data_fim: '',
    observacoes: '',

    // TAB 2: Produto
    produto: '',
    quantidade: '',
    unidade_medida: 'sc',
    preco_unitario: '',
    valor_total: '',
    qualidade_especificacao: '',

    // TAB 3: Condições de Compra
    condicao_pagamento: 'dinheiro',
    prazo_entrega_dias: '',
    desconto_global_percentual: '',
    taxa_juros: '',
    barter: false,
    barter_descricao: '',

    // TAB 4: Documentos
    nfe_numero: '',
    nfe_chave: '',
  });

  const [documentos, setDocumentos] = useState<File[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [fornecedoresSearchQuery, setFornecedoresSearchQuery] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        numero_contrato: initialData.numero_contrato || '',
        titulo: initialData.titulo || '',
        fornecedor_id: String(initialData.fornecedor || initialData.fornecedor_id || ''),
        status: initialData.status || 'ativo',
        data_inicio: initialData.data_inicio || '',
        data_fim: initialData.data_fim || '',
        observacoes: initialData.observacoes || '',
        produto: initialData.produto || '',
        quantidade: String(initialData.quantidade || ''),
        unidade_medida: initialData.unidade_medida || 'sc',
        preco_unitario: String(initialData.preco_unitario || ''),
        valor_total: String(initialData.valor_total || ''),
        qualidade_especificacao: initialData.qualidade_especificacao || '',
        condicao_pagamento: initialData.condicao_pagamento || 'dinheiro',
        prazo_entrega_dias: String(initialData.prazo_entrega_dias || ''),
        desconto_global_percentual: String(initialData.desconto_global_percentual || ''),
        taxa_juros: String(initialData.taxa_juros || ''),
      }));
    }
  }, [initialData]);

  // Carregar fornecedores ao abrir o modal ou quando a busca muda
  useEffect(() => {
    if (!isOpen) return;
    
    const carregarFornecedores = async () => {
      try {
        const dados = await comercialService.getFornecedores(
          fornecedoresSearchQuery ? { busca: fornecedoresSearchQuery } : undefined
        );
        setFornecedores(Array.isArray(dados) ? dados : []);
      } catch (error) {
        console.error('Erro ao carregar fornecedores:', error);
        setFornecedores([]);
      }
    };

    // Fazemos debounce na busca para não fazer muitas requisições
    const timeoutId = setTimeout(carregarFornecedores, 300);
    return () => clearTimeout(timeoutId);
  }, [isOpen, fornecedoresSearchQuery]);

  const set = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setDocumentos(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const removeDocumento = (index: number) => setDocumentos(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const submitData = {
        ...formData,
        valor_total: parseFloat(formData.valor_total) || 0,
        partes: [{ tipo_parte: 'fornecedor', entidade_id: 1, papel_contrato: 'vendedor' }],
        itens: [],
        documento: documentos.length > 0 ? documentos[0] : null,
      };
      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar compra:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'identificacao', label: 'Identificação', icon: 'bi-file-earmark-text' },
    { id: 'produto', label: 'Produto', icon: 'bi-box-seam' },
    { id: 'condicoes', label: 'Condições de Compra', icon: 'bi-handshake' },
    { id: 'documentos', label: 'Documentos', icon: 'bi-paperclip' },
  ];

  return (
    <ModalForm isOpen={isOpen} title="Novo Contrato - Compra" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit}>
        {/* Tabs */}
        <div className="border-bottom mb-3">
          <nav className="d-flex overflow-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-3 border-bottom border-2 fw-medium text-nowrap me-1 btn btn-link text-decoration-none ${
                  activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted'
                }`}
                style={{ background: 'none' }}
              >
                <i className={`bi ${tab.icon} me-2`}></i>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div style={{ minHeight: '350px' }}>

          {/* ═══ TAB 1: IDENTIFICAÇÃO ═══ */}
          {activeTab === 'identificacao' && (
            <div>
              <h6 className="text-primary mb-3">
                <i className="bi bi-file-earmark-text me-2"></i>
                Identificação da Compra
              </h6>
              <div className="row g-2 g-md-3">
                <div className="col-12 col-sm-6 col-md-3">
                  <label className="form-label">Número do Contrato *</label>
                  <input type="text" className="form-control" value={formData.numero_contrato}
                    onChange={e => set('numero_contrato', e.target.value)} required />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Título *</label>
                  <input type="text" className="form-control" placeholder="Ex: Compra de Sementes de Soja"
                    value={formData.titulo} onChange={e => set('titulo', e.target.value)} required />
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={formData.status} onChange={e => set('status', e.target.value)}>
                    <option value="rascunho">Rascunho</option>
                    <option value="ativo">Ativo</option>
                    <option value="cancelado">Cancelado</option>
                    <option value="encerrado">Encerrado</option>
                  </select>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Fornecedor *</label>
                  <input type="text" className="form-control" placeholder="Buscar fornecedor cadastrado..."
                    value={formData.fornecedor_id} 
                    onChange={e => {
                      set('fornecedor_id', e.target.value);
                      setFornecedoresSearchQuery(e.target.value);
                    }} 
                    required
                    list="fornecedores-list" />
                  <datalist id="fornecedores-list">
                    {fornecedores.map((f) => (
                      <option key={f.id} value={f.nome_fantasia || f.razao_social || ''}>
                        {f.nome_fantasia || f.razao_social}
                      </option>
                    ))}
                  </datalist>
                  <small className="text-muted">Digite para buscar fornecedor no sistema</small>
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                  <label className="form-label">Data de Início *</label>
                  <input type="date" className="form-control" value={formData.data_inicio}
                    onChange={e => set('data_inicio', e.target.value)} required />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Data de Término</label>
                  <input type="date" className="form-control" value={formData.data_fim}
                    onChange={e => set('data_fim', e.target.value)} />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Observações</label>
                  <textarea className="form-control" rows={2} placeholder="Notas sobre a compra..."
                    value={formData.observacoes} onChange={e => set('observacoes', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* ═══ TAB 2: PRODUTO ═══ */}
          {activeTab === 'produto' && (
            <div>
              <h6 className="text-primary mb-3">
                <i className="bi bi-box-seam me-2"></i>
                Especificações do Produto
              </h6>
              <div className="row g-2 g-md-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Produto *</label>
                  <input type="text" className="form-control" placeholder="Ex: Sementes de Soja, Fertilizante NPK"
                    value={formData.produto} onChange={e => set('produto', e.target.value)} required />
                </div>

                <div className="col-12 col-sm-6 col-md-4">
                  <label className="form-label">Quantidade *</label>
                  <input type="number" className="form-control" step="0.001" placeholder="Ex: 1000"
                    value={formData.quantidade} onChange={e => set('quantidade', e.target.value)} required />
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                  <label className="form-label">Unidade *</label>
                  <select className="form-select" value={formData.unidade_medida}
                    onChange={e => set('unidade_medida', e.target.value)} required>
                    <option value="sc">Sacas (60kg)</option>
                    <option value="ton">Toneladas</option>
                    <option value="kg">Quilogramas</option>
                    <option value="litros">Litros</option>
                    <option value="unidade">Unidades</option>
                  </select>
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                  <label className="form-label">Preço Unitário (R$)</label>
                  <input type="number" className="form-control" step="0.01" placeholder="Ex: 125.50"
                    value={formData.preco_unitario} onChange={e => set('preco_unitario', e.target.value)} />
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                  <label className="form-label">Valor Total (R$) *</label>
                  <input type="number" className="form-control" step="0.01"
                    value={formData.valor_total} onChange={e => set('valor_total', e.target.value)} required />
                </div>

                <div className="col-12">
                  <label className="form-label">Especificação de Qualidade</label>
                  <input type="text" className="form-control"
                    placeholder="Ex: Pureza mínima 99%, Germinação mínima 90%"
                    value={formData.qualidade_especificacao} onChange={e => set('qualidade_especificacao', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* ═══ TAB 3: CONDIÇÕES DE COMPRA ═══ */}
          {activeTab === 'condicoes' && (
            <div>
              <h6 className="text-primary mb-3">
                <i className="bi bi-handshake me-2"></i>
                Condições de Compra
              </h6>
              <div className="row g-2 g-md-3">
                <div className="col-12 col-sm-6 col-md-4">
                  <label className="form-label">Condição de Pagamento *</label>
                  <select className="form-select" value={formData.condicao_pagamento}
                    onChange={e => set('condicao_pagamento', e.target.value)} required>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="credito_30">Crédito 30 dias</option>
                    <option value="credito_60">Crédito 60 dias</option>
                    <option value="credito_90">Crédito 90 dias</option>
                    <option value="parcelado">Parcelado</option>
                  </select>
                </div>

                <div className="col-12 col-sm-6 col-md-4">
                  <label className="form-label">Prazo de Entrega (dias)</label>
                  <input type="number" className="form-control" placeholder="Ex: 15"
                    value={formData.prazo_entrega_dias}
                    onChange={e => set('prazo_entrega_dias', e.target.value)} />
                </div>

                <div className="col-12 col-sm-6 col-md-4">
                  <label className="form-label">Desconto Global (%)</label>
                  <input type="number" className="form-control" step="0.01" placeholder="Ex: 5.00"
                    value={formData.desconto_global_percentual}
                    onChange={e => set('desconto_global_percentual', e.target.value)} />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Taxa de Juros (% a.m.)</label>
                  <input type="number" className="form-control" step="0.01" placeholder="Ex: 2.00"
                    value={formData.taxa_juros}
                    onChange={e => set('taxa_juros', e.target.value)} />
                </div>

                <div className="col-12">
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" id="barter-check"
                      checked={formData.barter} onChange={e => set('barter', e.target.checked)} />
                    <label className="form-check-label" htmlFor="barter-check">
                      Esta é uma compra com Barter (troca)
                    </label>
                  </div>
                </div>

                {formData.barter && (
                  <div className="col-12">
                    <label className="form-label">Descrição do Barter</label>
                    <textarea className="form-control" rows={2} placeholder="Descreva o que está sendo trocado..."
                      value={formData.barter_descricao}
                      onChange={e => set('barter_descricao', e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ TAB 4: DOCUMENTOS ═══ */}
          {activeTab === 'documentos' && (
            <div>
              <h6 className="text-primary mb-3">
                <i className="bi bi-paperclip me-2"></i>
                Documentação
              </h6>

              {/* Seção NFe */}
              <div className="row g-2 g-md-3 mb-4 pb-3 border-bottom">
                <div className="col-12">
                  <h6 className="text-secondary mb-3">
                    <i className="bi bi-receipt me-2"></i>
                    Vincular NFe
                  </h6>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Número da NFe</label>
                  <input type="text" className="form-control" placeholder="Ex: 123456"
                    value={formData.nfe_numero}
                    onChange={e => set('nfe_numero', e.target.value)} />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Chave de Acesso NFe</label>
                  <input type="text" className="form-control" placeholder="Ex: 35210412345678901234567890123456789012345678"
                    value={formData.nfe_chave}
                    onChange={e => set('nfe_chave', e.target.value)} />
                </div>
              </div>

              {/* Upload de Arquivos */}
              <div className="row g-3">
                <div className="col-12">
                  <div className="border border-dashed rounded p-3 bg-light text-center">
                    <label htmlFor="compra-file-upload" className="btn btn-outline-primary mb-2" style={{ cursor: 'pointer' }}>
                      <i className="bi bi-cloud-upload me-2"></i>
                      Selecionar Arquivos
                    </label>
                    <input id="compra-file-upload" type="file" multiple onChange={handleFileChange}
                      className="d-none" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                    <p className="text-muted mb-0 small">
                      NF-e, Contrato, Anexos (PDF, DOC, DOCX, JPG, PNG)
                    </p>
                  </div>
                </div>
                {documentos.length > 0 && (
                  <div className="col-12">
                    <div className="list-group">
                      {documentos.map((doc, index) => (
                        <div key={index} className="list-group-item d-flex justify-content-between align-items-center">
                          <div className="d-flex align-items-center">
                            <i className="bi bi-file-earmark-text text-primary me-2 fs-5"></i>
                            <div>
                              <div className="fw-medium">{doc.name}</div>
                              <small className="text-muted">{(doc.size / 1024).toFixed(1)} KB</small>
                            </div>
                          </div>
                          <button type="button" className="btn btn-sm btn-outline-danger"
                            onClick={() => removeDocumento(index)}>
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="d-flex justify-content-end gap-2 pt-4 border-top mt-3">
          <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={loading}>
            <i className="bi bi-x-circle me-1"></i> Cancelar
          </button>
          <button type="submit" className="btn btn-info" disabled={loading}>
            <i className="bi bi-check-circle me-1"></i>
            {loading ? 'Salvando...' : 'Salvar Compra'}
          </button>
        </div>
      </form>
    </ModalForm>
  );
};

export default ContratoCompraForm;
