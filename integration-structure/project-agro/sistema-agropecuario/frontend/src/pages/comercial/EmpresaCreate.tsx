import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Input from '@/components/common/Input';
import Button from '@/components/Button';
import ComercialService from '@/services/comercial';

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
  cnpj: yup.string().required('CNPJ é obrigatório'),
  contato: yup.string(),
  endereco: yup.string(),
});

interface EmpresaCreateProps {
  onSuccess?: (data?: unknown) => void;
  onCancel?: () => void;
  initialData?: any;
}

const EmpresaCreate: React.FC<EmpresaCreateProps> = ({ onSuccess, onCancel, initialData }) => {
  const isEditing = !!(initialData?.id);
  const { control, handleSubmit, reset } = useForm({ resolver: makeResolver(schema), defaultValues: { nome: '', cnpj: '', contato: '', endereco: '' } });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (initialData) {
      reset({
        nome: initialData.nome || '',
        cnpj: initialData.cnpj || '',
        contato: initialData.contato || '',
        endereco: initialData.endereco || '',
      });
    }
  }, [initialData, reset]);

  const mutation = useMutation({
    mutationFn: (payload: unknown) => {
      const p = payload as Parameters<typeof ComercialService.createEmpresa>[0];
      if (isEditing) return ComercialService.updateEmpresa(initialData.id, p);
      return ComercialService.createEmpresa(p);
    },
    onSuccess: (data: unknown) => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      const d = data as Record<string, unknown>;
      if (onSuccess) {
        onSuccess(data);
      } else {
        navigate(`/comercial/empresas/${String(d.id)}`);
      }
    }
  });

  const loading = mutation.status === 'pending';

  const onSubmit = async (data: unknown) => {
    try {
      const d = data as Record<string, unknown>;
      await mutation.mutateAsync({ nome: String(d.nome || ''), cnpj: String(d.cnpj || ''), contato: String(d.contato || ''), endereco: String(d.endereco || '') });
    } catch (e) {
      console.error('Erro ao salvar empresa', e);
    }
  };

  return (
    <div className="container-fluid py-4">
      {!onCancel && (
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2>Nova Empresa / Prestadora</h2>
        </div>
      )}

      <div className="card">
        <div className="card-body p-3 p-md-4">
          <form onSubmit={handleSubmit(onSubmit)}>
            {!onCancel && (
              <h2 className="mb-3">{isEditing ? 'Editar Empresa' : 'Nova Empresa / Prestadora'}</h2>
            )}
            <div className="row g-2 g-md-3">
              <div className="col-12 col-md-6">
                <Controller
                  name="nome"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input label="Nome" {...field} error={fieldState.error?.message} />
                  )}
                />
              </div>

              <div className="col-12 col-md-6">
                <Controller
                  name="cnpj"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input label="CNPJ" {...field} error={fieldState.error?.message} />
                  )}
                />
              </div>

              <div className="col-12 col-md-6">
                <Controller
                  name="contato"
                  control={control}
                  render={({ field }) => (
                    <Input label="Contato" {...field} />
                  )}
                />
              </div>

              <div className="col-12">
                <Controller
                  name="endereco"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label className="form-label">Endereço</label>
                      <textarea {...field} rows={3} className="form-control" />
                    </div>
                  )}
                />
              </div>
            </div>

            <div className="mt-3">
              <Button type="submit" className="btn btn-primary" disabled={loading}>{isEditing ? 'Atualizar Empresa' : 'Salvar Empresa'}</Button>
              {onCancel && (
                <button type="button" className="btn btn-outline-secondary ms-2" onClick={onCancel}>Cancelar</button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmpresaCreate;
