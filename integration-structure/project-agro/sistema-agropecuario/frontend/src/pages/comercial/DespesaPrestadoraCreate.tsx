import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import SelectFK from '@/components/common/SelectFK';
import Input from '@/components/common/Input';
import Button from '@/components/Button';
import ComercialService from '@/services/comercial';
import { useApiQuery } from '@/hooks/useApi';

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
  empresa: yup.number().required('Empresa é obrigatória'),
  prestador: yup.number().nullable(),
  data: yup.string().required('Data é obrigatória'),
  categoria: yup.string().required('Categoria é obrigatória'),
  valor: yup.number().required('Valor é obrigatório').moreThan(0, 'Valor deve ser maior que zero')
});

interface DespesaPrestadoraCreateProps {
  onSuccess?: (data?: unknown) => void;
  onCancel?: () => void;
}

const DespesaPrestadoraCreate: React.FC<DespesaPrestadoraCreateProps> = ({ onSuccess, onCancel }) => {
  const location = useLocation();
  const q = new URLSearchParams(location.search);
  const empresaPrefill = q.get('empresa') ? Number(q.get('empresa')) : undefined;

  const { control, handleSubmit, setValue } = useForm({ resolver: makeResolver(schema), defaultValues: { empresa: empresaPrefill || undefined, prestador: undefined, data: new Date().toISOString().slice(0,10), categoria: '', valor: '', centro_custo: undefined, descricao: '' } });
  const { data: centros = [] } = useApiQuery<any[]>(['centros-custo'], '/administrativo/centros-custo/');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (empresaPrefill) setValue('empresa', empresaPrefill);
  }, [empresaPrefill, setValue]);

  const mutation = useMutation({
    mutationFn: (payload: unknown) => ComercialService.createDespesaPrestadora(payload as Parameters<typeof ComercialService.createDespesaPrestadora>[0]),
    onSuccess: (data: unknown) => {
      // refresh company expenses and navigate to company detail if possible
      const d = data as Record<string, unknown>;
      queryClient.invalidateQueries({ queryKey: ['empresa', d.empresa] });
      if (onSuccess) onSuccess(data); else navigate(`/comercial/empresas/${String(d.empresa)}`);
    }
  });

  const loading = mutation.status === 'pending';

  const onSubmit = async (data: unknown) => {
    try {
      const d = data as Record<string, unknown>;
      await mutation.mutateAsync({ empresa: Number(d.empresa), prestador: d.prestador == null ? null : Number(d.prestador), data: String(d.data || ''), categoria: String(d.categoria || ''), valor: Number(d.valor || 0), centro_custo: d.centro_custo == null ? null : Number(d.centro_custo), descricao: String(d.descricao || '') });
    } catch (e) {
      console.error('Erro ao criar despesa prestadora', e);
    }
  };

  return (
    <div className="container-fluid py-4">
      {!onCancel && (
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2>Nova Despesa (Prestadora)</h2>
        </div>
      )}

      <div className="card">
        <div className="card-body p-3 p-md-4">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="row g-2 g-md-3">
              <div className="col-12 col-md-6">
                <Controller
                  name="empresa"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div>
                      <label className="form-label">Empresa</label>
                      <SelectFK endpoint="/comercial/empresas/" value={field.value} onChange={(v) => field.onChange(Number(v))} placeholder="Selecione uma empresa" error={fieldState.error?.message} />
                    </div>
                  )}
                />
              </div>

              <div className="col-12 col-md-6">
                <Controller
                  name="prestador"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label className="form-label">Prestador</label>
                      <SelectFK endpoint="/comercial/prestadores-servico/" value={field.value} onChange={(v) => field.onChange(Number(v))} placeholder="Selecione um prestador (opcional)" />
                    </div>
                  )}
                />
              </div>

              <div className="col-12 col-sm-6 col-md-4">
                <Controller
                  name="data"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input label="Data" type="date" {...field} error={fieldState.error?.message} />
                  )}
                />
              </div>

              <div className="col-12 col-sm-6 col-md-4">
                <Controller
                  name="categoria"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input label="Categoria" {...field} error={fieldState.error?.message} />
                  )}
                />
              </div>

              <div className="col-12 col-sm-6 col-md-4">
                <Controller
                  name="valor"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input label="Valor" type="number" step="0.01" {...field} error={fieldState.error?.message} />
                  )}
                />
              </div>

              <div className="col-12 col-md-6">
                <Controller
                  name="centro_custo"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label className="form-label">Centro de Custo</label>
                      <select className="form-select" value={String(field.value ?? '')} onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}>
                        <option value="">-- selecione --</option>
                        {centros.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.nome}</option>)}
                      </select>
                    </div>
                  )}
                />
              </div>

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

            <div className="mt-3">
              <Button type="submit" className="btn btn-primary" disabled={loading}>Salvar Despesa</Button>
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

export default DespesaPrestadoraCreate;
