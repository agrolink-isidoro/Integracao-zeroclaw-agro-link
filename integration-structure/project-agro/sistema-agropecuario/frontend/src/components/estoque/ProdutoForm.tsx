import * as React from 'react';
const { useState, useEffect, useRef } = React;
import type { Produto, CategoriaProduto, LocalArmazenagem } from '../../types/estoque_maquinas';
import { locaisService, produtosService, movimentacoesService } from '../../services/produtos';

interface ProdutoFormProps {
  produto?: Produto;
  onSave: (produto: Omit<Produto, 'id'> | Partial<Produto>) => void;
  onCancel: () => void;
}

const ProdutoForm: React.FC<ProdutoFormProps> = ({
  produto,
  onSave,
  onCancel
}) => {
  // Função helper para padronizar unidades
  const padronizarUnidade = (unidade: string): string => {
    const unidadeUpper = unidade?.toUpperCase() || '';
    if (unidadeUpper === 'LT') return 'L';
    if (unidadeUpper === 'TON') return 't';
    return unidade || 'kg';
  };

  const [formData, setFormData] = useState({
    codigo: produto?.codigo || '',
    nome: produto?.nome || '',
    categoria: produto?.categoria || '',
    principio_ativo: produto?.principio_ativo || '',
    concentracao: produto?.concentracao || '',
    composicao_quimica: produto?.composicao_quimica || '',
    unidade: padronizarUnidade(produto?.unidade || 'kg'),
    estoque_minimo: produto?.estoque_minimo || 0,
    quantidade_estoque: produto?.quantidade_estoque || 0,
    custo_unitario: produto?.custo_unitario || 0,
    preco_unitario: produto?.preco_unitario || 0,
    fornecedor_nome: produto?.fornecedor_nome || '',
    vencimento: produto?.vencimento || '',
    lote: produto?.lote || '',
    local_armazenamento: produto?.local_armazenamento || null,
    status: produto?.status || 'ativo',
    dosagem_padrao: produto?.dosagem_padrao || 0,
    unidade_dosagem: produto?.unidade_dosagem || '',
    observacoes: produto?.observacoes || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState<CategoriaProduto[]>([]);
  const [locais, setLocais] = useState<LocalArmazenagem[]>([]);
  // store selected local id
  const [localSelectedId, setLocalSelectedId] = useState<number | null>(produto?.local_armazenamento || null);

  // ---- Modo: produto já existente (registrar entrada de estoque) ----
  const [produtoExistente, setProdutoExistente] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [produtoSearchQuery, setProdutoSearchQuery] = useState('');
  const [produtoSearchResults, setProdutoSearchResults] = useState<Produto[]>([]);
  const [produtoSearchLoading, setProdutoSearchLoading] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [entradaData, setEntradaData] = useState({
    quantidade: 0,
    custo_unitario: 0,
    local_armazenamento: null as number | null,
    documento_referencia: '',
    motivo: 'compra',
    observacoes: '',
  });
  const [entradaErrors, setEntradaErrors] = useState<Record<string, string>>({});

  // Categorias com validações específicas
  const categoriasPadrao: CategoriaProduto[] = [
    { id: 1, nome: 'Sementes', tag: 'semente', ativo: true },
    { id: 2, nome: 'Fertilizantes', tag: 'fertilizante', ativo: true },
    { id: 3, nome: 'Corretivos', tag: 'corretivo', ativo: true },
    { id: 4, nome: 'Herbicidas', tag: 'herbicida', ativo: true },
    { id: 5, nome: 'Fungicidas', tag: 'fungicida', ativo: true },
    { id: 6, nome: 'Inseticidas', tag: 'inseticida', ativo: true },
    { id: 7, nome: 'Acaricidas', tag: 'acaricida', ativo: true },
    { id: 8, nome: 'Adjuvantes', tag: 'adjuvante', ativo: true },
    { id: 9, nome: 'Combustíveis e Lubrificantes', tag: 'combustiveis_lubrificantes', ativo: true },
    { id: 10, nome: 'Peças de manutenção', tag: 'pecas_manutencao', ativo: true },
    { id: 11, nome: 'Construção', tag: 'construcao', ativo: true },
    { id: 12, nome: 'Correção de solo', tag: 'correcao_solo', ativo: true },
    { id: 13, nome: 'Outros', tag: 'outro', ativo: true }
  ];

  const validacaoPorCategoria = {
    'semente': {
      requer_principio_ativo: false,
      requer_vencimento: true,
      requer_dosagem: false,
      unidades_permitidas: ['kg', 'g', 'L', 'un'],
      campos_obrigatorios: ['codigo', 'nome', 'categoria', 'unidade', 'estoque_minimo']
    },
    'fertilizante': {
      requer_principio_ativo: true,
      requer_vencimento: true,
      requer_dosagem: false,
      unidades_permitidas: ['kg', 'g', 't', 'L'],
      campos_obrigatorios: ['codigo', 'nome', 'categoria', 'unidade', 'estoque_minimo']
    },
    'corretivo': {
      requer_principio_ativo: false,
      requer_vencimento: false,
      requer_dosagem: false,
      unidades_permitidas: ['kg', 't', 'm3'],
      campos_obrigatorios: ['codigo', 'nome', 'categoria', 'unidade', 'estoque_minimo']
    },
    'herbicida': {
      requer_principio_ativo: true,
      requer_vencimento: true,
      requer_dosagem: false,
      unidades_permitidas: ['L', 'kg', 'g'],
      campos_obrigatorios: ['codigo', 'nome', 'categoria', 'unidade', 'estoque_minimo']
    },
    'fungicida': {
      requer_principio_ativo: true,
      requer_vencimento: true,
      requer_dosagem: false,
      unidades_permitidas: ['L', 'kg', 'g'],
      campos_obrigatorios: ['codigo', 'nome', 'categoria', 'unidade', 'estoque_minimo']
    },
    'inseticida': {
      requer_principio_ativo: true,
      requer_vencimento: true,
      requer_dosagem: false,
      unidades_permitidas: ['L', 'kg', 'g'],
      campos_obrigatorios: ['codigo', 'nome', 'categoria', 'unidade', 'estoque_minimo']
    },
    'acaricida': {
      requer_principio_ativo: true,
      requer_vencimento: true,
      requer_dosagem: false,
      unidades_permitidas: ['L', 'kg', 'g'],
      campos_obrigatorios: ['codigo', 'nome', 'categoria', 'unidade', 'estoque_minimo']
    },
    'adjuvante': {
      requer_principio_ativo: false,
      requer_vencimento: true,
      requer_dosagem: false,
      unidades_permitidas: ['L', 'kg', 'g'],
      campos_obrigatorios: ['codigo', 'nome', 'categoria', 'unidade', 'estoque_minimo']
    },
    'combustiveis_lubrificantes': {
      requer_principio_ativo: false,
      requer_vencimento: false,
      requer_dosagem: false,
      unidades_permitidas: ['L'],
      campos_obrigatorios: ['codigo', 'nome', 'categoria', 'unidade', 'estoque_minimo']
    },
    'pecas_manutencao': {
      requer_principio_ativo: false,
      requer_vencimento: false,
      requer_dosagem: false,
      unidades_permitidas: ['un'],
      campos_obrigatorios: ['codigo', 'nome', 'categoria']
    },
    'construcao': {
      requer_principio_ativo: false,
      requer_vencimento: false,
      requer_dosagem: false,
      unidades_permitidas: ['kg', 'm3', 'un'],
      campos_obrigatorios: ['codigo', 'nome', 'categoria']
    },
    'correcao_solo': {
      requer_principio_ativo: false,
      requer_vencimento: false,
      requer_dosagem: false,
      unidades_permitidas: ['kg', 't'],
      campos_obrigatorios: ['codigo', 'nome', 'categoria']
    },
    'outro': {
      requer_principio_ativo: false,
      requer_vencimento: false,
      requer_dosagem: false,
      unidades_permitidas: ['kg', 'g', 'L', 'un'],
      campos_obrigatorios: ['codigo', 'nome', 'categoria', 'unidade', 'estoque_minimo']
    }
  };

  useEffect(() => {
    // Carregar categorias da API (futuramente)
    setCategorias(categoriasPadrao);

    // Carregar locais de armazenagem para o select/autocomplete
    const loadLocais = async () => {
      try {
        const res = await locaisService.listar();
        setLocais(res);
      } catch (err) {
        console.error('Erro ao carregar locais de armazenagem', err);
      }
    };

    loadLocais();
  }, []);

  const getCategoriaNome = (key: number | string) => {
    const tag = String(key);
    const categoria = categorias.find(c => (c.tag && c.tag === tag) || String(c.id) === tag);
    return categoria?.nome || '';
  };

  // Helper function to suggest storage location based on product category
  const getSuggestedStorageType = (categoriaKey: string): string[] => {
    const mapping: Record<string, string[]> = {
      'semente': ['barracao', 'armazem', 'galpao'],
      'fertilizante': ['armazem', 'galpao', 'barracao'],
      'corretivo': ['patio', 'galpao', 'barracao'],
      'herbicida': ['almoxerifado', 'armazem', 'depósito'],
      'fungicida': ['almoxerifado', 'armazem', 'depósito'],
      'inseticida': ['almoxerifado', 'armazem', 'depósito'],
      'acaricida': ['almoxerifado', 'armazem', 'depósito'],
      'adjuvante': ['almoxerifado', 'armazem', 'depósito'],
      'combustiveis_lubrificantes': ['posto', 'almoxerifado'],
      'pecas_manutencao': ['almoxerifado', 'depósito'],
      'construcao': ['patio', 'galpao', 'almoxerifado'],
      'correcao_solo': ['patio', 'galpao', 'barracao'],
      'outro': ['galpao', 'depósito', 'almoxerifado']
    };
    return mapping[categoriaKey] || [];
  };

  const getRegrasCategoria = () => {
    const categoriaKey = String(formData.categoria || '').toLowerCase();
    return validacaoPorCategoria[categoriaKey as keyof typeof validacaoPorCategoria] || {
      requer_principio_ativo: false,
      requer_vencimento: false,
      requer_dosagem: false,
      unidades_permitidas: ['kg', 'g', 'L', 'un'],
      campos_obrigatorios: ['codigo', 'nome', 'categoria', 'unidade', 'estoque_minimo']
    };
  };

  const validarFormulario = () => {
    const newErrors: Record<string, string> = {};
    const regras = getRegrasCategoria();

    // Campos obrigatórios (tratar zeros como valores válidos)
    regras.campos_obrigatorios.forEach(campo => {
      const val = formData[campo as keyof typeof formData];
      const isEmpty = val === undefined || val === null || (typeof val === 'string' && String(val).trim() === '');
      if (isEmpty) {
        newErrors[campo] = 'Este campo é obrigatório';
      }
    });

    // Validações específicas por categoria
    if (regras.requer_principio_ativo && !formData.principio_ativo) {
      newErrors.principio_ativo = 'Princípio ativo é obrigatório para esta categoria';
    }

    if (regras.requer_vencimento && !formData.vencimento) {
      newErrors.vencimento = 'Data de vencimento é obrigatória para esta categoria';
    }

    if (regras.requer_dosagem && (!formData.dosagem_padrao || formData.dosagem_padrao <= 0)) {
      newErrors.dosagem_padrao = 'Dosagem padrão é obrigatória para esta categoria';
    }

    // Validação de unidade de medida (padronizar antes de validar)
    const unidadePadronizada = formData.unidade.toUpperCase() === 'LT' ? 'L' : formData.unidade;
    if (!regras.unidades_permitidas.includes(unidadePadronizada)) {
      newErrors.unidade = `Unidade não permitida para ${getCategoriaNome(formData.categoria).toLowerCase()}`;
    }

    // Validações gerais
    if (formData.estoque_minimo < 0) {
      newErrors.estoque_minimo = 'Estoque mínimo não pode ser negativo';
    }

    if (formData.quantidade_estoque < 0) {
      newErrors.quantidade_estoque = 'Estoque atual não pode ser negativo';
    }

    if (formData.custo_unitario < 0) {
      newErrors.custo_unitario = 'Custo unitário não pode ser negativo';
    }



    if (formData.preco_unitario < 0) {
      newErrors.preco_unitario = 'Preço unitário não pode ser negativo';
    }

    // Validação de vencimento
    if (formData.vencimento) {
      const dataVencimento = new Date(formData.vencimento);
      const hoje = new Date();
      if (dataVencimento <= hoje) {
        newErrors.vencimento = 'Data de vencimento deve ser futura';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validarFormulario()) {
      return;
    }

    setLoading(true);

    try {
      const dataToSave = {
        ...formData,
        categoria: formData.categoria || undefined,
        estoque_minimo: formData.estoque_minimo || undefined,
        quantidade_estoque: formData.quantidade_estoque || undefined,
        custo_unitario: formData.custo_unitario || undefined,
        // Backend expects 'preco_venda'; we map UI 'preco_unitario' -> 'preco_venda'
        preco_venda: formData.preco_unitario || undefined,
        dosagem_padrao: formData.dosagem_padrao || undefined,
        vencimento: formData.vencimento || undefined,
        // Send local_armazenamento as FK ID
        local_armazenamento: localSelectedId || undefined,
      };

      // Remove UI-only fields that don't exist in backend model
      delete (dataToSave as any).preco_unitario;
      delete (dataToSave as any).data_validade;
      delete (dataToSave as any).observacoes;
      delete (dataToSave as any).concentracao;
      delete (dataToSave as any).fornecedor_nome;
      delete (dataToSave as any).lote;

      // Map UI 'status' to backend boolean 'ativo'
      (dataToSave as any).ativo = formData.status === 'ativo';
      delete (dataToSave as any).status;

      await onSave(dataToSave);
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      alert('Erro ao salvar produto. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // ---- Handlers para modo produto existente ----
  const handleProdutoSearch = (query: string) => {
    setProdutoSearchQuery(query);
    setProdutoSelecionado(null);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!query.trim()) {
      setProdutoSearchResults([]);
      return;
    }
    setProdutoSearchLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await produtosService.buscarSimples(query, 20);
        setProdutoSearchResults(results);
      } catch {
        setProdutoSearchResults([]);
      } finally {
        setProdutoSearchLoading(false);
      }
    }, 300);
  };

  const handleSubmitExistente = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!produtoSelecionado) newErrors.produto = 'Selecione um produto da lista';
    if (!entradaData.quantidade || entradaData.quantidade <= 0) newErrors.quantidade = 'Quantidade deve ser maior que zero';
    if (Object.keys(newErrors).length > 0) {
      setEntradaErrors(newErrors);
      return;
    }
    setLoading(true);
    try {
      await movimentacoesService.criar({
        produto: produtoSelecionado!.id,
        tipo: 'entrada',
        quantidade: entradaData.quantidade,
        valor_unitario: entradaData.custo_unitario || undefined,
        local_armazenamento: entradaData.local_armazenamento || undefined,
        documento_referencia: entradaData.documento_referencia || undefined,
        motivo: entradaData.motivo || 'compra',
        observacoes: entradaData.observacoes || undefined,
      } as any);
      onSave({} as any); // sinaliza sucesso para o pai refazer a busca
    } catch (error) {
      console.error('Erro ao registrar entrada:', error);
      alert('Erro ao registrar entrada de estoque. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const processedValue = type === 'number' ? (value === '' ? 0 : Number(value)) : value;

    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));

    // Limpar erro do campo quando usuário começa a digitar
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleCategoriaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoriaTag = e.target.value;
    // Reset unit to first allowed value for the new category to avoid validation errors
    const regrasNovas = validacaoPorCategoria[categoriaTag as keyof typeof validacaoPorCategoria];
    const primeiraUnidade = regrasNovas?.unidades_permitidas?.[0] ?? 'kg';
    setFormData(prev => ({
      ...prev,
      categoria: categoriaTag,
      unidade: primeiraUnidade
    }));

    // Limpar erros relacionados à categoria
    setErrors(prev => ({
      ...prev,
      categoria: '',
      principio_ativo: '',
      vencimento: '',
      dosagem_padrao: '',
      unidade: ''
    }));
  };

  const regras = getRegrasCategoria();

  // ==== Modo: produto já existente – renderiza formulário de entrada ====
  if (produtoExistente && !produto) {
    return (
      <div className="row g-2 g-md-3">
        {/* Toggle de volta para novo produto */}
        <div className="col-12 mb-1">
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="produtoExistenteToggle"
              checked={produtoExistente}
              onChange={e => {
                setProdutoExistente(e.target.checked);
                if (!e.target.checked) {
                  setProdutoSelecionado(null);
                  setProdutoSearchQuery('');
                  setProdutoSearchResults([]);
                }
              }}
            />
            <label className="form-check-label fw-medium" htmlFor="produtoExistenteToggle">
              Produto já cadastrado? (registrar entrada de estoque)
            </label>
          </div>
          <small className="text-muted">Busque o produto existente e informe a quantidade recebida.</small>
        </div>

        {/* Campo de pesquisa do produto */}
        <div className="col-12 position-relative">
          <label className="form-label">
            <i className="bi bi-search me-2"></i>
            Pesquisar Produto *
          </label>
          <input
            type="text"
            className={`form-control ${entradaErrors.produto ? 'is-invalid' : ''}`}
            placeholder="Digite nome, código ou princípio ativo..."
            value={produtoSelecionado ? produtoSelecionado.nome : produtoSearchQuery}
            onChange={e => handleProdutoSearch(e.target.value)}
            autoComplete="off"
          />
          {produtoSearchLoading && (
            <small className="text-muted ms-1"><i className="bi bi-hourglass-split me-1"></i>Buscando...</small>
          )}
          {produtoSearchResults.length > 0 && !produtoSelecionado && (
            <ul className="list-group shadow position-absolute w-100 z-3" style={{ top: '100%', maxHeight: 240, overflowY: 'auto' }}>
              {produtoSearchResults.map(p => (
                <li
                  key={p.id}
                  className="list-group-item list-group-item-action py-2"
                  style={{ cursor: 'pointer' }}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => {
                    setProdutoSelecionado(p);
                    setProdutoSearchQuery('');
                    setProdutoSearchResults([]);
                    // Pré-preencher custo unitário com o valor do produto
                    setEntradaData(prev => ({ ...prev, custo_unitario: p.custo_unitario || 0 }));
                  }}
                >
                  <div className="fw-semibold">{p.nome}</div>
                  <small className="text-muted">
                    Código: {p.codigo} &nbsp;|&nbsp; Unidade: {p.unidade} &nbsp;|&nbsp;
                    Estoque atual: <span className="fw-medium">{p.quantidade_estoque ?? 0}</span>
                  </small>
                </li>
              ))}
            </ul>
          )}
          {entradaErrors.produto && <div className="text-danger small mt-1">{entradaErrors.produto}</div>}
        </div>

        {/* Informação do produto selecionado */}
        {produtoSelecionado && (
          <div className="col-12">
            <div className="alert alert-info py-2 d-flex align-items-center justify-content-between">
              <div>
                <strong><i className="bi bi-check-circle me-2"></i>{produtoSelecionado.nome}</strong>
                <div className="small text-muted mt-1">
                  Código: {produtoSelecionado.codigo} &nbsp;|&nbsp;
                  Categoria: {produtoSelecionado.categoria} &nbsp;|&nbsp;
                  Estoque atual: <strong>{produtoSelecionado.quantidade_estoque ?? 0} {produtoSelecionado.unidade}</strong>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => { setProdutoSelecionado(null); setProdutoSearchQuery(''); }}
              >
                <i className="bi bi-x"></i>
              </button>
            </div>
          </div>
        )}

        {/* Campos de entrada (visíveis após selecionar produto) */}
        {produtoSelecionado && (
          <>
            <div className="col-12 col-md-6">
              <label className="form-label">
                <i className="bi bi-plus-circle me-2"></i>
                Quantidade de Entrada *
              </label>
              <input
                type="number"
                className={`form-control ${entradaErrors.quantidade ? 'is-invalid' : ''}`}
                min="0.001"
                step="0.001"
                placeholder={`Ex: 50 ${produtoSelecionado.unidade}`}
                value={entradaData.quantidade || ''}
                onChange={e => setEntradaData(prev => ({ ...prev, quantidade: Number(e.target.value) }))}
              />
              {entradaErrors.quantidade && <div className="invalid-feedback">{entradaErrors.quantidade}</div>}
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label">
                <i className="bi bi-currency-dollar me-2"></i>
                Custo Unitário (R$)
              </label>
              <input
                type="number"
                className="form-control"
                min="0"
                step="0.01"
                placeholder="Ex: 65.00"
                value={entradaData.custo_unitario || ''}
                onChange={e => setEntradaData(prev => ({ ...prev, custo_unitario: Number(e.target.value) }))}
              />
              <small className="text-muted">Custo desta compra/lote</small>
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label">
                <i className="bi bi-geo-alt me-2"></i>
                Local de Armazenagem
              </label>
              <select
                className="form-control"
                value={entradaData.local_armazenamento ?? ''}
                onChange={e => setEntradaData(prev => ({ ...prev, local_armazenamento: e.target.value ? Number(e.target.value) : null }))}
              >
                <option value="">— Selecionar local —</option>
                {locais.map(l => (
                  <option key={l.id} value={l.id}>{l.nome}</option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label">
                <i className="bi bi-file-text me-2"></i>
                Documento de Referência
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: NF 1234, Compra 05/2026"
                value={entradaData.documento_referencia}
                onChange={e => setEntradaData(prev => ({ ...prev, documento_referencia: e.target.value }))}
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label">Motivo</label>
              <select
                className="form-control"
                value={entradaData.motivo}
                onChange={e => setEntradaData(prev => ({ ...prev, motivo: e.target.value }))}
              >
                <option value="compra">Compra</option>
                <option value="devolucao">Devolução</option>
                <option value="ajuste">Ajuste de Estoque</option>
                <option value="transferencia">Transferência</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label">Observações</label>
              <input
                type="text"
                className="form-control"
                placeholder="Opcional..."
                value={entradaData.observacoes}
                onChange={e => setEntradaData(prev => ({ ...prev, observacoes: e.target.value }))}
              />
            </div>
          </>
        )}

        {/* Botões */}
        <div className="col-12">
          <div className="d-flex gap-2 justify-content-end mt-2">
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>
              <i className="bi bi-x-circle me-2"></i>Cancelar
            </button>
            <button
              type="button"
              className="btn btn-success"
              disabled={loading || !produtoSelecionado}
              onClick={handleSubmitExistente as any}
            >
              <i className="bi bi-box-arrow-in-down me-2"></i>
              {loading ? 'Registrando...' : 'Registrar Entrada'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==== Modo normal: novo produto ====
  return (
    <form onSubmit={handleSubmit} className="row g-2 g-md-3">
      {/* Toggle: habilitar pesquisa de produto existente */}
      {!produto && (
        <div className="col-12 mb-1">
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="produtoExistenteToggle"
              checked={produtoExistente}
              onChange={e => setProdutoExistente(e.target.checked)}
            />
            <label className="form-check-label fw-medium" htmlFor="produtoExistenteToggle">
              Produto já cadastrado? (registrar entrada de estoque)
            </label>
          </div>
          <small className="text-muted">Ative para buscar um produto existente e dar entrada na quantidade.</small>
        </div>
      )}

      {/* Código e Nome */}
      <div className="col-12 col-md-6">
        <label htmlFor="codigo" className="form-label">
          <i className="bi bi-upc me-2"></i>
          Código * <small className="text-muted">(único)</small>
        </label>
        <input
          type="text"
          className={`form-control ${errors.codigo ? 'is-invalid' : ''}`}
          id="codigo"
          name="codigo"
          value={formData.codigo}
          onChange={handleChange}
          required
        />
        {errors.codigo && <div className="invalid-feedback">{errors.codigo}</div>}
      </div>

      <div className="col-12 col-md-6">
        <label htmlFor="nome" className="form-label">
          <i className="bi bi-box-seam me-2"></i>
          Nome *
        </label>
        <input
          type="text"
          className={`form-control ${errors.nome ? 'is-invalid' : ''}`}
          id="nome"
          name="nome"
          value={formData.nome}
          onChange={handleChange}
          required
        />
        {errors.nome && <div className="invalid-feedback">{errors.nome}</div>}
      </div>

      {/* Categoria */}
      <div className="col-12 col-md-6">
        <label htmlFor="categoria" className="form-label">Categoria</label>
        <select
          className={`form-select ${errors.categoria ? 'is-invalid' : ''}`}
          id="categoria"
          name="categoria"
          value={formData.categoria}
          onChange={handleCategoriaChange}
        >
          <option value="">Selecione uma categoria</option>
          {categorias.map(cat => (
            <option key={cat.id} value={cat.tag || String(cat.id)}>{cat.nome}</option>
          ))}
        </select>
        {errors.categoria && <div className="invalid-feedback">{errors.categoria}</div>}
      </div>

      {/* Status */}
      <div className="col-md-6">
        <label htmlFor="status" className="form-label">Status *</label>
        <select
          className="form-select"
          id="status"
          name="status"
          value={formData.status}
          onChange={handleChange}
          required
        >
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
          <option value="vencido">Vencido</option>
        </select>
      </div>

      {/* Composição Química (mantida para busca e conciliação) */}
      <div className="col-12">
        <label htmlFor="composicao_quimica" className="form-label">Composição Química</label>
        <textarea
          className="form-control"
          id="composicao_quimica"
          name="composicao_quimica"
          rows={2}
          value={formData.composicao_quimica}
          onChange={handleChange}
          placeholder="Descreva a composição química completa do produto"
        />
      </div>



      {/* Unidade de Medida */}
      <div className="col-12 col-md-6">
        <label htmlFor="unidade" className="form-label">
          <i className="bi bi-rulers me-2"></i>
          Unidade de Medida *
        </label>
        <select
          className={`form-select ${errors.unidade ? 'is-invalid' : ''}`}
          id="unidade"
          name="unidade"
          value={formData.unidade}
          onChange={handleChange}
          required
        >
          {regras.unidades_permitidas.map(unidade => (
            <option key={unidade} value={unidade}>
              {unidade === 'kg' ? 'Quilograma (kg)' :
               unidade === 'g' ? 'Grama (g)' :
               unidade === 'L' ? 'Litro (L)' :
               unidade === 'mL' ? 'Mililitro (mL)' :
               unidade === 'un' ? 'Unidade (un)' :
               unidade === 'saca_60kg' ? 'Saca (60kg)' :
               unidade === 'pct' ? 'Pacote (pct)' :
               unidade === 't' ? 'Tonelada (t)' :
               unidade === 'm3' ? 'Metro cúbico (m³)' :
               unidade === 'sc' ? 'Saco (sc)' : unidade}
            </option>
          ))}
        </select>
        {errors.unidade && <div className="invalid-feedback">{errors.unidade}</div>}
      </div>





      {/* Estoque Mínimo e Atual */}
      <div className="col-12 col-md-6">
        <label htmlFor="estoque_minimo" className="form-label">
          <i className="bi bi-dash-circle me-2"></i>
          Estoque Mínimo
        </label>
        <input
          type="number"
          className={`form-control ${errors.estoque_minimo ? 'is-invalid' : ''}`}
          id="estoque_minimo"
          name="estoque_minimo"
          value={formData.estoque_minimo}
          onChange={handleChange}
          min="0"
          step="0.01"
        />
        {errors.estoque_minimo && <div className="invalid-feedback">{errors.estoque_minimo}</div>}
      </div>

      <div className="col-12 col-md-6">
        <label htmlFor="quantidade_estoque" className="form-label">
          <i className="bi bi-box-arrow-in-down me-2"></i>
          Entrada de Produto
        </label>
        <input
          type="number"
          className={`form-control ${errors.quantidade_estoque ? 'is-invalid' : ''}`}
          id="quantidade_estoque"
          name="quantidade_estoque"
          value={formData.quantidade_estoque}
          onChange={handleChange}
          min="0"
          step="0.01"
        />
        {errors.quantidade_estoque && <div className="invalid-feedback">{errors.quantidade_estoque}</div>}
      </div>

      {/* Preços */}
      <div className="col-12 col-md-6">
        <label htmlFor="custo_unitario" className="form-label">
          <i className="bi bi-currency-dollar me-2"></i>
          Custo Unitário (R$)
        </label>
        <input
          type="number"
          className={`form-control ${errors.custo_unitario ? 'is-invalid' : ''}`}
          id="custo_unitario"
          name="custo_unitario"
          value={formData.custo_unitario}
          onChange={handleChange}
          min="0"
          step="0.01"
        />
        {errors.custo_unitario && <div className="invalid-feedback">{errors.custo_unitario}</div>}
      </div>

      <div className="col-12 col-md-6">
        <label htmlFor="preco_unitario" className="form-label">
          <i className="bi bi-tag me-2"></i>
          Preço Unitário (R$)
        </label>
        <input
          type="number"
          className={`form-control ${errors.preco_unitario ? 'is-invalid' : ''}`}
          id="preco_unitario"
          name="preco_unitario"
          value={formData.preco_unitario}
          onChange={handleChange}
          min="0"
          step="0.01"
        />
        {errors.preco_unitario && <div className="invalid-feedback">{errors.preco_unitario}</div>}
      </div>

      {/* Fornecedor */}
      <div className="col-12 col-md-6">
        <label htmlFor="fornecedor_nome" className="form-label">
          <i className="bi bi-shop me-2"></i>
          Fornecedor
        </label>
        <input
          type="text"
          className="form-control"
          id="fornecedor_nome"
          name="fornecedor_nome"
          value={formData.fornecedor_nome}
          onChange={handleChange}
        />
      </div>

      {/* Local de Armazenagem */}
      <div className="col-12 col-md-6">
        <label htmlFor="local_armazenamento" className="form-label">
          <i className="bi bi-geo-alt me-2"></i>
          Local de Armazenagem
        </label>
        {locais && locais.length > 0 ? (
          <>
            <select
              className={`form-select ${errors.local_armazenamento ? 'is-invalid' : ''}`}
              id="local_armazenamento"
              name="local_armazenamento"
              value={localSelectedId ?? ''}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : null;
                setLocalSelectedId(id);
                setFormData(prev => ({ ...prev, local_armazenamento: id }));

                // clear errors
                if (errors.local_armazenamento) setErrors(prev => ({ ...prev, local_armazenamento: '' }));
              }}
            >
              <option value="">Selecione um local</option>
              {locais.map(l => {
                const suggestedTypes = getSuggestedStorageType(String(formData.categoria));
                const isSuggested = suggestedTypes.includes(l.tipo);
                return (
                  <option key={l.id} value={l.id}>
                    {isSuggested && '⭐ '}{l.nome} {l.tipo ? `(${l.tipo})` : ''}
                  </option>
                );
              })}
              <option value="outro">Outro / Não listado</option>
            </select>
            {formData.categoria && getSuggestedStorageType(String(formData.categoria)).length > 0 && (
              <small className="text-muted">
                ⭐ = Locais sugeridos para esta categoria
              </small>
            )}
          </>
        ) : (
          <input
            type="text"
            className="form-control"
            id="local_armazenamento"
            name="local_armazenamento"
            value={formData.local_armazenamento || ''}
            onChange={handleChange}
            placeholder="Ex: Silos, Depósito A"
          />
        )}
        {errors.local_armazenamento && <div className="invalid-feedback">{errors.local_armazenamento}</div>}
      </div>

      {/* Princípio Ativo (mostrar quando necessário ou quando já existe) */}
      {(regras.requer_principio_ativo || formData.principio_ativo) && (
        <div className="col-12 col-md-6">
          <label htmlFor="principio_ativo" className="form-label">
            <i className="bi bi-capsule me-2"></i>
            Princípio Ativo {regras.requer_principio_ativo && '*'}
          </label>
          <input
            type="text"
            className={`form-control ${errors.principio_ativo ? 'is-invalid' : ''}`}
            id="principio_ativo"
            name="principio_ativo"
            value={formData.principio_ativo}
            onChange={handleChange}
            required={regras.requer_principio_ativo}
          />
          {errors.principio_ativo && <div className="invalid-feedback">{errors.principio_ativo}</div>}
        </div>
      )}

      {/* Data de Validade e Lote */}
      <div className="col-12 col-md-6">
        <label htmlFor="vencimento" className="form-label">
          <i className="bi bi-calendar-event me-2"></i>
          Vencimento {regras.requer_vencimento && '*'}
        </label>
        <input
          type="date"
          className={`form-control ${errors.vencimento ? 'is-invalid' : ''}`}
          id="vencimento"
          name="vencimento"
          value={formData.vencimento}
          onChange={handleChange}
          required={regras.requer_vencimento}
        />
        {errors.vencimento && <div className="invalid-feedback">{errors.vencimento}</div>}
      </div>



      {/* Botões */}
      <div className="col-12">
        <div className="d-flex gap-2 justify-content-end mt-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
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
            <i className="bi bi-save me-2"></i>
            {loading ? 'Salvando...' : (produto ? 'Atualizar' : 'Cadastrar')}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ProdutoForm;