import React, { useState } from 'react';
import ModalForm from '../common/ModalForm';

interface ContratoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

const ContratoFormModal: React.FC<ContratoFormModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('identificacao');

  // --- Estado do formulário ---
  const [formData, setFormData] = useState({
    numero_contrato: '',
    titulo: '',
    tipo_contrato: '',
    modalidade_comercial: '',
    categoria: '',
    status: 'ativo',
    instrumento_garantia: '',
    // Produto/Serviço
    produto: '',
    variedade: '',
    safra: '',
    quantidade: '',
    unidade_medida: 'sc',
    qualidade_especificacao: '',
    // Valores e Prazos
    preco_unitario: '',
    valor_total: '',
    forma_pagamento: 'a_vista',
    prazo_pagamento_dias: '',
    data_inicio: '',
    data_entrega: '',
    data_fim: '',
    local_entrega: '',
    // Barter
    produto_troca_recebido: '',
    quantidade_troca_recebida: '',
    unidade_troca_recebida: '',
    // Condições
    condicoes: '',
    observacoes: '',
  });

  // Dados específicos - Compra
  const [compraData, setCompraData] = useState({
    condicao_pagamento: 'dinheiro',
    prazo_entrega_dias: '',
    desconto_global_percentual: '',
  });

  // Dados específicos - Venda
  const [vendaData, setVendaData] = useState({
    numero_parcelas: '1',
    periodicidade_parcela: 'mensal',
    rastrear_comissao: true,
    percentual_comissao: '',
  });

  // Dados específicos - Financeiro
  const [financeiroData, setFinanceiroData] = useState({
    produto_financeiro: 'emprestimo',
    valor_entrada: '',
    taxa_juros: '',
    prazo_meses: '12',
    numero_parcelas: '12',
  });

  // Documentos
  const [documentos, setDocumentos] = useState<File[]>([]);

  const set = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setDocumentos(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const removeDocumento = (index: number) => setDocumentos(prev => prev.filter((_, i) => i !== index));

  // Determina qual aba tipo-específica mostrar
  const tipoTab = formData.tipo_contrato === 'compra' ? 'compra'
    : formData.tipo_contrato === 'venda' || formData.tipo_contrato === 'venda_futura' || formData.tipo_contrato === 'venda_spot' ? 'venda'
    : formData.tipo_contrato === 'financiamento' ? 'financeiro'
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const submitData: any = {
        ...formData,
        valor_total: parseFloat(formData.valor_total) || 0,
        partes: [{ tipo_parte: 'cliente', entidade_id: 1, papel_contrato: 'contratante' }],
        itens: [],
        condicoes: formData.condicoes ? [{ tipo_condicao: 'geral', descricao: formData.condicoes, obrigatoria: true }] : [],
        documento: documentos.length > 0 ? documentos[0] : null,
      };

      if (tipoTab === 'compra') submitData.compra_especifico = compraData;
      else if (tipoTab === 'venda') submitData.venda_especifico = vendaData;
      else if (tipoTab === 'financeiro') submitData.financeiro_especifico = financeiroData;

      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar contrato:', error);
    } finally {
      setLoading(false);
    }
  };

  // Abas
  const tabs = [
    { id: 'identificacao', label: 'Identificação', icon: 'bi-file-earmark-text' },
    { id: 'produto', label: 'Produto/Serviço', icon: 'bi-box-seam' },
    { id: 'valores', label: 'Valores e Prazos', icon: 'bi-currency-dollar' },
    ...(tipoTab === 'compra' ? [{ id: 'compra', label: 'Compra', icon: 'bi-cart3' }] : []),
    ...(tipoTab === 'venda' ? [{ id: 'venda', label: 'Venda', icon: 'bi-graph-up-arrow' }] : []),
    ...(tipoTab === 'financeiro' ? [{ id: 'financeiro', label: 'Financeiro', icon: 'bi-bank' }] : []),
    { id: 'condicoes', label: 'Condições', icon: 'bi-list-check' },
    { id: 'documentos', label: 'Documentos', icon: 'bi-paperclip' },
  ];

  return (
    <ModalForm isOpen={isOpen} title="Novo Contrato" onClose={onClose} size="xl">
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

        <div style={{ minHeight: '420px' }}>

          {/* ═══ ABA 1: IDENTIFICAÇÃO ═══ */}
          {activeTab === 'identificacao' && (
            <div>
              <h6 className="text-primary mb-3">
                <i className="bi bi-file-earmark-text me-2"></i>
                Identificação do Contrato
              </h6>
              <div className="row g-2 g-md-3">
                <div className="col-12 col-sm-6 col-md-3">
                  <label className="form-label">Número do Contrato *</label>
                  <input type="text" className="form-control" value={formData.numero_contrato}
                    onChange={e => set('numero_contrato', e.target.value)} required />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Título / Objeto *</label>
                  <input type="text" className="form-control" placeholder="Ex: Venda de Soja Safra 2025/2026"
                    value={formData.titulo} onChange={e => set('titulo', e.target.value)} required />
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={formData.status} onChange={e => set('status', e.target.value)}>
                    <option value="rascunho">Rascunho</option>
                    <option value="ativo">Ativo</option>
                    <option value="suspenso">Suspenso</option>
                    <option value="cancelado">Cancelado</option>
                    <option value="encerrado">Encerrado</option>
                  </select>
                </div>

                <div className="col-12 col-sm-6 col-lg-3">
                  <label className="form-label">Tipo de Operação *</label>
                  <select className="form-select" value={formData.tipo_contrato}
                    onChange={e => set('tipo_contrato', e.target.value)} required>
                    <option value="">Selecione</option>
                    <option value="venda">Venda</option>
                    <option value="compra">Compra</option>
                    <option value="venda_futura">Venda Futura</option>
                    <option value="venda_spot">Venda Spot</option>
                    <option value="barter">Barter</option>
                    <option value="servico">Serviço</option>
                    <option value="fornecimento">Fornecimento</option>
                    <option value="parceria">Parceria</option>
                    <option value="financiamento">Financiamento</option>
                    <option value="outros">Arrendamento / Outros</option>
                  </select>
                </div>
                <div className="col-12 col-sm-6 col-lg-3">
                  <label className="form-label">Modalidade Comercial</label>
                  <select className="form-select" value={formData.modalidade_comercial}
                    onChange={e => set('modalidade_comercial', e.target.value)}>
                    <option value="">Selecione</option>
                    <option value="spot">SPOT (À Vista)</option>
                    <option value="fixo">Fixo (Pré-Fixado)</option>
                    <option value="futuro">Futuro</option>
                    <option value="a_fixar">A Fixar</option>
                    <option value="consignado">Consignado</option>
                  </select>
                </div>
                <div className="col-12 col-sm-6 col-lg-3">
                  <label className="form-label">Categoria</label>
                  <select className="form-select" value={formData.categoria}
                    onChange={e => set('categoria', e.target.value)}>
                    <option value="">Selecione</option>
                    <option value="graos">Grãos</option>
                    <option value="insumos">Insumos</option>
                    <option value="sementes">Sementes</option>
                    <option value="fertilizantes">Fertilizantes</option>
                    <option value="defensivos">Defensivos</option>
                    <option value="servicos">Serviços</option>
                    <option value="equipamentos">Equipamentos</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
                <div className="col-12 col-sm-6 col-lg-3">
                  <label className="form-label">Garantia</label>
                  <select className="form-select" value={formData.instrumento_garantia}
                    onChange={e => set('instrumento_garantia', e.target.value)}>
                    <option value="">Nenhum</option>
                    <option value="cpr_fisica">CPR Física</option>
                    <option value="cpr_financeira">CPR Financeira</option>
                    <option value="nota_promissoria">Nota Promissória</option>
                    <option value="penhor">Penhor</option>
                    <option value="aval">Aval</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ═══ ABA 2: PRODUTO/SERVIÇO ═══ */}
          {activeTab === 'produto' && (
            <div>
              <h6 className="text-primary mb-3">
                <i className="bi bi-box-seam me-2"></i>
                Especificações do Produto/Serviço
              </h6>
              <div className="row g-2 g-md-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Produto/Serviço *</label>
                  <input type="text" className="form-control" placeholder="Ex: Soja em Grão"
                    value={formData.produto} onChange={e => set('produto', e.target.value)} />
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                  <label className="form-label">Variedade/Cultivar</label>
                  <input type="text" className="form-control" placeholder="Ex: M6410 IPRO"
                    value={formData.variedade} onChange={e => set('variedade', e.target.value)} />
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                  <label className="form-label">Safra</label>
                  <input type="text" className="form-control" placeholder="Ex: 2025/2026"
                    value={formData.safra} onChange={e => set('safra', e.target.value)} />
                </div>
                <div className="col-12 col-sm-6 col-md-4">
                  <label className="form-label">Quantidade *</label>
                  <input type="number" className="form-control" step="0.001" placeholder="Ex: 5000"
                    value={formData.quantidade} onChange={e => set('quantidade', e.target.value)} />
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                  <label className="form-label">Unidade *</label>
                  <select className="form-select" value={formData.unidade_medida}
                    onChange={e => set('unidade_medida', e.target.value)}>
                    <option value="sc">Sacas (60kg)</option>
                    <option value="ton">Toneladas</option>
                    <option value="kg">Quilogramas</option>
                    <option value="litros">Litros</option>
                    <option value="unidade">Unidades</option>
                  </select>
                </div>
                <div className="col-12 col-md-5">
                  <label className="form-label">Especificação de Qualidade</label>
                  <input type="text" className="form-control"
                    placeholder="Ex: Umidade máx 14%, Impurezas máx 1%"
                    value={formData.qualidade_especificacao} onChange={e => set('qualidade_especificacao', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* ═══ ABA 3: VALORES E PRAZOS ═══ */}
          {activeTab === 'valores' && (
            <div>
              <h6 className="text-primary mb-3">
                <i className="bi bi-currency-dollar me-2"></i>
                Valores, Preços e Prazos
              </h6>
              <div className="row g-2 g-md-3">
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
                <div className="col-12 col-sm-6 col-md-3">
                  <label className="form-label">Forma de Pagamento</label>
                  <select className="form-select" value={formData.forma_pagamento}
                    onChange={e => set('forma_pagamento', e.target.value)}>
                    <option value="a_vista">À Vista</option>
                    <option value="parcelado">Parcelado</option>
                    <option value="antecipado">Antecipado</option>
                    <option value="pos_entrega">Pós-Entrega</option>
                    <option value="troca">Troca (Barter)</option>
                  </select>
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                  <label className="form-label">Prazo (dias)</label>
                  <input type="number" className="form-control" placeholder="Ex: 30"
                    value={formData.prazo_pagamento_dias} onChange={e => set('prazo_pagamento_dias', e.target.value)} />
                </div>
                <div className="col-12 col-sm-6 col-md-4">
                  <label className="form-label">Data de Início *</label>
                  <input type="date" className="form-control"
                    value={formData.data_inicio} onChange={e => set('data_inicio', e.target.value)} required />
                </div>
                <div className="col-12 col-sm-6 col-md-4">
                  <label className="form-label">Data de Entrega</label>
                  <input type="date" className="form-control"
                    value={formData.data_entrega} onChange={e => set('data_entrega', e.target.value)} />
                </div>
                <div className="col-12 col-sm-6 col-md-4">
                  <label className="form-label">Data de Término</label>
                  <input type="date" className="form-control"
                    value={formData.data_fim} onChange={e => set('data_fim', e.target.value)} />
                </div>
                <div className="col-12">
                  <label className="form-label">Local de Entrega</label>
                  <input type="text" className="form-control"
                    placeholder="Ex: Armazém XYZ, Rodovia BR-163 km 512, Lucas do Rio Verde - MT"
                    value={formData.local_entrega} onChange={e => set('local_entrega', e.target.value)} />
                </div>

                {/* Campos Barter */}
                {formData.tipo_contrato === 'barter' && (
                  <>
                    <div className="col-12">
                      <div className="alert alert-info mb-0">
                        <i className="bi bi-info-circle me-2"></i>
                        <strong>Operação Barter:</strong> Especifique os produtos/insumos envolvidos na troca e suas quantidades equivalentes.
                      </div>
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">Produto Recebido na Troca</label>
                      <input type="text" className="form-control" placeholder="Ex: Fertilizante NPK"
                        value={formData.produto_troca_recebido} onChange={e => set('produto_troca_recebido', e.target.value)} />
                    </div>
                    <div className="col-12 col-sm-6 col-md-3">
                      <label className="form-label">Quantidade Recebida</label>
                      <input type="number" className="form-control" step="0.001"
                        value={formData.quantidade_troca_recebida} onChange={e => set('quantidade_troca_recebida', e.target.value)} />
                    </div>
                    <div className="col-12 col-sm-6 col-md-3">
                      <label className="form-label">Unidade</label>
                      <input type="text" className="form-control" placeholder="Ex: Toneladas"
                        value={formData.unidade_troca_recebida} onChange={e => set('unidade_troca_recebida', e.target.value)} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ═══ ABA: COMPRA ESPECÍFICO ═══ */}
          {activeTab === 'compra' && (
            <div>
              <h6 className="text-primary mb-3">
                <i className="bi bi-cart3 me-2"></i>
                Dados Específicos da Compra
              </h6>
              <div className="row g-2 g-md-3">
                <div className="col-12 col-sm-6 col-md-4">
                  <label className="form-label">Condição de Pagamento</label>
                  <select className="form-select" value={compraData.condicao_pagamento}
                    onChange={e => setCompraData({ ...compraData, condicao_pagamento: e.target.value })}>
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
                    value={compraData.prazo_entrega_dias}
                    onChange={e => setCompraData({ ...compraData, prazo_entrega_dias: e.target.value })} />
                </div>
                <div className="col-12 col-sm-6 col-md-4">
                  <label className="form-label">Desconto Global (%)</label>
                  <input type="number" className="form-control" step="0.01" placeholder="Ex: 5.00"
                    value={compraData.desconto_global_percentual}
                    onChange={e => setCompraData({ ...compraData, desconto_global_percentual: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {/* ═══ ABA: VENDA ESPECÍFICO ═══ */}
          {activeTab === 'venda' && (
            <div>
              <h6 className="text-primary mb-3">
                <i className="bi bi-graph-up-arrow me-2"></i>
                Dados Específicos da Venda
              </h6>
              <div className="row g-2 g-md-3">
                <div className="col-12 col-sm-6 col-md-4">
                  <label className="form-label">Número de Parcelas</label>
                  <input type="number" className="form-control" min="1"
                    value={vendaData.numero_parcelas}
                    onChange={e => setVendaData({ ...vendaData, numero_parcelas: e.target.value })} />
                </div>
                <div className="col-12 col-sm-6 col-md-4">
                  <label className="form-label">Periodicidade</label>
                  <select className="form-select" value={vendaData.periodicidade_parcela}
                    onChange={e => setVendaData({ ...vendaData, periodicidade_parcela: e.target.value })}>
                    <option value="semanal">Semanal</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="mensal">Mensal</option>
                    <option value="bimestral">Bimestral</option>
                    <option value="trimestral">Trimestral</option>
                  </select>
                </div>
                <div className="col-12 col-sm-6 col-md-4">
                  <label className="form-label">Comissão (%)</label>
                  <input type="number" className="form-control" step="0.01" placeholder="Ex: 3.00"
                    value={vendaData.percentual_comissao}
                    onChange={e => setVendaData({ ...vendaData, percentual_comissao: e.target.value })} />
                </div>
                <div className="col-12">
                  <div className="form-check">
                    <input type="checkbox" className="form-check-input" id="rastrear-comissao"
                      checked={vendaData.rastrear_comissao}
                      onChange={e => setVendaData({ ...vendaData, rastrear_comissao: e.target.checked })} />
                    <label className="form-check-label" htmlFor="rastrear-comissao">
                      Rastrear Comissão de Vendedor
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ ABA: FINANCEIRO ESPECÍFICO ═══ */}
          {activeTab === 'financeiro' && (
            <div>
              <h6 className="text-primary mb-3">
                <i className="bi bi-bank me-2"></i>
                Dados do Produto Financeiro
              </h6>
              <div className="row g-2 g-md-3">
                <div className="col-12 col-sm-6 col-md-4">
                  <label className="form-label">Tipo de Produto *</label>
                  <select className="form-select" value={financeiroData.produto_financeiro}
                    onChange={e => setFinanceiroData({ ...financeiroData, produto_financeiro: e.target.value })}>
                    <option value="emprestimo">Empréstimo</option>
                    <option value="consorcio">Consórcio</option>
                    <option value="seguro">Seguro</option>
                    <option value="aplicacao">Aplicação Financeira</option>
                  </select>
                </div>
                <div className="col-12 col-sm-6 col-md-4">
                  <label className="form-label">Valor de Entrada (R$)</label>
                  <input type="number" className="form-control" step="0.01" placeholder="Ex: 10000.00"
                    value={financeiroData.valor_entrada}
                    onChange={e => setFinanceiroData({ ...financeiroData, valor_entrada: e.target.value })} />
                </div>
                <div className="col-12 col-sm-6 col-md-4">
                  <label className="form-label">Taxa de Juros (% a.m.)</label>
                  <input type="number" className="form-control" step="0.01" placeholder="Ex: 1.50"
                    value={financeiroData.taxa_juros}
                    onChange={e => setFinanceiroData({ ...financeiroData, taxa_juros: e.target.value })} />
                </div>
                <div className="col-12 col-sm-6 col-md-6">
                  <label className="form-label">Prazo (meses)</label>
                  <input type="number" className="form-control" placeholder="Ex: 24"
                    value={financeiroData.prazo_meses}
                    onChange={e => setFinanceiroData({ ...financeiroData, prazo_meses: e.target.value })} />
                </div>
                <div className="col-12 col-sm-6 col-md-6">
                  <label className="form-label">Número de Parcelas</label>
                  <input type="number" className="form-control" placeholder="Ex: 24"
                    value={financeiroData.numero_parcelas}
                    onChange={e => setFinanceiroData({ ...financeiroData, numero_parcelas: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {/* ═══ ABA: CONDIÇÕES ═══ */}
          {activeTab === 'condicoes' && (
            <div>
              <h6 className="text-primary mb-3">
                <i className="bi bi-list-check me-2"></i>
                Condições, Cláusulas e Observações
              </h6>
              <div className="row g-2 g-md-3">
                <div className="col-12">
                  <label className="form-label">Condições Contratuais e Cláusulas</label>
                  <textarea className="form-control" rows={5}
                    placeholder="Descreva as condições, cláusulas, penalidades, multas e termos específicos do contrato..."
                    value={formData.condicoes} onChange={e => set('condicoes', e.target.value)} />
                </div>
                <div className="col-12">
                  <label className="form-label">Observações Adicionais</label>
                  <textarea className="form-control" rows={3}
                    placeholder="Observações gerais sobre o contrato..."
                    value={formData.observacoes} onChange={e => set('observacoes', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* ═══ ABA: DOCUMENTOS ═══ */}
          {activeTab === 'documentos' && (
            <div>
              <h6 className="text-primary mb-3">
                <i className="bi bi-paperclip me-2"></i>
                Documentos Anexos
              </h6>
              <div className="row g-3">
                <div className="col-12">
                  <div className="border border-dashed rounded p-3 bg-light text-center">
                    <label htmlFor="contrato-file-upload" className="btn btn-outline-primary mb-2" style={{ cursor: 'pointer' }}>
                      <i className="bi bi-cloud-upload me-2"></i>
                      Selecionar Arquivos
                    </label>
                    <input id="contrato-file-upload" type="file" multiple onChange={handleFileChange}
                      className="d-none" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                    <p className="text-muted mb-0 small">
                      Formatos aceitos: PDF, DOC, DOCX, JPG, PNG (Máx. 10MB por arquivo)
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
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <i className="bi bi-check-circle me-1"></i>
            {loading ? 'Salvando...' : 'Salvar Contrato'}
          </button>
        </div>
      </form>
    </ModalForm>
  );
};

export default ContratoFormModal;
