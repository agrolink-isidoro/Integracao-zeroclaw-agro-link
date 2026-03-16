import React, { useState, useEffect } from 'react';
import ModalForm from '../common/ModalForm';
import comercialService from '../../services/comercial';

interface ContratoFinanceiroFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
}

const ContratoFinanceiroForm: React.FC<ContratoFinanceiroFormProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('identificacao');

  const [formData, setFormData] = useState({
    // TAB 1: Identificação
    numero_contrato: '',
    titulo: '',
    status: 'ativo',
    data_contratacao: '',
    data_vigencia: '',
    data_termino: '',
    observacoes: '',

    // TAB 2: Produto Financeiro
    produto_financeiro: 'seguro', // seguro | aplicacao | consorcio

    // SEGURO
    tipo_seguro: '',
    culturas_cobertas: '',
    cobertura_percentual: '',
    premio: '',
    limite_indenizacao: '',
    numero_apolice: '',
    seguradora: '',

    // APLICAÇÃO
    tipo_aplicacao: '', // CDB | LCI | Fundo
    valor_aplicado: '',
    taxa_juros: '',
    prazo_meses: '',
    data_resgate: '',
    rendimento_estimado: '',
    banco: '',

    // CONSÓRCIO
    bem_consortiado: '',
    valor_carta: '',
    numero_parcelas: '',
    valor_parcela: '',
    fundo_reserva_percentual: '',
    numero_consorcio: '',
    data_saida: '',
    administradora: '',
    reajuste_anual: false,
    inflacao_media_percentual: '',

    // TAB 3: Beneficiário
    pessoa_juridica: '',
    cpf_cnpj: '',
    email: '',
    telefone: '',
    conta_deposito: '',
    banco_deposito: '',
    responsavel_pagamento: '',
  });

  const [documentos, setDocumentos] = useState<File[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [contasSearchQuery, setContasSearchQuery] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        numero_contrato: initialData.numero_contrato || '',
        titulo: initialData.titulo || '',
        status: initialData.status || 'ativo',
        data_contratacao: initialData.data_contratacao || '',
        data_vigencia: initialData.data_vigencia || '',
        data_termino: initialData.data_termino || '',
        observacoes: initialData.observacoes || '',
        produto_financeiro: initialData.produto_financeiro || 'seguro',
        tipo_seguro: initialData.tipo_seguro || '',
        culturas_cobertas: initialData.culturas_cobertas || '',
        cobertura_percentual: String(initialData.cobertura_percentual || ''),
        premio: String(initialData.premio || ''),
        limite_indenizacao: String(initialData.limite_indenizacao || ''),
        numero_apolice: initialData.numero_apolice || '',
        seguradora: initialData.seguradora || '',
        valor_aplicado: String(initialData.valor_aplicado || ''),
        taxa_juros: String(initialData.taxa_juros || ''),
        prazo_meses: String(initialData.prazo_meses || ''),
        banco: initialData.banco || '',
        cpf_cnpj: initialData.cpf_cnpj || '',
        email: initialData.email || '',
        telefone: initialData.telefone || '',
      }));
    }
  }, [initialData]);

  // Carregar contas ao abrir o modal ou quando a busca muda
  useEffect(() => {
    if (!isOpen) return;

    const carregarContas = async () => {
      try {
        const dados = await comercialService.getContas(contasSearchQuery || undefined);
        setContas(Array.isArray(dados) ? dados : []);
      } catch (error) {
        console.error('Erro ao carregar contas:', error);
        setContas([]);
      }
    };

    // Debounce na busca
    const timeoutId = setTimeout(carregarContas, 300);
    return () => clearTimeout(timeoutId);
  }, [isOpen, contasSearchQuery]);

  const set = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calcular rendimento para aplicações financeiras
      if (field === 'valor_aplicado' || field === 'taxa_juros' || field === 'prazo_meses') {
        if (formData.produto_financeiro === 'aplicacao' && updated.valor_aplicado && updated.taxa_juros && updated.prazo_meses) {
          const valorAplicado = parseFloat(updated.valor_aplicado) || 0;
          const taxaAnual = parseFloat(updated.taxa_juros) || 0;
          const meses = parseFloat(updated.prazo_meses) || 0;
          
          // Cálculo simples de rendimento: (valor * taxa% * meses) / 12
          const rendimento = (valorAplicado * (taxaAnual / 100) * meses) / 12;
          updated.rendimento_estimado = rendimento.toFixed(2);
        }
      }
      
      return updated;
    });
  };

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
        premio: parseFloat(formData.premio) || 0,
        valor_aplicado: parseFloat(formData.valor_aplicado) || 0,
        valor_carta: parseFloat(formData.valor_carta) || 0,
        partes: [{ tipo_parte: 'beneficiario', entidade_id: 1, papel_contrato: 'beneficiario' }],
        documento: documentos.length > 0 ? documentos[0] : null,
      };
      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar financeiro:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'identificacao', label: 'Identificação', icon: 'bi-file-earmark-text' },
    { id: 'produto', label: 'Produto Financeiro', icon: 'bi-bank2' },
    { id: 'beneficiario', label: 'Beneficiário', icon: 'bi-person-check' },
    { id: 'documentos', label: 'Documentos', icon: 'bi-paperclip' },
  ];

  return (
    <ModalForm isOpen={isOpen} title="Novo Contrato - Financeiro" onClose={onClose} size="lg">
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
                  activeTab === tab.id ? 'border-warning text-warning' : 'border-transparent text-muted'
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
              <h6 className="text-warning mb-3">
                <i className="bi bi-file-earmark-text me-2"></i>
                Identificação do Contrato Financeiro
              </h6>
              <div className="row g-2 g-md-3">
                <div className="col-12 col-sm-6 col-md-3">
                  <label className="form-label">Número do Contrato *</label>
                  <input type="text" className="form-control" value={formData.numero_contrato}
                    onChange={e => set('numero_contrato', e.target.value)} required />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Título *</label>
                  <input type="text" className="form-control" placeholder="Ex: Seguro de Safra - Soja 2024"
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

                <div className="col-12 col-sm-6 col-md-4">
                  <label className="form-label">Data de Contratação *</label>
                  <input type="date" className="form-control" value={formData.data_contratacao}
                    onChange={e => set('data_contratacao', e.target.value)} required />
                </div>
                <div className="col-12 col-sm-6 col-md-4">
                  <label className="form-label">Data de Vigência</label>
                  <input type="date" className="form-control" value={formData.data_vigencia}
                    onChange={e => set('data_vigencia', e.target.value)} />
                </div>
                <div className="col-12 col-sm-6 col-md-4">
                  <label className="form-label">Data de Término</label>
                  <input type="date" className="form-control" value={formData.data_termino}
                    onChange={e => set('data_termino', e.target.value)} />
                </div>

                <div className="col-12">
                  <label className="form-label">Observações</label>
                  <textarea className="form-control" rows={2} placeholder="Notas gerais..."
                    value={formData.observacoes} onChange={e => set('observacoes', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* ═══ TAB 2: PRODUTO FINANCEIRO ═══ */}
          {activeTab === 'produto' && (
            <div>
              <h6 className="text-warning mb-3">
                <i className="bi bi-bank2 me-2"></i>
                Especificações do Produto Financeiro
              </h6>

              <div className="row g-2 g-md-3 mb-3 pb-3 border-bottom">
                <div className="col-12">
                  <label className="form-label">Tipo de Produto Financeiro *</label>
                  <div className="d-flex gap-2 flex-wrap">
                    {['seguro', 'aplicacao', 'consorcio'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={`btn btn-sm ${
                          formData.produto_financeiro === type
                            ? 'btn-warning'
                            : 'btn-outline-secondary'
                        }`}
                        onClick={() => set('produto_financeiro', type)}
                      >
                        <i className={`bi ${
                          type === 'seguro' ? 'bi-shield-check' :
                          type === 'aplicacao' ? 'bi-graph-up' :
                          'bi-diagram-3'
                        } me-1`}></i>
                        {type === 'seguro' ? 'Seguro' : type === 'aplicacao' ? 'Aplicação' : 'Consórcio'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ─────── SEGURO ─────── */}
              {formData.produto_financeiro === 'seguro' && (
                <div className="row g-2 g-md-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">Tipo de Seguro *</label>
                    <select className="form-select" value={formData.tipo_seguro}
                      onChange={e => set('tipo_seguro', e.target.value)} required>
                      <option value="">Selecione</option>
                      <option value="agricola">Seguro Agrícola</option>
                      <option value="vida">Seguro de Vida</option>
                      <option value="equipamentos">Seguro de Equipamentos</option>
                      <option value="responsabilidade">Seguro de Responsabilidade</option>
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Seguradora</label>
                    <input type="text" className="form-control" placeholder="Ex: HDI, Zurich, Allianz"
                      value={formData.seguradora} onChange={e => set('seguradora', e.target.value)} />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Culturas Cobertas</label>
                    <input type="text" className="form-control" placeholder="Ex: Soja, Milho, Trigo"
                      value={formData.culturas_cobertas} onChange={e => set('culturas_cobertas', e.target.value)} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Cobertura (%)</label>
                    <input type="number" className="form-control" step="0.01" placeholder="Ex: 80.00"
                      value={formData.cobertura_percentual} onChange={e => set('cobertura_percentual', e.target.value)} />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Prêmio (R$) *</label>
                    <input type="number" className="form-control" step="0.01" placeholder="Ex: 5000.00"
                      value={formData.premio} onChange={e => set('premio', e.target.value)} required />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Limite de Indenização (R$)</label>
                    <input type="number" className="form-control" step="0.01" placeholder="Ex: 100000.00"
                      value={formData.limite_indenizacao} onChange={e => set('limite_indenizacao', e.target.value)} />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Número da Apólice</label>
                    <input type="text" className="form-control"
                      value={formData.numero_apolice} onChange={e => set('numero_apolice', e.target.value)} />
                  </div>
                </div>
              )}

              {/* ─────── APLICAÇÃO ─────── */}
              {formData.produto_financeiro === 'aplicacao' && (
                <div className="row g-2 g-md-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">Tipo de Aplicação *</label>
                    <select className="form-select" value={formData.tipo_aplicacao}
                      onChange={e => set('tipo_aplicacao', e.target.value)} required>
                      <option value="">Selecione</option>
                      <option value="CDB">CDB - Certificado de Depósito Bancário</option>
                      <option value="LCI">LCI - Letra de Crédito Imobiliário</option>
                      <option value="Fundo">Fundo de Investimento</option>
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Banco / Instituição</label>
                    <input type="text" className="form-control" placeholder="Ex: Banco do Brasil, Itaú, Caixa"
                      value={formData.banco} onChange={e => set('banco', e.target.value)} />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Valor Aplicado (R$) *</label>
                    <input type="number" className="form-control" step="0.01" placeholder="Ex: 50000.00"
                      value={formData.valor_aplicado} onChange={e => set('valor_aplicado', e.target.value)} required />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Taxa de Juros (% a.a.) *</label>
                    <input type="number" className="form-control" step="0.01" placeholder="Ex: 10.50"
                      value={formData.taxa_juros} onChange={e => set('taxa_juros', e.target.value)} required />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Prazo (meses) *</label>
                    <input type="number" className="form-control" placeholder="Ex: 12"
                      value={formData.prazo_meses} onChange={e => set('prazo_meses', e.target.value)} required />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Data de Resgate</label>
                    <input type="date" className="form-control"
                      value={formData.data_resgate} onChange={e => set('data_resgate', e.target.value)} />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Rendimento Estimado (R$)</label>
                    <input type="number" className="form-control" step="0.01" placeholder="Calculado automaticamente"
                      value={formData.rendimento_estimado} onChange={e => set('rendimento_estimado', e.target.value)}
                      disabled title="Calculado automaticamente a partir da taxa de juros, valor aplicado e prazo" />
                    <small className="text-muted">Atualizado automaticamente baseado na taxa de juros e prazo</small>
                  </div>
                </div>
              )}

              {/* ─────── CONSÓRCIO ─────── */}
              {formData.produto_financeiro === 'consorcio' && (
                <div className="row g-2 g-md-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">Bem Consortiado *</label>
                    <input type="text" className="form-control" placeholder="Ex: Trator, Colheitadeira, Caminhão"
                      value={formData.bem_consortiado} onChange={e => set('bem_consortiado', e.target.value)} required />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Administradora</label>
                    <input type="text" className="form-control" placeholder="Ex: Bradescon, Uniconsorcios"
                      value={formData.administradora} onChange={e => set('administradora', e.target.value)} />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Valor da Carta (R$) *</label>
                    <input type="number" className="form-control" step="0.01" placeholder="Ex: 250000.00"
                      value={formData.valor_carta} onChange={e => set('valor_carta', e.target.value)} required />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Número do Consórcio</label>
                    <input type="text" className="form-control"
                      value={formData.numero_consorcio} onChange={e => set('numero_consorcio', e.target.value)} />
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label">Número de Parcelas *</label>
                    <input type="number" className="form-control" min="6" max="200" placeholder="Ex: 60"
                      value={formData.numero_parcelas} onChange={e => set('numero_parcelas', e.target.value)} required />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Valor da Parcela (R$)</label>
                    <input type="number" className="form-control" step="0.01" placeholder="Ex: 4166.67"
                      value={formData.valor_parcela} onChange={e => set('valor_parcela', e.target.value)} />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Fundo de Reserva (%)</label>
                    <input type="number" className="form-control" step="0.01" placeholder="Ex: 10.00"
                      value={formData.fundo_reserva_percentual} onChange={e => set('fundo_reserva_percentual', e.target.value)} />
                  </div>

                  <div className="col-12">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="reajuste-anual-check"
                        checked={formData.reajuste_anual} onChange={e => set('reajuste_anual', e.target.checked)} />
                      <label className="form-check-label" htmlFor="reajuste-anual-check">
                        Incluir Reajuste Anual
                      </label>
                    </div>
                  </div>

                  {formData.reajuste_anual && (
                    <div className="col-12 col-md-6">
                      <label className="form-label">Inflação Média Anual (%)</label>
                      <input type="number" className="form-control" step="0.01" placeholder="Ex: 6.50"
                        value={formData.inflacao_media_percentual}
                        onChange={e => set('inflacao_media_percentual', e.target.value)} />
                      <small className="text-muted">Utilizada para reajustar valor da carta anualmente</small>
                    </div>
                  )}

                  <div className="col-12">
                    <label className="form-label">Data de Saída / Contemplação</label>
                    <input type="date" className="form-control"
                      value={formData.data_saida} onChange={e => set('data_saida', e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ TAB 3: BENEFICIÁRIO ═══ */}
          {activeTab === 'beneficiario' && (
            <div>
              <h6 className="text-warning mb-3">
                <i className="bi bi-person-check me-2"></i>
                Dados do Beneficiário
              </h6>
              <div className="row g-2 g-md-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Nome / Pessoa Jurídica *</label>
                  <input type="text" className="form-control" placeholder="Ex: João Silva ou Empresa LTDA"
                    value={formData.pessoa_juridica} onChange={e => set('pessoa_juridica', e.target.value)} required />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">CPF / CNPJ *</label>
                  <input type="text" className="form-control" placeholder="Ex: 000.000.000-00 ou 00.000.000/0000-00"
                    value={formData.cpf_cnpj} onChange={e => set('cpf_cnpj', e.target.value)} required />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">E-mail</label>
                  <input type="email" className="form-control" placeholder="Ex: email@example.com"
                    value={formData.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Telefone</label>
                  <input type="tel" className="form-control" placeholder="Ex: (11) 98765-4321"
                    value={formData.telefone} onChange={e => set('telefone', e.target.value)} />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Banco</label>
                  <input type="text" className="form-control" placeholder="Ex: Banco do Brasil, Itaú, Caixa"
                    value={formData.banco_deposito} onChange={e => set('banco_deposito', e.target.value)}
                    list="bancos-list" />
                  <datalist id="bancos-list">
                    <option value="Banco do Brasil"></option>
                    <option value="Itaú"></option>
                    <option value="Caixa Econômica"></option>
                    <option value="Bradesco"></option>
                  </datalist>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Número da Conta para Depósito</label>
                  <input type="text" className="form-control" placeholder="Ex: 12345-67 ou buscar conta cadastrada"
                    value={formData.conta_deposito} 
                    onChange={e => {
                      set('conta_deposito', e.target.value);
                      setContasSearchQuery(e.target.value);
                    }}
                    list="contas-list" />
                  <datalist id="contas-list">
                    {contas.map((c) => (
                      <option key={c.id} value={`${c.conta}-${c.agencia} (${c.banco})`}>
                        {c.conta}-{c.agencia} ({c.banco})
                      </option>
                    ))}
                  </datalist>
                  <small className="text-muted">Digite para buscar conta no módulo financeiro</small>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Responsável pelo Pagamento</label>
                  <input type="text" className="form-control"
                    value={formData.responsavel_pagamento} onChange={e => set('responsavel_pagamento', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* ═══ TAB 4: DOCUMENTOS ═══ */}
          {activeTab === 'documentos' && (
            <div>
              <h6 className="text-warning mb-3">
                <i className="bi bi-paperclip me-2"></i>
                Documentação
              </h6>
              <div className="row g-3">
                <div className="col-12">
                  <div className="border border-dashed rounded p-3 bg-light text-center">
                    <label htmlFor="financeiro-file-upload" className="btn btn-outline-warning mb-2" style={{ cursor: 'pointer' }}>
                      <i className="bi bi-cloud-upload me-2"></i>
                      Selecionar Arquivos
                    </label>
                    <input id="financeiro-file-upload" type="file" multiple onChange={handleFileChange}
                      className="d-none" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                    <p className="text-muted mb-0 small">
                      Contrato, Apólice, Aditivos, Comprovantes (PDF, DOC, DOCX, JPG, PNG)
                    </p>
                  </div>
                </div>
                {documentos.length > 0 && (
                  <div className="col-12">
                    <div className="list-group">
                      {documentos.map((doc, index) => (
                        <div key={index} className="list-group-item d-flex justify-content-between align-items-center">
                          <div className="d-flex align-items-center">
                            <i className="bi bi-file-earmark-text text-warning me-2 fs-5"></i>
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
          <button type="submit" className="btn btn-warning" disabled={loading}>
            <i className="bi bi-check-circle me-1"></i>
            {loading ? 'Salvando...' : 'Salvar Financeiro'}
          </button>
        </div>
      </form>
    </ModalForm>
  );
};

export default ContratoFinanceiroForm;
