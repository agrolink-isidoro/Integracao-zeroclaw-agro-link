import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import operacoesService from '../../services/operacoes';
import type { OperacaoCreate, Categoria, Tipo, ProdutoOperacao } from '../../services/operacoes';
import api from '../../services/api';
import { SeedCalculator } from './SeedCalculator';
import type { Plantio } from '../../types/agricultura';
import type { Equipamento, Produto } from '../../types';

interface Step {
  id: number;
  title: string;
  description: string;
}

interface Talhao {
  id: number;
  name: string;
  area_hectares: number;
  area_size?: number; // compatibility: some APIs return `area_size` instead of `area_hectares`
  fazenda?: number;
}

interface OperacaoWizardProps {
  onSuccess?: () => void;
}

interface Funcionario {
  id: number;
  nome: string;
  tipo: 'clt' | 'temporario' | string;
  diaria_valor: string | null;
  salario_bruto: string | null;
  cargo?: string;
  ativo: boolean;
}

// ha/h productivity reference by operation category
const HA_POR_HORA: Record<string, number> = {
  preparacao: 4,
  adubacao: 5,
  plantio: 2,
  tratos: 5,
  pulverizacao: 12,
  mecanicas: 3,
};

// UI-level product input (extends API model with transient UI fields)
type ProdutoInputUI = ProdutoOperacao & {
  produto_nome?: string;
  unidade_selecionada?: string;
  quantidade_total?: number | null;
};

type ProdutosArray = Array<ProdutoInputUI> & { __lastSearchIndex?: number };

type Estimate = {
  area_total_ha?: number;
  produtos?: Array<{
    produto_id: number;
    produto_nome?: string;
    dosagem?: number;
    unidade_dosagem?: string;
    quantidade_total?: number;
    estoque_suficiente?: boolean;
  }>;
} | null;

const STEPS: Step[] = [
  { id: 1, title: 'Categoria', description: 'Selecione o tipo de operação' },
  { id: 2, title: 'Detalhes', description: 'Informações da operação' },
  { id: 3, title: 'Localização', description: 'Fazenda e talhões' },
  { id: 4, title: 'Recursos', description: 'Equipamentos e produtos' },
];

export const OperacaoWizard: React.FC<OperacaoWizardProps> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const operacaoId = id ? parseInt(id) : null;
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [categorias] = useState<Categoria[]>(operacoesService.getCategorias() || []);
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [talhoesFiltrados, setTalhoesFiltrados] = useState<Talhao[]>([]);
  const [safras, setSafras] = useState<Plantio[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [equipamentosError, setEquipamentosError] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState<string>('');
  const [productSearchLoading, setProductSearchLoading] = useState<boolean>(false);

  const [productResults, setProductResults] = useState<Produto[]>([]);
  const searchTimeout = useRef<number | null>(null);
  const [estimate, setEstimate] = useState<Estimate>(null);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [selectedFuncionarioId, setSelectedFuncionarioId] = useState<number | null>(null);
  const [horasEstimadas, setHorasEstimadas] = useState<number | null>(null);
  
  // Form data
  const [formData, setFormData] = useState<Partial<OperacaoCreate>>({
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
    const selectedIds: number[] = (formData.talhoes || []) as number[];
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
    const current = (formData.produtos_input || []) as ProdutoInputUI[];
    const updated = current.map((p) => {
      const prod = { ...(p || {}) } as ProdutoInputUI;
      if (prod.dosagem !== undefined) {
        if (prod.quantidade_total === undefined || prod.quantidade_total === null) {
          prod.quantidade_total = areaTotalSelected ? Number((Number(prod.dosagem) * Number(areaTotalSelected)).toFixed(3)) : undefined;
        } else if (areaTotalSelected) {
          prod.dosagem = Number((Number(prod.quantidade_total) / Number(areaTotalSelected)).toFixed(3));
        }
      } else if (prod.quantidade_total !== undefined && areaTotalSelected) {
        prod.dosagem = Number((Number(prod.quantidade_total) / Number(areaTotalSelected)).toFixed(3));
      }
      return prod;
    });
    updateFormData('produtos_input', updated as any);
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
        } else {
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
    if (!func || !areaTotalSelected) return;

    const hasPorHora = HA_POR_HORA[formData.categoria || ''] ?? 4;
    const horas = areaTotalSelected / hasPorHora;
    setHorasEstimadas(Math.round(horas * 10) / 10);

    let valorDia = 0;
    if (func.tipo === 'temporario' && func.diaria_valor) {
      valorDia = parseFloat(func.diaria_valor);
    } else if (func.salario_bruto) {
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
    } else {
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
    if (searchTimeout.current) window.clearTimeout(searchTimeout.current);
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
      if (searchTimeout.current) window.clearTimeout(searchTimeout.current);
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
    } else if (!formData.plantio) {
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
      } else {
        // Modo criação: criar nova operação
        operacao = await operacoesService.criar(formData as OperacaoCreate);
        alert(`Operação #${operacao.id} criada com sucesso!`);
      }
      if (onSuccess) {
        // notify parent to close the embedded wizard and refresh list
        onSuccess();
        // ensure navigation to the list to avoid the wizard staying open due to UI timing
        setTimeout(() => navigate('/agricultura/operacoes'), 50);
      } else {
        navigate('/agricultura/operacoes');
      }
    } catch (err: unknown) {
      const extractDetail = (e: unknown) => {
        if (!e || typeof e !== 'object') return String(e);
        const ae = e as { response?: { data?: any }; message?: string };

        // Prefer standard DRF 'detail' field
        if (ae.response && typeof ae.response.data === 'object' && ae.response.data !== null) {
          const resp = ae.response.data as Record<string, any>;
          if ('detail' in resp) {
            const d = resp['detail'];
            return typeof d === 'string' ? d : JSON.stringify(d);
          }

          // Handle structured estoque error returned as { produtos_operacao: { produto: id, mensagem: '...' } }
          if ('produtos_operacao' in resp) {
            const po = resp['produtos_operacao'];
            if (po && typeof po === 'object') {
              if ('mensagem' in po) return String(po['mensagem']);
              if ('message' in po) return String(po['message']);
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
      const ae2 = err as { response?: { data?: unknown } };
      console.error('Erro completo:', ae2.response?.data);
      const acao = operacaoId ? 'atualizar' : 'criar';
      alert(`Erro ao ${acao} operação: ` + detail);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = <K extends keyof OperacaoCreate>(field: K, value: OperacaoCreate[K] | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="mb-3">
            <div className="mb-3">
              <label className="form-label">
                Categoria da Operação *
              </label>
              <select
                className="form-select"
                value={formData.categoria}
                onChange={(e) => updateFormData('categoria', e.target.value)}
                required
              >
                <option value="">Selecione...</option>
                {categorias?.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {formData.categoria && (
              <div className="mb-3">
                <label className="form-label">
                  Tipo de Operação *
                </label>
                <select
                  className="form-select"
                  value={formData.tipo}
                  onChange={(e) => updateFormData('tipo', e.target.value)}
                  required
                >
                  <option value="">Selecione...</option>
                  {tipos?.map(tipo => (
                    <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                  ))}
                  {tipos?.length === 0 && (
                    <option value="outra">Outra Operação</option>
                  )}
                  {tipos?.length > 0 && (
                    <option value="outra">Outra (não listada)</option>
                  )}
                </select>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="mb-3">
            <div className="mb-3">
              <label className="form-label">
                Data de Início *
              </label>
              <input
                type="datetime-local"
                className="form-control"
                value={formData.data_inicio || ''}
                onChange={(e) => updateFormData('data_inicio', e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">
                Data de Término (opcional)
              </label>
              <input
                type="datetime-local"
                className="form-control"
                value={formData.data_fim || ''}
                onChange={(e) => updateFormData('data_fim', e.target.value)}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">
                Status
              </label>
              <select
                className="form-select"
                value={formData.status}
                onChange={(e) => updateFormData('status', e.target.value as OperacaoCreate['status'])}
              >
                {operacoesService.getStatusOptions().map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">
                Observações
              </label>
              <textarea
                className="form-control"
                rows={3}
                value={formData.observacoes || ''}
                onChange={(e) => updateFormData('observacoes', e.target.value)}
                placeholder="Detalhes adicionais sobre a operação..."
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="mb-3">
            <div className="mb-3">
              <label className="form-label">
                Safra/Plantio (opcional)
              </label>
              <select
                className="form-select"
                value={formData.plantio || ''}
                onChange={(e) => updateFormData('plantio', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">Nenhuma safra específica</option>
                {safras?.map(safra => (
                  <option key={safra.id} value={safra.id}>
                    {safra.cultura_nome || 'Safra'} - {new Date(safra.data_plantio).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">
                Talhões * (Selecione um ou mais)
              </label>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        <input
                          type="checkbox"
                          checked={formData.talhoes?.length === talhoesFiltrados?.length && talhoesFiltrados?.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateFormData('talhoes', talhoesFiltrados?.map(t => t.id) || []);
                            } else {
                              updateFormData('talhoes', []);
                            }
                          }}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Talhão</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Área (ha)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {talhoesFiltrados?.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-center text-sm text-gray-500">
                          Nenhum talhão disponível
                        </td>
                      </tr>
                    ) : (
                      talhoesFiltrados?.map(talhao => (
                        <tr key={talhao.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={formData.talhoes?.includes(talhao.id) || false}
                              onChange={(e) => {
                                const current = formData.talhoes || [];
                                if (e.target.checked) {
                                  updateFormData('talhoes', [...current, talhao.id]);
                                } else {
                                  updateFormData('talhoes', current.filter(id => id !== talhao.id));
                                }
                              }}
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{talhao.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{talhao.area_hectares.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {formData.talhoes && formData.talhoes.length > 0 && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ {formData.talhoes.length} talhão(ões) selecionado(s)
                </p>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="mb-3">
            {/* Aviso se não houver talhões selecionados */}
            {(!formData.talhoes || formData.talhoes.length === 0) && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <i className="bi bi-exclamation-triangle-fill text-amber-600"></i>
                  <p className="text-sm text-amber-800">
                    <strong>Atenção:</strong> Volte ao <strong>Passo 3 (Localização)</strong> e selecione os talhões para calcular as quantidades totais automaticamente.
                  </p>
                </div>
              </div>
            )}

            {/* Informação de área total */}
            {formData.talhoes && formData.talhoes.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <strong>Área total selecionada:</strong> {areaTotalSelected.toFixed(2)} ha ({formData.talhoes.length} talhão{formData.talhoes.length > 1 ? 'ões' : ''})
                </p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Produtos:</strong> Adicione produtos e dosagens para estimar as quantidades necessárias. Use o botão "Calcular Estimativa" para validar estoque e custos.
              </p>
            </div>

            {/* Calculadora de Sementes (apenas para plantio) */}
            {formData.categoria === 'plantio' && areaTotalSelected > 0 && (
              <div className="mt-4">
                <SeedCalculator
                  areaHa={areaTotalSelected}
                  onCalculate={(result) => {
                    // Salvar cálculo em dados_especificos
                    updateFormData('dados_especificos', {
                      ...(formData.dados_especificos || {}),
                      calculo_sementes: result
                    });
                  }}
                />
              </div>
            )}

            <div className="space-y-3">

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label">Trator (opcional)</label>
                  <select className="form-select" value={(formData.trator || '')} onChange={(e) => updateFormData('trator', e.target.value ? Number(e.target.value) : undefined)}>
                    <option value="">Nenhum</option>
                    {equipamentos.filter(eq => eq.categoria_detail?.tipo_mobilidade === 'autopropelido').map(eq => (
                      <option key={eq.id} value={eq.id}>{`${eq.nome} - ${eq.marca || ''} ${eq.modelo || ''}`}</option>
                    ))}
                  </select>
                  {equipamentosError && <p className="text-sm text-red-600 mt-1">{equipamentosError}</p>}
                </div>

                <div className="col-md-6">
                  <label className="form-label">Implemento (opcional)</label>
                  <select className="form-select" value={(formData.implemento || '')} onChange={(e) => updateFormData('implemento', e.target.value ? Number(e.target.value) : undefined)}>
                    <option value="">Nenhum</option>
                    {equipamentos.filter(eq => eq.categoria_detail?.tipo_mobilidade === 'rebocado').map(eq => (
                      <option key={eq.id} value={eq.id}>{`${eq.categoria_detail?.nome || 'Implemento'} - ${eq.nome} ${eq.largura_trabalho ? '(' + eq.largura_trabalho + 'm)' : ''}`}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(() => {
                const produtos = (formData.produtos_input || []) as ProdutosArray;
                return produtos.map((p, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="relative">
                      <input
                        type="text"
                        className="w-56 px-3 py-2 border rounded"
                        placeholder="Buscar produto (nome, código, princípio ativo)"
                        value={p.produto_nome || ''}
                        onChange={(e) => {
                          const val = e.target.value || '';
                          const current = produtos;
                          current[idx] = { ...(current[idx] || {}), produto_nome: val, produto_id: (current[idx] || {}).produto_id };
                          updateFormData('produtos_input', [...current]);
                          // trigger search
                          setProductQuery(val);
                          // store index on input (so selection knows which row to update)
                          (current as ProdutosArray).__lastSearchIndex = idx;
                        }}
                      />

                      {/* Loading indicator */}
                      {productSearchLoading && productQuery && (
                        <div className="absolute z-50 bg-white border rounded w-56 mt-1 p-2 text-center text-sm text-gray-500">
                          <i className="bi bi-hourglass-split animate-spin"></i> Buscando...
                        </div>
                      )}

                      {/* Dropdown results */}
                      {!productSearchLoading && productQuery && productResults.length > 0 && (
                        <ul className="absolute z-50 bg-white border rounded w-96 mt-1 max-h-60 overflow-auto shadow-lg">
                          {productResults.map(prod => (
                            <li key={prod.id} className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0" onClick={() => {
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
                            }}>
                              <div className="text-sm font-medium text-gray-900">{prod.nome || prod.descricao}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                Código: {prod.codigo || '-'} • 
                                {prod.principio_ativo && <span className="ml-1">P.A.: {prod.principio_ativo} • </span>}
                                Estoque: {prod.quantidade_estoque} {prod.unidade}
                              </div>
                              {prod.composicao_quimica && (
                                <div className="text-xs text-gray-400 mt-0.5 italic">{prod.composicao_quimica}</div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* No results message */}
                      {!productSearchLoading && productQuery && productQuery.length >= 2 && productResults.length === 0 && (
                        <div className="absolute z-50 bg-white border rounded w-56 mt-1 p-2 text-center text-sm text-gray-500">
                          Nenhum produto encontrado
                        </div>
                      )}
                    </div>

                    <input
                      type="number"
                      step="0.001"
                      aria-label="Dosagem"
                      className="w-36 px-3 py-2 border rounded"
                      placeholder="Dosagem (ex: 2.5)"
                      value={p.dosagem || ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseFloat(e.target.value) : undefined;
                        const current = produtos;
                        if (val !== undefined && areaTotalSelected) {
                          const total = Number((val * areaTotalSelected).toFixed(3));
                          current[idx] = { ...(current[idx] || {}), dosagem: val, quantidade_total: total };
                        } else {
                          current[idx] = { ...(current[idx] || {}), dosagem: val, quantidade_total: undefined };
                        }
                        updateFormData('produtos_input', [...current]);
                      }}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <select
                        className="w-28 px-3 py-2 border rounded"
                        value={(p.unidade_selecionada) || (p.unidade_dosagem ? p.unidade_dosagem.split('/')[0] : '')}
                        onChange={(e) => {
                          const unit = e.target.value || '';
                          const current = produtos;
                          current[idx] = { ...(current[idx] || {}), unidade_selecionada: unit, unidade_dosagem: unit ? `${unit}/ha` : '' };
                          updateFormData('produtos_input', [...current]);
                        }}
                      >
                        <option value="">Unidade</option>
                        <option value="kg">kg</option>
                        <option value="L">L</option>
                        <option value="g">g</option>
                      </select>
                      <div className="text-xs text-gray-500">Unidade: {(p.unidade_selecionada || ((p.unidade_dosagem || '').split('/')[0] || 'kg')).toUpperCase()}/ha • Área: {areaTotalSelected.toFixed(3)} ha</div>
                    </div>

                    <div className="w-40 px-3 py-2 border rounded bg-gray-50 text-sm">
                      <label className="text-xs text-gray-500" htmlFor={`quantidade_total_${idx}`}>Quantidade total</label>
                      <input
                        id={`quantidade_total_${idx}`}
                        aria-label="Quantidade total"
                        type="number"
                        step="0.001"
                        className="font-medium w-full mt-1 px-2 py-1 border rounded"
                        placeholder={areaTotalSelected ? '0.000' : 'Selecione talhões'}
                        value={(p.quantidade_total !== undefined && p.quantidade_total !== null) ? String(p.quantidade_total) : (p.dosagem && areaTotalSelected ? (Number(p.dosagem) * Number(areaTotalSelected)).toFixed(3) : '')}
                        disabled={!areaTotalSelected}
                        onChange={(e) => {
                          const val = e.target.value ? parseFloat(e.target.value) : undefined;
                          const current = produtos;
                          if (val !== undefined && areaTotalSelected) {
                            const computedDos = Number((val / areaTotalSelected).toFixed(3));
                            current[idx] = { ...(current[idx] || {}), quantidade_total: val, dosagem: computedDos };
                          } else {
                            current[idx] = { ...(current[idx] || {}), quantidade_total: val, dosagem: undefined };
                          }
                          updateFormData('produtos_input', [...current]);
                        }}
                      />
                      <div className="text-xs text-gray-500 mt-1">{((p.unidade_selecionada || (p.unidade_dosagem || '').split('/')[0]) || 'kg').toUpperCase()}/ha · Valor calculado para <strong>{areaTotalSelected.toFixed(3)} ha</strong></div>
                    </div>

                    <button
                      onClick={() => {
                        const current = produtos;
                        current.splice(idx, 1);
                        updateFormData('produtos_input', [...current]);
                      }}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded"
                    >
                      Remover
                    </button>
                  </div>
                ));
              })()}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const current = formData.produtos_input || [];
                    current.push({ produto_id: undefined, dosagem: undefined, unidade_dosagem: '', quantidade_total: undefined } as ProdutoInputUI);
                    updateFormData('produtos_input', [...current]);
                  }}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded"
                >
                  + Adicionar Produto
                </button>

                <button
                  onClick={async () => {
                    // Rodar estimativa
                    try {
                      const payload = {} as { plantio?: number; talhoes?: number[]; produtos_input?: ProdutoOperacao[] };
                      if (formData.plantio) payload.plantio = formData.plantio;
                      if (formData.talhoes) payload.talhoes = formData.talhoes as number[];
                      payload.produtos_input = (formData.produtos_input || []) as ProdutoOperacao[];
                      const res = await operacoesService.estimate(payload);
                      setEstimate(res as Estimate);
                    } catch (err) {
                      console.error('Erro ao estimar:', err);
                      alert('Erro ao calcular estimativa. Verifique console para detalhes.');
                    }
                  }}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded"
                >
                  Calcular Estimativa
                </button>
              </div>

              {estimate && (
                <div className="mt-3 bg-white border rounded p-3">
                  <h4 className="font-medium">Estimativa</h4>
                  <p>Área total: <strong>{estimate.area_total_ha} ha</strong></p>
                  <div className="mt-2 space-y-1">
                    {(estimate?.produtos || []).map((pr) => (
                      <div key={pr.produto_id} className="flex justify-between">
                        <div>
                          <div className="font-medium">{pr.produto_nome} (ID: {pr.produto_id})</div>
                          <div className="text-sm text-gray-600">Dosagem: {pr.dosagem} {pr.unidade_dosagem}</div>
                        </div>
                        <div className="text-right">
                          <div>{(pr.quantidade_total ?? 0).toFixed(3)} {pr.unidade_dosagem?.split('/')[0] || ''}</div>
                          <div className={`${pr.estoque_suficiente ? 'text-green-600' : 'text-red-600'} text-sm`}>{pr.estoque_suficiente ? 'Estoque suficiente' : 'Estoque insuficiente'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Responsável pela execução + Custos */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <h3 className="font-medium text-blue-900 mb-3">Responsável & Custos da Operação</h3>
              <div className="row g-3">
                {/* Responsável */}
                <div className="col-12">
                  <label className="form-label text-sm">Responsável pela execução</label>
                  <select
                    className="form-select"
                    value={selectedFuncionarioId ?? ''}
                    onChange={(e) => setSelectedFuncionarioId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">— Selecionar funcionário —</option>
                    {funcionarios.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.nome}{f.cargo ? ` (${f.cargo})` : ''}
                        {f.tipo === 'temporario' && f.diaria_valor ? ` — Diária: R$ ${parseFloat(f.diaria_valor).toFixed(2)}` : ''}
                        {f.tipo !== 'temporario' && f.salario_bruto ? ` — CLT: R$ ${parseFloat(f.salario_bruto).toFixed(2)}/mês` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedFuncionarioId && horasEstimadas !== null && (
                    <small className="text-muted">
                      Duração estimada: <strong>{horasEstimadas} h</strong> para {areaTotalSelected.toFixed(1)} ha
                      {formData.categoria && ` (${HA_POR_HORA[formData.categoria] ?? 4} ha/h)`}
                    </small>
                  )}
                </div>
                {/* Custo Mão de Obra */}
                <div className="col-md-6">
                  <label className="form-label text-sm">Custo Mão de Obra (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control"
                    placeholder="Ex: 230.00"
                    value={formData.custo_mao_obra ?? ''}
                    onChange={(e) => updateFormData('custo_mao_obra', e.target.value ? Number(e.target.value) : undefined)}
                  />
                  <small className="text-muted">
                    {selectedFuncionarioId ? 'Calculado automaticamente (editável)' : 'Digite manualmente ou selecione um responsável'}
                  </small>
                </div>
                {/* Custo Máquina */}
                <div className="col-md-6">
                  <label className="form-label text-sm">Custo Máquina (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control"
                    placeholder="Ex: 150.00"
                    value={formData.custo_maquina ?? ''}
                    onChange={(e) => updateFormData('custo_maquina', e.target.value ? Number(e.target.value) : undefined)}
                  />
                  <small className="text-muted">Custo de hora/máquina ou combustível adicional</small>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
              <h3 className="font-medium text-gray-900 mb-2">Resumo da Operação</h3>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Categoria:</dt>
                  <dd className="font-medium">{categorias?.find(c => c.value === formData.categoria)?.label || 'N/A'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Tipo:</dt>
                  <dd className="font-medium">{tipos?.find(t => t.value === formData.tipo)?.label || 'N/A'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Talhões:</dt>
                  <dd className="font-medium">{formData.talhoes?.length || 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Status:</dt>
                  <dd className="font-medium">{operacoesService.getStatusOptions()?.find(s => s.value === formData.status)?.label || 'N/A'}</dd>
                </div>
              </dl>
            </div>
          </div>
        );

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

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <h2 className="mb-4">
            <i className="bi bi-magic me-2"></i>
            Nova Operação Agrícola
          </h2>
        </div>
      </div>

      {/* Stepper */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex align-items-center justify-content-between px-3">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="d-flex flex-column align-items-center">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                    style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: currentStep === step.id ? '#16a34a' : currentStep > step.id ? '#bbf7d0' : '#e5e7eb',
                      color: currentStep === step.id ? 'white' : currentStep > step.id ? '#166534' : '#6b7280'
                    }}
                  >
                    {step.id}
                  </div>
                  <small className="text-center mt-2" style={{ maxWidth: '100px' }}>{step.title}</small>
                </div>
                {index < STEPS.length - 1 && (
                  <div className="flex-fill" style={{ height: '2px', backgroundColor: currentStep > step.id ? '#16a34a' : '#e5e7eb', marginTop: '-15px' }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <h5 className="card-title mb-4">
                <i className="bi bi-pencil-square me-2"></i>
                {STEPS[currentStep - 1].description}
              </h5>
              <div style={{ minHeight: '300px' }}>
                {renderStep()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="d-flex justify-content-between gap-3">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 1}
          className="btn btn-lg fw-bold"
          style={{
            backgroundColor: currentStep === 1 ? '#e5e7eb' : '#fef3c7',
            color: currentStep === 1 ? '#6b7280' : '#78350f',
            border: '2px solid #b45309',
            opacity: currentStep === 1 ? 0.3 : 1
          }}
        >
          ← Anterior
        </button>

        {currentStep < STEPS.length ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="btn btn-lg fw-bold shadow"
            style={{
              backgroundColor: !canProceed() ? '#d1d5db' : '#bbf7d0',
              color: !canProceed() ? '#6b7280' : '#78350f',
              border: 'none'
            }}
          >
            Próximo →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading || !canProceed()}
            className="btn btn-lg fw-bold shadow"
            style={{
              backgroundColor: (loading || !canProceed()) ? '#d1d5db' : '#bbf7d0',
              color: (loading || !canProceed()) ? '#6b7280' : '#78350f',
              border: 'none'
            }}
          >
            {loading ? '⏳ Salvando...' : '✓ Finalizar'}
          </button>
        )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperacaoWizard;
