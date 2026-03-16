import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import * as React from 'react';
const { useState, useEffect, useRef } = React;
import { locaisService, produtosService, movimentacoesService } from '../../services/produtos';
const ProdutoForm = ({ produto, onSave, onCancel }) => {
    // Função helper para padronizar unidades
    const padronizarUnidade = (unidade) => {
        const unidadeUpper = unidade?.toUpperCase() || '';
        if (unidadeUpper === 'LT')
            return 'L';
        if (unidadeUpper === 'TON')
            return 't';
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
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [categorias, setCategorias] = useState([]);
    const [locais, setLocais] = useState([]);
    // store selected local id
    const [localSelectedId, setLocalSelectedId] = useState(produto?.local_armazenamento || null);
    // ---- Modo: produto já existente (registrar entrada de estoque) ----
    const [produtoExistente, setProdutoExistente] = useState(false);
    const [produtoSelecionado, setProdutoSelecionado] = useState(null);
    const [produtoSearchQuery, setProdutoSearchQuery] = useState('');
    const [produtoSearchResults, setProdutoSearchResults] = useState([]);
    const [produtoSearchLoading, setProdutoSearchLoading] = useState(false);
    const searchTimerRef = useRef(null);
    const [entradaData, setEntradaData] = useState({
        quantidade: 0,
        custo_unitario: 0,
        local_armazenamento: null,
        documento_referencia: '',
        motivo: 'compra',
        observacoes: '',
    });
    const [entradaErrors, setEntradaErrors] = useState({});
    // Categorias com validações específicas
    const categoriasPadrao = [
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
            }
            catch (err) {
                console.error('Erro ao carregar locais de armazenagem', err);
            }
        };
        loadLocais();
    }, []);
    const getCategoriaNome = (key) => {
        const tag = String(key);
        const categoria = categorias.find(c => (c.tag && c.tag === tag) || String(c.id) === tag);
        return categoria?.nome || '';
    };
    // Helper function to suggest storage location based on product category
    const getSuggestedStorageType = (categoriaKey) => {
        const mapping = {
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
        return validacaoPorCategoria[categoriaKey] || {
            requer_principio_ativo: false,
            requer_vencimento: false,
            requer_dosagem: false,
            unidades_permitidas: ['kg', 'g', 'L', 'un'],
            campos_obrigatorios: ['codigo', 'nome', 'categoria', 'unidade', 'estoque_minimo']
        };
    };
    const validarFormulario = () => {
        const newErrors = {};
        const regras = getRegrasCategoria();
        // Campos obrigatórios (tratar zeros como valores válidos)
        regras.campos_obrigatorios.forEach(campo => {
            const val = formData[campo];
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
    const handleSubmit = async (e) => {
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
            delete dataToSave.preco_unitario;
            delete dataToSave.data_validade;
            delete dataToSave.observacoes;
            delete dataToSave.concentracao;
            delete dataToSave.fornecedor_nome;
            delete dataToSave.lote;
            // Map UI 'status' to backend boolean 'ativo'
            dataToSave.ativo = formData.status === 'ativo';
            delete dataToSave.status;
            await onSave(dataToSave);
        }
        catch (error) {
            console.error('Erro ao salvar produto:', error);
            alert('Erro ao salvar produto. Tente novamente.');
        }
        finally {
            setLoading(false);
        }
    };
    // ---- Handlers para modo produto existente ----
    const handleProdutoSearch = (query) => {
        setProdutoSearchQuery(query);
        setProdutoSelecionado(null);
        if (searchTimerRef.current)
            clearTimeout(searchTimerRef.current);
        if (!query.trim()) {
            setProdutoSearchResults([]);
            return;
        }
        setProdutoSearchLoading(true);
        searchTimerRef.current = setTimeout(async () => {
            try {
                const results = await produtosService.buscarSimples(query, 20);
                setProdutoSearchResults(results);
            }
            catch {
                setProdutoSearchResults([]);
            }
            finally {
                setProdutoSearchLoading(false);
            }
        }, 300);
    };
    const handleSubmitExistente = async (e) => {
        e.preventDefault();
        const newErrors = {};
        if (!produtoSelecionado)
            newErrors.produto = 'Selecione um produto da lista';
        if (!entradaData.quantidade || entradaData.quantidade <= 0)
            newErrors.quantidade = 'Quantidade deve ser maior que zero';
        if (Object.keys(newErrors).length > 0) {
            setEntradaErrors(newErrors);
            return;
        }
        setLoading(true);
        try {
            await movimentacoesService.criar({
                produto: produtoSelecionado.id,
                tipo: 'entrada',
                quantidade: entradaData.quantidade,
                valor_unitario: entradaData.custo_unitario || undefined,
                local_armazenamento: entradaData.local_armazenamento || undefined,
                documento_referencia: entradaData.documento_referencia || undefined,
                motivo: entradaData.motivo || 'compra',
                observacoes: entradaData.observacoes || undefined,
            });
            onSave({}); // sinaliza sucesso para o pai refazer a busca
        }
        catch (error) {
            console.error('Erro ao registrar entrada:', error);
            alert('Erro ao registrar entrada de estoque. Tente novamente.');
        }
        finally {
            setLoading(false);
        }
    };
    const handleChange = (e) => {
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
    const handleCategoriaChange = (e) => {
        const categoriaTag = e.target.value;
        // Reset unit to first allowed value for the new category to avoid validation errors
        const regrasNovas = validacaoPorCategoria[categoriaTag];
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
        return (_jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12 mb-1", children: [_jsxs("div", { className: "form-check form-switch", children: [_jsx("input", { className: "form-check-input", type: "checkbox", id: "produtoExistenteToggle", checked: produtoExistente, onChange: e => {
                                        setProdutoExistente(e.target.checked);
                                        if (!e.target.checked) {
                                            setProdutoSelecionado(null);
                                            setProdutoSearchQuery('');
                                            setProdutoSearchResults([]);
                                        }
                                    } }), _jsx("label", { className: "form-check-label fw-medium", htmlFor: "produtoExistenteToggle", children: "Produto j\u00E1 cadastrado? (registrar entrada de estoque)" })] }), _jsx("small", { className: "text-muted", children: "Busque o produto existente e informe a quantidade recebida." })] }), _jsxs("div", { className: "col-12 position-relative", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-search me-2" }), "Pesquisar Produto *"] }), _jsx("input", { type: "text", className: `form-control ${entradaErrors.produto ? 'is-invalid' : ''}`, placeholder: "Digite nome, c\u00F3digo ou princ\u00EDpio ativo...", value: produtoSelecionado ? produtoSelecionado.nome : produtoSearchQuery, onChange: e => handleProdutoSearch(e.target.value), autoComplete: "off" }), produtoSearchLoading && (_jsxs("small", { className: "text-muted ms-1", children: [_jsx("i", { className: "bi bi-hourglass-split me-1" }), "Buscando..."] })), produtoSearchResults.length > 0 && !produtoSelecionado && (_jsx("ul", { className: "list-group shadow position-absolute w-100 z-3", style: { top: '100%', maxHeight: 240, overflowY: 'auto' }, children: produtoSearchResults.map(p => (_jsxs("li", { className: "list-group-item list-group-item-action py-2", style: { cursor: 'pointer' }, onMouseDown: e => e.preventDefault(), onClick: () => {
                                    setProdutoSelecionado(p);
                                    setProdutoSearchQuery('');
                                    setProdutoSearchResults([]);
                                    // Pré-preencher custo unitário com o valor do produto
                                    setEntradaData(prev => ({ ...prev, custo_unitario: p.custo_unitario || 0 }));
                                }, children: [_jsx("div", { className: "fw-semibold", children: p.nome }), _jsxs("small", { className: "text-muted", children: ["C\u00F3digo: ", p.codigo, " \u00A0|\u00A0 Unidade: ", p.unidade, " \u00A0|\u00A0 Estoque atual: ", _jsx("span", { className: "fw-medium", children: p.quantidade_estoque ?? 0 })] })] }, p.id))) })), entradaErrors.produto && _jsx("div", { className: "text-danger small mt-1", children: entradaErrors.produto })] }), produtoSelecionado && (_jsx("div", { className: "col-12", children: _jsxs("div", { className: "alert alert-info py-2 d-flex align-items-center justify-content-between", children: [_jsxs("div", { children: [_jsxs("strong", { children: [_jsx("i", { className: "bi bi-check-circle me-2" }), produtoSelecionado.nome] }), _jsxs("div", { className: "small text-muted mt-1", children: ["C\u00F3digo: ", produtoSelecionado.codigo, " \u00A0|\u00A0 Categoria: ", produtoSelecionado.categoria, " \u00A0|\u00A0 Estoque atual: ", _jsxs("strong", { children: [produtoSelecionado.quantidade_estoque ?? 0, " ", produtoSelecionado.unidade] })] })] }), _jsx("button", { type: "button", className: "btn btn-sm btn-outline-secondary", onClick: () => { setProdutoSelecionado(null); setProdutoSearchQuery(''); }, children: _jsx("i", { className: "bi bi-x" }) })] }) })), produtoSelecionado && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-plus-circle me-2" }), "Quantidade de Entrada *"] }), _jsx("input", { type: "number", className: `form-control ${entradaErrors.quantidade ? 'is-invalid' : ''}`, min: "0.001", step: "0.001", placeholder: `Ex: 50 ${produtoSelecionado.unidade}`, value: entradaData.quantidade || '', onChange: e => setEntradaData(prev => ({ ...prev, quantidade: Number(e.target.value) })) }), entradaErrors.quantidade && _jsx("div", { className: "invalid-feedback", children: entradaErrors.quantidade })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-currency-dollar me-2" }), "Custo Unit\u00E1rio (R$)"] }), _jsx("input", { type: "number", className: "form-control", min: "0", step: "0.01", placeholder: "Ex: 65.00", value: entradaData.custo_unitario || '', onChange: e => setEntradaData(prev => ({ ...prev, custo_unitario: Number(e.target.value) })) }), _jsx("small", { className: "text-muted", children: "Custo desta compra/lote" })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-geo-alt me-2" }), "Local de Armazenagem"] }), _jsxs("select", { className: "form-control", value: entradaData.local_armazenamento ?? '', onChange: e => setEntradaData(prev => ({ ...prev, local_armazenamento: e.target.value ? Number(e.target.value) : null })), children: [_jsx("option", { value: "", children: "\u2014 Selecionar local \u2014" }), locais.map(l => (_jsx("option", { value: l.id, children: l.nome }, l.id)))] })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-file-text me-2" }), "Documento de Refer\u00EAncia"] }), _jsx("input", { type: "text", className: "form-control", placeholder: "Ex: NF 1234, Compra 05/2026", value: entradaData.documento_referencia, onChange: e => setEntradaData(prev => ({ ...prev, documento_referencia: e.target.value })) })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Motivo" }), _jsxs("select", { className: "form-control", value: entradaData.motivo, onChange: e => setEntradaData(prev => ({ ...prev, motivo: e.target.value })), children: [_jsx("option", { value: "compra", children: "Compra" }), _jsx("option", { value: "devolucao", children: "Devolu\u00E7\u00E3o" }), _jsx("option", { value: "ajuste", children: "Ajuste de Estoque" }), _jsx("option", { value: "transferencia", children: "Transfer\u00EAncia" }), _jsx("option", { value: "outro", children: "Outro" })] })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "form-label", children: "Observa\u00E7\u00F5es" }), _jsx("input", { type: "text", className: "form-control", placeholder: "Opcional...", value: entradaData.observacoes, onChange: e => setEntradaData(prev => ({ ...prev, observacoes: e.target.value })) })] })] })), _jsx("div", { className: "col-12", children: _jsxs("div", { className: "d-flex gap-2 justify-content-end mt-2", children: [_jsxs("button", { type: "button", className: "btn btn-secondary", onClick: onCancel, disabled: loading, children: [_jsx("i", { className: "bi bi-x-circle me-2" }), "Cancelar"] }), _jsxs("button", { type: "button", className: "btn btn-success", disabled: loading || !produtoSelecionado, onClick: handleSubmitExistente, children: [_jsx("i", { className: "bi bi-box-arrow-in-down me-2" }), loading ? 'Registrando...' : 'Registrar Entrada'] })] }) })] }));
    }
    // ==== Modo normal: novo produto ====
    return (_jsxs("form", { onSubmit: handleSubmit, className: "row g-2 g-md-3", children: [!produto && (_jsxs("div", { className: "col-12 mb-1", children: [_jsxs("div", { className: "form-check form-switch", children: [_jsx("input", { className: "form-check-input", type: "checkbox", id: "produtoExistenteToggle", checked: produtoExistente, onChange: e => setProdutoExistente(e.target.checked) }), _jsx("label", { className: "form-check-label fw-medium", htmlFor: "produtoExistenteToggle", children: "Produto j\u00E1 cadastrado? (registrar entrada de estoque)" })] }), _jsx("small", { className: "text-muted", children: "Ative para buscar um produto existente e dar entrada na quantidade." })] })), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "codigo", className: "form-label", children: [_jsx("i", { className: "bi bi-upc me-2" }), "C\u00F3digo * ", _jsx("small", { className: "text-muted", children: "(\u00FAnico)" })] }), _jsx("input", { type: "text", className: `form-control ${errors.codigo ? 'is-invalid' : ''}`, id: "codigo", name: "codigo", value: formData.codigo, onChange: handleChange, required: true }), errors.codigo && _jsx("div", { className: "invalid-feedback", children: errors.codigo })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "nome", className: "form-label", children: [_jsx("i", { className: "bi bi-box-seam me-2" }), "Nome *"] }), _jsx("input", { type: "text", className: `form-control ${errors.nome ? 'is-invalid' : ''}`, id: "nome", name: "nome", value: formData.nome, onChange: handleChange, required: true }), errors.nome && _jsx("div", { className: "invalid-feedback", children: errors.nome })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { htmlFor: "categoria", className: "form-label", children: "Categoria" }), _jsxs("select", { className: `form-select ${errors.categoria ? 'is-invalid' : ''}`, id: "categoria", name: "categoria", value: formData.categoria, onChange: handleCategoriaChange, children: [_jsx("option", { value: "", children: "Selecione uma categoria" }), categorias.map(cat => (_jsx("option", { value: cat.tag || String(cat.id), children: cat.nome }, cat.id)))] }), errors.categoria && _jsx("div", { className: "invalid-feedback", children: errors.categoria })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { htmlFor: "status", className: "form-label", children: "Status *" }), _jsxs("select", { className: "form-select", id: "status", name: "status", value: formData.status, onChange: handleChange, required: true, children: [_jsx("option", { value: "ativo", children: "Ativo" }), _jsx("option", { value: "inativo", children: "Inativo" }), _jsx("option", { value: "vencido", children: "Vencido" })] })] }), _jsxs("div", { className: "col-12", children: [_jsx("label", { htmlFor: "composicao_quimica", className: "form-label", children: "Composi\u00E7\u00E3o Qu\u00EDmica" }), _jsx("textarea", { className: "form-control", id: "composicao_quimica", name: "composicao_quimica", rows: 2, value: formData.composicao_quimica, onChange: handleChange, placeholder: "Descreva a composi\u00E7\u00E3o qu\u00EDmica completa do produto" })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "unidade", className: "form-label", children: [_jsx("i", { className: "bi bi-rulers me-2" }), "Unidade de Medida *"] }), _jsx("select", { className: `form-select ${errors.unidade ? 'is-invalid' : ''}`, id: "unidade", name: "unidade", value: formData.unidade, onChange: handleChange, required: true, children: regras.unidades_permitidas.map(unidade => (_jsx("option", { value: unidade, children: unidade === 'kg' ? 'Quilograma (kg)' :
                                unidade === 'g' ? 'Grama (g)' :
                                    unidade === 'L' ? 'Litro (L)' :
                                        unidade === 'mL' ? 'Mililitro (mL)' :
                                            unidade === 'un' ? 'Unidade (un)' :
                                                unidade === 'saca_60kg' ? 'Saca (60kg)' :
                                                    unidade === 'pct' ? 'Pacote (pct)' :
                                                        unidade === 't' ? 'Tonelada (t)' :
                                                            unidade === 'm3' ? 'Metro cúbico (m³)' :
                                                                unidade === 'sc' ? 'Saco (sc)' : unidade }, unidade))) }), errors.unidade && _jsx("div", { className: "invalid-feedback", children: errors.unidade })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "estoque_minimo", className: "form-label", children: [_jsx("i", { className: "bi bi-dash-circle me-2" }), "Estoque M\u00EDnimo"] }), _jsx("input", { type: "number", className: `form-control ${errors.estoque_minimo ? 'is-invalid' : ''}`, id: "estoque_minimo", name: "estoque_minimo", value: formData.estoque_minimo, onChange: handleChange, min: "0", step: "0.01" }), errors.estoque_minimo && _jsx("div", { className: "invalid-feedback", children: errors.estoque_minimo })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "quantidade_estoque", className: "form-label", children: [_jsx("i", { className: "bi bi-box-arrow-in-down me-2" }), "Entrada de Produto"] }), _jsx("input", { type: "number", className: `form-control ${errors.quantidade_estoque ? 'is-invalid' : ''}`, id: "quantidade_estoque", name: "quantidade_estoque", value: formData.quantidade_estoque, onChange: handleChange, min: "0", step: "0.01" }), errors.quantidade_estoque && _jsx("div", { className: "invalid-feedback", children: errors.quantidade_estoque })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "custo_unitario", className: "form-label", children: [_jsx("i", { className: "bi bi-currency-dollar me-2" }), "Custo Unit\u00E1rio (R$)"] }), _jsx("input", { type: "number", className: `form-control ${errors.custo_unitario ? 'is-invalid' : ''}`, id: "custo_unitario", name: "custo_unitario", value: formData.custo_unitario, onChange: handleChange, min: "0", step: "0.01" }), errors.custo_unitario && _jsx("div", { className: "invalid-feedback", children: errors.custo_unitario })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "preco_unitario", className: "form-label", children: [_jsx("i", { className: "bi bi-tag me-2" }), "Pre\u00E7o Unit\u00E1rio (R$)"] }), _jsx("input", { type: "number", className: `form-control ${errors.preco_unitario ? 'is-invalid' : ''}`, id: "preco_unitario", name: "preco_unitario", value: formData.preco_unitario, onChange: handleChange, min: "0", step: "0.01" }), errors.preco_unitario && _jsx("div", { className: "invalid-feedback", children: errors.preco_unitario })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "fornecedor_nome", className: "form-label", children: [_jsx("i", { className: "bi bi-shop me-2" }), "Fornecedor"] }), _jsx("input", { type: "text", className: "form-control", id: "fornecedor_nome", name: "fornecedor_nome", value: formData.fornecedor_nome, onChange: handleChange })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "local_armazenamento", className: "form-label", children: [_jsx("i", { className: "bi bi-geo-alt me-2" }), "Local de Armazenagem"] }), locais && locais.length > 0 ? (_jsxs(_Fragment, { children: [_jsxs("select", { className: `form-select ${errors.local_armazenamento ? 'is-invalid' : ''}`, id: "local_armazenamento", name: "local_armazenamento", value: localSelectedId ?? '', onChange: (e) => {
                                    const id = e.target.value ? Number(e.target.value) : null;
                                    setLocalSelectedId(id);
                                    setFormData(prev => ({ ...prev, local_armazenamento: id }));
                                    // clear errors
                                    if (errors.local_armazenamento)
                                        setErrors(prev => ({ ...prev, local_armazenamento: '' }));
                                }, children: [_jsx("option", { value: "", children: "Selecione um local" }), locais.map(l => {
                                        const suggestedTypes = getSuggestedStorageType(String(formData.categoria));
                                        const isSuggested = suggestedTypes.includes(l.tipo);
                                        return (_jsxs("option", { value: l.id, children: [isSuggested && '⭐ ', l.nome, " ", l.tipo ? `(${l.tipo})` : ''] }, l.id));
                                    }), _jsx("option", { value: "outro", children: "Outro / N\u00E3o listado" })] }), formData.categoria && getSuggestedStorageType(String(formData.categoria)).length > 0 && (_jsx("small", { className: "text-muted", children: "\u2B50 = Locais sugeridos para esta categoria" }))] })) : (_jsx("input", { type: "text", className: "form-control", id: "local_armazenamento", name: "local_armazenamento", value: formData.local_armazenamento || '', onChange: handleChange, placeholder: "Ex: Silos, Dep\u00F3sito A" })), errors.local_armazenamento && _jsx("div", { className: "invalid-feedback", children: errors.local_armazenamento })] }), (regras.requer_principio_ativo || formData.principio_ativo) && (_jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "principio_ativo", className: "form-label", children: [_jsx("i", { className: "bi bi-capsule me-2" }), "Princ\u00EDpio Ativo ", regras.requer_principio_ativo && '*'] }), _jsx("input", { type: "text", className: `form-control ${errors.principio_ativo ? 'is-invalid' : ''}`, id: "principio_ativo", name: "principio_ativo", value: formData.principio_ativo, onChange: handleChange, required: regras.requer_principio_ativo }), errors.principio_ativo && _jsx("div", { className: "invalid-feedback", children: errors.principio_ativo })] })), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "vencimento", className: "form-label", children: [_jsx("i", { className: "bi bi-calendar-event me-2" }), "Vencimento ", regras.requer_vencimento && '*'] }), _jsx("input", { type: "date", className: `form-control ${errors.vencimento ? 'is-invalid' : ''}`, id: "vencimento", name: "vencimento", value: formData.vencimento, onChange: handleChange, required: regras.requer_vencimento }), errors.vencimento && _jsx("div", { className: "invalid-feedback", children: errors.vencimento })] }), _jsx("div", { className: "col-12", children: _jsxs("div", { className: "d-flex gap-2 justify-content-end mt-2", children: [_jsxs("button", { type: "button", className: "btn btn-secondary", onClick: onCancel, disabled: loading, children: [_jsx("i", { className: "bi bi-x-circle me-2" }), "Cancelar"] }), _jsxs("button", { type: "submit", className: "btn btn-primary", disabled: loading, children: [_jsx("i", { className: "bi bi-save me-2" }), loading ? 'Salvando...' : (produto ? 'Atualizar' : 'Cadastrar')] })] }) })] }));
};
export default ProdutoForm;
