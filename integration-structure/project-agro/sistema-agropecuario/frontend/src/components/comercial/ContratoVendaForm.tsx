import React, { useState, useEffect } from 'react';
import ModalForm from '../common/ModalForm';
import comercialService from '../../services/comercial';

interface ContratoVendaFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
}

const ContratoVendaForm: React.FC<ContratoVendaFormProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('identificacao');

  const [formData, setFormData] = useState({
    // TAB 1: Identificação
    numero_contrato: '',
    titulo: '',
    cliente_id: '',
    status: 'ativo',
    data_inicio: '',
    data_entrega_prevista: '',
    observacoes: '',

    // TAB 2: Produto
    cultura: '', // ABERTO para qualquer tipo
    variedade_cultivar: '', // OPCIONAL
    quantidade: '',
    unidade_medida: 'sc', // Sacas, Toneladas, Caixas, Quilogramas, Punhados, Unidades
    preco_unitario: '',
    valor_total: '',
    qualidade_esperada: '',
    local_entrega: '',

    // TAB 3: Pagamento
    forma_pagamento: 'a_vista', // À Vista, Parcelado, Antecipado, Sobre Rodas, Entrega Indústria, Futuro Pós, Futuro Pré
    numero_parcelas: '1',
    periodicidade_parcela: 'mensal',
    primeira_data_vencimento: '',
    desconto_percentual: '',
    comissao_percentual: '',
    rastrear_comissao: false,

    // TAB 4: Entrega
    tipo_entrega: 'fob', // FOB (Comprador Busca), CIF (Vendedor Entrega)
    fazenda_origem: '',
    cultura_colheita: '',
    tipo_colheita: '', // Colheita Completa, Silo Bolsa, Contrato Indústria
    peso_estimado: '',
    custos_armazenagem: '',
    custos_frete: '',
    responsavel_frete: 'vendedor', // Vendedor ou Comprador
  });

  const [documentos, setDocumentos] = useState<File[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [clientesSearchQuery, setClientesSearchQuery] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        numero_contrato: initialData.numero_contrato || '',
        titulo: initialData.titulo || '',
        cliente_id: String(initialData.cliente || initialData.cliente_id || ''),
        status: initialData.status || 'ativo',
        data_inicio: initialData.data_inicio || '',
        data_entrega_prevista: initialData.data_entrega_prevista || '',
        observacoes: initialData.observacoes || '',
        cultura: initialData.cultura || '',
        variedade_cultivar: initialData.variedade_cultivar || '',
        quantidade: String(initialData.quantidade || ''),
        unidade_medida: initialData.unidade_medida || 'sc',
        preco_unitario: String(initialData.preco_unitario || ''),
        valor_total: String(initialData.valor_total || ''),
        qualidade_esperada: initialData.qualidade_esperada || '',
        local_entrega: initialData.local_entrega || '',
        forma_pagamento: initialData.forma_pagamento || 'a_vista',
        tipo_entrega: initialData.tipo_entrega || 'fob',
      }));
    }
  }, [initialData]);

  // Carregar clientes ao abrir o modal ou quando a busca muda
  useEffect(() => {
    if (!isOpen) return;

    const carregarClientes = async () => {
      try {
        const dados = await comercialService.getClientes(clientesSearchQuery || undefined);
        setClientes(Array.isArray(dados) ? dados : []);
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        setClientes([]);
      }
    };

    // Debounce na busca
    const timeoutId = setTimeout(carregarClientes, 300);
    return () => clearTimeout(timeoutId);
  }, [isOpen, clientesSearchQuery]);

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
        partes: [{ tipo_parte: 'cliente', entidade_id: 1, papel_contrato: 'comprador' }],
        itens: [],
        documento: documentos.length > 0 ? documentos[0] : null,
      };
      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar venda:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'identificacao', label: 'Identificação', icon: 'bi-file-earmark-text' },
    { id: 'produto', label: 'Produto/Colheita', icon: 'bi-box-seam' },
    { id: 'pagamento', label: 'Pagamento', icon: 'bi-credit-card' },
    { id: 'entrega', label: 'Tipo de Entrega', icon: 'bi-truck' },
    { id: 'documentos', label: 'Documentos', icon: 'bi-paperclip' },
  ];

  return (
    <ModalForm isOpen={isOpen} title="Novo Contrato - Venda de Produtos" onClose={onClose} size="xl">
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

        <div style={{ minHeight: '400px' }}>

          {/* ═══ TAB 1: IDENTIFICAÇÃO ═══ */}
          {activeTab === 'identificacao' && (
            <div>
              <h6 className="text-primary mb-3">
                <i className="bi bi-file-earmark-text me-2"></i>
                Identificação da Venda
              </h6>
              <div className="row g-2 g-md-3">
                <div className="col-12 col-sm-6 col-md-3">
                  <label className="form-label">Número do Contrato *</label>
                  <input type="text" className="form-control" value={formData.numero_contrato}
                    onChange={e => set('numero_contrato', e.target.value)} required />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Título *</label>
                  <input type="text" className="form-control" placeholder="Ex: Venda de Soja Safra 2025/2026"
                    value={formData.titulo} onChange={e => set('titulo', e.target.value)} required />
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={formData.status} onChange={e => set('status', e.target.value)}>
                    <option value="rascunho">Rascunho</option>
                    <option value="ativo">Ativo</option>
                    <option value="encerrado">Encerrado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                <div className="col-12 col-sm-6 col-md-6">
                  <label className="form-label">Cliente *</label>
                  <input type="text" className="form-control" placeholder="Buscar cliente cadastrado..."
                    value={formData.cliente_id} 
                    onChange={e => {
                      set('cliente_id', e.target.value);
                      setClientesSearchQuery(e.target.value);
                    }} 
                    required
                    list="clientes-list" />
                  <datalist id="clientes-list">
                    {clientes.map((c) => (
                      <option key={c.id} value={c.nome_fantasia || c.razao_social || c.nome_completo || ''}>
                        {c.nome_fantasia || c.razao_social || c.nome_completo}
                      </option>
                    ))}
                  </datalist>
                  <small className="text-muted">Digite para buscar cliente no sistema</small>
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                  <label className="form-label">Data de Início *</label>
                  <input type="date" className="form-control" value={formData.data_inicio}
                    onChange={e => set('data_inicio', e.target.value)} required />
                </div>

                <div className="col-12 col-sm-6 col-md-6">
                  <label className="form-label">Data Prevista de Entrega</label>
                  <input type="date" className="form-control" value={formData.data_entrega_prevista}
                    onChange={e => set('data_entrega_prevista', e.target.value)} />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Observações</label>
                  <textarea className="form-control" rows={2} placeholder="Notas gerais sobre a venda..."
                    value={formData.observacoes} onChange={e => set('observacoes', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* ═══ TAB 2: PRODUTO/COLHEITA ═══ */}
          {activeTab === 'produto' && (
            <div>
              <h6 className="text-primary mb-3">
                <i className="bi bi-box-seam me-2"></i>
                Produto/Colheita
              </h6>
              <div className="row g-2 g-md-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Cultura/Produto *</label>
                  <input type="text" className="form-control" placeholder="Ex: Soja, Milho, Alface, Tomate, Maçã, Banana, Abóbora, Horti-fruti..."
                    value={formData.cultura} onChange={e => set('cultura', e.target.value)} required />
                  <small className="text-muted">Qualquer tipo de cultura (grãos, horti-fruti, frutas, etc)</small>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Variedade/Cultivar <span className="text-muted">(Opcional)</span></label>
                  <input type="text" className="form-control" placeholder="Ex: M6410 IPRO, Salateira, Gala, Braeburn..."
                    value={formData.variedade_cultivar} onChange={e => set('variedade_cultivar', e.target.value)} />
                  <small className="text-muted">Campo opcional</small>
                </div>

                <div className="col-12 col-sm-6 col-md-4">
                  <label className="form-label">Quantidade *</label>
                  <input type="number" className="form-control" step="0.001" placeholder="Ex: 5000"
                    value={formData.quantidade} onChange={e => set('quantidade', e.target.value)} required />
                </div>

                <div className="col-12 col-sm-6 col-md-4">
                  <label className="form-label">Unidade de Medida *</label>
                  <select className="form-select" value={formData.unidade_medida} onChange={e => set('unidade_medida', e.target.value)} required>
                    <option value="sc">Sacas (60kg)</option>
                    <option value="ton">Toneladas</option>
                    <option value="caixas">Caixas</option>
                    <option value="kg">Quilogramas</option>
                    <option value="punhados">Punhados</option>
                    <option value="unidades">Unidades</option>
                  </select>
                </div>

                <div className="col-12 col-sm-6 col-md-4">
                  <label className="form-label">Valor Total (R$) *</label>
                  <input type="number" className="form-control" step="0.01" placeholder="0.00"
                    value={formData.valor_total} onChange={e => set('valor_total', e.target.value)} required />
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                  <label className="form-label">Preço Unitário (R$)</label>
                  <input type="number" className="form-control" step="0.01" placeholder="0.00"
                    value={formData.preco_unitario} onChange={e => set('preco_unitario', e.target.value)} />
                </div>

                <div className="col-12 col-md-9">
                  <label className="form-label">Qualidade Esperada</label>
                  <textarea className="form-control" rows={2} placeholder="Ex: Umidade máx 14%, Impurezas máx 1%..."
                    value={formData.qualidade_esperada} onChange={e => set('qualidade_esperada', e.target.value)} />
                </div>

                <div className="col-12">
                  <label className="form-label">Local de Entrega</label>
                  <input type="text" className="form-control" placeholder="Ex: Armazém XYZ, Rodovia BR-163..."
                    value={formData.local_entrega} onChange={e => set('local_entrega', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* ═══ TAB 3: PAGAMENTO ═══ */}
          {activeTab === 'pagamento' && (
            <div>
              <h6 className="text-primary mb-3">
                <i className="bi bi-credit-card me-2"></i>
                Modalidade de Pagamento
              </h6>
              <div className="row g-2 g-md-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Forma de Pagamento *</label>
                  <select className="form-select" value={formData.forma_pagamento}
                    onChange={e => set('forma_pagamento', e.target.value)} required>
                    <option value="a_vista">À Vista</option>
                    <option value="sobre_rodas">Sobre Rodas</option>
                    <option value="parcelado">Parcelado (N parcelas)</option>
                    <option value="antecipado">Antecipado (remove 50%)</option>
                    <option value="entrega_industria">Entrega na Indústria</option>
                    <option value="futuro_pos">Contrato Futuro Pós Fixado</option>
                    <option value="futuro_pre">Contrato Futuro Pré Fixado</option>
                  </select>
                </div>

                {formData.forma_pagamento === 'antecipado' && (
                  <div className="col-12">
                    <div className="alert alert-info mb-0">
                      <i className="bi bi-info-circle me-2"></i>
                      <strong>Nota:</strong> Antecipado remove 50% do valor no fechamento do contrato
                    </div>
                  </div>
                )}

                {(formData.forma_pagamento === 'parcelado' || formData.forma_pagamento === 'sobre_rodas') && (
                  <>
                    <div className="col-12 col-sm-6 col-md-3">
                      <label className="form-label">Número de Parcelas *</label>
                      <input type="number" className="form-control" min="2" max="12"
                        value={formData.numero_parcelas}
                        onChange={e => set('numero_parcelas', e.target.value)} />
                    </div>
                    <div className="col-12 col-sm-6 col-md-3">
                      <label className="form-label">Periodicidade</label>
                      <select className="form-select" value={formData.periodicidade_parcela}
                        onChange={e => set('periodicidade_parcela', e.target.value)}>
                        <option value="semanal">Semanal</option>
                        <option value="quinzenal">Quinzenal</option>
                        <option value="mensal">Mensal</option>
                        <option value="trimestral">Trimestral</option>
                      </select>
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">Primeira Data de Vencimento</label>
                      <input type="date" className="form-control"
                        value={formData.primeira_data_vencimento}
                        onChange={e => set('primeira_data_vencimento', e.target.value)} />
                    </div>
                  </>
                )}

                <div className="col-12 col-sm-6 col-md-3">
                  <label className="form-label">Desconto (%)</label>
                  <input type="number" className="form-control" step="0.01" placeholder="0.00"
                    value={formData.desconto_percentual}
                    onChange={e => set('desconto_percentual', e.target.value)} />
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                  <label className="form-label">Comissão Vendedor (%)</label>
                  <input type="number" className="form-control" step="0.01" placeholder="0.00"
                    value={formData.comissao_percentual}
                    onChange={e => set('comissao_percentual', e.target.value)} />
                </div>

                <div className="col-12">
                  <div className="form-check">
                    <input type="checkbox" className="form-check-input" id="rastrear-comissao"
                      checked={formData.rastrear_comissao}
                      onChange={e => set('rastrear_comissao', e.target.checked)} />
                    <label className="form-check-label" htmlFor="rastrear-comissao">
                      Rastrear Comissão de Vendedor
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ TAB 4: ENTREGA ═══ */}
          {activeTab === 'entrega' && (
            <div>
              <h6 className="text-primary mb-3">
                <i className="bi bi-truck me-2"></i>
                Tipo de Entrega
              </h6>
              <div className="row g-2 g-md-3">
                <div className="col-12">
                  <label className="form-label">Incoterm / Tipo de Entrega *</label>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className={`btn btn-sm ${formData.tipo_entrega === 'fob' ? 'btn-warning' : 'btn-outline-secondary'}`}
                      onClick={() => set('tipo_entrega', 'fob')}
                    >
                      <i className="bi bi-box me-1"></i>FOB (Comprador Busca)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${formData.tipo_entrega === 'cif' ? 'btn-warning' : 'btn-outline-secondary'}`}
                      onClick={() => set('tipo_entrega', 'cif')}
                    >
                      <i className="bi bi-truck me-1"></i>CIF (Vendedor Entrega)
                    </button>
                  </div>
                  <small className="text-muted d-block mt-2">
                    {formData.tipo_entrega === 'fob' ? 'Comprador é responsável por buscar e pagar o frete.' : 'Vendedor é responsável pela entrega e absorve custos de frete.'}
                  </small>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Fazenda de Origem</label>
                  <input type="text" className="form-control" placeholder="Nome ou identificação da fazenda"
                    value={formData.fazenda_origem}
                    onChange={e => set('fazenda_origem', e.target.value)} />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Cultura da Colheita</label>
                  <input type="text" className="form-control" placeholder="Ex: Soja, Milho..."
                    value={formData.cultura_colheita}
                    onChange={e => set('cultura_colheita', e.target.value)} />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Tipo de Colheita</label>
                  <select className="form-select" value={formData.tipo_colheita}
                    onChange={e => set('tipo_colheita', e.target.value)}>
                    <option value="">Selecione</option>
                    <option value="completa">Colheita Completa c/ Pesagem</option>
                    <option value="silo_bolsa">Silo Bolsa (armazenagem)</option>
                    <option value="contrato_industria">Contrato Indústria</option>
                  </select>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Peso Estimado</label>
                  <input type="number" className="form-control" step="0.001" placeholder="Ex: 5000"
                    value={formData.peso_estimado}
                    onChange={e => set('peso_estimado', e.target.value)} />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Custos de Armazenagem (R$)</label>
                  <input type="number" className="form-control" step="0.01" placeholder="0.00"
                    value={formData.custos_armazenagem}
                    onChange={e => set('custos_armazenagem', e.target.value)} />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Custos de Frete (R$)</label>
                  <input type="number" className="form-control" step="0.01" placeholder="0.00"
                    value={formData.custos_frete}
                    onChange={e => set('custos_frete', e.target.value)} />
                </div>

                <div className="col-12">
                  <label className="form-label">Responsável pelo Frete</label>
                  <select className="form-select" value={formData.responsavel_frete}
                    disabled
                    title={formData.tipo_entrega === 'fob' ? 'Automaticamente selecionado: Comprador paga' : 'Automaticamente selecionado: Vendedor absorve'}>
                    <option value={formData.tipo_entrega === 'fob' ? 'comprador' : 'vendedor'}>
                      {formData.tipo_entrega === 'fob' ? 'Comprador (Paga frete)' : 'Vendedor (Absorve custo)'}
                    </option>
                  </select>
                  <small className="text-muted">Preenchido automaticamente baseado no incoterm selecionado</small>
                </div>
              </div>
            </div>
          )}

          {/* ═══ TAB 5: DOCUMENTOS ═══ */}
          {activeTab === 'documentos' && (
            <div>
              <h6 className="text-primary mb-3">
                <i className="bi bi-paperclip me-2"></i>
                Documentação
              </h6>
              <div className="row g-3">
                <div className="col-12">
                  <div className="border border-dashed rounded p-3 bg-light text-center">
                    <label htmlFor="venda-file-upload" className="btn btn-outline-primary mb-2" style={{ cursor: 'pointer' }}>
                      <i className="bi bi-cloud-upload me-2"></i>
                      Selecionar Arquivos
                    </label>
                    <input id="venda-file-upload" type="file" multiple onChange={handleFileChange}
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
          <button type="submit" className="btn btn-success" disabled={loading}>
            <i className="bi bi-check-circle me-1"></i>
            {loading ? 'Salvando...' : 'Salvar Venda'}
          </button>
        </div>
      </form>
    </ModalForm>
  );
};

export default ContratoVendaForm;
