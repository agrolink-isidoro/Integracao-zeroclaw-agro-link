import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { X, Plus } from 'lucide-react';
import type { Fornecedor, Endereco, Contato, Documento } from '../../types/comercial';
import Input from '../common/Input';
import SelectDropdown from '../common/SelectDropdown';
import ModalForm from '../common/ModalForm';
import Button from '../Button';
import { useApiQuery } from '@/hooks/useApi';

const schema = yup.object().shape({
  tipo_pessoa: yup.string().required('Tipo de pessoa é obrigatório'),
  cpf_cnpj: yup.string().required('CPF/CNPJ é obrigatório'),
  nome_completo: yup.string().when('tipo_pessoa', {
    is: 'pf',
    then: (schema) => schema.required('Nome completo é obrigatório para pessoa física'),
  }),
  razao_social: yup.string().when('tipo_pessoa', {
    is: 'pj',
    then: (schema) => schema.required('Razão social é obrigatória para pessoa jurídica'),
  }),
  nome_fantasia: yup.string(),
  inscricao_estadual: yup.string(),
  inscricao_municipal: yup.string(),
  categoria_fornecedor: yup.string().required('Categoria é obrigatória'),
  status: yup.string().required('Status é obrigatório'),
  prazo_pagamento_padrao: yup.number().min(0, 'Prazo deve ser positivo'),
  limite_credito: yup.number().min(0, 'Limite deve ser positivo'),
  observacoes: yup.string(),

  // Endereço
  endereco: yup.object().shape({
    logradouro: yup.string().required('Logradouro é obrigatório'),
    numero: yup.string().required('Número é obrigatório'),
    complemento: yup.string(),
    bairro: yup.string().required('Bairro é obrigatório'),
    cidade: yup.string().required('Cidade é obrigatória'),
    estado: yup.string().required('Estado é obrigatório'),
    cep: yup.string().required('CEP é obrigatório'),
    pais: yup.string(),
  }),

  // Contato
  contato: yup.object().shape({
    telefone_principal: yup.string().required('Telefone principal é obrigatório'),
    telefone_secundario: yup.string(),
    email_principal: yup.string().email('E-mail inválido').required('E-mail principal é obrigatório'),
    email_secundario: yup.string().email('E-mail inválido'),
    site: yup.string().url('URL inválida'),
    observacoes: yup.string(),
  }),
});

interface FornecedorFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Fornecedor, 'id'>) => Promise<void>;
  fornecedor?: Fornecedor;
  loading?: boolean;
  onCancel?: () => void;
}

