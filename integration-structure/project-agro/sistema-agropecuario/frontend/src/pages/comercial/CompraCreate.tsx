import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';

import type { AnySchema } from 'yup';
// lightweight resolver to avoid adding @hookform/resolvers dependency in tests
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import SelectFK from '@/components/common/SelectFK';
import Input from '@/components/common/Input';
import Button from '@/components/Button';
import ComercialService from '@/services/comercial';

const schema = yup.object().shape({
  fornecedor: yup.number().required('Fornecedor é obrigatório'),
  data: yup.string().required('Data é obrigatória'),
  valor_total: yup.number().required('Valor é obrigatório').moreThan(0, 'Valor deve ser maior que zero'),
  descricao: yup.string(),
});

interface CompraCreateProps {
  onSuccess?: (data?: unknown) => void;
  onCancel?: () => void;
}

const CompraCreate: React.FC<CompraCreateProps> = ({ onSuccess, onCancel }) => {
  const { control, handleSubmit } = useForm({ resolver: makeResolver(schema), defaultValues: { fornecedor: undefined, data: '', valor_total: '', descricao: '' } });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: (payload: unknown) => ComercialService.createCompra(payload as Parameters<typeof ComercialService.createCompra>[0]),
    onSuccess: (data: unknown) => {
      // invalidate compras list and navigate to list view
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      if (onSuccess) onSuccess(data); else navigate('/comercial/compras');
    }
  });

  // helper to know loading state across mutation
  const loading = mutation.status === 'pending';

  const onSubmit = async (data: unknown) => {
    try {
      const d = data as Record<string, unknown>;
      await mutation.mutateAsync({
        fornecedor: Number(d.fornecedor),
        data: String(d.data || ''),
        valor_total: Number(d.valor_total || 0),
        descricao: String(d.descricao || ''),
      });
    } catch (e) {
      // show error toast in real app
      console.error('Erro ao criar compra', e);
    }
  };

  return (
    <div className="container-fluid py-4">
      {!onCancel && (
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2>Nova Compra</h2>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Dados da Compra */}
            <div className="mb-4">
              <h6 className="text-primary mb-3">
                <i className="bi bi-cart-plus me-2"></i>
                Dados da Compra
              </h6>
              <div className="row g-3">
                <div className="col-md-8">
                  <Controller
                    name="fornecedor"
                    control={control}
                    render={({ field, fieldState }) => (
                      <div>
                        <label className="form-label">Fornecedor *</label>
                        <SelectFK                          testId="fornecedor-select"                          endpoint="/comercial/fornecedores/"
                          value={field.value}
                          onChange={(v) => field.onChange(Number(v))}
                          placeholder="Selecione o fornecedor"
                          error={fieldState.error?.message}
                        />
                      </div>
                    )}
                  />
                </div>

                <div className="col-md-4">
                  <Controller
                    name="data"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Input label="Data *" type="date" {...field} error={fieldState.error?.message} />
                    )}
                  />
                </div>

                <div className="col-md-6">
                  <Controller
                    name="valor_total"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Input label="Valor Total (R$) *" type="number" step="0.01" {...field} error={fieldState.error?.message} />
                    )}
                  />
                </div>
              </div>
            </div>

            <hr className="my-4" />

            {/* Informações Adicionais */}
            <div className="mb-4">
              <h6 className="text-primary mb-3">
                <i className="bi bi-chat-left-text me-2"></i>
                Informações Adicionais
              </h6>
              <div className="row g-3">
                <div className="col-12">
                  <Controller
                    name="descricao"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="form-label">Descrição</label>
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
                {loading ? 'Salvando...' : 'Salvar Compra'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompraCreate;
