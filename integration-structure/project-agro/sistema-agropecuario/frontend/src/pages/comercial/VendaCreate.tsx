import React from 'react';
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
  data_venda: yup.string().required('Data da venda é obrigatória'),
  quantidade: yup.number().transform((value, originalValue) => originalValue === '' ? undefined : Number(originalValue)).required('Quantidade é obrigatória'),
  preco_unitario: yup.number().transform((value, originalValue) => originalValue === '' ? undefined : Number(originalValue)).required('Preço unitário é obrigatório'),
  cliente: yup.number().transform((value, originalValue) => originalValue === '' ? undefined : Number(originalValue)).required('Cliente é obrigatório'),
  local_armazenamento: yup.number().nullable(),
  produto: yup.number().nullable(),
  numero_nota_fiscal: yup.string(),
  data_emissao_nota: yup.string(),
  status_emissao: yup.string(),
  observacoes: yup.string(),
});

interface VendaCreateProps {
  onSuccess?: (data?: unknown) => void;
  onCancel?: () => void;
}

const VendaCreate: React.FC<VendaCreateProps> = ({ onSuccess, onCancel }) => {
  const { control, handleSubmit, setValue, watch, formState } = useForm({ 
    resolver: makeResolver(schema), 
    defaultValues: { 
      tipo_operacao: 'venda',
      data_venda: '', 
      quantidade: '', 
      preco_unitario: '', 
      cliente: '', 
      local_armazenamento: '',
      produto: '',
      numero_nota_fiscal: '', 
      data_emissao_nota: '', 
      status_emissao: 'pendente', 
      observacoes: '' 
    } 
  });

  const [clientes, setClientes] = React.useState<Array<{ id: number; nome?: string }>>([]);
  const [locais, setLocais] = React.useState<Array<{ id: number; nome?: string }>>([]);
  const [produtos, setProdutos] = React.useState<Array<{ id: number; nome?: string; unidade?: string }>>([]);
  const [unidadeProduto, setUnidadeProduto] = React.useState<string>('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: unknown) => ComercialService.createVendaCompra(payload as Parameters<typeof ComercialService.createVendaCompra>[0]),
    onSuccess: (data: unknown) => {
      queryClient.invalidateQueries({ queryKey: ['vendas-compras'] });
      const d = data as Record<string, unknown>;
      if (onSuccess) onSuccess(data); else navigate(`/comercial/vendas/${String(d.id)}`);
    }
  });

  const loading = mutation.status === 'pending';

  const [allProdutos, setAllProdutos] = React.useState<Array<{ id: number; nome?: string; unidade?: string }>>([]);

  React.useEffect(() => {
    // load clients, locais e todos os produtos para selectors
    let mounted = true;
    ComercialService.getClientes().then((c) => {
      if (mounted) setClientes(c || []);
    }).catch(() => {});
    ComercialService.getLocais().then((l) => {
      if (mounted) setLocais(l || []);
    }).catch(() => {});
    ComercialService.getAllProdutos().then((p) => {
      if (mounted) {
        const list: Array<{ id: number; nome?: string; unidade?: string }> = Array.isArray(p) ? p : [];
        setAllProdutos(list);
        setProdutos(list);
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);





  const watchedQtd = watch('quantidade');
  const watchedPreco = watch('preco_unitario');
  const valorTotal = (Number(watchedQtd || 0) * Number(watchedPreco || 0)).toFixed(2);

  const onSubmit = async (data: unknown) => {
    try {
      // eslint-disable-next-line no-console
      console.log('VendaCreate onSubmit called', data);
      const d = data as Record<string, unknown>;
      const clean: Record<string, unknown> = { ...d };
      // Empty string FK fields must be null, not empty string (DRF FK validation)
      (['local_armazenamento', 'produto'] as const).forEach((k) => {
        if (clean[k] === '' || clean[k] === undefined) clean[k] = null;
      });
      // Tributos são calculados no módulo fiscal — não enviar
      delete clean.regime_tributario;
      delete clean.valor_tributos;
      const payload = { ...clean, tipo_operacao: 'venda' };
      await mutation.mutateAsync(payload as any);
    } catch (e) {
      console.error('Erro ao criar venda', e);
    }
  };

  React.useEffect(() => {
    try {
      (window as any).__VendaCreate_onSubmit_attached = true;
    } catch (e) {}
    return () => {
      try {
        (window as any).__VendaCreate_onSubmit_attached = false;
      } catch (e) {}
    };
  }, []);

  return (
    <div className="container-fluid py-4">
      {!onCancel && (
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2>Nova Venda</h2>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <form onSubmit={(e) => {
            try {
              console.log('PAGE LOG: VendaCreate DOM onSubmit captured');
              (window as any).__VendaCreate_dom_submit_fired = true;
            } catch (err) {}
            try {
              // call react-hook-form's handleSubmit which will call our onSubmit
              const res = handleSubmit(async (data) => {
                try {
                  console.log('PAGE LOG: VendaCreate handleSubmit wrapper invoked');
                  (window as any).__VendaCreate_handle_submit_invoked = true;
                  return await onSubmit(data);
                } catch (e) {
                  console.error('PAGE LOG: VendaCreate onSubmit threw', e);
                  (window as any).__VendaCreate_last_submit_error = String(e);
                  throw e;
                }
              })(e as any);
              return res;
            } catch (err) {
              console.error('PAGE LOG: VendaCreate submit wrapper error', err);
              (window as any).__VendaCreate_submit_wrapper_error = String(err);
              throw err;
            }
          }}>
            {/* Dados da Venda */}
            <div className="mb-4">
              <h6 className="text-primary mb-3">
                <i className="bi bi-cart-check me-2"></i>
                Dados da Venda
              </h6>
              <div className="row g-3">
                <div className="col-md-4">
                  <Controller
                    name="data_venda"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Input label="Data da Venda *" type="date" {...field} error={fieldState.error?.message} />
                    )}
                  />
                </div>

                <div className="col-md-8">
                  <Controller
                    name="cliente"
                    control={control}
                    render={({ field, fieldState }) => (
                      <div>
                        <label className="form-label">Cliente *</label>
                        <select {...field} className="form-select">
                          <option value="">Selecione o cliente</option>
                          {clientes.map((c) => (
                            <option key={c.id} value={c.id}>{c.nome}</option>
                          ))}
                        </select>
                        {fieldState.error && <small className="text-danger">{fieldState.error.message}</small>}
                      </div>
                    )}
                  />
                </div>
              </div>
            </div>

            <hr className="my-4" />

            {/* Produto e Estoque */}
            <div className="mb-4">
              <h6 className="text-primary mb-3">
                <i className="bi bi-box-seam me-2"></i>
                Produto e Estoque
              </h6>
              <div className="row g-3">
                <div className="col-md-6">
                  <Controller
                    name="local_armazenamento"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="form-label">Local de Armazenamento</label>
                        <select {...field} className="form-select" onChange={async (e) => {
                          field.onChange(e);
                          const val = e.target.value;
                          setValue('produto', '');
                          setUnidadeProduto('');
                          if (val) {
                            // Filter from already-loaded products by local, fallback to API
                            const filtered = allProdutos.filter((p: any) =>
                              p.local_armazenamento === Number(val) || String(p.local_armazenamento) === val
                            );
                            if (filtered.length > 0) {
                              setProdutos(filtered);
                            } else {
                              const raw = await ComercialService.getProdutosByLocal(Number(val));
                              const list: Array<{ id: number; nome?: string; unidade?: string }> = Array.isArray(raw) ? raw : ((raw as any)?.results ?? []);
                              setProdutos(list.length > 0 ? list : allProdutos);
                            }
                          } else {
                            setProdutos(allProdutos);
                          }
                        }}>
                          <option value="">Selecione o local</option>
                          {locais.map((l) => (
                            <option key={l.id} value={l.id}>{l.nome}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  />
                </div>

                <div className="col-md-6">
                  <Controller
                    name="produto"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="form-label">Produto</label>
                        <select
                          {...field}
                          className="form-select"
                          onChange={(e) => {
                            field.onChange(e);
                            const found = produtos.find((p) => String(p.id) === e.target.value);
                            setUnidadeProduto(found?.unidade || '');
                          }}
                        >
                          <option value="">Selecione o produto</option>
                          {produtos.map((p) => (
                            <option key={p.id} value={p.id}>{p.nome}{p.unidade ? ` (${p.unidade})` : ''}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  />
                </div>

                <div className="col-md-4">
                  <Controller
                    name="quantidade"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Input
                        label={`Quantidade${unidadeProduto ? ` (${unidadeProduto})` : ''} *`}
                        type="number"
                        step="0.001"
                        {...field}
                        error={fieldState.error?.message}
                      />
                    )}
                  />
                </div>

                <div className="col-md-4">
                  <Controller
                    name="preco_unitario"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Input label="Preço Unitário (R$) *" type="number" step="0.01" {...field} error={fieldState.error?.message} />
                    )}
                  />
                </div>

                <div className="col-md-4">
                  <div>
                    <label className="form-label">Valor Total (R$)</label>
                    <input
                      type="text"
                      className="form-control bg-light"
                      readOnly
                      value={`R$ ${valorTotal}`}
                    />
                  </div>
                </div>
              </div>
            </div>

            <hr className="my-4" />

            {/* Informações Fiscais */}
            <div className="mb-4">
              <h6 className="text-primary mb-3">
                <i className="bi bi-receipt me-2"></i>
                Informações Fiscais
              </h6>
              <div className="row g-3">
                <div className="col-md-4">
                  <Controller
                    name="numero_nota_fiscal"
                    control={control}
                    render={({ field }) => (
                      <Input label="Número da NF" {...field} />
                    )}
                  />
                </div>

                <div className="col-md-4">
                  <Controller
                    name="data_emissao_nota"
                    control={control}
                    render={({ field }) => (
                      <Input label="Data de Emissão" type="date" {...field} />
                    )}
                  />
                </div>

                <div className="col-md-4">
                  <Controller
                    name="status_emissao"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="form-label">Status de Emissão</label>
                        <select {...field} className="form-select">
                          <option value="pendente">Pendente</option>
                          <option value="emitida">Emitida</option>
                        </select>
                      </div>
                    )}
                  />
                </div>
              </div>
              <p className="text-muted small mt-2 mb-0">
                <i className="bi bi-info-circle me-1"></i>
                Regime tributário e impostos serão calculados durante a emissão da nota pelo módulo fiscal.
              </p>
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
                {loading ? 'Salvando...' : 'Salvar Venda'}
              </Button>
            </div>
            {/* Dev-only debug: show validation errors to help E2E troubleshooting */}
            {process.env.NODE_ENV === 'development' && (
              <pre data-testid="venda-form-errors" style={{ marginTop: 10 }}>{JSON.stringify(formState.errors)}</pre>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default VendaCreate;