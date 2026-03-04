import React, { useState, useEffect } from 'react';
import type { Equipamento, CategoriaEquipamento } from '../../types';
import api from '../../services/api';

interface EquipamentoFormProps {
  equipamento?: Equipamento;
  onSave: (equipamento: Omit<Equipamento, 'id'> | Partial<Equipamento>) => void;
  onCancel: () => void;
}

const EquipamentoForm: React.FC<EquipamentoFormProps> = ({
  equipamento,
  onSave,
  onCancel
}) => {
  const [categorias, setCategorias] = useState<CategoriaEquipamento[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [formData, setFormData] = useState({
    nome: equipamento?.nome || '',
    categoria: equipamento?.categoria || null,
    tipo_mobilidade: equipamento?.tipo_mobilidade || '',
    marca: equipamento?.marca || '',
    modelo: equipamento?.modelo || '',
    ano_fabricacao: equipamento?.ano_fabricacao || new Date().getFullYear(),
    numero_serie: equipamento?.numero_serie || '',
    potencia_cv: Number(equipamento?.potencia_cv) || 0,
    capacidade_litros: Number(equipamento?.capacidade_litros) || 0,
    horimetro_atual: Number(equipamento?.horimetro_atual) || 0,
    valor_aquisicao: Number(equipamento?.valor_aquisicao) || 0,
    data_aquisicao: equipamento?.data_aquisicao || '',
    status: equipamento?.status || 'ativo',
    observacoes: equipamento?.observacoes || '',
    local_instalacao: equipamento?.local_instalacao || ''
  });

  // Carregar categorias do backend
  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const response = await api.get('/maquinas/categorias-equipamento/');
        setCategorias(response.data.results || response.data);
      } catch (error: any) {
        if (error?.response?.status === 401) {
          // Usuário não autenticado – reduzir spam no console
          console.warn('Categorias: não autorizado (usuário não autenticado)');
        } else {
          console.error('Erro ao carregar categorias:', error);
        }
        // Fallback para categorias básicas se API falhar
        setCategorias([
          { id: 1, nome: 'Trator', descricao: 'Trator agrícola', tipo_mobilidade: 'autopropelido', requer_horimetro: true, requer_potencia: true, requer_localizacao: false, requer_acoplamento: false, ativo: true, ordem_exibicao: 1 },
          { id: 5, nome: 'Outros', descricao: 'Outros equipamentos', tipo_mobilidade: 'autopropelido', requer_horimetro: false, requer_potencia: false, requer_localizacao: false, requer_acoplamento: false, ativo: true, ordem_exibicao: 5 }
        ]);
      } finally {
        setLoadingCategorias(false);
      }
    };

    loadCategorias();
  }, []);

  // Atualizar tipo_mobilidade quando categoria mudar
  useEffect(() => {
    if (formData.categoria && categorias.length > 0) {
      const categoriaSelecionada = categorias.find(c => c.id === formData.categoria);
      if (categoriaSelecionada) {
        setFormData(prev => ({
          ...prev,
          tipo_mobilidade: categoriaSelecionada.tipo_mobilidade
        }));
      }
    }
  }, [formData.categoria, categorias]);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const dataToSave: Omit<Equipamento, 'id'> = {
        nome: formData.nome,
        ano_fabricacao: formData.ano_fabricacao,
        categoria: formData.categoria!,
        tipo_mobilidade: formData.tipo_mobilidade as 'autopropelido' | 'estacionario' | 'rebocado',
        status: formData.status as 'ativo' | 'inativo' | 'manutenção' | 'vendido',
        marca: formData.marca || undefined,
        modelo: formData.modelo || undefined,
        numero_serie: formData.numero_serie || undefined,
        potencia_cv: formData.potencia_cv > 0 ? formData.potencia_cv : undefined,
        capacidade_litros: formData.capacidade_litros > 0 ? formData.capacidade_litros : undefined,
        horimetro_atual: formData.horimetro_atual > 0 ? formData.horimetro_atual : undefined,
        valor_aquisicao: formData.valor_aquisicao,  // Campo obrigatório, sempre enviar
        data_aquisicao: formData.data_aquisicao || undefined,
        observacoes: formData.observacoes || undefined,
        local_instalacao: formData.local_instalacao || undefined
      };

      console.log('=== DEBUG EQUIPAMENTO FORM ===');
      console.log('FormData completo:', formData);
      console.log('Categoria selecionada:', categorias.find(c => c.id === formData.categoria));
      console.log('DataToSave sendo enviado:', dataToSave);
      console.log('============================');

      await onSave(dataToSave);
    } catch (error: any) {
      console.error('Erro ao salvar equipamento:', error);

      // Tentativa de mapear erros do DRF e mostrar inline
      if (error?.response?.data && typeof error.response.data === 'object') {
        setErrors(error.response.data);
      } else {
        alert('Erro ao salvar equipamento. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let processedValue: any = value;
    
    if (type === 'number') {
      processedValue = value === '' ? 0 : Number(value);
    } else if (name === 'categoria') {
      // Categoria deve ser number (ID) ou undefined
      processedValue = value === '' ? null : Number(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-primary text-white d-flex align-items-center">
        <i className="bi bi-truck me-2"></i>
        <h5 className="mb-0">{equipamento ? 'Editar Equipamento' : 'Novo Equipamento'}</h5>
      </div>
      <div className="card-body p-3 p-md-4">
        <form onSubmit={handleSubmit}>
          <div className="row g-2 g-md-3">
            {/* Nome */}
            <div className="col-12 col-md-6">
              <label htmlFor="nome" className="form-label">
                <i className="bi bi-tag me-1"></i>Nome *
              </label>
              <input
                type="text"
                className="form-control"
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                required
              />
            </div>

            {/* Categoria */}
            <div className="col-12 col-md-6">
              <label htmlFor="categoria" className="form-label">
                <i className="bi bi-list-ul me-1"></i>Categoria *
              </label>
              <select
                className="form-select"
                id="categoria"
                name="categoria"
                value={formData.categoria || ''}
                onChange={handleChange}
                required
                disabled={loadingCategorias}
              >
                <option value="">
                  {loadingCategorias ? 'Carregando categorias...' : 'Selecione uma categoria'}
                </option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nome}</option>
                ))}
              </select>
            </div>

            {/* Tipo de Mobilidade - Auto-preenchido pela categoria */}
            <div className="col-12 col-md-6">
              <label htmlFor="tipo_mobilidade" className="form-label">
                <i className="bi bi-arrow-left-right me-1"></i>Tipo de Mobilidade *
              </label>
              <input
                type="text"
                className="form-control bg-light"
                id="tipo_mobilidade"
                name="tipo_mobilidade"
                value={formData.tipo_mobilidade || 'Selecione uma categoria'}
                disabled
                readOnly
              />
              <small className="text-muted">Preenchido automaticamente pela categoria</small>
            </div>

            {/* Status */}
            <div className="col-12 col-md-6">
              <label htmlFor="status" className="form-label">
                <i className="bi bi-check-circle me-1"></i>Status *
              </label>
              <select
                className="form-select"
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="manutencao">Em Manutenção</option>
                <option value="vendido">Vendido</option>
              </select>
            </div>

            {/* Marca e Modelo */}
            <div className="col-12 col-md-6">
              <label htmlFor="marca" className="form-label">
                <i className="bi bi-building me-1"></i>Marca *
              </label>
        <input
          type="text"
          className={`form-control ${errors.marca ? 'is-invalid' : ''}`}
          id="marca"
          name="marca"
          value={formData.marca}
          onChange={handleChange}
          required
        />
        {errors.marca && (
          <div className="invalid-feedback">
            {errors.marca.join(' ')}
          </div>
        )}
      </div>

      <div className="col-md-6">
        <label htmlFor="modelo" className="form-label">Modelo *</label>
        <input
          type="text"
          className={`form-control ${errors.modelo ? 'is-invalid' : ''}`}
          id="modelo"
          name="modelo"
          value={formData.modelo}
          onChange={handleChange}
          required
        />
        {errors.modelo && (
          <div className="invalid-feedback">
            {errors.modelo.join(' ')}
          </div>
        )}
      </div>

      {/* Ano de Fabricação e Número de Série */}
      <div className="col-md-6">
        <label htmlFor="ano_fabricacao" className="form-label">Ano de Fabricação *</label>
        <input
          type="number"
          className={`form-control ${errors.ano_fabricacao ? 'is-invalid' : ''}`}
          id="ano_fabricacao"
          name="ano_fabricacao"
          value={formData.ano_fabricacao}
          onChange={handleChange}
          min="1900"
          max={new Date().getFullYear() + 1}
          required
        />
        {errors.ano_fabricacao && (
          <div className="invalid-feedback">{errors.ano_fabricacao.join(' ')}</div>
        )}
      </div>

      <div className="col-md-6">
        <label htmlFor="numero_serie" className="form-label">Número de Série</label>
        <input
          type="text"
          className="form-control"
          id="numero_serie"
          name="numero_serie"
          value={formData.numero_serie}
          onChange={handleChange}
        />
      </div>

      {/* Potência e Capacidade */}
      <div className="col-md-6">
        <label htmlFor="potencia_cv" className="form-label">Potência (CV)</label>
        <input
          type="number"
          className="form-control"
          id="potencia_cv"
          name="potencia_cv"
          value={formData.potencia_cv}
          onChange={handleChange}
          min="0"
          step="0.1"
        />
      </div>

      <div className="col-md-6">
        <label htmlFor="capacidade_litros" className="form-label">Capacidade (Litros)</label>
        <input
          type="number"
          className="form-control"
          id="capacidade_litros"
          name="capacidade_litros"
          value={formData.capacidade_litros}
          onChange={handleChange}
          min="0"
          step="0.1"
        />
      </div>

      {/* Horímetro e Valor de Aquisição */}
      <div className="col-md-6">
        <label htmlFor="horimetro_atual" className="form-label">Horímetro Atual</label>
        <input
          type="number"
          className="form-control"
          id="horimetro_atual"
          name="horimetro_atual"
          value={formData.horimetro_atual}
          onChange={handleChange}
          min="0"
          step="0.1"
        />
      </div>

            {/* Campos condicionais baseados em categoria */}
            {formData.categoria && categorias.length > 0 && (() => {
              const categoria = categorias.find(c => c.id === formData.categoria);
              
              return (
                <>
                  {/* Local de instalação (estacionários) */}
                  {categoria?.requer_localizacao && (
                    <div className="col-12 col-md-6">
                      <label htmlFor="local_instalacao" className="form-label">
                        <i className="bi bi-geo-alt me-1"></i>Local de Instalação *
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="local_instalacao"
                        name="local_instalacao"
                        value={formData.local_instalacao}
                        onChange={handleChange}
                        required
                        placeholder="Ex: Fazenda Santa Rita - Pivot 1"
                      />
                      <small className="text-muted">Para equipamentos fixos (pivot, bomba, gerador)</small>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Valor de Aquisição */}
            <div className="col-12 col-md-6">
              <label htmlFor="valor_aquisicao" className="form-label">
                <i className="bi bi-currency-dollar me-1"></i>Valor de Aquisição (R$) *
              </label>
              <input
                type="number"
                className={`form-control ${errors.valor_aquisicao ? 'is-invalid' : ''}`}
                id="valor_aquisicao"
                name="valor_aquisicao"
                value={formData.valor_aquisicao}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
              />
              {errors.valor_aquisicao && (
                <div className="invalid-feedback">{errors.valor_aquisicao.join(' ')}</div>
              )}
            </div>

            {/* Data de Aquisição */}
            <div className="col-12 col-md-6">
              <label htmlFor="data_aquisicao" className="form-label">
                <i className="bi bi-calendar me-1"></i>Data de Aquisição *
              </label>
              <input
                type="date"
                className={`form-control ${errors.data_aquisicao ? 'is-invalid' : ''}`}
                id="data_aquisicao"
                name="data_aquisicao"
                value={formData.data_aquisicao}
                onChange={handleChange}
                required
              />
              {errors.data_aquisicao && (
                <div className="invalid-feedback">{errors.data_aquisicao.join(' ')}</div>
              )}
            </div>

            {/* Observações */}
            <div className="col-12">
              <label htmlFor="observacoes" className="form-label">
                <i className="bi bi-chat-left-text me-1"></i>Observações
              </label>
              <textarea
                className="form-control"
                id="observacoes"
                name="observacoes"
                rows={3}
                value={formData.observacoes}
                onChange={handleChange}
              />
            </div>

            {/* Botões */}
            <div className="col-12">
              <div className="d-flex flex-column flex-sm-row gap-2 justify-content-end mt-3">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onCancel}
                  disabled={loading}
                >
                  <i className="bi bi-x-circle me-2"></i>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  <i className="bi bi-check-circle me-2"></i>
                  {loading ? 'Salvando...' : (equipamento ? 'Atualizar' : 'Cadastrar')}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EquipamentoForm;