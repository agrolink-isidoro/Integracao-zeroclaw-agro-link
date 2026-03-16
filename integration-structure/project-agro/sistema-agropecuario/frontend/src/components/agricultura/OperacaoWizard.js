import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import operacoesService from '../../services/operacoes';
import api from '../../services/api';
import { SeedCalculator } from './SeedCalculator';
// ha/h productivity reference by operation category
const HA_POR_HORA = {
    preparacao: 4,
    adubacao: 5,
    plantio: 2,
    tratos: 5,
    pulverizacao: 12,
    mecanicas: 3,
};
const STEPS = [
    { id: 1, title: 'Categoria', description: 'Selecione o tipo de operação' },
    { id: 2, title: 'Detalhes', description: 'Informações da operação' },
    { id: 3, title: 'Localização', description: 'Fazenda e talhões' },
    { id: 4, title: 'Recursos', description: 'Equipamentos e produtos' },
];
export const OperacaoWizard = ({ onSuccess }) => {
    const navigate = useNavigate();
    const { id } = useParams();
    const operacaoId = id ? parseInt(id) : null;
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [categorias] = useState(operacoesService.getCategorias() || []);
    const [tipos, setTipos] = useState([]);
    const [talhoes, setTalhoes] = useState([]);
    const [talhoesFiltrados, setTalhoesFiltrados] = useState([]);
    const [safras, setSafras] = useState([]);
    const [equipamentos, setEquipamentos] = useState([]);
    const [equipamentosError, setEquipamentosError] = useState(null);
    const [productQuery, setProductQuery] = useState('');
    const [productSearchLoading, setProductSearchLoading] = useState(false);
    const [productResults, setProductResults] = useState([]);
    const searchTimeout = useRef(null);
    const [estimate, setEstimate] = useState(null);
    const [funcionarios, setFuncionarios] = useState([]);
    const [selectedFuncionarioId, setSelectedFuncionarioId] = useState(null);
    const [horasEstimadas, setHorasEstimadas] = useState(null);
    // Form data
    const [formData, setFormData] = useState({
        categoria: '',
        tipo: '',
        talhoes: [],
        status: 'planejada',
        data_operacao: new Date().toISOString().split('T')[0],
        data_inicio: new Date().toISOString(),
        produtos_input: [],
    });
    // Área total selecionada (somatório dos talhões escolhidos)
    const areaTotalSelected = useMemo(() => {
        const selectedIds = (formData.talhoes || []);
        if (!selectedIds || selectedIds.length === 0) {
            console.log('⚠️ Nenhum talhão selecionado');
            return 0;
        }
        console.log('🔍 Calculando área total:', {
            selectedIds,
            totalTalhoes: talhoes.length,
            talhoes: talhoes.map(t => ({ id: t.id, name: t.name, area_hectares: t.area_hectares, area_size: t.area_size }))
        });
        const total = selectedIds.reduce((sum, id) => {
            const t = talhoes.find(tt => tt.id === id);
            const area = t?.area_hectares || t?.area_size || 0;
            console.log(`  Talhão ${id}: ${t?.name || 'não encontrado'} = ${area} ha`);
            return sum + area;
        }, 0);
        console.log('✅ Área total calculada:', total, 'ha');
        return total;
    }, [formData.talhoes, talhoes]);
    // Recalcula valores derivados de produtos quando a área selecionada mudar
    useEffect(() => {
        const current = (formData.produtos_input || []);
        const updated = current.map((p) => {
            const prod = { ...(p || {}) };
            if (prod.dosagem !== undefined) {
                if (prod.quantidade_total === undefined || prod.quantidade_total === null) {
                    prod.quantidade_total = areaTotalSelected ? Number((Number(prod.dosagem) * Number(areaTotalSelected)).toFixed(3)) : undefined;
                }
                else if (areaTotalSelected) {
                    prod.dosagem = Number((Number(prod.quantidade_total) / Number(areaTotalSelected)).toFixed(3));
                }
            }
            else if (prod.quantidade_total !== undefined && areaTotalSelected) {
                prod.dosagem = Number((Number(prod.quantidade_total) / Number(areaTotalSelected)).toFixed(3));
            }
            return prod;
        });
        updateFormData('produtos_input', updated);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [areaTotalSelected]);
    // Carregar operação existente se estiver editando
    useEffect(() => {
        if (operacaoId) {
            setLoading(true);
            operacoesService.buscar(operacaoId)
                .then(operacao => {
                console.log('Operação carregada para edição:', operacao);
                setFormData({
                    categoria: operacao.categoria,
                    tipo: operacao.tipo,
                    plantio: operacao.plantio,
                    fazenda: operacao.fazenda,
                    talhoes: operacao.talhoes,
                    trator: operacao.trator,
                    implemento: operacao.implemento,
                    data_operacao: operacao.data_operacao,
                    data_inicio: operacao.data_inicio,
                    data_fim: operacao.data_fim,
                    status: operacao.status,
                    observacoes: operacao.observacoes,
                    custo_mao_obra: operacao.custo_mao_obra,
                    custo_maquina: operacao.custo_maquina,
                    custo_insumos: operacao.custo_insumos,
                    produtos_input: operacao.produtos_input,
                    dados_especificos: operacao.dados_especificos,
                });
            })
                .catch(err => {
                console.error('Erro ao carregar operação:', err);
                alert('Erro ao carregar operação para edição');
                navigate('/agricultura/operacoes');
            })
                .finally(() => setLoading(false));
        }
    }, [operacaoId, navigate]);
    // Carregar dados iniciais
    useEffect(() => {
        // Carregar talhões
        api.get('/talhoes/')
            .then(res => setTalhoes(res.data?.results || res.data || []))
            .catch(err => console.error('Erro ao carregar talhões:', err));
        // Carregar safras/plantios
        api.get('/agricultura/plantios/')
            .then(res => setSafras(res.data?.results || res.data || []))
            .catch(err => console.error('Erro ao carregar safras:', err));
        // Carregar equipamentos (máquinas e implementos)
        api.get('/maquinas/equipamentos/')
            .then(res => {
            setEquipamentos(res.data?.results || res.data || []);
            setEquipamentosError(null);
        })
            .catch(err => {
            console.error('Erro ao carregar equipamentos:', err);
            if (err?.response?.status === 401) {
                setEquipamentosError('Acesso não autorizado — faça login para ver equipamentos');
                setEquipamentos([]);
            }
            else {
                setEquipamentosError('Erro ao carregar equipamentos');
                setEquipamentos([]);
            }
        });
    }, []);
    // Carregar funcionários ativos para seleção de responsável
    useEffect(() => {
        api.get('/administrativo/funcionarios/?ativo=true')
            .then(res => setFuncionarios(res.data?.results || res.data || []))
            .catch(err => console.error('Erro ao carregar funcionários:', err));
    }, []);
    // Auto-calcular custo_mao_obra ao mudar responsável, área ou categoria
    useEffect(() => {
        const func = funcionarios.find(f => f.id === selectedFuncionarioId);
        if (!func || !areaTotalSelected)
            return;
        const hasPorHora = HA_POR_HORA[formData.categoria || ''] ?? 4;
        const horas = areaTotalSelected / hasPorHora;
        setHorasEstimadas(Math.round(horas * 10) / 10);
        let valorDia = 0;
        if (func.tipo === 'temporario' && func.diaria_valor) {
            valorDia = parseFloat(func.diaria_valor);
        }
        else if (func.salario_bruto) {
            valorDia = parseFloat(func.salario_bruto) / 22; // CLT: 22 dias úteis
        }
        if (valorDia > 0) {
            const custoProporcional = parseFloat(((horas / 8) * valorDia).toFixed(2));
            updateFormData('custo_mao_obra', custoProporcional);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedFuncionarioId, areaTotalSelected, formData.categoria, funcionarios]);
    // Carregar tipos quando categoria mudar
    useEffect(() => {
        if (formData.categoria) {
            operacoesService.tiposPorCategoria(formData.categoria)
                .then(response => setTipos(response?.tipos || []))
                .catch(err => {
                console.error('Erro ao carregar tipos:', err);
                setTipos([]);
            });
        }
        else {
            setTipos([]);
        }
    }, [formData.categoria]);
    // Atualizar talhões filtrados quando talhões mudar
    useEffect(() => {
        setTalhoesFiltrados(talhoes);
    }, [talhoes]);
    // Debounced product search
    useEffect(() => {
        if (!productQuery || productQuery.trim() === '') {
            setProductResults([]);
            setProductSearchLoading(false);
            return;
        }
        setProductSearchLoading(true);
        if (searchTimeout.current)
            window.clearTimeout(searchTimeout.current);
        searchTimeout.current = window.setTimeout(() => {
            console.log('🔍 Buscando produtos com:', productQuery);
            api.get(`/estoque/produtos/`, { params: { search: productQuery } })
                .then(res => {
                const results = res.data?.results || res.data || [];
                console.log('✅ Produtos encontrados:', results.length, results);
                setProductResults(results);
            })
                .catch(err => {
                console.error('❌ Erro buscando produtos:', err);
                setProductResults([]);
            })
                .finally(() => {
                setProductSearchLoading(false);
            });
        }, 300);
        return () => {
            if (searchTimeout.current)
                window.clearTimeout(searchTimeout.current);
        };
    }, [productQuery]);
    // Selecionar automaticamente talhões quando safra for selecionada
    useEffect(() => {
        if (formData.plantio && safras && safras.length > 0) {
            const safraSelec = safras.find(s => s.id === formData.plantio);
            if (safraSelec && safraSelec.talhoes && Array.isArray(safraSelec.talhoes) && safraSelec.talhoes.length > 0) {
                // Selecionar automaticamente os talhões da safra
                setFormData(prev => ({
                    ...prev,
                    talhoes: safraSelec.talhoes
                }));
            }
        }
        else if (!formData.plantio) {
            // Limpar talhões quando safra for desmarcada
            setFormData(prev => ({
                ...prev,
                talhoes: []
            }));
        }
    }, [formData.plantio, safras]);
    const handleNext = () => {
        if (currentStep < STEPS.length) {
            setCurrentStep(currentStep + 1);
        }
    };
    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };
    const handleSubmit = async () => {
        setLoading(true);
        try {
            console.log('Dados sendo enviados:', formData);
            let operacao;
            if (operacaoId) {
                // Modo edição: atualizar operação existente
                operacao = await operacoesService.atualizar(operacaoId, formData);
                alert(`Operação #${operacao.id} atualizada com sucesso!`);
            }
            else {
                // Modo criação: criar nova operação
                operacao = await operacoesService.criar(formData);
                alert(`Operação #${operacao.id} criada com sucesso!`);
            }
            if (onSuccess) {
                // notify parent to close the embedded wizard and refresh list
                onSuccess();
                // ensure navigation to the list to avoid the wizard staying open due to UI timing
                setTimeout(() => navigate('/agricultura/operacoes'), 50);
            }
            else {
                navigate('/agricultura/operacoes');
            }
        }
        catch (err) {
            const extractDetail = (e) => {
                if (!e || typeof e !== 'object')
                    return String(e);
                const ae = e;
                // Prefer standard DRF 'detail' field
                if (ae.response && typeof ae.response.data === 'object' && ae.response.data !== null) {
                    const resp = ae.response.data;
                    if ('detail' in resp) {
                        const d = resp['detail'];
                        return typeof d === 'string' ? d : JSON.stringify(d);
                    }
                    // Handle structured estoque error returned as { produtos_operacao: { produto: id, mensagem: '...' } }
                    if ('produtos_operacao' in resp) {
                        const po = resp['produtos_operacao'];
                        if (po && typeof po === 'object') {
                            if ('mensagem' in po)
                                return String(po['mensagem']);
                            if ('message' in po)
                                return String(po['message']);
                            // Fallback to stringify structured payload
                            return JSON.stringify(po);
                        }
                        // If it's a list or string, stringify
                        return JSON.stringify(po);
                    }
                }
                return JSON.stringify(ae.response?.data) || ae.message || 'Erro desconhecido';
            };
            const detail = extractDetail(err);
            const ae2 = err;
            console.error('Erro completo:', ae2.response?.data);
            const acao = operacaoId ? 'atualizar' : 'criar';
            alert(`Erro ao ${acao} operação: ` + detail);
        }
        finally {
            setLoading(false);
        }
    };
    const updateFormData = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (_jsxs("div", { className: "mb-3", children: [_jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Categoria da Opera\u00E7\u00E3o *" }), _jsxs("select", { className: "form-select", value: formData.categoria, onChange: (e) => updateFormData('categoria', e.target.value), required: true, children: [_jsx("option", { value: "", children: "Selecione..." }), categorias?.map(cat => (_jsx("option", { value: cat.value, children: cat.label }, cat.value)))] })] }), formData.categoria && (_jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Tipo de Opera\u00E7\u00E3o *" }), _jsxs("select", { className: "form-select", value: formData.tipo, onChange: (e) => updateFormData('tipo', e.target.value), required: true, children: [_jsx("option", { value: "", children: "Selecione..." }), tipos?.map(tipo => (_jsx("option", { value: tipo.value, children: tipo.label }, tipo.value))), tipos?.length === 0 && (_jsx("option", { value: "outra", children: "Outra Opera\u00E7\u00E3o" })), tipos?.length > 0 && (_jsx("option", { value: "outra", children: "Outra (n\u00E3o listada)" }))] })] }))] }));
            case 2:
                return (_jsxs("div", { className: "mb-3", children: [_jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Data de In\u00EDcio *" }), _jsx("input", { type: "datetime-local", className: "form-control", value: formData.data_inicio || '', onChange: (e) => updateFormData('data_inicio', e.target.value), required: true })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Data de T\u00E9rmino (opcional)" }), _jsx("input", { type: "datetime-local", className: "form-control", value: formData.data_fim || '', onChange: (e) => updateFormData('data_fim', e.target.value) })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Status" }), _jsx("select", { className: "form-select", value: formData.status, onChange: (e) => updateFormData('status', e.target.value), children: operacoesService.getStatusOptions().map(status => (_jsx("option", { value: status.value, children: status.label }, status.value))) })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Observa\u00E7\u00F5es" }), _jsx("textarea", { className: "form-control", rows: 3, value: formData.observacoes || '', onChange: (e) => updateFormData('observacoes', e.target.value), placeholder: "Detalhes adicionais sobre a opera\u00E7\u00E3o..." })] })] }));
            case 3:
                return (_jsxs("div", { className: "mb-3", children: [_jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Safra/Plantio (opcional)" }), _jsxs("select", { className: "form-select", value: formData.plantio || '', onChange: (e) => updateFormData('plantio', e.target.value ? parseInt(e.target.value) : undefined), children: [_jsx("option", { value: "", children: "Nenhuma safra espec\u00EDfica" }), safras?.map(safra => (_jsxs("option", { value: safra.id, children: [safra.cultura_nome || 'Safra', " - ", new Date(safra.data_plantio).toLocaleDateString()] }, safra.id)))] })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Talh\u00F5es * (Selecione um ou mais)" }), _jsx("div", { className: "border border-gray-300 rounded-lg overflow-hidden", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase", children: _jsx("input", { type: "checkbox", checked: formData.talhoes?.length === talhoesFiltrados?.length && talhoesFiltrados?.length > 0, onChange: (e) => {
                                                                    if (e.target.checked) {
                                                                        updateFormData('talhoes', talhoesFiltrados?.map(t => t.id) || []);
                                                                    }
                                                                    else {
                                                                        updateFormData('talhoes', []);
                                                                    }
                                                                }, className: "rounded border-gray-300 text-green-600 focus:ring-green-500" }) }), _jsx("th", { className: "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase", children: "Talh\u00E3o" }), _jsx("th", { className: "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase", children: "\u00C1rea (ha)" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: talhoesFiltrados?.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 3, className: "px-4 py-3 text-center text-sm text-gray-500", children: "Nenhum talh\u00E3o dispon\u00EDvel" }) })) : (talhoesFiltrados?.map(talhao => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { className: "px-4 py-3", children: _jsx("input", { type: "checkbox", checked: formData.talhoes?.includes(talhao.id) || false, onChange: (e) => {
                                                                    const current = formData.talhoes || [];
                                                                    if (e.target.checked) {
                                                                        updateFormData('talhoes', [...current, talhao.id]);
                                                                    }
                                                                    else {
                                                                        updateFormData('talhoes', current.filter(id => id !== talhao.id));
                                                                    }
                                                                }, className: "rounded border-gray-300 text-green-600 focus:ring-green-500" }) }), _jsx("td", { className: "px-4 py-3 text-sm font-medium text-gray-900", children: talhao.name }), _jsx("td", { className: "px-4 py-3 text-sm text-gray-600", children: talhao.area_hectares.toFixed(2) })] }, talhao.id)))) })] }) }), formData.talhoes && formData.talhoes.length > 0 && (_jsxs("p", { className: "text-sm text-green-600 mt-2", children: ["\u2713 ", formData.talhoes.length, " talh\u00E3o(\u00F5es) selecionado(s)"] }))] })] }));
            case 4:
                return (_jsxs("div", { className: "mb-3", children: [(!formData.talhoes || formData.talhoes.length === 0) && (_jsx("div", { className: "bg-amber-50 border border-amber-300 rounded-lg p-4", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("i", { className: "bi bi-exclamation-triangle-fill text-amber-600" }), _jsxs("p", { className: "text-sm text-amber-800", children: [_jsx("strong", { children: "Aten\u00E7\u00E3o:" }), " Volte ao ", _jsx("strong", { children: "Passo 3 (Localiza\u00E7\u00E3o)" }), " e selecione os talh\u00F5es para calcular as quantidades totais automaticamente."] })] }) })), formData.talhoes && formData.talhoes.length > 0 && (_jsx("div", { className: "bg-green-50 border border-green-200 rounded-lg p-4", children: _jsxs("p", { className: "text-sm text-green-800", children: [_jsx("strong", { children: "\u00C1rea total selecionada:" }), " ", areaTotalSelected.toFixed(2), " ha (", formData.talhoes.length, " talh\u00E3o", formData.talhoes.length > 1 ? 'ões' : '', ")"] }) })), _jsx("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4", children: _jsxs("p", { className: "text-sm text-blue-800", children: [_jsx("strong", { children: "Produtos:" }), " Adicione produtos e dosagens para estimar as quantidades necess\u00E1rias. Use o bot\u00E3o \"Calcular Estimativa\" para validar estoque e custos."] }) }), formData.categoria === 'plantio' && areaTotalSelected > 0 && (_jsx("div", { className: "mt-4", children: _jsx(SeedCalculator, { areaHa: areaTotalSelected, onCalculate: (result) => {
                                    // Salvar cálculo em dados_especificos
                                    updateFormData('dados_especificos', {
                                        ...(formData.dados_especificos || {}),
                                        calculo_sementes: result
                                    });
                                } }) })), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "row g-3 mb-3", children: [_jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label", children: "Trator (opcional)" }), _jsxs("select", { className: "form-select", value: (formData.trator || ''), onChange: (e) => updateFormData('trator', e.target.value ? Number(e.target.value) : undefined), children: [_jsx("option", { value: "", children: "Nenhum" }), equipamentos.filter(eq => eq.categoria_detail?.tipo_mobilidade === 'autopropelido').map(eq => (_jsx("option", { value: eq.id, children: `${eq.nome} - ${eq.marca || ''} ${eq.modelo || ''}` }, eq.id)))] }), equipamentosError && _jsx("p", { className: "text-sm text-red-600 mt-1", children: equipamentosError })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label", children: "Implemento (opcional)" }), _jsxs("select", { className: "form-select", value: (formData.implemento || ''), onChange: (e) => updateFormData('implemento', e.target.value ? Number(e.target.value) : undefined), children: [_jsx("option", { value: "", children: "Nenhum" }), equipamentos.filter(eq => eq.categoria_detail?.tipo_mobilidade === 'rebocado').map(eq => (_jsx("option", { value: eq.id, children: `${eq.categoria_detail?.nome || 'Implemento'} - ${eq.nome} ${eq.largura_trabalho ? '(' + eq.largura_trabalho + 'm)' : ''}` }, eq.id)))] })] })] }), (() => {
                                    const produtos = (formData.produtos_input || []);
                                    return produtos.map((p, idx) => (_jsxs("div", { className: "flex items-start gap-2", children: [_jsxs("div", { className: "relative", children: [_jsx("input", { type: "text", className: "w-56 px-3 py-2 border rounded", placeholder: "Buscar produto (nome, c\u00F3digo, princ\u00EDpio ativo)", value: p.produto_nome || '', onChange: (e) => {
                                                            const val = e.target.value || '';
                                                            const current = produtos;
                                                            current[idx] = { ...(current[idx] || {}), produto_nome: val, produto_id: (current[idx] || {}).produto_id };
                                                            updateFormData('produtos_input', [...current]);
                                                            // trigger search
                                                            setProductQuery(val);
                                                            // store index on input (so selection knows which row to update)
                                                            current.__lastSearchIndex = idx;
                                                        } }), productSearchLoading && productQuery && (_jsxs("div", { className: "absolute z-50 bg-white border rounded w-56 mt-1 p-2 text-center text-sm text-gray-500", children: [_jsx("i", { className: "bi bi-hourglass-split animate-spin" }), " Buscando..."] })), !productSearchLoading && productQuery && productResults.length > 0 && (_jsx("ul", { className: "absolute z-50 bg-white border rounded w-96 mt-1 max-h-60 overflow-auto shadow-lg", children: productResults.map(prod => (_jsxs("li", { className: "px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0", onClick: () => {
                                                                const current = produtos;
                                                                const defaultDosagem = prod.dosagem_padrao ?? undefined;
                                                                const defaultUnidade = prod.unidade_dosagem ?? (prod.unidade ? `${prod.unidade}/ha` : '');
                                                                current[idx] = {
                                                                    ...(current[idx] || {}),
                                                                    produto_id: prod.id,
                                                                    produto_nome: prod.nome || prod.descricao || prod.codigo,
                                                                    dosagem: defaultDosagem,
                                                                    unidade_dosagem: defaultUnidade,
                                                                    unidade_selecionada: defaultUnidade ? defaultUnidade.split('/')[0] : ''
                                                                };
                                                                updateFormData('produtos_input', [...current]);
                                                                setProductResults([]);
                                                                setProductQuery('');
                                                            }, children: [_jsx("div", { className: "text-sm font-medium text-gray-900", children: prod.nome || prod.descricao }), _jsxs("div", { className: "text-xs text-gray-500 mt-0.5", children: ["C\u00F3digo: ", prod.codigo || '-', " \u2022", prod.principio_ativo && _jsxs("span", { className: "ml-1", children: ["P.A.: ", prod.principio_ativo, " \u2022 "] }), "Estoque: ", prod.quantidade_estoque, " ", prod.unidade] }), prod.composicao_quimica && (_jsx("div", { className: "text-xs text-gray-400 mt-0.5 italic", children: prod.composicao_quimica }))] }, prod.id))) })), !productSearchLoading && productQuery && productQuery.length >= 2 && productResults.length === 0 && (_jsx("div", { className: "absolute z-50 bg-white border rounded w-56 mt-1 p-2 text-center text-sm text-gray-500", children: "Nenhum produto encontrado" }))] }), _jsx("input", { type: "number", step: "0.001", "aria-label": "Dosagem", className: "w-36 px-3 py-2 border rounded", placeholder: "Dosagem (ex: 2.5)", value: p.dosagem || '', onChange: (e) => {
                                                    const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                                    const current = produtos;
                                                    if (val !== undefined && areaTotalSelected) {
                                                        const total = Number((val * areaTotalSelected).toFixed(3));
                                                        current[idx] = { ...(current[idx] || {}), dosagem: val, quantidade_total: total };
                                                    }
                                                    else {
                                                        current[idx] = { ...(current[idx] || {}), dosagem: val, quantidade_total: undefined };
                                                    }
                                                    updateFormData('produtos_input', [...current]);
                                                } }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px' }, children: [_jsxs("select", { className: "w-28 px-3 py-2 border rounded", value: (p.unidade_selecionada) || (p.unidade_dosagem ? p.unidade_dosagem.split('/')[0] : ''), onChange: (e) => {
                                                            const unit = e.target.value || '';
                                                            const current = produtos;
                                                            current[idx] = { ...(current[idx] || {}), unidade_selecionada: unit, unidade_dosagem: unit ? `${unit}/ha` : '' };
                                                            updateFormData('produtos_input', [...current]);
                                                        }, children: [_jsx("option", { value: "", children: "Unidade" }), _jsx("option", { value: "kg", children: "kg" }), _jsx("option", { value: "L", children: "L" }), _jsx("option", { value: "g", children: "g" })] }), _jsxs("div", { className: "text-xs text-gray-500", children: ["Unidade: ", (p.unidade_selecionada || ((p.unidade_dosagem || '').split('/')[0] || 'kg')).toUpperCase(), "/ha \u2022 \u00C1rea: ", areaTotalSelected.toFixed(3), " ha"] })] }), _jsxs("div", { className: "w-40 px-3 py-2 border rounded bg-gray-50 text-sm", children: [_jsx("label", { className: "text-xs text-gray-500", htmlFor: `quantidade_total_${idx}`, children: "Quantidade total" }), _jsx("input", { id: `quantidade_total_${idx}`, "aria-label": "Quantidade total", type: "number", step: "0.001", className: "font-medium w-full mt-1 px-2 py-1 border rounded", placeholder: areaTotalSelected ? '0.000' : 'Selecione talhões', value: (p.quantidade_total !== undefined && p.quantidade_total !== null) ? String(p.quantidade_total) : (p.dosagem && areaTotalSelected ? (Number(p.dosagem) * Number(areaTotalSelected)).toFixed(3) : ''), disabled: !areaTotalSelected, onChange: (e) => {
                                                            const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                                            const current = produtos;
                                                            if (val !== undefined && areaTotalSelected) {
                                                                const computedDos = Number((val / areaTotalSelected).toFixed(3));
                                                                current[idx] = { ...(current[idx] || {}), quantidade_total: val, dosagem: computedDos };
                                                            }
                                                            else {
                                                                current[idx] = { ...(current[idx] || {}), quantidade_total: val, dosagem: undefined };
                                                            }
                                                            updateFormData('produtos_input', [...current]);
                                                        } }), _jsxs("div", { className: "text-xs text-gray-500 mt-1", children: [((p.unidade_selecionada || (p.unidade_dosagem || '').split('/')[0]) || 'kg').toUpperCase(), "/ha \u00B7 Valor calculado para ", _jsxs("strong", { children: [areaTotalSelected.toFixed(3), " ha"] })] })] }), _jsx("button", { onClick: () => {
                                                    const current = produtos;
                                                    current.splice(idx, 1);
                                                    updateFormData('produtos_input', [...current]);
                                                }, className: "px-3 py-1 bg-red-100 text-red-700 rounded", children: "Remover" })] }, idx)));
                                })(), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => {
                                                const current = formData.produtos_input || [];
                                                current.push({ produto_id: undefined, dosagem: undefined, unidade_dosagem: '', quantidade_total: undefined });
                                                updateFormData('produtos_input', [...current]);
                                            }, className: "px-4 py-2 bg-green-100 text-green-700 rounded", children: "+ Adicionar Produto" }), _jsx("button", { onClick: async () => {
                                                // Rodar estimativa
                                                try {
                                                    const payload = {};
                                                    if (formData.plantio)
                                                        payload.plantio = formData.plantio;
                                                    if (formData.talhoes)
                                                        payload.talhoes = formData.talhoes;
                                                    payload.produtos_input = (formData.produtos_input || []);
                                                    const res = await operacoesService.estimate(payload);
                                                    setEstimate(res);
                                                }
                                                catch (err) {
                                                    console.error('Erro ao estimar:', err);
                                                    alert('Erro ao calcular estimativa. Verifique console para detalhes.');
                                                }
                                            }, className: "px-4 py-2 bg-blue-100 text-blue-700 rounded", children: "Calcular Estimativa" })] }), estimate && (_jsxs("div", { className: "mt-3 bg-white border rounded p-3", children: [_jsx("h4", { className: "font-medium", children: "Estimativa" }), _jsxs("p", { children: ["\u00C1rea total: ", _jsxs("strong", { children: [estimate.area_total_ha, " ha"] })] }), _jsx("div", { className: "mt-2 space-y-1", children: (estimate?.produtos || []).map((pr) => (_jsxs("div", { className: "flex justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "font-medium", children: [pr.produto_nome, " (ID: ", pr.produto_id, ")"] }), _jsxs("div", { className: "text-sm text-gray-600", children: ["Dosagem: ", pr.dosagem, " ", pr.unidade_dosagem] })] }), _jsxs("div", { className: "text-right", children: [_jsxs("div", { children: [(pr.quantidade_total ?? 0).toFixed(3), " ", pr.unidade_dosagem?.split('/')[0] || ''] }), _jsx("div", { className: `${pr.estoque_suficiente ? 'text-green-600' : 'text-red-600'} text-sm`, children: pr.estoque_suficiente ? 'Estoque suficiente' : 'Estoque insuficiente' })] })] }, pr.produto_id))) })] }))] }), _jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4", children: [_jsx("h3", { className: "font-medium text-blue-900 mb-3", children: "Respons\u00E1vel & Custos da Opera\u00E7\u00E3o" }), _jsxs("div", { className: "row g-3", children: [_jsxs("div", { className: "col-12", children: [_jsx("label", { className: "form-label text-sm", children: "Respons\u00E1vel pela execu\u00E7\u00E3o" }), _jsxs("select", { className: "form-select", value: selectedFuncionarioId ?? '', onChange: (e) => setSelectedFuncionarioId(e.target.value ? Number(e.target.value) : null), children: [_jsx("option", { value: "", children: "\u2014 Selecionar funcion\u00E1rio \u2014" }), funcionarios.map(f => (_jsxs("option", { value: f.id, children: [f.nome, f.cargo ? ` (${f.cargo})` : '', f.tipo === 'temporario' && f.diaria_valor ? ` — Diária: R$ ${parseFloat(f.diaria_valor).toFixed(2)}` : '', f.tipo !== 'temporario' && f.salario_bruto ? ` — CLT: R$ ${parseFloat(f.salario_bruto).toFixed(2)}/mês` : ''] }, f.id)))] }), selectedFuncionarioId && horasEstimadas !== null && (_jsxs("small", { className: "text-muted", children: ["Dura\u00E7\u00E3o estimada: ", _jsxs("strong", { children: [horasEstimadas, " h"] }), " para ", areaTotalSelected.toFixed(1), " ha", formData.categoria && ` (${HA_POR_HORA[formData.categoria] ?? 4} ha/h)`] }))] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label text-sm", children: "Custo M\u00E3o de Obra (R$)" }), _jsx("input", { type: "number", min: "0", step: "0.01", className: "form-control", placeholder: "Ex: 230.00", value: formData.custo_mao_obra ?? '', onChange: (e) => updateFormData('custo_mao_obra', e.target.value ? Number(e.target.value) : undefined) }), _jsx("small", { className: "text-muted", children: selectedFuncionarioId ? 'Calculado automaticamente (editável)' : 'Digite manualmente ou selecione um responsável' })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label text-sm", children: "Custo M\u00E1quina (R$)" }), _jsx("input", { type: "number", min: "0", step: "0.01", className: "form-control", placeholder: "Ex: 150.00", value: formData.custo_maquina ?? '', onChange: (e) => updateFormData('custo_maquina', e.target.value ? Number(e.target.value) : undefined) }), _jsx("small", { className: "text-muted", children: "Custo de hora/m\u00E1quina ou combust\u00EDvel adicional" })] })] })] }), _jsxs("div", { className: "bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4", children: [_jsx("h3", { className: "font-medium text-gray-900 mb-2", children: "Resumo da Opera\u00E7\u00E3o" }), _jsxs("dl", { className: "space-y-1 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("dt", { className: "text-gray-600", children: "Categoria:" }), _jsx("dd", { className: "font-medium", children: categorias?.find(c => c.value === formData.categoria)?.label || 'N/A' })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("dt", { className: "text-gray-600", children: "Tipo:" }), _jsx("dd", { className: "font-medium", children: tipos?.find(t => t.value === formData.tipo)?.label || 'N/A' })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("dt", { className: "text-gray-600", children: "Talh\u00F5es:" }), _jsx("dd", { className: "font-medium", children: formData.talhoes?.length || 0 })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("dt", { className: "text-gray-600", children: "Status:" }), _jsx("dd", { className: "font-medium", children: operacoesService.getStatusOptions()?.find(s => s.value === formData.status)?.label || 'N/A' })] })] })] })] }));
            default:
                return null;
        }
    };
    const canProceed = () => {
        switch (currentStep) {
            case 1:
                return formData.categoria && formData.tipo;
            case 2:
                return formData.data_inicio;
            case 3:
                return formData.talhoes && formData.talhoes.length > 0;
            case 4:
                return true;
            default:
                return false;
        }
    };
    return (_jsxs("div", { className: "container-fluid", children: [_jsx("div", { className: "row", children: _jsx("div", { className: "col-12", children: _jsxs("h2", { className: "mb-4", children: [_jsx("i", { className: "bi bi-magic me-2" }), "Nova Opera\u00E7\u00E3o Agr\u00EDcola"] }) }) }), _jsx("div", { className: "row mb-4", children: _jsx("div", { className: "col-12", children: _jsx("div", { className: "d-flex align-items-center justify-content-between px-3", children: STEPS.map((step, index) => (_jsxs(React.Fragment, { children: [_jsxs("div", { className: "d-flex flex-column align-items-center", children: [_jsx("div", { className: "rounded-circle d-flex align-items-center justify-content-center fw-bold", style: {
                                                width: '40px',
                                                height: '40px',
                                                backgroundColor: currentStep === step.id ? '#16a34a' : currentStep > step.id ? '#bbf7d0' : '#e5e7eb',
                                                color: currentStep === step.id ? 'white' : currentStep > step.id ? '#166534' : '#6b7280'
                                            }, children: step.id }), _jsx("small", { className: "text-center mt-2", style: { maxWidth: '100px' }, children: step.title })] }), index < STEPS.length - 1 && (_jsx("div", { className: "flex-fill", style: { height: '2px', backgroundColor: currentStep > step.id ? '#16a34a' : '#e5e7eb', marginTop: '-15px' } }))] }, step.id))) }) }) }), _jsx("div", { className: "row mb-4", children: _jsx("div", { className: "col-12", children: _jsx("div", { className: "card shadow-sm", children: _jsxs("div", { className: "card-body p-4", children: [_jsxs("h5", { className: "card-title mb-4", children: [_jsx("i", { className: "bi bi-pencil-square me-2" }), STEPS[currentStep - 1].description] }), _jsx("div", { style: { minHeight: '300px' }, children: renderStep() })] }) }) }) }), _jsx("div", { className: "row mt-4", children: _jsx("div", { className: "col-12", children: _jsxs("div", { className: "d-flex justify-content-between gap-3", children: [_jsx("button", { onClick: handlePrevious, disabled: currentStep === 1, className: "btn btn-lg fw-bold", style: {
                                    backgroundColor: currentStep === 1 ? '#e5e7eb' : '#fef3c7',
                                    color: currentStep === 1 ? '#6b7280' : '#78350f',
                                    border: '2px solid #b45309',
                                    opacity: currentStep === 1 ? 0.3 : 1
                                }, children: "\u2190 Anterior" }), currentStep < STEPS.length ? (_jsx("button", { onClick: handleNext, disabled: !canProceed(), className: "btn btn-lg fw-bold shadow", style: {
                                    backgroundColor: !canProceed() ? '#d1d5db' : '#bbf7d0',
                                    color: !canProceed() ? '#6b7280' : '#78350f',
                                    border: 'none'
                                }, children: "Pr\u00F3ximo \u2192" })) : (_jsx("button", { onClick: handleSubmit, disabled: loading || !canProceed(), className: "btn btn-lg fw-bold shadow", style: {
                                    backgroundColor: (loading || !canProceed()) ? '#d1d5db' : '#bbf7d0',
                                    color: (loading || !canProceed()) ? '#6b7280' : '#78350f',
                                    border: 'none'
                                }, children: loading ? '⏳ Salvando...' : '✓ Finalizar' }))] }) }) })] }));
};
export default OperacaoWizard;
