import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import Input from '@/components/common/Input';
import Button from '@/components/Button';
import ComercialService from '@/services/comercial';
import { validarCPFouCNPJ, mascaraCPFouCNPJ, mascaraTelefone, mascaraCEP } from '@/utils/validators';

import type { AnySchema } from 'yup';
const makeResolver = (schema: AnySchema) => async (values: unknown) => {
  try {
    const validated = await schema.validate(values, { abortEarly: false }) as unknown;
    return { values: validated as Record<string, unknown>, errors: {} };
  } catch (err: unknown) {
    const inner = (err as { inner?: Array<{ path?: string; type?: string; message?: string }> })?.inner || [];
    const errors = inner.reduce((acc: Record<string, { type: string; message: string }>, e) => {
      if (e && e.path) acc[e.path] = { type: e.type || 'validation', message: e.message || 'Invalid' };
      return acc;
    }, {});
    return { values: {}, errors };
  }
};

const schema = yup.object().shape({
  nome: yup.string().required('Nome é obrigatório'),
  tipo_pessoa: yup.string().required('Tipo de pessoa é obrigatório'),
  cpf_cnpj: yup.string()
    .required('CPF/CNPJ é obrigatório')
    .test('cpf-cnpj-valido', 'CPF/CNPJ inválido', (value) => {
      if (!value) return false;
      return validarCPFouCNPJ(value);
    }),
  rg_ie: yup.string(),
  inscricao_estadual: yup.string(),
  telefone: yup.string(),
  celular: yup.string(),
  email: yup.string().email('E-mail inválido'),
  cep: yup.string(),
  endereco: yup.string(),
  numero: yup.string(),
  complemento: yup.string(),
  bairro: yup.string(),
  cidade: yup.string(),
  estado: yup.string(),
  status: yup.string(),
  observacoes: yup.string(),
});

interface ClienteCreateProps {
  onSuccess?: (data?: unknown) => void;
  onCancel?: () => void;
  initialData?: any;
}

const ClienteCreate: React.FC<ClienteCreateProps> = ({ onSuccess, onCancel, initialData }) => {
  const { id: routeId } = useParams<{ id?: string }>();
  const id = initialData?.id ? String(initialData.id) : routeId;
  const isEditing = !!id;
  const { control, handleSubmit, watch, reset } = useForm({ 
    resolver: makeResolver(schema), 
    defaultValues: { 
      nome: '', 
      tipo_pessoa: 'pf', 
      cpf_cnpj: '', 
      rg_ie: '',
      inscricao_estadual: '',
      telefone: '', 
      celular: '', 
      email: '', 
      cep: '', 
      endereco: '', 
      numero: '', 
      complemento: '', 
      bairro: '', 
      cidade: '', 
      estado: '', 
      status: 'ativo', 
      observacoes: '' 
    } 
  });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const tipoPessoa = watch('tipo_pessoa');

  // Load existing data when editing
  React.useEffect(() => {
    if (!isEditing) return;
    // If initialData is passed directly, use it (modal mode)
    if (initialData) {
      const safeStr = (v: unknown) => (v === null || v === undefined ? '' : String(v));
      reset({
        nome: safeStr(initialData.nome),
        tipo_pessoa: initialData.tipo_pessoa || 'pf',
        cpf_cnpj: safeStr(initialData.cpf_cnpj),
        rg_ie: safeStr(initialData.rg_ie),
        inscricao_estadual: safeStr(initialData.inscricao_estadual),
        telefone: safeStr(initialData.telefone),
        celular: safeStr(initialData.celular),
        email: safeStr(initialData.email),
        cep: safeStr(initialData.cep),
        endereco: safeStr(initialData.endereco),
        numero: safeStr(initialData.numero),
        complemento: safeStr(initialData.complemento),
        bairro: safeStr(initialData.bairro),
        cidade: safeStr(initialData.cidade),
        estado: safeStr(initialData.estado),
        status: initialData.status || 'ativo',
        observacoes: safeStr(initialData.observacoes),
      });
      return;
    }
    // Otherwise fetch from API (route mode)
    ComercialService.getClienteById(Number(id)).then((data: any) => {
      const safeStr = (v: unknown) => (v === null || v === undefined ? '' : String(v));
      reset({
        nome: safeStr(data.nome),
        tipo_pessoa: data.tipo_pessoa || 'pf',
        cpf_cnpj: safeStr(data.cpf_cnpj),
        rg_ie: safeStr(data.rg_ie),
        inscricao_estadual: safeStr(data.inscricao_estadual),
        telefone: safeStr(data.telefone),
        celular: safeStr(data.celular),
        email: safeStr(data.email),
        cep: safeStr(data.cep),
        endereco: safeStr(data.endereco),
        numero: safeStr(data.numero),
        complemento: safeStr(data.complemento),
        bairro: safeStr(data.bairro),
        cidade: safeStr(data.cidade),
        estado: safeStr(data.estado),
        status: data.status || 'ativo',
        observacoes: safeStr(data.observacoes),
      });
    }).catch(console.error);
  }, [id, isEditing, initialData, reset]);

  const mutation = useMutation({
    mutationFn: (payload: unknown) => isEditing
      ? ComercialService.updateCliente(Number(id), payload as Record<string, unknown>)
      : ComercialService.createCliente(payload as Record<string, unknown>),
    onSuccess: (data: unknown) => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      const d = data as Record<string, unknown>;
      if (onSuccess) onSuccess(data); else navigate(`/comercial/clientes/${String(d.id)}`);
    }
  });

  const loading = mutation.status === 'pending';

  const onSubmit = async (data: unknown) => {
    try {
      await mutation.mutateAsync(data as Record<string, unknown>);
    } catch (e) {
      console.error('Erro ao criar cliente', e);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit(onSubmit)}>
            {/* Dados Principais */}
            <div className="mb-4">
              <h6 className="text-primary mb-3">
                <i className="bi bi-person-badge me-2"></i>
                Dados Principais
              </h6>
              <div className="row g-3">
                <div className="col-md-6">
                  <Controller
                    name="nome"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Input label="Nome / Razão Social *" {...field} error={fieldState.error?.message} />
                    )}
                  />
                </div>

                <div className="col-md-3">
                  <Controller
                    name="tipo_pessoa"
                    control={control}
                    render={({ field, fieldState }) => (
                      <div>
                        <label className="form-label">Tipo de Pessoa *</label>
                        <select {...field} className="form-select">
                          <option value="pf">Pessoa Física</option>
                          <option value="pj">Pessoa Jurídica</option>
                        </select>
                        {fieldState.error && <small className="text-danger">{fieldState.error.message}</small>}
                      </div>
                    )}
                  />
                </div>

                <div className="col-md-3">
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="form-label">Status</label>
                        <select {...field} className="form-select">
                          <option value="ativo">Ativo</option>
                          <option value="inativo">Inativo</option>
                          <option value="bloqueado">Bloqueado</option>
                        </select>
                      </div>
                    )}
                  />
                </div>

                <div className="col-md-6">
                  <Controller
                    name="cpf_cnpj"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Input 
                        label={tipoPessoa === 'pf' ? 'CPF *' : 'CNPJ *'}
                        {...field}
                        onChange={(e) => field.onChange(mascaraCPFouCNPJ(e.target.value))}
                        error={fieldState.error?.message} 
                      />
                    )}
                  />
                </div>

                {tipoPessoa === 'pf' ? (
                  <div className="col-md-6">
                    <Controller
                      name="rg_ie"
                      control={control}
                      render={({ field }) => (
                        <Input label="RG" {...field} />
                      )}
                    />
                  </div>
                ) : (
                  <div className="col-md-6">
                    <Controller
                      name="inscricao_estadual"
                      control={control}
                      render={({ field }) => (
                        <Input label="Inscrição Estadual" {...field} />
                      )}
                    />
                  </div>
                )}
              </div>
            </div>

            <hr className="my-4" />

            {/* Contato */}
            <div className="mb-4">
              <h6 className="text-primary mb-3">
                <i className="bi bi-telephone me-2"></i>
                Contato
              </h6>
              <div className="row g-3">
                <div className="col-md-4">
                  <Controller
                    name="telefone"
                    control={control}
                    render={({ field }) => (
                      <Input 
                        label="Telefone" 
                        {...field}
                        onChange={(e) => field.onChange(mascaraTelefone(e.target.value))}
                      />
                    )}
                  />
                </div>

                <div className="col-md-4">
                  <Controller
                    name="celular"
                    control={control}
                    render={({ field }) => (
                      <Input 
                        label="Celular" 
                        {...field}
                        onChange={(e) => field.onChange(mascaraTelefone(e.target.value))}
                      />
                    )}
                  />
                </div>

                <div className="col-md-4">
                  <Controller
                    name="email"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Input label="E-mail" {...field} error={fieldState.error?.message} />
                    )}
                  />
                </div>
              </div>
            </div>

            <hr className="my-4" />

            {/* Endereço */}
            <div className="mb-4">
              <h6 className="text-primary mb-3">
                <i className="bi bi-geo-alt me-2"></i>
                Endereço
              </h6>
              <div className="row g-3">
                <div className="col-md-3">
                  <Controller
                    name="cep"
                    control={control}
                    render={({ field }) => (
                      <Input 
                        label="CEP" 
                        {...field}
                        onChange={(e) => field.onChange(mascaraCEP(e.target.value))}
                      />
                    )}
                  />
                </div>

                <div className="col-md-6">
                  <Controller
                    name="endereco"
                    control={control}
                    render={({ field }) => (
                      <Input label="Endereço" {...field} />
                    )}
                  />
                </div>

                <div className="col-md-3">
                  <Controller
                    name="numero"
                    control={control}
                    render={({ field }) => (
                      <Input label="Número" {...field} />
                    )}
                  />
                </div>

                <div className="col-md-4">
                  <Controller
                    name="complemento"
                    control={control}
                    render={({ field }) => (
                      <Input label="Complemento" {...field} />
                    )}
                  />
                </div>

                <div className="col-md-4">
                  <Controller
                    name="bairro"
                    control={control}
                    render={({ field }) => (
                      <Input label="Bairro" {...field} />
                    )}
                  />
                </div>

                <div className="col-md-3">
                  <Controller
                    name="cidade"
                    control={control}
                    render={({ field }) => (
                      <Input label="Cidade" {...field} />
                    )}
                  />
                </div>

                <div className="col-md-1">
                  <Controller
                    name="estado"
                    control={control}
                    render={({ field }) => (
                      <Input label="UF" {...field} maxLength={2} />
                    )}
                  />
                </div>
              </div>
            </div>

            <hr className="my-4" />

            {/* Observações */}
            <div className="mb-4">
              <h6 className="text-primary mb-3">
                <i className="bi bi-chat-left-text me-2"></i>
                Informações Adicionais
              </h6>
              <div className="row g-3">
                <div className="col-12">
                  <Controller
                    name="observacoes"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="form-label">Observações</label>
                        <textarea {...field} rows={3} className="form-control" />
                      </div>
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4">
              {onCancel && (
                <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
                  <i className="bi bi-x-circle me-1"></i>
                  Cancelar
                </button>
              )}
              <Button type="submit" className="btn btn-primary" disabled={loading}>
                <i className="bi bi-check-circle me-1"></i>
                {loading ? 'Salvando...' : isEditing ? 'Atualizar Cliente' : 'Salvar Cliente'}
              </Button>
            </div>
          </form>
  );

  // Modal mode: render form directly without container/card wrappers
  if (onCancel) {
    return formContent;
  }

  // Page mode: wrap with container, heading and card
  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</h2>
      </div>
      <div className="card">
        <div className="card-body">
          {formContent}
        </div>
      </div>
    </div>
  );
};

export default ClienteCreate;