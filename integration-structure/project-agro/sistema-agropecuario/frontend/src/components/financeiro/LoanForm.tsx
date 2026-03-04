import React from 'react';
import { useForm } from 'react-hook-form';
import financeiroService from '@/services/financeiro';
import { useApiQuery } from '@/hooks/useApi';
import SelectDropdown from '@/components/common/SelectDropdown';
import ComercialService from '@/services/comercial';

type TipoOperacao = 'financiamento' | 'emprestimo';

type Props = {
  defaultTipo?: TipoOperacao;
  onSuccess?: (created: any) => void;
  onCancel?: () => void;
};

type FormValues = {
  tipo_operacao: TipoOperacao;
  titulo: string;
  descricao?: string;
  instituicao_financeira?: number;
  valor?: number;
  valor_entrada?: number;
  taxa_juros?: number;
  frequencia_taxa?: 'mensal' | 'trimestral' | 'semestral' | 'anual';
  metodo_calculo?: 'price' | 'sac' | 'personalizado';
  numero_parcelas?: number;
  prazo_meses?: number;
  // Carência (meses) e flag para juros embutidos (backend já suporta)
  carencia_meses?: number;
  juros_embutidos?: boolean;
  data_contratacao?: string;
  data_primeiro_vencimento?: string;
  numero_contrato?: string;
};

