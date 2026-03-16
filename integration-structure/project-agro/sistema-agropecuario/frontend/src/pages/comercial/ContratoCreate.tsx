import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Input from '@/components/common/Input';
import Button from '@/components/Button';
import ComercialService from '@/services/comercial';

const schema = yup.object().shape({
  numero_contrato: yup.string().required('Número do contrato é obrigatório'),
  titulo: yup.string().required('Título é obrigatório'),
  tipo_contrato: yup.string().required('Tipo de contrato é obrigatório'),
  categoria: yup.string().required('Categoria é obrigatória'),
  status: yup.string().required('Status é obrigatório'),
  valor_total: yup.number().required('Valor total é obrigatório'),
  data_inicio: yup.string().required('Data de início é obrigatória'),
  data_fim: yup.string(),
  // Condições should be an array; forms may post empty array by default
  condicoes: yup.array().of(yup.object().shape({
    tipo_condicao: yup.string().required(),
    descricao: yup.string().required(),
    obrigatoria: yup.boolean(),
  })).default([]),
  // Commercial contract specific optional fields
  modalidade_comercial: yup.string(),
  instrumento_garantia: yup.string(),
  produto: yup.mixed(),
  variedade: yup.string(),
  safra: yup.mixed(),
  quantidade: yup.mixed(),
  unidade_medida: yup.string(),
  qualidade_especificacao: yup.string(),
  preco_unitario: yup.mixed(),
  forma_pagamento: yup.string(),
  prazo_pagamento_dias: yup.mixed(),
  data_entrega: yup.string(),
  local_entrega: yup.string(),
  produto_troca_recebido: yup.mixed(),
  quantidade_troca_recebida: yup.mixed(),
  unidade_troca_recebida: yup.string(),
});

interface ContratoCreateProps {
  onSuccess?: (data?: unknown) => void;
  onCancel?: () => void;
}

