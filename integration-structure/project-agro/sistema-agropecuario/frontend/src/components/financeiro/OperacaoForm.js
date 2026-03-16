import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useApiCreate, useApiQuery } from '@/hooks/useApi';
import ComercialService from '@/services/comercial';
import SelectDropdown from '@/components/common/SelectDropdown';
import ProductSelector from '@/components/financeiro/ProductSelector';
import ItemEmprestimoList from '@/components/financeiro/ItemEmprestimoList';
const OperacaoForm = ({ tipo: tipoProp, initialData, onClose, onSaved }) => {
    const isEdit = !!initialData;
    const [tipo, setTipo] = useState(tipoProp || initialData?.tipo || 'emprestimo');
    const [titulo, setTitulo] = useState(initialData?.titulo || '');
    const [beneficiario, setBeneficiario] = useState(initialData?.beneficiario ?? null);
    const [valorTotal, setValorTotal] = useState(initialData?.valor_total ?? (initialData?.valor || '0.00'));
    const [valorEntrada, setValorEntrada] = useState(initialData?.valor_entrada || '0.00');
    const [valorFinanciado, setValorFinanciado] = useState(initialData?.valor_financiado || (initialData?.valor || '0.00'));
    const [taxaJuros, setTaxaJuros] = useState(initialData?.taxa_juros || '0.00');
    const [frequenciaTaxa, setFrequenciaTaxa] = useState(initialData?.frequencia_taxa || 'mensal');
    const [metodoCalculo, setMetodoCalculo] = useState(initialData?.metodo_calculo || 'price');
    const [numeroParcelas, setNumeroParcelas] = useState(initialData?.numero_parcelas || 1);
    const [prazoMeses, setPrazoMeses] = useState(initialData?.prazo_meses || 1);
    const [dataContrato, setDataContrato] = useState(initialData?.data_contratacao || '');
    const [dataPrimeiroVencimento, setDataPrimeiroVencimento] = useState(initialData?.data_primeiro_vencimento || '');
    const [status, setStatus] = useState(initialData?.status || 'ativo');
    const [tipoFinanciamento, setTipoFinanciamento] = useState(initialData?.tipo_financiamento || 'custeio');
    const [numeroContrato, setNumeroContrato] = useState(initialData?.numero_contrato || '');
    // cálculo / parcelas
    // advanced optional fields
    const [garantias, setGarantias] = useState(initialData?.garantias || '');
    const [contratoArquivo, setContratoArquivo] = useState(null);
    const [taxaMulta, setTaxaMulta] = useState(initialData?.taxa_multa || '');
    const [taxaMora, setTaxaMora] = useState(initialData?.taxa_mora || '');
    const [observacoes, setObservacoes] = useState(initialData?.observacoes || '');
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [contaDestino, setContaDestino] = useState(initialData?.conta_destino ?? null);
    const [carenciaMeses, setCarenciaMeses] = useState(initialData?.carencia_meses || 0);
    const [jurosEmbutidos, setJurosEmbutidos] = useState(initialData?.juros_embutidos || false);
    // State for product items (ItemEmprestimo)
    const [temItens, setTemItens] = useState(false);
    const [items, setItems] = useState(initialData?.itens_produtos || []);
    const [valueTotalFromItems, setValueTotalFromItems] = useState(0);
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
    const handleAddItem = (newItem) => {
        setItems([...items, newItem]);
    };
    const handleRemoveItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };
    const { data: clientes = [] } = useApiQuery(['clientes'], '/comercial/clientes/');
    // request larger page to avoid truncated lists in dropdowns
    const { data: insts = [] } = useApiQuery(['instituicoes'], '/comercial/instituicoes-financeiras/?page_size=1000');
    const { data: contas = [] } = useApiQuery(['contas'], '/financeiro/contas/?page_size=1000');
    // local helper that wraps remote search and returns [] on failure to avoid bubbling rejections
    const instituicoesSearch = async (term) => {
        try {
            const results = await ComercialService.getInstituicoes({ busca: term });
            return results || [];
        }
        catch (e) {
            console.warn('Instituições search failed:', e);
            return [];
        }
    };
    // create mutations (we will post to the right endpoint dynamically)
    const createEmprestimo = useApiCreate('/financeiro/emprestimos/', [['emprestimos']]);
    const createFinanciamento = useApiCreate('/financeiro/financiamentos/', [['financiamentos']]);
    useEffect(() => {
        if (tipoProp)
            setTipo(tipoProp);
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
        if (!titulo || !titulo.trim())
            return 'Título obrigatório';
        if (!valorTotal || isNaN(Number(String(valorTotal))))
            return 'Valor inválido';
        // For empréstimo: beneficiário é o cliente; for financiamento: é a instituição
        if (tipo === 'emprestimo' && !beneficiario)
            return 'Beneficiário (cliente) obrigatório';
        if (tipo === 'financiamento') {
            if (!beneficiario)
                return 'Beneficiário (instituição) obrigatório';
            if (!contaDestino)
                return 'Conta de destino obrigatória';
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
                    const base = dataContrato || new Date().toISOString().slice(0, 10);
                    const dt = new Date(base);
                    dt.setMonth(dt.getMonth() + 1);
                    return dt.toISOString().slice(0, 10);
                })();
                const payload = {
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
                    }
                    catch (itemErr) {
                        console.warn('[OperacaoForm] error creating items:', itemErr);
                        // Items creation failed but emprestimo was created - notify user
                        alert('Empréstimo criado, mas houve erro ao criar os itens de produto. Tente novamente.');
                    }
                }
                if (onSaved)
                    onSaved(res);
            }
            else {
                console.debug('[OperacaoForm] preparing financiamento payload');
                const dataContratoVal = dataContrato || new Date().toISOString().slice(0, 10);
                const firstVenc = dataPrimeiroVencimento || (() => { const dt = new Date(dataContratoVal); dt.setMonth(dt.getMonth() + 1); return dt.toISOString().slice(0, 10); })();
                const basePayload = {
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
                if (garantias)
                    basePayload.garantias = garantias;
                if (taxaMulta)
                    basePayload.taxa_multa = taxaMulta;
                if (taxaMora)
                    basePayload.taxa_mora = taxaMora;
                if (observacoes)
                    basePayload.observacoes = observacoes;
                // carência fields
                basePayload.carencia_meses = Number(carenciaMeses) || 0;
                basePayload.juros_embutidos = Boolean(jurosEmbutidos);
                // If contract file provided, send as multipart FormData
                if (contratoArquivo) {
                    const fd = new FormData();
                    Object.entries(basePayload).forEach(([k, v]) => {
                        if (v !== null && typeof v !== 'undefined')
                            fd.append(k, String(v));
                    });
                    fd.append('contrato_arquivo', contratoArquivo);
                    console.debug('[OperacaoForm] sending FormData financiamento');
                    const res = await createFinanciamento.mutateAsync(fd);
                    if (onSaved)
                        onSaved(res);
                }
                else {
                    console.debug('[OperacaoForm] calling createFinanciamento with payload', basePayload);
                    const res = await createFinanciamento.mutateAsync(basePayload);
                    if (onSaved)
                        onSaved(res);
                }
            }
            onClose();
        }
        catch (e) {
            console.error('Erro salvar operação:', e);
            const data = e?.response?.data;
            const msg = data ? (typeof data === 'string' ? data : JSON.stringify(data)) : (e?.message || 'erro desconhecido');
            alert('Falha ao salvar operação: ' + msg);
        }
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Tipo" }), _jsxs("select", { name: "tipo", className: "form-select", value: tipo, onChange: (e) => setTipo(e.target.value), children: [_jsx("option", { value: "emprestimo", children: "Empr\u00E9stimo" }), _jsx("option", { value: "financiamento", children: "Financiamento" })] })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-tag me-2" }), "T\u00EDtulo"] }), _jsx("input", { name: "titulo", className: "form-control", value: titulo, onChange: (e) => setTitulo(e.target.value) })] }), _jsxs("div", { className: "row g-3", children: [_jsxs("div", { className: "col-md-4", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-cash me-2" }), "Valor Total"] }), _jsx("input", { name: "valor_total", className: "form-control", value: String(valorTotal), onChange: (e) => setValorTotal(e.target.value) })] }), _jsxs("div", { className: "col-md-4", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-cash me-2" }), "Valor de Entrada"] }), _jsx("input", { name: "valor_entrada", className: "form-control", value: String(valorEntrada), onChange: (e) => setValorEntrada(e.target.value) })] }), _jsxs("div", { className: "col-md-4", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-cash me-2" }), "Valor Financiado"] }), _jsx("input", { name: "valor_financiado", className: "form-control", value: String(valorFinanciado), onChange: (e) => setValorFinanciado(e.target.value) })] })] }), _jsxs("div", { className: "row g-3 mt-3", children: [_jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label", children: "Taxa de Juros (%)" }), _jsx("input", { className: "form-control", value: String(taxaJuros), onChange: (e) => setTaxaJuros(e.target.value) })] }), _jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label", children: "Frequ\u00EAncia da Taxa" }), _jsxs("select", { className: "form-select", value: frequenciaTaxa, onChange: (e) => setFrequenciaTaxa(e.target.value), children: [_jsx("option", { value: "mensal", children: "Mensal" }), _jsx("option", { value: "trimestral", children: "Trimestral" }), _jsx("option", { value: "semestral", children: "Semestral" }), _jsx("option", { value: "anual", children: "Anual" })] })] }), _jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label", children: "M\u00E9todo de C\u00E1lculo" }), _jsxs("select", { className: "form-select", value: metodoCalculo, onChange: (e) => setMetodoCalculo(e.target.value), children: [_jsx("option", { value: "price", children: "Price" }), _jsx("option", { value: "sac", children: "SAC" }), _jsx("option", { value: "personalizado", children: "Personalizado" })] })] })] }), _jsxs("div", { className: "row g-3 mt-2", children: [_jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label", children: "N\u00FAmero de parcelas" }), _jsx("input", { className: "form-control", type: "number", value: String(numeroParcelas), onChange: (e) => setNumeroParcelas(Number(e.target.value || 1)) })] }), _jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label", children: "Prazo (meses)" }), _jsx("input", { className: "form-control", type: "number", value: String(prazoMeses), onChange: (e) => setPrazoMeses(Number(e.target.value || 1)) })] }), _jsx("div", { className: "col-md-4 d-flex align-items-center", children: _jsxs("div", { children: [_jsx("label", { className: "form-label mb-1", children: "Car\u00EAncia (meses)" }), _jsx("input", { type: "number", name: "carencia_meses", className: "form-control", value: String(carenciaMeses), onChange: (e) => setCarenciaMeses(Number(e.target.value || 0)) })] }) })] }), _jsxs("div", { className: "form-check mt-2 mb-3", children: [_jsx("input", { className: "form-check-input", type: "checkbox", id: "jurosEmbutidosQuick", checked: jurosEmbutidos, onChange: (e) => setJurosEmbutidos(e.target.checked) }), _jsx("label", { className: "form-check-label", htmlFor: "jurosEmbutidosQuick", children: "Juros embutidos na car\u00EAncia (capitalizar)" })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-calendar me-2" }), "Data de Contrata\u00E7\u00E3o"] }), _jsx("input", { type: "date", name: "data_contratacao", className: "form-control", value: dataContrato, onChange: (e) => setDataContrato(e.target.value) })] }), tipo === 'emprestimo' ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Data primeiro vencimento" }), _jsx("input", { name: "data_primeiro_vencimento", type: "date", className: "form-control", value: dataPrimeiroVencimento, onChange: (e) => setDataPrimeiroVencimento(e.target.value) })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-building me-2" }), "Benefici\u00E1rio (Cliente)"] }), _jsxs("select", { name: "beneficiario", className: "form-select", value: beneficiario ?? '', onChange: (e) => setBeneficiario(e.target.value ? Number(e.target.value) : null), children: [_jsx("option", { value: "", children: "Selecione..." }), clientes.map(c => _jsx("option", { value: c.id, children: c.nome || c.razao_social || c.cpf_cnpj }, c.id))] })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("div", { className: "form-check", children: [_jsx("input", { className: "form-check-input", type: "checkbox", id: "temItensCheckbox", checked: temItens, onChange: (e) => setTemItens(e.target.checked) }), _jsxs("label", { className: "form-check-label", htmlFor: "temItensCheckbox", children: [_jsx("i", { className: "bi bi-box me-2" }), "Este empr\u00E9stimo financia produtos do estoque"] })] }), _jsx("small", { className: "text-muted d-block mt-2", children: "Marque esta op\u00E7\u00E3o para adicionar produtos espec\u00EDficos e o valor total ser\u00E1 calculado automaticamente." })] }), temItens && (_jsxs(_Fragment, { children: [_jsx(ProductSelector, { onAddItem: handleAddItem }), _jsx(ItemEmprestimoList, { items: items, onRemoveItem: handleRemoveItem }), items.length > 0 && (_jsxs("div", { className: "alert alert-info", children: [_jsx("strong", { children: "Valor Total (baseado nos produtos):" }), " R$ ", valueTotalFromItems.toFixed(2)] }))] }))] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-bank me-2" }), "Benefici\u00E1rio (Institui\u00E7\u00E3o BACEN)"] }), _jsx("div", { "data-testid": "instituicao-select", children: _jsx(SelectDropdown, { options: insts
                                        .filter((i) => i && (typeof i.id === 'number' || typeof i.id === 'string'))
                                        .map((i) => ({ value: i.id, label: `${i.codigo_bacen} — ${i.nome}` })), value: beneficiario ?? '', onChange: (v) => setBeneficiario(v ? Number(v) : null), placeholder: "Selecione institui\u00E7\u00E3o (nome ou c\u00F3digo)", searchable: true, onSearch: async (term) => {
                                        const results = await instituicoesSearch(term);
                                        return results.map((r) => ({ value: r.id, label: `${r.codigo_bacen} — ${r.nome}` }));
                                    } }) })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Tipo de Financiamento" }), _jsxs("select", { name: "tipo_financiamento", className: "form-select", value: tipoFinanciamento, onChange: (e) => setTipoFinanciamento(e.target.value), children: [_jsx("option", { value: "credito_rotativo", children: "Cr\u00E9dito Rotativo" }), _jsx("option", { value: "custeio", children: "Custeio" }), _jsx("option", { value: "cpr", children: "CPR" }), _jsx("option", { value: "investimento", children: "Investimento" })] })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "N\u00FAmero do Contrato (opcional)" }), _jsx("input", { name: "numero_contrato", className: "form-control", value: String(numeroContrato || ''), onChange: (e) => setNumeroContrato(e.target.value), placeholder: "Ex: CT-12345" })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-bank me-2" }), "Conta Destino (obrigat\u00F3ria)"] }), _jsxs("select", { name: "conta_destino", className: "form-select", value: contaDestino ?? '', onChange: (e) => setContaDestino(e.target.value ? Number(e.target.value) : null), children: [_jsx("option", { value: "", children: "Selecione..." }), contas.map((c) => _jsxs("option", { value: c.id, children: [c.banco, " \u2014 ", c.conta] }, c.id))] })] }), _jsx("div", { className: "mb-3", children: _jsx("button", { type: "button", className: "btn btn-sm btn-outline-secondary", onClick: () => setAdvancedOpen(!advancedOpen), children: advancedOpen ? 'Ocultar campos avançados' : 'Mostrar campos avançados (opcionais)' }) }), advancedOpen && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Taxa de Multa (%)" }), _jsx("input", { name: "taxa_multa", className: "form-control", value: String(taxaMulta), onChange: (e) => setTaxaMulta(e.target.value) })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Taxa de Mora (%)" }), _jsx("input", { name: "taxa_mora", className: "form-control", value: String(taxaMora), onChange: (e) => setTaxaMora(e.target.value) })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Car\u00EAncia (meses)" }), _jsx("input", { type: "number", name: "carencia_meses", className: "form-control", value: String(carenciaMeses), onChange: (e) => setCarenciaMeses(Number(e.target.value || 0)) })] }), _jsxs("div", { className: "form-check mb-3", children: [_jsx("input", { className: "form-check-input", type: "checkbox", id: "jurosEmbutidos", checked: jurosEmbutidos, onChange: (e) => setJurosEmbutidos(e.target.checked) }), _jsx("label", { className: "form-check-label", htmlFor: "jurosEmbutidos", children: "Juros embutidos durante car\u00EAncia (capitalizar)" })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Garantias" }), _jsx("textarea", { className: "form-control", value: garantias, onChange: (e) => setGarantias(e.target.value) })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Observa\u00E7\u00F5es" }), _jsx("textarea", { className: "form-control", value: observacoes, onChange: (e) => setObservacoes(e.target.value) })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Arquivo do Contrato (opcional)" }), _jsx("input", { type: "file", className: "form-control", onChange: (e) => setContratoArquivo(e.target.files && e.target.files[0] ? e.target.files[0] : null) })] })] }))] })), _jsxs("div", { className: "d-flex justify-content-end gap-2", children: [_jsx("button", { className: "btn btn-outline-secondary", onClick: onClose, children: "Cancelar" }), _jsx("button", { className: "btn btn-primary", onClick: handleSave, children: isEdit ? 'Salvar' : 'Criar' })] })] }));
};
export default OperacaoForm;