const FornecedorForm: React.FC<FornecedorFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  fornecedor,
  loading = false
}) => {
  const [activeTab, setActiveTab] = useState<'dados_gerais' | 'endereco' | 'contato' | 'dados_bancarios' | 'documentos'>('dados_gerais');
  const [documentos, setDocumentos] = useState<Documento[]>(fornecedor?.documentos || []);

  const { control, handleSubmit, watch, setValue, setError, getValues, formState: { errors } } = useForm<Fornecedor>({
    resolver: yupResolver(schema),
    defaultValues: fornecedor || {
      tipo_pessoa: 'pj',
      status: 'ativo',
      categoria_fornecedor: 'insumos',
      endereco: {} as Endereco,
      contato: {} as Contato,
      dados_bancarios: { banco: '', agencia: '', conta: '', tipo_conta: '', titular: '', chave_pix: '', tipo_chave_pix: '' },
      documentos: [],
    }
  });

  const tipoPessoa = watch('tipo_pessoa');
  const dadosBancoTipo = watch('dados_bancarios.tipo_chave_pix');
  const dadosBancoChave = watch('dados_bancarios.chave_pix');

  // Load instituições (bancos) for Banco dropdown
  const { data: insts = [] } = useApiQuery<any[]>(['instituicoes'], '/comercial/instituicoes-financeiras/?page_size=1000');

  useEffect(() => {
    if (fornecedor) {
      Object.keys(fornecedor).forEach(key => {
        if (key !== 'documentos') {
          setValue(key as keyof Fornecedor, fornecedor[key as keyof Fornecedor]);
        }
      });
      setDocumentos(fornecedor.documentos || []);
    }
  }, [fornecedor, setValue]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    // Capture any native submit events (before React handlers) so we can tell
    // whether the browser attempted a native submit when the modal form is submitted.
    (window as any).__submitEvents = (window as any).__submitEvents || [];
    const handler = (ev: Event) => {
      try {
        const target = ev.target as HTMLFormElement;
        const fd = new FormData(target);
        const entries = Array.from(fd.entries()).slice(0, 50);
        console.debug('[DOM SUBMIT] event captured', { entries, defaultPrevented: ev.defaultPrevented });
        (window as any).__submitEvents.push({ ts: Date.now(), entries, defaultPrevented: ev.defaultPrevented });

        // Log delayed defaultPrevented value as some handlers may set it later
        setTimeout(() => {
          try {
            console.debug('[DOM SUBMIT] delayed defaultPrevented=', (ev as any).defaultPrevented);
          } catch (e) {
            // ignore
          }
        }, 50);
      } catch (e) {
        console.debug('[DOM SUBMIT] capture error', e);
      }
    };

    // Instrument stopPropagation/stopImmediatePropagation to detect if someone stops the event
    const origStop = Event.prototype.stopPropagation;
    const origStopImmediate = Event.prototype.stopImmediatePropagation;
    const origPrevent = Event.prototype.preventDefault;

    Event.prototype.stopPropagation = function () {
      (window as any).__stopPropCalls = ((window as any).__stopPropCalls || 0) + 1;
      return origStop.apply(this, arguments as any);
    };
    Event.prototype.stopImmediatePropagation = function () {
      (window as any).__stopImmediateCalls = ((window as any).__stopImmediateCalls || 0) + 1;
      return origStopImmediate.apply(this, arguments as any);
    };

    // Capture preventDefault calls and their stacks to know who called it
    Event.prototype.preventDefault = function () {
      try {
        const stack = (new Error()).stack || '';
        (window as any).__preventDefaultCalls = (window as any).__preventDefaultCalls || [];
        (window as any).__preventDefaultCalls.push({ ts: Date.now(), stack });
      } catch (e) {
        // ignore
      }
      return origPrevent.apply(this, arguments as any);
    };

    document.addEventListener('submit', handler, true);

    // Expose helper to dump react-hook-form values on demand
    (window as any).__dumpFornecedor = () => getValues();

    return () => {
      document.removeEventListener('submit', handler, true);
      // restore originals
      Event.prototype.stopPropagation = origStop;
      Event.prototype.stopImmediatePropagation = origStopImmediate;
      Event.prototype.preventDefault = origPrevent;
    };
  }, [getValues]);

  // Expose form errors so tests can inspect them
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    (window as any).__dumpFornecedorErrors = () => errors;
  }, [errors]);

  const handleFormSubmit = async (data: Fornecedor) => {
    try {
      if (process.env.NODE_ENV === 'development') console.debug('[FornecedorForm] handleFormSubmit called, documentos count=', documentos.length, 'data keys=', Object.keys(data).slice(0,10));
      await onSubmit({
        ...data,
        documentos,
      });
      if (process.env.NODE_ENV === 'development') console.debug('[FornecedorForm] onSubmit resolved, closing modal');
      onClose();
    } catch (error: unknown) {
      console.error('Erro ao salvar fornecedor:', error);

      // Try to extract server-side validation errors and map them to form fields
      const ae = error as { response?: { data?: any } };
      const body = ae.response?.data;
      if (body && typeof body === 'object') {
        // Common patterns: { field: ['msg'] } or { field: 'msg' } or { detail: '...' }
        for (const key of Object.keys(body)) {
          const val = body[key];
          if (Array.isArray(val)) {
            setError(key as keyof Fornecedor, { type: 'server', message: val.join('; ') });
          } else if (typeof val === 'string') {
            setError(key as keyof Fornecedor, { type: 'server', message: val });
          } else if (typeof val === 'object' && val !== null) {
            // nested object, try to flatten (e.g., produtos_operacao, documentos)
            const messages: string[] = [];
            for (const sub of Object.values(val)) {
              if (Array.isArray(sub)) messages.push(sub.join('; '));
              else if (typeof sub === 'string') messages.push(sub);
            }
            if (messages.length) setError(key as keyof Fornecedor, { type: 'server', message: messages.join('; ') });
          }
        }
      }

      // rethrow so parent can also handle (e.g., show toast)
      throw error;
    }
  };

  const addDocumento = () => {
    setDocumentos([...documentos, {
      tipo: 'outros',
      numero: '',
    }]);
  };

  const removeDocumento = (index: number) => {
    setDocumentos(documentos.filter((_, i) => i !== index));
  };

  const updateDocumento = (index: number, field: keyof Documento, value: Documento[keyof Documento]) => {
    const updated = [...documentos];
    updated[index] = { ...updated[index], [field]: value as Documento[typeof field] } as Documento;
    setDocumentos(updated);
  };

  type TabId = 'dados_gerais' | 'endereco' | 'contato' | 'dados_bancarios' | 'documentos';
  type Tab = { id: TabId; label: string; icon: string };
  const tabs: Tab[] = [
    { id: 'dados_gerais', label: 'Dados Gerais', icon: '📋' },
    { id: 'endereco', label: 'Endereço', icon: '📍' },
    { id: 'contato', label: 'Contato', icon: '📞' },
    { id: 'dados_bancarios', label: 'Dados Bancários', icon: '🏦' },
    { id: 'documentos', label: 'Documentos', icon: '📄' },
  ];

  return (
    <ModalForm
      isOpen={isOpen}
      title={fornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
      onClose={onClose}
      size="xl"
    >
      <form onSubmit={(e) => {
        try {
          if (process.env.NODE_ENV === 'development') console.debug('[FornecedorForm] React onSubmit wrapper invoked');
          const res = handleSubmit(handleFormSubmit)(e as any);
          if (res && typeof (res as any).then === 'function') {
            (res as any).then(() => { if (process.env.NODE_ENV === 'development') console.debug('[FornecedorForm] handleSubmit resolved'); }).catch((err: any) => console.error('[FornecedorForm] handleSubmit rejected', err));
          }
          return res;
        } catch (err) {
          console.error('[FornecedorForm] React onSubmit wrapper error', err);
          throw err;
        }
      }}>
        {/* Tabs */}
        <div className="border-bottom mb-3">
          <nav className="d-flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-bottom border-2 fw-medium small ms-2 ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted'
                }`}
              >
                <span className="me-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div style={{ minHeight: '400px' }} className="mb-3">
          {activeTab === 'dados_gerais' && (
            <div className="row g-2 g-md-3">
              <div className="col-12 col-md-6">
                <label className="form-label">
                  Tipo de Pessoa
                </label>
                <Controller
                  name="tipo_pessoa"
                  control={control}
                  render={({ field }) => (
                    <SelectDropdown
                      options={[
                        { value: 'pf', label: 'Pessoa Física' },
                        { value: 'pj', label: 'Pessoa Jurídica' },
                      ]}
                      {...field}
                      error={errors.tipo_pessoa?.message}
                    />
                  )}
                />
              </div>

              <div className="col-12 col-md-6">
              <Controller
                name="cpf_cnpj"
                control={control}
                render={({ field }) => (
                  <Input
                    label={tipoPessoa === 'pf' ? 'CPF' : 'CNPJ'}
                    placeholder={tipoPessoa === 'pf' ? '000.000.000-00' : '00.000.000/0000-00'}
                    {...field}
                    error={errors.cpf_cnpj?.message}
                  />
                )}
              />
              </div>

              {tipoPessoa === 'pf' ? (
                <div className="col-12 col-md-6">
                <Controller
                  name="nome_completo"
                  control={control}
                  render={({ field }) => (
                    <Input
                      label="Nome Completo"
                      {...field}
                      error={errors.nome_completo?.message}
                    />
                  )}
                />
                </div>
              ) : (
                <>
                  <div className="col-12 col-md-6">
                  <Controller
                    name="razao_social"
                    control={control}
                    render={({ field }) => (
                      <Input
                        label="Razão Social"
                        {...field}
                        error={errors.razao_social?.message}
                      />
                    )}
                  />
                  </div>
                  <div className="col-12 col-md-6">
                  <Controller
                    name="nome_fantasia"
                    control={control}
                    render={({ field }) => (
                      <Input
                        label="Nome Fantasia"
                        {...field}
                        error={errors.nome_fantasia?.message}
                      />
                    )}
                  />
                  </div>
                </>
              )}

              <div className="col-12 col-md-6">
                <label className="form-label">
                  Categoria
                </label>
                <Controller
                  name="categoria_fornecedor"
                  control={control}
                  render={({ field }) => (
                    <SelectDropdown
                      options={[
                        { value: 'insumos', label: 'Insumos Agrícolas' },
                        { value: 'servicos', label: 'Serviços' },
                        { value: 'maquinas', label: 'Máquinas e Equipamentos' },
                        { value: 'transporte', label: 'Transporte / Logística' },
                        { value: 'produtos_agricolas', label: 'Produtos Agrícolas' },
                        { value: 'combustiveis', label: 'Combustíveis' },
                        { value: 'ti', label: 'TI / Soluções Digitais' },
                        { value: 'manutencao', label: 'Manutenção / Peças' },
                        { value: 'prestador_servicos', label: 'Prestadores de Serviços' },
                        { value: 'fabricante', label: 'Fabricante' },
                        { value: 'outros', label: 'Outros' },
                      ]}
                      {...field}
                      error={errors.categoria_fornecedor?.message}
                    />
                  )}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">
                  Status
                </label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <SelectDropdown
                      options={[
                        { value: 'ativo', label: 'Ativo' },
                        { value: 'inativo', label: 'Inativo' },
                        { value: 'bloqueado', label: 'Bloqueado' },
                        { value: 'pendente', label: 'Pendente' },
                      ]}
                      {...field}
                      error={errors.status?.message}
                    />
                  )}
                />
              </div>

              <div className="col-12 col-md-6">
              <Controller
                name="prazo_pagamento_padrao"
                control={control}
                render={({ field }) => (
                  <Input
                    label="Prazo de Pagamento (dias)"
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    error={errors.prazo_pagamento_padrao?.message}
                  />
                )}
              />
              </div>

              <div className="col-12 col-md-6">
              <Controller
                name="limite_credito"
                control={control}
                render={({ field }) => (
                  <Input
                    label="Limite de Crédito"
                    type="number"
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    error={errors.limite_credito?.message}
                  />
                )}
              />
              </div>

              <div className="col-12">
                <Controller
                  name="observacoes"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label className="form-label">
                        Observações
                      </label>
                      <textarea
                        {...field}
                        rows={3}
                        className="form-control"
                      />
                    </div>
                  )}
                />
              </div>
            </div>
          )}

          {activeTab === 'endereco' && (
            <div className="row g-2 g-md-3">
              <div className="col-12 col-md-6">
              <Controller
                name="endereco.cep"
                control={control}
                render={({ field }) => (
                  <Input
                    label="CEP"
                    placeholder="00000-000"
                    {...field}
                    error={errors.endereco?.cep?.message}
                  />
                )}
              />
              </div>

              <div className="col-12 col-md-6">
              <Controller
                name="endereco.logradouro"
                control={control}
                render={({ field }) => (
                  <Input
                    label="Logradouro"
                    {...field}
                    error={errors.endereco?.logradouro?.message}
                  />
                )}
              />
              </div>

              <div className="col-12 col-md-6">
              <Controller
                name="endereco.numero"
                control={control}
                render={({ field }) => (
                  <Input
                    label="Número"
                    {...field}
                    error={errors.endereco?.numero?.message}
                  />
                )}
              />
              </div>

              <div className="col-12 col-md-6">
              <Controller
                name="endereco.complemento"
                control={control}
                render={({ field }) => (
                  <Input
                    label="Complemento"
                    {...field}
                    error={errors.endereco?.complemento?.message}
                  />
                )}
              />
              </div>

              <div className="col-12 col-md-6">
              <Controller
                name="endereco.bairro"
                control={control}
                render={({ field }) => (
                  <Input
                    label="Bairro"
                    {...field}
                    error={errors.endereco?.bairro?.message}
                  />
                )}
              />
              </div>

              <div className="col-12 col-md-6">
              <Controller
                name="endereco.cidade"
                control={control}
                render={({ field }) => (
                  <Input
                    label="Cidade"
                    {...field}
                    error={errors.endereco?.cidade?.message}
                  />
                )}
              />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">
                  Estado
                </label>
                <Controller
                  name="endereco.estado"
                  control={control}
                  render={({ field }) => (
                    <SelectDropdown
                      testId="estado-select"
                      options={[
                        { value: 'AC', label: 'Acre' },
                        { value: 'AL', label: 'Alagoas' },
                        { value: 'AP', label: 'Amapá' },
                        { value: 'AM', label: 'Amazonas' },
                        { value: 'BA', label: 'Bahia' },
                        { value: 'CE', label: 'Ceará' },
                        { value: 'DF', label: 'Distrito Federal' },
                        { value: 'ES', label: 'Espírito Santo' },
                        { value: 'GO', label: 'Goiás' },
                        { value: 'MA', label: 'Maranhão' },
                        { value: 'MT', label: 'Mato Grosso' },
                        { value: 'MS', label: 'Mato Grosso do Sul' },
                        { value: 'MG', label: 'Minas Gerais' },
                        { value: 'PA', label: 'Pará' },
                        { value: 'PB', label: 'Paraíba' },
                        { value: 'PR', label: 'Paraná' },
                        { value: 'PE', label: 'Pernambuco' },
                        { value: 'PI', label: 'Piauí' },
                        { value: 'RJ', label: 'Rio de Janeiro' },
                        { value: 'RN', label: 'Rio Grande do Norte' },
                        { value: 'RS', label: 'Rio Grande do Sul' },
                        { value: 'RO', label: 'Rondônia' },
                        { value: 'RR', label: 'Roraima' },
                        { value: 'SC', label: 'Santa Catarina' },
                        { value: 'SP', label: 'São Paulo' },
                        { value: 'SE', label: 'Sergipe' },
                        { value: 'TO', label: 'Tocantins' },
                      ]}
                      {...field}
                      error={errors.endereco?.estado?.message}
                    />
                  )}
                />
              </div>

              <div className="col-12 col-md-6">
              <Controller
                name="endereco.pais"
                control={control}
                render={({ field }) => (
                  <Input
                    label="País"
                    defaultValue="Brasil"
                    {...field}
                    error={errors.endereco?.pais?.message}
                  />
                )}
              />
              </div>
            </div>
          )}

          {activeTab === 'contato' && (
            <div className="row g-2 g-md-3">
              <div className="col-12 col-md-6">
              <Controller
                name="contato.telefone_principal"
                control={control}
                render={({ field }) => (
                  <Input
                    label="Telefone Principal"
                    placeholder="(00) 00000-0000"
                    {...field}
                    error={errors.contato?.telefone_principal?.message}
                  />
                )}
              />
              </div>

              <div className="col-12 col-md-6">
              <Controller
                name="contato.telefone_secundario"
                control={control}
                render={({ field }) => (
                  <Input
                    label="Telefone Secundário"
                    placeholder="(00) 00000-0000"
                    {...field}
                    error={errors.contato?.telefone_secundario?.message}
                  />
                )}
              />
              </div>

              <div className="col-12 col-md-6">
              <Controller
                name="contato.email_principal"
                control={control}
                render={({ field }) => (
                  <Input
                    label="E-mail Principal"
                    type="email"
                    {...field}
                    error={errors.contato?.email_principal?.message}
                  />
                )}
              />
              </div>

              <div className="col-12 col-md-6">
              <Controller
                name="contato.email_secundario"
                control={control}
                render={({ field }) => (
                  <Input
                    label="E-mail Secundário"
                    type="email"
                    {...field}
                    error={errors.contato?.email_secundario?.message}
                  />
                )}
              />
              </div>

              <div className="col-12 col-md-6">
              <Controller
                name="contato.site"
                control={control}
                render={({ field }) => (
                  <Input
                    label="Site"
                    placeholder="https://www.exemplo.com"
                    {...field}
                    error={errors.contato?.site?.message}
                  />
                )}
              />
              </div>

              <div className="col-12">
                <Controller
                  name="contato.observacoes"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label className="form-label">
                        Observações de Contato
                      </label>
                      <textarea
                        {...field}
                        rows={3}
                        className="form-control"
                      />
                    </div>
                  )}
                />
              </div>
            </div>
          )}

          {activeTab === 'dados_bancarios' && (
            <div className="row g-2 g-md-3">
              <div className="col-12">
                <div className="alert alert-info small mb-3">
                  <i className="bi bi-info-circle me-1"></i>
                  Preencha os dados bancários do fornecedor para facilitar transferências e pagamentos.
                </div>
              </div>
              <div className="col-12 col-md-6">
              <Controller
                name="dados_bancarios.banco"
                control={control}
                render={({ field }) => (
                  <SelectDropdown
                    options={insts.map((ins: any) => ({ value: ins.nome || ins.codigo_bacen || String(ins.id), label: `${ins.nome}${ins.codigo_bacen ? ` (${ins.codigo_bacen})` : ''}` }))}
                    value={field.value || ''}
                    onChange={(v) => field.onChange(v)}
                    placeholder="Selecione um banco..."
                    searchable
                    testId="fornecedor-banco-select"
                  />
                )}
              />
              </div>

              <div className="col-12 col-md-6">
              <Controller
                name="dados_bancarios.agencia"
                control={control}
                render={({ field }) => (
                  <Input
                    label="Agência"
                    placeholder="0000"
                    {...field}
                  />
                )}
              />
              </div>

              <div className="col-12 col-md-6">
              <Controller
                name="dados_bancarios.conta"
                control={control}
                render={({ field }) => (
                  <Input
                    label="Conta Bancária"
                    placeholder="00000-0"
                    {...field}
                  />
                )}
              />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Tipo de Conta</label>
                <Controller
                  name="dados_bancarios.tipo_conta"
                  control={control}
                  render={({ field }) => (
                    <SelectDropdown
                      options={[
                        { value: '', label: 'Selecione...' },
                        { value: 'corrente', label: 'Conta Corrente' },
                        { value: 'poupanca', label: 'Conta Poupança' },
                      ]}
                      {...field}
                      testId="fornecedor-tipo-conta-select"
                    />
                  )}
                />
              </div>

              <div className="col-12 col-md-6">
              <Controller
                name="dados_bancarios.titular"
                control={control}
                render={({ field }) => (
                  <Input
                    label="Titular da Conta"
                    placeholder="Nome do titular"
                    {...field}
                  />
                )}
              />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Tipo de Chave PIX</label>
                <Controller
                  name="dados_bancarios.tipo_chave_pix"
                  control={control}
                  render={({ field }) => (
                    <SelectDropdown
                      options={[
                        { value: '', label: 'Selecione...' },
                        { value: 'cpf', label: 'CPF' },
                        { value: 'cnpj', label: 'CNPJ' },
                        { value: 'email', label: 'E-mail' },
                        { value: 'telefone', label: 'Telefone' },
                        { value: 'aleatoria', label: 'Chave Aleatória' },
                      ]}
                      {...field}
                      testId="fornecedor-tipo-chave-pix-select"
                    />
                  )}
                />
              </div>

              <div className="col-12 col-md-6">
              <Controller
                name="dados_bancarios.chave_pix"
                control={control}
                render={({ field }) => {
                  const placeholder = dadosBancoTipo === 'cpf' ? '000.000.000-00' : dadosBancoTipo === 'cnpj' ? '00.000.000/0000-00' : dadosBancoTipo === 'telefone' ? '+55 11 90000-0000' : dadosBancoTipo === 'email' ? 'usuario@exemplo.com' : 'Chave PIX do fornecedor';
                  const formatByType = (type: string | undefined, value: string) => {
                    if (!value) return '';
                    const digits = value.replace(/\D+/g, '');
                    if (type === 'cpf') {
                      if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                      return value;
                    }
                    if (type === 'cnpj') {
                      if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
                      return value;
                    }
                    if (type === 'telefone') {
                      // naive phone formatting: keep digits and format if 11 digits
                      if (digits.length === 11) return `+55 ${digits.slice(0,2)} ${digits.slice(2,7)}-${digits.slice(7)}`;
                      return value;
                    }
                    return value;
                  };
                  return (
                    <Input
                      label="Chave PIX"
                      placeholder={placeholder}
                      {...field}
                      onBlur={(e) => {
                        const formatted = formatByType(dadosBancoTipo, e.target.value || '');
                        field.onChange(formatted);
                      }}
                    />
                  );
                }}
              />
              </div>
            </div>
          )}

          {activeTab === 'documentos' && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="fs-5 fw-medium">Documentos</h3>
                <Button
                  type="button"
                  onClick={addDocumento}
                  variant="secondary"
                  size="sm"
                >
                  <Plus className="me-2" style={{width: '1rem', height: '1rem'}} />
                  Adicionar Documento
                </Button>
              </div>

              {documentos.map((doc, index) => (
                <div key={index} className="border rounded p-4 mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="fw-medium">Documento {index + 1}</h4>
                    <Button
                      type="button"
                      onClick={() => removeDocumento(index)}
                      variant="danger"
                      size="sm"
                    >
                      <X style={{width: '1rem', height: '1rem'}} />
                    </Button>
                  </div>

                  <div className="row g-2 g-md-3 mb-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label">
                        Tipo
                      </label>
                      <SelectDropdown
                        value={doc.tipo}
                        onChange={(value) => updateDocumento(index, 'tipo', value)}
                        options={[
                          { value: 'cpf', label: 'CPF' },
                          { value: 'cnpj', label: 'CNPJ' },
                          { value: 'rg', label: 'RG' },
                          { value: 'cnh', label: 'CNH' },
                          { value: 'contrato_social', label: 'Contrato Social' },
                          { value: 'certificado', label: 'Certificado' },
                          { value: 'outros', label: 'Outros' },
                        ]}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                    <Input
                      label="Número"
                      value={doc.numero}
                      onChange={(e) => updateDocumento(index, 'numero', e.target.value)}
                    />
                    </div>

                    <div className="col-12 col-md-6">
                    <Input
                      label="Data de Emissão"
                      type="date"
                      value={doc.data_emissao || ''}
                      onChange={(e) => updateDocumento(index, 'data_emissao', e.target.value)}
                    />
                    </div>

                    <div className="col-12 col-md-6">
                    <Input
                      label="Data de Validade"
                      type="date"
                      value={doc.data_validade || ''}
                      onChange={(e) => updateDocumento(index, 'data_validade', e.target.value)}
                    />
                    </div>

                    <div className="col-12 col-md-6">
                    <Input
                      label="Órgão Emissor"
                      value={doc.orgao_emissor || ''}
                      onChange={(e) => updateDocumento(index, 'orgao_emissor', e.target.value)}
                    />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">
                        Arquivo
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) updateDocumento(index, 'arquivo', file);
                        }}
                        className="form-control"
                      />
                    </div>
                  </div>

                  <div className="col-12">
                  <Input
                    label="Observações"
                    value={doc.observacoes || ''}
                    onChange={(e) => updateDocumento(index, 'observacoes', e.target.value)}
                  />
                  </div>
                </div>
              ))}

              {documentos.length === 0 && (
                <div className="text-center py-4 text-muted">
                  Nenhum documento adicionado
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="d-flex justify-content-end pt-4 border-top">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="ms-2"
            disabled={loading}
            onClick={() => { if (process.env.NODE_ENV === 'development') console.debug('[FornecedorForm] submit button clicked (JS)'); (window as any).__submitButtonClicked = Date.now(); }}
          >
            {loading ? 'Salvando...' : (fornecedor ? 'Atualizar' : 'Criar')}
          </Button>
        </div>
      </form>
    </ModalForm>
  );
};

export default FornecedorForm;