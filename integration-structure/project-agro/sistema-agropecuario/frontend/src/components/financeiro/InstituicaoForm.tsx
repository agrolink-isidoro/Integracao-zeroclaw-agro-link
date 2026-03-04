import React, { useEffect, useState } from 'react';
import { useApiCreate, useApiUpdate } from '@/hooks/useApi';

interface Props {
  initialData?: any;
  onClose: () => void;
  onSaved?: (data: any) => void;
}

const InstituicaoForm: React.FC<Props> = ({ initialData, onClose, onSaved }) => {
  const isEdit = !!initialData;
  const [codigo, setCodigo] = useState(initialData?.codigo_bacen || '');
  const [nome, setNome] = useState(initialData?.nome || '');
  const [segmento, setSegmento] = useState(initialData?.segmento || 'outros');
  const [municipio, setMunicipio] = useState(initialData?.municipio || '');
  const [uf, setUf] = useState(initialData?.uf || '');
  const [errors, setErrors] = useState<{ codigo?: string; nome?: string }>({});

  const create = useApiCreate('/comercial/instituicoes-financeiras/', [['instituicoes']]);
  const update = useApiUpdate('/comercial/instituicoes-financeiras/', [['instituicoes']]);

  const validate = () => {
    const e: any = {};
    if (!codigo || !codigo.trim()) e.codigo = 'Código BACEN é obrigatório';
    if (!nome || !nome.trim()) e.nome = 'Nome é obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ensure validation runs before save
  const handleSave = async () => {
    if (!validate()) return;

    const payload = { codigo_bacen: codigo, nome, segmento, municipio, uf } as any;
    try {
      if (isEdit && initialData?.id) {
        await update.mutateAsync({ id: initialData.id, ...payload });
        if (onSaved) onSaved({ id: initialData.id, ...payload });
      } else {
        const created = await create.mutateAsync(payload);
        if (onSaved) onSaved(created);
      }
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar instituição:', err);
      alert('Falha ao salvar: ' + (err?.response?.data?.detail || err?.message || 'erro desconhecido'));
    }
  };

  useEffect(() => {
    if (initialData) {
      setCodigo(initialData.codigo_bacen || '');
      setNome(initialData.nome || '');
      setSegmento(initialData.segmento || 'outros');
      setMunicipio(initialData.municipio || '');
      setUf(initialData.uf || '');
    }
  }, [initialData]);

  return (
    <div>
      <div className="mb-3">
        <label className="form-label">
          <i className="bi bi-building me-2"></i>Código BACEN
        </label>
        <input name="codigo_bacen" className={`form-control ${errors.codigo ? 'is-invalid' : ''}`} value={codigo} onChange={(e) => setCodigo(e.target.value)} />
        {errors.codigo && <div className="invalid-feedback">{errors.codigo}</div>}
      </div>
      <div className="mb-3">
        <label className="form-label">
          <i className="bi bi-building me-2"></i>Nome
        </label>
        <input name="nome" placeholder="Nome" className={`form-control ${errors.nome ? 'is-invalid' : ''}`} value={nome} onChange={(e) => setNome(e.target.value)} />
        {errors.nome && <div className="invalid-feedback">{errors.nome}</div>}
      </div>
      <div className="mb-3">
        <label className="form-label">Segmento</label>
        <select className="form-select" value={segmento} onChange={(e) => setSegmento(e.target.value)}>
          <option value="banco_comercial">Banco Comercial</option>
          <option value="banco_multiplo">Banco Múltiplo</option>
          <option value="banco_investimento">Banco de Investimento</option>
          <option value="caixa_economica">Caixa Econômica</option>
          <option value="outros">Outros</option>
        </select>
      </div>
      <div className="row g-2 mb-3">
        <div className="col">
          <label className="form-label">Município</label>
          <input className="form-control" value={municipio} onChange={(e) => setMunicipio(e.target.value)} />
        </div>
        <div className="col-2">
          <label className="form-label">UF</label>
          <input className="form-control" value={uf} onChange={(e) => setUf(e.target.value)} />
        </div>
      </div>

      <div className="d-flex justify-content-end gap-2">
        <button className="btn btn-outline-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave}>{isEdit ? 'Salvar' : 'Criar'}</button>
      </div>
    </div>
  );
};

export default InstituicaoForm;