const ContratoCreate: React.FC<ContratoCreateProps> = ({ onSuccess, onCancel }) => {
  const [documentos, setDocumentos] = React.useState<File[]>([]);
  const [tipoContrato, setTipoContrato] = React.useState<string>('');
  const [modalidadeComercial, setModalidadeComercial] = React.useState<string>('');
  
  const { control, handleSubmit, watch } = useForm<any>({ 
    resolver: yupResolver(schema) as any, 
    defaultValues: { 
      numero_contrato: '', 
      titulo: '', 
      tipo_contrato: '', 
      categoria: '', 
      status: 'ativo', 
      valor_total: '', 
      data_inicio: '', 
      data_fim: '', 
      partes: [], 
      itens: [], 
      condicoes: [] 
    } 
  });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: (payload: unknown) => ComercialService.createContrato(payload as Parameters<typeof ComercialService.createContrato>[0]),
    onSuccess: (data: unknown) => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      const d = data as Record<string, unknown>;
      if (onSuccess) onSuccess(data); else navigate(`/comercial/contratos/${String(d.id)}`);
    }
  });

  const loading = mutation.status === 'pending';

  const onSubmit = async (data: unknown) => {
    try {
      // For MVP, add a simple parte
      const d = data as Record<string, unknown>;
      const payload = {
        ...(d as Record<string, unknown>),
        partes: [{
          tipo_parte: 'cliente',
          entidade_id: 1, // placeholder
          papel_contrato: 'contratante'
        }],
        condicoes: Array.isArray(d.condicoes) ? d.condicoes : [],
        documentos: documentos.map(file => ({
          nome: file.name,
          tipo: file.type,
          tamanho: file.size
        }))
      } as unknown as Parameters<typeof ComercialService.createContrato>[0];
      await mutation.mutateAsync(payload);
    } catch (e) {
      console.error('Erro ao criar contrato', e);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setDocumentos([...documentos, ...Array.from(files)]);
    }
  };

  const removeDocumento = (index: number) => {
    setDocumentos(documentos.filter((_, i) => i !== index));
  };

  return (
    <div className="container-fluid py-4">
      {!onCancel && (
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2>Novo Contrato</h2>
        </div>
      )}

      <div className="card">
        <div className="card-body p-3 p-md-4">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Dados do Contrato */}
            <div className="mb-4">
              <h6 className="text-primary mb-3">
                <i className="bi bi-file-earmark-text me-2"></i>
                Identificação do Contrato
              </h6>
              <div className="row g-2 g-md-3">
                <div className="col-12 col-sm-6 col-md-3">
                  <Controller
                    name="numero_contrato"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Input label="Número do Contrato *" {...field} error={fieldState.error?.message} />
                    )}
                  />
                </div>

                <div className="col-12 col-md-6">
                  <Controller
                    name="titulo"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Input label="Título / Objeto *" placeholder="Ex: Venda de Soja Safra 2025/2026" {...field} error={fieldState.error?.message} />
                    )}
                  />
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="form-label">Status</label>
                        <select {...field} className="form-select">
                          <option value="rascunho">Rascunho</option>
                          <option value="ativo">Ativo</option>
                          <option value="suspenso">Suspenso</option>
                          <option value="cancelado">Cancelado</option>
                          <option value="encerrado">Encerrado</option>
                        </select>
                      </div>
                    )}
                  />
                </div>

                <div className="col-12 col-sm-6 col-lg-3">
                  <Controller
                    name="tipo_contrato"
                    control={control}
                    render={({ field, fieldState }) => (
                      <div>
                        <label className="form-label">Tipo de Operação *</label>
                        <select 
                          {...field} 
                          className="form-select"
                          onChange={(e) => {
                            field.onChange(e);
                            setTipoContrato(e.target.value);
                          }}
                        >
                          <option value="">Selecione</option>
                          <option value="venda">Venda</option>
                          <option value="compra">Compra</option>
                          <option value="bater">Barter</option>
                          <option value="servico">Serviço</option>
                          <option value="outros">Arrendamento / Outros</option>
                        </select>
                        {fieldState.error && <small className="text-danger">{fieldState.error.message}</small>}
                      </div>
                    )}
                  />
                </div>

                <div className="col-12 col-sm-6 col-lg-3">
                  <Controller
                    name="modalidade_comercial"
                    control={control}
                    render={({ field, fieldState }) => (
                      <div>
                        <label className="form-label">Modalidade Comercial *</label>
                        <select 
                          {...field} 
                          className="form-select"
                          onChange={(e) => {
                            field.onChange(e);
                            setModalidadeComercial(e.target.value);
                          }}
                        >
                          <option value="">Selecione</option>
                          <option value="spot">SPOT (À Vista)</option>
                          <option value="fixo">Fixo (Pré-Fixado)</option>
                          <option value="futuro">Futuro</option>
                          <option value="a_fixar">A Fixar</option>
                          <option value="consignado">Consignado</option>
                        </select>
                        {fieldState.error && <small className="text-danger">{fieldState.error.message}</small>}
                      </div>
                    )}
                  />
                </div>

                <div className="col-12 col-sm-6 col-lg-3">
                  <Controller
                    name="categoria"
                    control={control}
                    render={({ field, fieldState }) => (
                      <div>
                        <label className="form-label">Categoria *</label>
                        <select {...field} className="form-select">
                          <option value="">Selecione</option>
                          <option value="graos">Grãos</option>
                          <option value="insumos">Insumos</option>
                          <option value="sementes">Sementes</option>
                          <option value="fertilizantes">Fertilizantes</option>
                          <option value="defensivos">Defensivos</option>
                          <option value="servicos">Serviços</option>
                          <option value="equipamentos">Equipamentos</option>
                          <option value="outros">Outros</option>
                        </select>
                        {fieldState.error && <small className="text-danger">{fieldState.error.message}</small>}
                      </div>
                    )}
                  />
                </div>

                <div className="col-12 col-sm-6 col-lg-3">
                  <Controller
                    name="instrumento_garantia"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="form-label">Garantia</label>
                        <select {...field} className="form-select">
                          <option value="">Nenhum</option>
                          <option value="cpr_fisica">CPR Física</option>
                          <option value="cpr_financeira">CPR Financeira</option>
                          <option value="nota_promissoria">Nota Promissória</option>
                          <option value="penhor">Penhor</option>
                          <option value="aval">Aval</option>
                        </select>
                      </div>
                    )}
                  />
                </div>
              </div>
            </div>

            <hr className="my-4" />

            {/* Especificações do Produto/Serviço */}
            <div className="mb-4">
              <h6 className="text-primary mb-3">
                <i className="bi bi-box-seam me-2"></i>
                Especificações do Produto/Serviço
              </h6>
              <div className="row g-2 g-md-3">
                <div className="col-12 col-md-6">
                  <Controller
                    name="produto"
                    control={control}
                    render={({ field }) => (
                      <Input label="Produto/Serviço *" placeholder="Ex: Soja em Grão" {...field} />
                    )}
                  />
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                  <Controller
                    name="variedade"
                    control={control}
                    render={({ field }) => (
                      <Input label="Variedade/Cultivar" placeholder="Ex: M6410 IPRO" {...field} />
                    )}
                  />
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                  <Controller
                    name="safra"
                    control={control}
                    render={({ field }) => (
                      <Input label="Safra" placeholder="Ex: 2025/2026" {...field} />
                    )}
                  />
                </div>

                <div className="col-12 col-sm-6 col-md-4">
                  <Controller
                    name="quantidade"
                    control={control}
                    render={({ field }) => (
                      <Input label="Quantidade *" type="number" step="0.001" placeholder="Ex: 5000" {...field} />
                    )}
                  />
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                  <Controller
                    name="unidade_medida"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="form-label">Unidade *</label>
                        <select {...field} className="form-select">
                          <option value="sc">Sacas (60kg)</option>
                          <option value="ton">Toneladas</option>
                          <option value="kg">Quilogramas</option>
                          <option value="litros">Litros</option>
                          <option value="unidade">Unidades</option>
                        </select>
                      </div>
                    )}
                  />
                </div>

                <div className="col-12 col-md-5">
                  <Controller
                    name="qualidade_especificacao"
                    control={control}
                    render={({ field }) => (
                      <Input 
                        label="Especificação de Qualidade" 
                        placeholder="Ex: Umidade máx 14%, Impurezas máx 1%" 
                        {...field} 
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            <hr className="my-4" />

            {/* Valores e Prazos */}
            <div className="mb-4">
              <h6 className="text-primary mb-3">
                <i className="bi bi-currency-dollar me-2"></i>
                Valores, Preços e Prazos
              </h6>
              <div className="row g-2 g-md-3">
                <div className="col-12 col-sm-6 col-md-3">
                  <Controller
                    name="preco_unitario"
                    control={control}
                    render={({ field }) => (
                      <Input label="Preço Unitário (R$)" type="number" step="0.01" placeholder="Ex: 125.50" {...field} />
                    )}
                  />
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                  <Controller
                    name="valor_total"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Input label="Valor Total (R$) *" type="number" step="0.01" {...field} error={fieldState.error?.message} />
                    )}
                  />
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                  <Controller
                    name="forma_pagamento"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="form-label">Forma de Pagamento</label>
                        <select {...field} className="form-select">
                          <option value="a_vista">À Vista</option>
                          <option value="parcelado">Parcelado</option>
                          <option value="antecipado">Antecipado</option>
                          <option value="pos_entrega">Pós-Entrega</option>
                          <option value="troca">Troca (Barter)</option>
                        </select>
                      </div>
                    )}
                  />
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                  <Controller
                    name="prazo_pagamento_dias"
                    control={control}
                    render={({ field }) => (
                      <Input label="Prazo (dias)" type="number" placeholder="Ex: 30" {...field} />
                    )}
                  />
                </div>

                <div className="col-12 col-sm-6 col-md-4">
                  <Controller
                    name="data_inicio"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Input label="Data de Início *" type="date" {...field} error={fieldState.error?.message} />
                    )}
                  />
                </div>

                <div className="col-12 col-sm-6 col-md-4">
                  <Controller
                    name="data_entrega"
                    control={control}
                    render={({ field }) => (
                      <Input label="Data de Entrega" type="date" {...field} />
                    )}
                  />
                </div>

                <div className="col-12 col-sm-6 col-md-4">
                  <Controller
                    name="data_fim"
                    control={control}
                    render={({ field }) => (
                      <Input label="Data de Término" type="date" {...field} />
                    )}
                  />
                </div>

                <div className="col-12">
                  <Controller
                    name="local_entrega"
                    control={control}
                    render={({ field }) => (
                      <Input 
                        label="Local de Entrega" 
                        placeholder="Ex: Armazém XYZ, Rodovia BR-163 km 512, Lucas do Rio Verde - MT" 
                        {...field} 
                      />
                    )}
                  />
                </div>

                {tipoContrato === 'barter' && (
                  <>
                    <div className="col-12">
                      <div className="alert alert-info mb-0">
                        <i className="bi bi-info-circle me-2"></i>
                        <strong>Operação Barter:</strong> Especifique os produtos/insumos envolvidos na troca e suas quantidades equivalentes.
                      </div>
                    </div>
                    <div className="col-12 col-md-6">
                      <Controller
                        name="produto_troca_recebido"
                        control={control}
                        render={({ field }) => (
                          <Input label="Produto Recebido na Troca" placeholder="Ex: Fertilizante NPK" {...field} />
                        )}
                      />
                    </div>
                    <div className="col-12 col-sm-6 col-md-3">
                      <Controller
                        name="quantidade_troca_recebida"
                        control={control}
                        render={({ field }) => (
                          <Input label="Quantidade Recebida" type="number" step="0.001" {...field} />
                        )}
                      />
                    </div>
                    <div className="col-12 col-sm-6 col-md-3">
                      <Controller
                        name="unidade_troca_recebida"
                        control={control}
                        render={({ field }) => (
                          <Input label="Unidade" placeholder="Ex: Toneladas" {...field} />
                        )}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <hr className="my-4" />
            <hr className="my-4" />

            {/* Condições */}
            <div className="mb-4">
              <h6 className="text-primary mb-3">
                <i className="bi bi-list-check me-2"></i>
                Condições, Cláusulas e Observações
              </h6>
              <div className="row g-2 g-md-3">
                <div className="col-12">
                  <Controller
                    name="condicoes"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="form-label">Condições Contratuais e Cláusulas</label>
                        <textarea {...field} rows={5} className="form-control" placeholder="Descreva as condições, cláusulas, penalidades, multas e termos específicos do contrato..." />
                      </div>
                    )}
                  />
                </div>
              </div>
            </div>

            <hr className="my-4" />

            {/* Documentos */}
            <div className="mb-4">
              <h6 className="text-primary mb-3">
                <i className="bi bi-paperclip me-2"></i>
                Documentos Anexos
              </h6>
              <div className="row g-3">
                <div className="col-12">
                  <div className="border border-dashed rounded p-3 bg-light">
                    <div className="d-flex align-items-center justify-content-center mb-3">
                      <label htmlFor="file-upload" className="btn btn-outline-primary mb-0 cursor-pointer">
                        <i className="bi bi-cloud-upload me-2"></i>
                        Selecionar Arquivos
                      </label>
                      <input
                        id="file-upload"
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="d-none"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                    </div>
                    <p className="text-muted text-center mb-0 small">
                      Formatos aceitos: PDF, DOC, DOCX, JPG, PNG (Máx. 10MB por arquivo)
                    </p>
                  </div>
                </div>

                {documentos.length > 0 && (
                  <div className="col-12">
                    <div className="list-group">
                      {documentos.map((doc, index) => (
                        <div key={index} className="list-group-item d-flex justify-content-between align-items-center">
                          <div className="d-flex align-items-center">
                            <i className="bi bi-file-earmark-text text-primary me-2 fs-5"></i>
                            <div>
                              <div className="fw-medium">{doc.name}</div>
                              <small className="text-muted">
                                {(doc.size / 1024).toFixed(2)} KB
                              </small>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeDocumento(index)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                {loading ? 'Salvando...' : 'Salvar Contrato'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContratoCreate;