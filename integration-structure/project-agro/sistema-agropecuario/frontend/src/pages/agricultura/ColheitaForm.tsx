import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { UNIT_LABELS } from '../../utils/units';
import { useToast } from '../../hooks/useToast';
import type { Colheita, ColheitaTransporte, Plantio } from '../../types/agricultura';
import TransportFields from '../../components/TransportFields';

interface ColheitaFormProps {
  plantioId?: number;
  preselectedTalhao?: number;
  preselectedQuantidade?: number;
  preselectedSessionItem?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const ColheitaForm: React.FC<ColheitaFormProps> = ({ plantioId, preselectedTalhao, preselectedQuantidade, preselectedSessionItem, onClose, onSuccess }) => {
  const queryClient = useQueryClient();

  type TalhaoInfo = { id: number; nome?: string; name?: string; area_hectares?: number; area_size?: number };
  type ColheitaItem = { talhao: number | string; quantidade_colhida?: number | string };

  interface ColheitaFormState {
    plantio?: number;
    data_colheita: string;
    quantidade_colhida?: number | string;
    unidade: string;
    qualidade?: string;
    observacoes?: string;
    transportes: ColheitaTransporte[];
    itens: ColheitaItem[];
    // Destino configuration
    destino_tipo: 'armazenagem_interna' | 'contrato_industria' | 'armazenagem_geral';
    local_tipo?: string;
    local_destino?: number;
    empresa_destino?: number;
    nf_provisoria?: string;
    peso_estimado?: number;
    _session_item?: number;
  }

  // Initialize itens/state from incoming props to avoid setting state inside effects
  const initialItens: ColheitaItem[] = preselectedTalhao ? [ { talhao: preselectedTalhao, quantidade_colhida: preselectedQuantidade ?? '' } ] : [];

  const [formData, setFormData] = useState<ColheitaFormState>(() => ({
    plantio: plantioId,
    data_colheita: new Date().toISOString().split('T')[0],
    quantidade_colhida: preselectedQuantidade ?? undefined,
    unidade: 'kg',
    qualidade: undefined,
    observacoes: undefined,
    transportes: [ { placa: '', tara: undefined, peso_bruto: undefined, custo_transporte: undefined } as ColheitaTransporte ],
    itens: initialItens,
    destino_tipo: 'armazenagem_interna',
    local_tipo: 'silo_bolsa',
    local_destino: undefined,
    empresa_destino: undefined,
    nf_provisoria: undefined,
    peso_estimado: undefined,
    _session_item: preselectedSessionItem ?? undefined
  }));

  // State is initialized from props above; avoid setting state in an effect to prevent cascading renders.

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Buscar plantios (safras)
  const { data: plantios = [] } = useQuery<Plantio[]>({
    queryKey: ['plantios'],
    queryFn: async () => {
      const response = await api.get('/agricultura/plantios/');
      return response.data as Plantio[];
    },
  });

  // typed queries for locais and empresas
  const { data: locais = [] } = useQuery<{ id: number; nome: string; tipo?: string }[]>({ queryKey: ['locais-armazenamento'], queryFn: async () => { const r = await api.get('estoque/locais-armazenamento/'); return r.data as { id:number; nome:string; tipo?:string }[]; }});
  const { data: empresas = [] } = useQuery<{ id: number; nome: string }[]>({ queryKey: ['empresas'], queryFn: async () => { const r = await api.get('comercial/empresas/'); return r.data as { id:number; nome:string }[]; }});

  // Derived talhões for selected plantio
  const selectedPlantio = plantios.find(p => p.id === formData.plantio);
  const talhoesInfo = selectedPlantio?.talhoes_info || [];


  const { showError, showSuccess } = useToast();

  const mutation = useMutation<void, unknown, Partial<Colheita>>({
    mutationFn: async (data: Partial<Colheita>) => {
      return api.post('/agricultura/colheitas/', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colheitas'] });
      showSuccess('Colheita registrada com sucesso');
      onSuccess();
      onClose();
    },
    onError: (error: unknown) => {
      const e = error as { response?: { data?: unknown } } | null;
      const data = e?.response?.data;
      if (data) {
        // try to set server-side validation errors as record
        if (typeof data === 'object') {
          setErrors(data as Record<string, string>);
        }
        const getErrorMessage = (d: unknown) => {
          if (typeof d === 'string') return d;
          if (typeof d === 'object' && d !== null) {
            const r = d as Record<string, unknown>;
            if (typeof r.detail === 'string') return r.detail;
          }
          return 'Erro ao registrar colheita';
        };
        showError(getErrorMessage(data));
      } else {
        showError('Erro ao registrar colheita');
      }
    },
  });

  const handleChange = (field: keyof ColheitaFormState, value: unknown) => {
    setFormData((prev: ColheitaFormState) => ({ ...(prev as ColheitaFormState), [field]: value } as ColheitaFormState));
    if (errors[field as string]) setErrors((prev) => ({ ...prev, [field as string]: '' }));
  };



  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.plantio) newErrors.plantio = 'Safra (plantio) é obrigatória';
    if (!formData.data_colheita) newErrors.data_colheita = 'Data é obrigatória';
    // if itens exist, their sum should provide quantidade, otherwise require quantidade_colhida explicitly
    const itensSum = (formData.itens || []).reduce((s: number, it: { quantidade_colhida?: number | string }) => s + (Number(it.quantidade_colhida) || 0), 0);
    if (!formData.quantidade_colhida && itensSum === 0) newErrors.quantidade_colhida = 'Quantidade é obrigatória';

    // Destination-specific validations
    if (formData.destino_tipo === 'armazenagem_interna' && !formData.local_destino) {
      newErrors.local_destino = 'Selecione o local de armazenamento';
    }
    if ((formData.destino_tipo === 'contrato_industria' || formData.destino_tipo === 'armazenagem_geral') && !formData.empresa_destino) {
      newErrors.empresa_destino = 'Selecione a empresa/prestador responsável';
    }
    if ((formData.destino_tipo === 'contrato_industria' || formData.destino_tipo === 'armazenagem_geral') && !formData.peso_estimado) {
      newErrors.peso_estimado = 'Informe o peso estimado (kg)';
    }

    // Per-talhão validation: if a talhão is selected, require quantidade_colhida for it
    (formData.itens || []).forEach((it: { talhao: number | string; quantidade_colhida?: number | string }) => {
      if (it.talhao && (it.quantidade_colhida === undefined || it.quantidade_colhida === '' || Number(it.quantidade_colhida) <= 0)) {
        newErrors[`itens_${it.talhao}`] = 'Informe a quantidade colhida para o talhão';
      }
    });

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      console.debug('[ColheitaForm] validation errors', newErrors);
      showError('Preencha os campos obrigatórios antes de enviar');
    }
    return Object.keys(newErrors).length === 0; 
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      console.debug('[ColheitaForm] validation failed', errors);
      return;
    }
    // If itens are provided, sum their quantities into quantidade_colhecida
    const itensPayload = (formData.itens || []).map((i: { talhao: number | string; quantidade_colhida?: number | string }) => ({ talhao: i.talhao, quantidade_colhida: i.quantidade_colhida }));
    const totalFromItens = itensPayload.reduce((s: number, it: { quantidade_colhida?: number | string }) => s + (Number(it.quantidade_colhida) || 0), 0);

    const payload: Partial<Colheita> = {
      plantio: formData.plantio,
      data_colheita: formData.data_colheita,
      quantidade_colhida: (formData.quantidade_colhida as number) || (totalFromItens || undefined),
      unidade: formData.unidade,
      qualidade: formData.qualidade,
      observacoes: formData.observacoes,
      itens: itensPayload as unknown as Colheita['itens'],
      transportes: formData.transportes ? formData.transportes.map((t: ColheitaTransporte) => ({
        placa: t.placa,
        tara: t.tara,
        peso_bruto: t.peso_bruto,
        custo_transporte: t.custo_transporte
      })) : [],

      destino_tipo: formData.destino_tipo,
      local_tipo: formData.local_tipo || null,
      local_destino: formData.local_destino || null,
      empresa_destino: formData.empresa_destino || null,
      nf_provisoria: formData.nf_provisoria || null,
      peso_estimado: formData.peso_estimado || null
    };
    console.debug('[ColheitaForm] submitting payload:', payload);
    mutation.mutate(payload);
  };

  const firstTransporte = (formData.transportes && formData.transportes[0]) || {} as ColheitaTransporte; // kept for compatibility with TransportFields

  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-header">
        <h5 className="modal-title">Finalizar Talhão</h5>
        <button type="button" className="btn-close" onClick={onClose}></button>
      </div>

      <div className="modal-body p-3 p-md-4">
        <div className="mb-3">
          <label htmlFor="plantio" className="form-label">
            <i className="bi bi-flower1 me-2"></i>
            Safra (Plantio) <span className="text-danger">*</span>
          </label>
          <select id="plantio" aria-label="Safra (Plantio)"
            className={`form-select ${errors.plantio ? 'is-invalid' : ''}`}
            value={formData.plantio || ''}
            onChange={(e) => {
              handleChange('plantio', Number(e.target.value) || undefined);
              // Reset itens when plantio changes
              setFormData((prev: ColheitaFormState) => ({ ...prev, itens: [] }));
            }}
          >
            <option value="">Selecione a safra</option>
            {plantios.map((p: Plantio) => (
              <option key={p.id} value={p.id}>{p.nome_safra || p.cultura_nome || `Safra ${p.cultura}`}</option>
            ))}
          </select>
          {errors.plantio && <div className="invalid-feedback d-block">{errors.plantio}</div>}
        </div>

        {/* Talhões (seleção de talhões colhidos) */}
        {talhoesInfo.length > 0 && (
          <div className="mb-3">
            <label className="form-label">
              <i className="bi bi-geo-alt me-2"></i>
              Talhões colhidos
            </label>
            <small className="text-muted d-block mb-2">Preencha a quantidade colhida por talhão na unidade selecionada (kg, t, sacas 60kg). Este valor representa a quantidade colhida de produto, não a área (hectares).</small>
            <div className="border rounded p-2">
              {talhoesInfo.map((t: TalhaoInfo) => {
                const existing = (formData.itens || []).find((i) => i.talhao === t.id) || { quantidade_colhida: '' };
                const isPreselect = !!preselectedTalhao && preselectedTalhao === t.id;
                return (
                  <div key={t.id} className="d-flex align-items-center gap-3 mb-2">
                    <div className="form-check">
                      <input aria-label={`selecionar-talhao-${t.id}`} className="form-check-input" type="checkbox" id={`talhao-${t.id}`} checked={(formData.itens || []).some((i) => i.talhao === t.id)} onChange={(e) => {
                        if (isPreselect) return; // prevent unchecking when preselected
                        if (e.target.checked) {
                          setFormData((prev: ColheitaFormState) => ({ ...prev, itens: [ ...(prev.itens || []), { talhao: t.id, quantidade_colhida: '' } ] }))
                        } else {
                          setFormData((prev: ColheitaFormState) => ({ ...prev, itens: (prev.itens || []).filter((i) => i.talhao !== t.id) }))
                        }
                      }} disabled={isPreselect} />
                      <label className="form-check-label" htmlFor={`talhao-${t.id}`}>{t.nome || t.name} ({((t.area_hectares||t.area_size||0)).toFixed(2)} ha)</label>
                    </div>

                    {/* If this talhão was preselected for finalization, don't show per-talhão input (removed as requested) */}
                    {(!isPreselect && (formData.itens || []).some((i) => i.talhao === t.id)) && (
                      <div style={{ width: 220 }}>
                        <input aria-label={`quantidade-talhao-${t.id}`} placeholder={formData.unidade === 'kg' ? 'kg' : formData.unidade === 't' ? 't' : 'sacas (60kg)'} type="number" step="0.01" className={`form-control ${errors[`itens_${t.id}`] ? 'is-invalid' : ''}`} value={existing.quantidade_colhida as number || ''} onChange={(e) => {
                          const val = e.target.value;
                          setFormData((prev: ColheitaFormState) => ({ ...prev, itens: (prev.itens || []).map((i) => i.talhao === t.id ? { ...i, quantidade_colhida: Number(val) } : i) }))
                        }} />
                        {errors[`itens_${t.id}`] && <div className="invalid-feedback d-block">{errors[`itens_${t.id}`]}</div>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )} 

        <div className="mb-3">
          <label className="form-label">
            <i className="bi bi-calendar-event me-2"></i>
            Data da Colheita <span className="text-danger">*</span>
          </label>
          <input aria-label="Data da Colheita" type="date" className={`form-control ${errors.data_colheita ? 'is-invalid' : ''}`} value={formData.data_colheita} onChange={(e) => handleChange('data_colheita', e.target.value)} />
          {errors.data_colheita && <div className="invalid-feedback d-block">{errors.data_colheita}</div>}
        </div>

        <div className="row g-2 g-md-3">
          <div className="col-12 col-md-6 mb-3">
            <label className="form-label">
              <i className="bi bi-box-seam me-2"></i>
              Quantidade Colhida <span className="text-danger">*</span>
            </label>
            <input aria-label="Quantidade Colhida" type="number" step="0.01" className={`form-control ${errors.quantidade_colhida ? 'is-invalid' : ''}`} value={formData.quantidade_colhida ?? ''} onChange={(e) => handleChange('quantidade_colhida', Number(e.target.value))} />
            {errors.quantidade_colhida && <div className="invalid-feedback d-block">{errors.quantidade_colhida}</div>}
          </div>
          <div className="col-12 col-md-6 mb-3">
            <label className="form-label">
              <i className="bi bi-tag me-2"></i>
              Unidade
            </label>
            <select aria-label="Unidade" className="form-select" value={formData.unidade || 'kg'} onChange={(e) => handleChange('unidade', e.target.value)}>
              {Object.entries(UNIT_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Qualidade removed for talhão finalization flow */}
        { !preselectedSessionItem && (
          <div className="mb-3">
            <label className="form-label">Qualidade</label>
            <input className="form-control" value={formData.qualidade || ''} onChange={(e) => handleChange('qualidade', e.target.value)} />
          </div>
        )}

        <hr />
        {/* Transporte section removed for talhão finalization flow */}
        { !preselectedSessionItem && (
          <>
            <h6 className="text-primary mb-3">
              <i className="bi bi-truck me-2"></i>
              Transporte (opcional)
            </h6>
            <div>
              <TransportFields
                value={firstTransporte}
                onChange={(v: Partial<ColheitaTransporte>) => {
                  const rest = (formData.transportes || []).slice(1);
                  setFormData((prev: ColheitaFormState) => ({ ...prev, transportes: [ { ...(prev.transportes && prev.transportes[0] ? prev.transportes[0] : {}), ...v }, ...rest ] }));
                }}
                showMotorista={true}
                showDescontos={true}
                showCusto={true}
              />
            </div>

            <hr />
          </>
        )}
        <h6 className="text-primary mb-3">
          <i className="bi bi-pin-map me-2"></i>
          Destino da produção
        </h6>

        <div className="mb-3">
          <label className="form-label">Tipo de destino</label>
          <select aria-label="Tipo de destino" className="form-select" value={formData.destino_tipo} onChange={(e) => handleChange('destino_tipo', e.target.value)}>
            <option value="armazenagem_interna">Armazenamento na propriedade</option>
            <option value="contrato_industria">Contrato direto com indústria</option>
            <option value="armazenagem_geral">Armazém geral (terceiro)</option>
          </select>
        </div>

        {formData.destino_tipo === 'armazenagem_interna' && (
          <div className="mb-3">
            <label className="form-label">Tipo de local</label>
            <select aria-label="Tipo de local" className="form-select" value={formData.local_tipo} onChange={(e) => handleChange('local_tipo', e.target.value)}>
              <option value="silo_bolsa">Silo Bolsa</option>
              <option value="armazem">Armazém</option>
            </select>

            <label className="form-label mt-2">Local de destino <span className="text-danger">*</span></label>
            {locais.length === 0 ? (
              <select className="form-select" disabled><option>Nenhum local de armazenamento cadastrado</option></select>
            ) : (
              <select aria-label="Local de destino" className={`form-select ${errors.local_destino ? 'is-invalid' : ''}`} value={formData.local_destino || ''} onChange={(e) => handleChange('local_destino', Number(e.target.value))}>
                <option value="">Selecione um local</option>
                {locais.map((l) => (
                  <option key={l.id} value={l.id}>{l.nome} ({l.tipo})</option>
                ))}
              </select>
            )}
            {errors.local_destino && <div className="invalid-feedback d-block">{errors.local_destino}</div>}
          </div>
        )}

        {(formData.destino_tipo === 'contrato_industria' || formData.destino_tipo === 'armazenagem_geral') && (
          <div className="mb-3">
            <label className="form-label">Empresa/Prestador <span className="text-danger">*</span></label>
            <select aria-label="Empresa/Prestador" className={`form-select ${errors.empresa_destino ? 'is-invalid' : ''}`} value={formData.empresa_destino || ''} onChange={(e) => handleChange('empresa_destino', Number(e.target.value))}>
              <option value="">Selecione uma empresa</option>
              {empresas.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.nome}</option>
              ))}
            </select>
            <label className="form-label mt-2">NF provisória (opcional)</label>
            <input aria-label="NF provisória" className="form-control" value={formData.nf_provisoria || ''} onChange={(e) => handleChange('nf_provisoria', e.target.value)} />
            <label className="form-label mt-2">Peso estimado (kg) <span className="text-danger">*</span></label>
            <input aria-label="Peso estimado" type="number" step="0.01" className={`form-control ${errors.peso_estimado ? 'is-invalid' : ''}`} value={formData.peso_estimado ?? ''} onChange={(e) => handleChange('peso_estimado', Number(e.target.value))} />
          </div>
        )}

        <div className="mb-3">
          <label className="form-label">
            <i className="bi bi-text-paragraph me-2"></i>
            Observações
          </label>
          <textarea className="form-control" rows={3} value={formData.observacoes || ''} onChange={(e) => handleChange('observacoes', e.target.value)} />
        </div>

      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-success" disabled={mutation.status === 'pending'}>{mutation.status === 'pending' ? 'Enviando...' : (preselectedSessionItem ? 'Finalizar Talhão' : 'Registrar')}</button>
      </div>
    </form>
  );
};

export default ColheitaForm;