const LoanForm: React.FC<Props> = ({ defaultTipo = 'financiamento', onSuccess, onCancel }) => {
  const { register, handleSubmit, watch, setValue } = useForm<FormValues>({ defaultValues: { tipo_operacao: defaultTipo, carencia_meses: 0, juros_embutidos: false } });
  const tipo = watch('tipo_operacao');
  const selectedInst = watch('instituicao_financeira');

  // request more results to populate the dropdown fully
  const { data: insts = [] } = useApiQuery<any[]>(['instituicoes'], '/comercial/instituicoes-financeiras/?page_size=1000');
  const handleSearchInst = async (term: string) => {
    const results = await ComercialService.getInstituicoes({ busca: term });
    return results.map((r: any) => ({ value: r.id, label: `${r.codigo_bacen} — ${r.nome}` }));
  };

  const onSubmit = async (data: FormValues) => {
    try {
      console.debug('LoanForm.onSubmit', data);
      const tituloFinal = data.titulo && data.titulo.trim().length ? data.titulo : (data.descricao || '');

      if (data.tipo_operacao === 'financiamento') {
        const firstVenc = data.data_primeiro_vencimento || (() => {
          const base = data.data_contratacao || new Date().toISOString().slice(0,10);
          const dt = new Date(base);
          dt.setMonth(dt.getMonth() + 1);
          return dt.toISOString().slice(0,10);
        })();

        const payload = {
          titulo: tituloFinal,
          descricao: data.descricao,
          instituicao_financeira: data.instituicao_financeira,
          valor_financiado: Number(data.valor || 0),
          valor_entrada: data.valor_entrada ? Number(data.valor_entrada) : 0,
          taxa_juros: Number(data.taxa_juros ?? 0),
          frequencia_taxa: data.frequencia_taxa || 'mensal',
          metodo_calculo: data.metodo_calculo || 'price',
          numero_parcelas: Number(data.numero_parcelas || 1),
          prazo_meses: Number(data.prazo_meses ?? data.numero_parcelas ?? 1),
          // carência e juros embutidos (backend já suporta)
          carencia_meses: Number(data.carencia_meses || 0),
          juros_embutidos: Boolean(data.juros_embutidos || false),
          data_contratacao: data.data_contratacao,
          data_primeiro_vencimento: firstVenc,
        } as any;

        // include numero_contrato when present
        if ((data as any).numero_contrato && String((data as any).numero_contrato).trim()) payload.numero_contrato = (data as any).numero_contrato;

        const created = await financeiroService.createFinanciamento(payload);
        if (onSuccess) onSuccess(created);
      } else {
        const firstVenc = data.data_primeiro_vencimento || (() => {
          const base = data.data_contratacao || new Date().toISOString().slice(0,10);
          const dt = new Date(base);
          dt.setMonth(dt.getMonth() + 1);
          return dt.toISOString().slice(0,10);
        })();

        const payload = {
          titulo: tituloFinal,
          descricao: data.descricao,
          instituicao_financeira: data.instituicao_financeira,
          valor_emprestimo: Number(data.valor || 0),
          valor_entrada: data.valor_entrada ? Number(data.valor_entrada) : 0,
          taxa_juros: Number(data.taxa_juros ?? 0),
          frequencia_taxa: data.frequencia_taxa || 'mensal',
          metodo_calculo: data.metodo_calculo || 'price',
          numero_parcelas: Number(data.numero_parcelas || 1),
          prazo_meses: Number(data.prazo_meses ?? data.numero_parcelas ?? 1),
          // carência e juros embutidos
          carencia_meses: Number(data.carencia_meses || 0),
          juros_embutidos: Boolean(data.juros_embutidos || false),
          data_contratacao: data.data_contratacao,
          data_primeiro_vencimento: firstVenc,
        } as any;

        console.debug('calling createEmprestimo', financeiroService.createEmprestimo);
        const created = await financeiroService.createEmprestimo(payload);
        try {
          const mockCalls = ((financeiroService.createEmprestimo as any)?.mock?.calls?.length) ?? 0;
          console.debug('after createEmprestimo call, mock calls:', mockCalls);
        } catch (err) {
          // ignore
        }

        if (onSuccess) onSuccess(created);
      }
    } catch (e) {
      console.error('Erro ao criar operação financeira', e);
      alert('Erro ao criar operação financeira');
    }
  };

  return (
    <div className="container-fluid p-3 p-md-4">
      <h4 className="mb-4">{tipo === 'financiamento' ? 'Novo Financiamento' : 'Novo Empréstimo'}</h4>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-3">
          <label className="form-label">Tipo</label>
          <select className="form-select" {...register('tipo_operacao')}>
            <option value="financiamento">Financiamento</option>
            <option value="emprestimo">Empréstimo</option>
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label">Título</label>
          <input className="form-control" {...register('titulo')} aria-label="Título" />
        </div>

        <div className="mb-3">
          <label className="form-label">Descrição</label>
          <textarea className="form-control" aria-label="Descrição" {...register('descricao')} />
        </div>

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Instituição financeira</label>
            <div>
              <SelectDropdown
                options={insts.map(i => ({ value: i.id, label: `${i.codigo_bacen} — ${i.nome}` }))}
                value={selectedInst}
                onChange={(v) => setValue('instituicao_financeira', v ? Number(v) : undefined)}
                placeholder="Pesquise por nome ou código"
                searchable={true}
                onSearch={handleSearchInst}
              />
              <input type="hidden" {...register('instituicao_financeira')} />
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label">Valor {tipo === 'financiamento' ? 'financiado' : 'emprestado'}</label>
            <input
              className="form-control"
              type="number"
              step="0.01"
              {...register('valor', { required: true })}
              aria-label={tipo === 'financiamento' ? 'Valor financiado' : 'Valor emprestado'}
            />
          </div>
        </div>

        <div className="row g-2 g-md-3">
          <div className="col-md-4">
            <label className="form-label">Valor entrada</label>
            <input className="form-control" type="number" step="0.01" {...register('valor_entrada')} />
          </div>

          <div className="col-md-4">
            <label className="form-label">Taxa juros (%)</label>
            <input className="form-control" type="number" step="0.01" {...register('taxa_juros')} />
          </div>

          <div className="col-md-4">
            <label className="form-label">Frequência taxa</label>
            <select className="form-select" {...register('frequencia_taxa')}>
              <option value="mensal">Mensal</option>
              <option value="trimestral">Trimestral</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Anual</option>
            </select>
          </div>
        </div>

        <div className="row g-2 g-md-3">
          <div className="col-md-4">
            <label className="form-label">Método cálculo</label>
            <select className="form-select" {...register('metodo_calculo')}>
              <option value="price">Price</option>
              <option value="sac">SAC</option>
              <option value="personalizado">Personalizado</option>
            </select>
          </div>

          <div className="col-md-4">
            <label className="form-label">Número de parcelas</label>
            <input className="form-control" type="number" {...register('numero_parcelas', { required: true })} aria-label="Número de parcelas" />
          </div>

          <div className="col-md-4">
            <label className="form-label">Prazo (meses)</label>
            <input className="form-control" type="number" {...register('prazo_meses')} />
          </div>
        </div>

        <div className="row g-2 g-md-3 align-items-center mt-2">
          <div className="col-md-6">
            <label className="form-label">Carência (meses)</label>
            <input className="form-control" type="number" min={0} {...register('carencia_meses')} />
          </div>

          <div className="col-md-6 d-flex align-items-center">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" {...register('juros_embutidos')} id="jurosEmbutidos" />
              <label className="form-check-label" htmlFor="jurosEmbutidos">Juros embutidos na carência</label>
            </div>
          </div>
        </div>

        <div className="row g-2 g-md-3">
          <div className="col-md-6">
            <label className="form-label">Data contratação</label>
            <input className="form-control" type="date" {...register('data_contratacao', { required: true })} aria-label="Data contratação" />
          </div>

          <div className="col-md-6">
            <label className="form-label">Data primeiro vencimento</label>
            <input className="form-control" type="date" {...register('data_primeiro_vencimento')} />
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Número do Contrato (opcional)</label>
          <input className="form-control" {...register('numero_contrato')} placeholder="Ex: CT-1234" />
        </div>

        <div className="d-flex gap-2">
          <button className="btn btn-primary" type="submit">Criar</button>
          <button type="button" className="btn btn-outline-secondary" onClick={() => onCancel && onCancel()}>Cancelar</button>
        </div>
      </form>
    </div>
  );
};

export default LoanForm;
