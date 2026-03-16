import React, { useEffect, useState } from 'react';
import { useApiCreate, useApiQuery } from '@/hooks/useApi';
import ComercialService from '@/services/comercial';
import SelectDropdown from '@/components/common/SelectDropdown';
import ProductSelector from '@/components/financeiro/ProductSelector';
import ItemEmprestimoList from '@/components/financeiro/ItemEmprestimoList';
import type { ItemEmprestimo, Emprestimo } from '@/types/financeiro';

interface Props {
  tipo?: 'emprestimo' | 'financiamento';
  initialData?: any;
  onClose: () => void;
  onSaved?: (data: any) => void;
}

const OperacaoForm: React.FC<Props> = ({ tipo: tipoProp, initialData, onClose, onSaved }) => {
  const isEdit = !!initialData;
  const [tipo, setTipo] = useState<'emprestimo' | 'financiamento'>(tipoProp || initialData?.tipo || 'emprestimo');
  const [titulo, setTitulo] = useState(initialData?.titulo || '');
  const [beneficiario, setBeneficiario] = useState<number | null>(initialData?.beneficiario ?? null);
  const [valorTotal, setValorTotal] = useState(initialData?.valor_total ?? (initialData?.valor || '0.00'));
  const [valorEntrada, setValorEntrada] = useState(initialData?.valor_entrada || '0.00');
  const [valorFinanciado, setValorFinanciado] = useState(initialData?.valor_financiado || (initialData?.valor || '0.00'));
  const [taxaJuros, setTaxaJuros] = useState(initialData?.taxa_juros || '0.00');
  const [frequenciaTaxa, setFrequenciaTaxa] = useState(initialData?.frequencia_taxa || 'mensal');
  const [metodoCalculo, setMetodoCalculo] = useState(initialData?.metodo_calculo || 'price');
  const [numeroParcelas, setNumeroParcelas] = useState<number>(initialData?.numero_parcelas || 1);
  const [prazoMeses, setPrazoMeses] = useState<number>(initialData?.prazo_meses || 1);
  const [dataContrato, setDataContrato] = useState(initialData?.data_contratacao || '');
  const [dataPrimeiroVencimento, setDataPrimeiroVencimento] = useState(initialData?.data_primeiro_vencimento || '');
  const [status, setStatus] = useState(initialData?.status || 'ativo');
  const [tipoFinanciamento, setTipoFinanciamento] = useState(initialData?.tipo_financiamento || 'custeio');
  const [numeroContrato, setNumeroContrato] = useState(initialData?.numero_contrato || '');
  // cálculo / parcelas


  // advanced optional fields
  const [garantias, setGarantias] = useState(initialData?.garantias || '');
  const [contratoArquivo, setContratoArquivo] = useState<File | null>(null);
  const [taxaMulta, setTaxaMulta] = useState(initialData?.taxa_multa || '');
  const [taxaMora, setTaxaMora] = useState(initialData?.taxa_mora || '');
  const [observacoes, setObservacoes] = useState(initialData?.observacoes || '');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [contaDestino, setContaDestino] = useState<number | null>(initialData?.conta_destino ?? null);
  const [carenciaMeses, setCarenciaMeses] = useState<number>(initialData?.carencia_meses || 0);
  const [jurosEmbutidos, setJurosEmbutidos] = useState<boolean>(initialData?.juros_embutidos || false);

  // State for product items (ItemEmprestimo)
  const [temItens, setTemItens] = useState(false);
  const [items, setItems] = useState<Omit<ItemEmprestimo, 'id' | 'criado_em' | 'atualizado_em'>[]>(
    initialData?.itens_produtos || []
  );
  const [valueTotalFromItems, setValueTotalFromItems] = useState<number>(0);

  // Update valor_emprestimo when items change
  useEffect(() => {
    const total = items.reduce((sum, item) => {
      const valor = parseFloat(String(item.valor_total || 0));
      return sum + (isNaN(valor) ? 0 : valor);
    }, 0);
    setValueTotalFromItems(total);
    if (temItens) {
      setValorTotal(total);
    }
  }, [items, temItens]);

  const createItemEmprestimo = useApiCreate('/financeiro/itens-emprestimo/', [['itens_emprestimo']]);

  const handleAddItem = (newItem: Omit<ItemEmprestimo, 'id' | 'criado_em' | 'atualizado_em'>) => {
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };
  const { data: clientes = [] } = useApiQuery<any[]>(['clientes'], '/comercial/clientes/');
  // request larger page to avoid truncated lists in dropdowns
  const { data: insts = [] } = useApiQuery<any[]>(['instituicoes'], '/comercial/instituicoes-financeiras/?page_size=1000');
  const { data: contas = [] } = useApiQuery<any[]>(['contas'], '/financeiro/contas/?page_size=1000');


  // local helper that wraps remote search and returns [] on failure to avoid bubbling rejections
  const instituicoesSearch = async (term: string) => {
    try {
      const results = await ComercialService.getInstituicoes({ busca: term });
      return results || [];
    } catch (e) {
      console.warn('Instituições search failed:', e);
      return [];
    }
  };

  // create mutations (we will post to the right endpoint dynamically)
  const createEmprestimo = useApiCreate<Emprestimo, Record<string, unknown>>('/financeiro/emprestimos/', [['emprestimos']]);
  const createFinanciamento = useApiCreate('/financeiro/financiamentos/', [['financiamentos']]);

  useEffect(() => {
    if (tipoProp) setTipo(tipoProp);
  }, [tipoProp]);

  useEffect(() => {
    if (initialData) {
      setTipo(initialData.tipo || 'emprestimo');
      setTitulo(initialData.titulo || '');
      setBeneficiario(initialData.beneficiario ?? null);
      setValorTotal(initialData.valor_total ?? initialData.valor ?? '0.00');
      setValorEntrada(initialData.valor_entrada || '0.00');
      setValorFinanciado(initialData.valor_financiado || (initialData.valor || '0.00'));
      setTaxaJuros(initialData.taxa_juros || '0.00');
      setFrequenciaTaxa(initialData.frequencia_taxa || 'mensal');
      setMetodoCalculo(initialData.metodo_calculo || 'price');
      setNumeroParcelas(initialData.numero_parcelas || 1);
      setPrazoMeses(initialData.prazo_meses || 1);
      setDataContrato(initialData.data_contratacao || '');
      setDataPrimeiroVencimento(initialData.data_primeiro_vencimento || '');
      setStatus(initialData.status || 'ativo');
      setTipoFinanciamento(initialData.tipo_financiamento || 'custeio');
      setNumeroContrato(initialData.numero_contrato || '');
      setGarantias(initialData.garantias || '');
      setTaxaMulta(initialData.taxa_multa || '');
      setTaxaMora(initialData.taxa_mora || '');
      setObservacoes(initialData.observacoes || '');
      setContaDestino(initialData.conta_destino ?? null);
    }
  }, [initialData]);

  const validate = () => {
    if (!titulo || !titulo.trim()) return 'Título obrigatório';
    if (!valorTotal || isNaN(Number(String(valorTotal)))) return 'Valor inválido';
    // For empréstimo: beneficiário é o cliente; for financiamento: é a instituição
    if (tipo === 'emprestimo' && !beneficiario) return 'Beneficiário (cliente) obrigatório';
    if (tipo === 'financiamento') {
      if (!beneficiario) return 'Beneficiário (instituição) obrigatório';
      if (!contaDestino) return 'Conta de destino obrigatória';
    }
    return null;
  };

  const handleSave = async () => {
    console.debug('[OperacaoForm] handleSave called, tipo=', tipo);
    const err = validate();
    if (err) {
      console.debug('[OperacaoForm] validation failed:', err);
      return alert(err);
    }

    try {
      if (tipo === 'emprestimo') {
        console.debug('[OperacaoForm] preparing emprestimo payload');
        // determine first vencimento (default: one month after contract date)
        const firstVenc = dataPrimeiroVencimento || (() => {
          const base = dataContrato || new Date().toISOString().slice(0,10);
          const dt = new Date(base);
          dt.setMonth(dt.getMonth() + 1);
          return dt.toISOString().slice(0,10);
        })();

        const payload: any = {
          titulo,
          // coerce numeric fields to numbers to satisfy backend validation
          valor_emprestimo: Number(valorTotal) || 0,
          valor_entrada: Number(valorEntrada) || 0,
          data_contratacao: dataContrato,
          data_primeiro_vencimento: firstVenc,
          cliente: beneficiario,
          // incluir campos financeiros importantes
          taxa_juros: Number(taxaJuros) || 0,
          frequencia_taxa: frequenciaTaxa,
          metodo_calculo: metodoCalculo,
          numero_parcelas: Number(numeroParcelas) || 1,
          prazo_meses: Number(prazoMeses) || 1,
          carencia_meses: Number(carenciaMeses) || 0,
          juros_embutidos: Boolean(jurosEmbutidos),
        };

        console.debug('[OperacaoForm] calling createEmprestimo with payload', payload);
        const res = await createEmprestimo.mutateAsync(payload);
        
        // Create items if any were added
        if (items && items.length > 0) {
          console.debug('[OperacaoForm] creating items for emprestimo', res.id);
          try {
            for (const item of items) {
              await createItemEmprestimo.mutateAsync({
                emprestimo: res.id,
                produto: item.produto,
                quantidade: item.quantidade,
                unidade: item.unidade,
                valor_unitario: item.valor_unitario,
                observacoes: item.observacoes
              });
            }
            console.debug('[OperacaoForm] all items created successfully');
          } catch (itemErr) {
            console.warn('[OperacaoForm] error creating items:', itemErr);
            // Items creation failed but emprestimo was created - notify user
            alert('Empréstimo criado, mas houve erro ao criar os itens de produto. Tente novamente.');
          }
        }
        
        if (onSaved) onSaved(res);
      } else {
        console.debug('[OperacaoForm] preparing financiamento payload');
        const dataContratoVal = dataContrato || new Date().toISOString().slice(0, 10);
        const firstVenc = dataPrimeiroVencimento || (() => { const dt = new Date(dataContratoVal); dt.setMonth(dt.getMonth() + 1); return dt.toISOString().slice(0,10); })();

        const basePayload: any = {
          titulo,
          descricao: '',
          valor_total: Number(valorTotal) || 0,
          valor_entrada: Number(valorEntrada) || 0,
          valor_financiado: Number(valorFinanciado) || Number(valorTotal) || 0,
          taxa_juros: Number(taxaJuros) || 0,
          frequencia_taxa: frequenciaTaxa,
          metodo_calculo: metodoCalculo,
          numero_parcelas: Number(numeroParcelas) || 1,
          prazo_meses: Number(prazoMeses) || 1,
          data_contratacao: dataContratoVal,
          data_primeiro_vencimento: firstVenc,
          status,
          tipo_financiamento: tipoFinanciamento,
          instituicao_financeira: beneficiario || null,
          numero_contrato: numeroContrato || null,
          conta_destino: contaDestino,
        };

        console.debug('[OperacaoForm] financiamento basePayload', basePayload);

        // include optional advanced fields when present
        if (garantias) basePayload.garantias = garantias;
        if (taxaMulta) basePayload.taxa_multa = taxaMulta;
        if (taxaMora) basePayload.taxa_mora = taxaMora;
        if (observacoes) basePayload.observacoes = observacoes;
        // carência fields
        basePayload.carencia_meses = Number(carenciaMeses) || 0;
        basePayload.juros_embutidos = Boolean(jurosEmbutidos);

        // If contract file provided, send as multipart FormData
        if (contratoArquivo) {
          const fd = new FormData();
          Object.entries(basePayload).forEach(([k, v]) => {
            if (v !== null && typeof v !== 'undefined') fd.append(k, String(v));
          });
          fd.append('contrato_arquivo', contratoArquivo);
          console.debug('[OperacaoForm] sending FormData financiamento');
          const res = await createFinanciamento.mutateAsync(fd as any);
          if (onSaved) onSaved(res);
        } else {
          console.debug('[OperacaoForm] calling createFinanciamento with payload', basePayload);
          const res = await createFinanciamento.mutateAsync(basePayload as any);
          if (onSaved) onSaved(res);
        }
      }
      onClose();
    } catch (e: any) {
      console.error('Erro salvar operação:', e);
      const data = e?.response?.data;
      const msg = data ? (typeof data === 'string' ? data : JSON.stringify(data)) : (e?.message || 'erro desconhecido');
      alert('Falha ao salvar operação: ' + msg);
    }
  };

  return (
    <div>
      <div className="mb-3">
        <label className="form-label">Tipo</label>
        <select name="tipo" className="form-select" value={tipo} onChange={(e) => setTipo(e.target.value as any)}>
          <option value="emprestimo">Empréstimo</option>
          <option value="financiamento">Financiamento</option>
        </select>
      </div>

      <div className="mb-3">
        <label className="form-label">
          <i className="bi bi-tag me-2"></i>Título
        </label>
        <input name="titulo" className="form-control" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </div>

      <div className="row g-3">
        <div className="col-md-4">
          <label className="form-label">
            <i className="bi bi-cash me-2"></i>Valor Total
          </label>
          <input name="valor_total" className="form-control" value={String(valorTotal)} onChange={(e) => setValorTotal(e.target.value)} />
        </div>

        <div className="col-md-4">
          <label className="form-label">
            <i className="bi bi-cash me-2"></i>Valor de Entrada
          </label>
          <input name="valor_entrada" className="form-control" value={String(valorEntrada)} onChange={(e) => setValorEntrada(e.target.value)} />
        </div>

        <div className="col-md-4">
          <label className="form-label">
            <i className="bi bi-cash me-2"></i>Valor Financiado
          </label>
          <input name="valor_financiado" className="form-control" value={String(valorFinanciado)} onChange={(e) => setValorFinanciado(e.target.value)} />
        </div>
      </div>

      {/* --- NOVOS CAMPOS VISÍVEIS: taxa de juros, frequência e parcelas --- */}
      <div className="row g-3 mt-3">
        <div className="col-md-4">
          <label className="form-label">Taxa de Juros (%)</label>
          <input className="form-control" value={String(taxaJuros)} onChange={(e) => setTaxaJuros(e.target.value)} />
        </div>

        <div className="col-md-4">
          <label className="form-label">Frequência da Taxa</label>
          <select className="form-select" value={frequenciaTaxa} onChange={(e) => setFrequenciaTaxa(e.target.value)}>
            <option value="mensal">Mensal</option>
            <option value="trimestral">Trimestral</option>
            <option value="semestral">Semestral</option>
            <option value="anual">Anual</option>
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label">Método de Cálculo</label>
          <select className="form-select" value={metodoCalculo} onChange={(e) => setMetodoCalculo(e.target.value)}>
            <option value="price">Price</option>
            <option value="sac">SAC</option>
            <option value="personalizado">Personalizado</option>
          </select>
        </div>
      </div>

      <div className="row g-3 mt-2">
        <div className="col-md-4">
          <label className="form-label">Número de parcelas</label>
          <input className="form-control" type="number" value={String(numeroParcelas)} onChange={(e) => setNumeroParcelas(Number(e.target.value || 1))} />
        </div>

        <div className="col-md-4">
          <label className="form-label">Prazo (meses)</label>
          <input className="form-control" type="number" value={String(prazoMeses)} onChange={(e) => setPrazoMeses(Number(e.target.value || 1))} />
        </div>

        <div className="col-md-4 d-flex align-items-center">
          <div>
            <label className="form-label mb-1">Carência (meses)</label>
            <input type="number" name="carencia_meses" className="form-control" value={String(carenciaMeses)} onChange={(e) => setCarenciaMeses(Number(e.target.value || 0))} />
          </div>
        </div>
      </div>

      <div className="form-check mt-2 mb-3">
        <input className="form-check-input" type="checkbox" id="jurosEmbutidosQuick" checked={jurosEmbutidos} onChange={(e) => setJurosEmbutidos(e.target.checked)} />
        <label className="form-check-label" htmlFor="jurosEmbutidosQuick">Juros embutidos na carência (capitalizar)</label>
      </div>

      <div className="mb-3">
        <label className="form-label">
          <i className="bi bi-calendar me-2"></i>Data de Contratação
        </label>
        <input type="date" name="data_contratacao" className="form-control" value={dataContrato} onChange={(e) => setDataContrato(e.target.value)} />
      </div>

      {tipo === 'emprestimo' ? (
        <>
          <div className="mb-3">
            <label className="form-label">Data primeiro vencimento</label>
            <input name="data_primeiro_vencimento" type="date" className="form-control" value={dataPrimeiroVencimento} onChange={(e) => setDataPrimeiroVencimento(e.target.value)} />
          </div>

          <div className="mb-3">
            <label className="form-label">
              <i className="bi bi-building me-2"></i>Beneficiário (Cliente)
            </label>
            <select name="beneficiario" className="form-select" value={beneficiario ?? ''} onChange={(e) => setBeneficiario(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Selecione...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome || c.razao_social || c.cpf_cnpj}</option>)}
            </select>
          </div>

          <div className="mb-3">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="temItensCheckbox"
                checked={temItens}
                onChange={(e) => setTemItens(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="temItensCheckbox">
                <i className="bi bi-box me-2"></i>Este empréstimo financia produtos do estoque
              </label>
            </div>
            <small className="text-muted d-block mt-2">
              Marque esta opção para adicionar produtos específicos e o valor total será calculado automaticamente.
            </small>
          </div>

          {temItens && (
            <>
              <ProductSelector onAddItem={handleAddItem} />
              <ItemEmprestimoList items={items as any} onRemoveItem={handleRemoveItem} />
              {items.length > 0 && (
                <div className="alert alert-info">
                  <strong>Valor Total (baseado nos produtos):</strong> R$ {valueTotalFromItems.toFixed(2)}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <div className="mb-3">
            <label className="form-label">
              <i className="bi bi-bank me-2"></i>Beneficiário (Instituição BACEN)
            </label>
            <div data-testid="instituicao-select">
              <SelectDropdown
                options={insts
                  .filter((i: any) => i && (typeof i.id === 'number' || typeof i.id === 'string'))
                  .map((i: any) => ({ value: i.id, label: `${i.codigo_bacen} — ${i.nome}` }))}
                value={beneficiario ?? ''}
                onChange={(v) => setBeneficiario(v ? Number(v) : null)}
                placeholder="Selecione instituição (nome ou código)"
                searchable={true}
                onSearch={async (term: string) => {
                  const results = await instituicoesSearch(term);
                  return results.map((r: any) => ({ value: r.id, label: `${r.codigo_bacen} — ${r.nome}` }));
                }}
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Tipo de Financiamento</label>
            <select name="tipo_financiamento" className="form-select" value={tipoFinanciamento} onChange={(e) => setTipoFinanciamento(e.target.value)}>
              <option value="credito_rotativo">Crédito Rotativo</option>
              <option value="custeio">Custeio</option>
              <option value="cpr">CPR</option>
              <option value="investimento">Investimento</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">Número do Contrato (opcional)</label>
            <input name="numero_contrato" className="form-control" value={String(numeroContrato || '')} onChange={(e) => setNumeroContrato(e.target.value)} placeholder="Ex: CT-12345" />
          </div>

          <div className="mb-3">
            <label className="form-label">
              <i className="bi bi-bank me-2"></i>Conta Destino (obrigatória)
            </label>
            <select name="conta_destino" className="form-select" value={contaDestino ?? ''} onChange={(e) => setContaDestino(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Selecione...</option>
              {contas.map((c: any) => <option key={c.id} value={c.id}>{c.banco} — {c.conta}</option>)}
            </select>
          </div>

          <div className="mb-3">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setAdvancedOpen(!advancedOpen)}>{advancedOpen ? 'Ocultar campos avançados' : 'Mostrar campos avançados (opcionais)'}</button>
          </div>

          {advancedOpen && (
            <>
              <div className="mb-3">
                <label className="form-label">Taxa de Multa (%)</label>
                <input name="taxa_multa" className="form-control" value={String(taxaMulta)} onChange={(e) => setTaxaMulta(e.target.value)} />
              </div>

              <div className="mb-3">
                <label className="form-label">Taxa de Mora (%)</label>
                <input name="taxa_mora" className="form-control" value={String(taxaMora)} onChange={(e) => setTaxaMora(e.target.value)} />
              </div>

              <div className="mb-3">
                <label className="form-label">Carência (meses)</label>
                <input type="number" name="carencia_meses" className="form-control" value={String(carenciaMeses)} onChange={(e) => setCarenciaMeses(Number(e.target.value || 0))} />
              </div>

              <div className="form-check mb-3">
                <input className="form-check-input" type="checkbox" id="jurosEmbutidos" checked={jurosEmbutidos} onChange={(e) => setJurosEmbutidos(e.target.checked)} />
                <label className="form-check-label" htmlFor="jurosEmbutidos">Juros embutidos durante carência (capitalizar)</label>
              </div>

              <div className="mb-3">
                <label className="form-label">Garantias</label>
                <textarea className="form-control" value={garantias} onChange={(e) => setGarantias(e.target.value)} />
              </div>

              <div className="mb-3">
                <label className="form-label">Observações</label>
                <textarea className="form-control" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
              </div>

              <div className="mb-3">
                <label className="form-label">Arquivo do Contrato (opcional)</label>
                <input type="file" className="form-control" onChange={(e) => setContratoArquivo(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
              </div>
            </>
          )}
        </>
      )}

      <div className="d-flex justify-content-end gap-2">
        <button className="btn btn-outline-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave}>{isEdit ? 'Salvar' : 'Criar'}</button>
      </div>
    </div>
  );
};

export default OperacaoForm;
