import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
const EquipamentoForm = ({ equipamento, onSave, onCancel }) => {
    const [categorias, setCategorias] = useState([]);
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
                console.log('[EquipamentoForm] Iniciando carregamento de categorias de /maquinas/categorias-equipamento/');
                const response = await api.get('/maquinas/categorias-equipamento/');
                console.log('[EquipamentoForm] Resposta da API:', response.data);
                const cats = response.data.results || response.data;
                console.log(`[EquipamentoForm] Categorias carregadas com sucesso: ${cats?.length || 0} itens`);
                setCategorias(cats || []);
            }
            catch (error) {
                console.error('[EquipamentoForm] ERRO ao carregar categorias:', {
                    status: error?.response?.status,
                    message: error?.message,
                    data: error?.response?.data,
                    fullError: error
                });
                
                // Fallback com as 18 categorias REAIS do banco de dados
                // Se a API falhar, usa essas para que a IA tenha dados corretos
                const categoriasReais = [
                    { id: 18, nome: 'Drone Agrícola', descricao: 'Drone aéreo para monitoramento e aplicação de defensivos', tipo_mobilidade: 'aéreo', requer_horimetro: false, requer_potencia: true, requer_localizacao: true, requer_acoplamento: false, ativo: true },
                    { id: 1, nome: 'Trator', descricao: 'Trator agrícola para tração e operações diversas', tipo_mobilidade: 'autopropelido', requer_horimetro: true, requer_potencia: true, requer_localizacao: false, requer_acoplamento: true, ativo: true },
                    { id: 2, nome: 'Colhedeira', descricao: 'Colhedeira automotriz para grãos', tipo_mobilidade: 'autopropelido', requer_horimetro: true, requer_potencia: true, requer_localizacao: false, requer_acoplamento: false, ativo: true },
                    { id: 3, nome: 'Pulverizador Autopropelido', descricao: 'Pulverizador com motor próprio', tipo_mobilidade: 'autopropelido', requer_horimetro: true, requer_potencia: true, requer_localizacao: false, requer_acoplamento: false, ativo: true },
                    { id: 4, nome: 'Caminhão', descricao: 'Caminhão para transporte', tipo_mobilidade: 'autopropelido', requer_horimetro: true, requer_potencia: true, requer_localizacao: false, requer_acoplamento: false, ativo: true },
                    { id: 5, nome: 'Arado', descricao: 'Arado acoplável ao trator', tipo_mobilidade: 'acoplado', requer_horimetro: false, requer_potencia: false, requer_localizacao: false, requer_acoplamento: true, ativo: true },
                    { id: 6, nome: 'Grade', descricao: 'Grade acoplável ao trator', tipo_mobilidade: 'acoplado', requer_horimetro: false, requer_potencia: false, requer_localizacao: false, requer_acoplamento: true, ativo: true },
                    { id: 7, nome: 'Plantadeira', descricao: 'Plantadeira acoplável ao trator', tipo_mobilidade: 'acoplado', requer_horimetro: false, requer_potencia: false, requer_localizacao: false, requer_acoplamento: true, ativo: true },
                    { id: 8, nome: 'Pulverizador Rebocado', descricao: 'Pulverizador rebocado pelo trator', tipo_mobilidade: 'rebocado', requer_horimetro: false, requer_potencia: false, requer_localizacao: false, requer_acoplamento: true, ativo: true },
                    { id: 9, nome: 'Distribuidor de Calcário', descricao: 'Distribuidor de calcário rebocado', tipo_mobilidade: 'rebocado', requer_horimetro: false, requer_potencia: false, requer_localizacao: false, requer_acoplamento: true, ativo: true },
                    { id: 10, nome: 'Carreta Agrícola', descricao: 'Carreta agrícola rebocada', tipo_mobilidade: 'rebocado', requer_horimetro: false, requer_potencia: false, requer_localizacao: false, requer_acoplamento: true, ativo: true },
                    { id: 11, nome: 'Pivot Central', descricao: 'Sistema de irrigação pivot', tipo_mobilidade: 'fixo', requer_horimetro: false, requer_potencia: true, requer_localizacao: true, requer_acoplamento: false, ativo: true },
                    { id: 12, nome: 'Bomba de Água', descricao: 'Bomba de água para irrigação', tipo_mobilidade: 'fixo', requer_horimetro: false, requer_potencia: true, requer_localizacao: true, requer_acoplamento: false, ativo: true },
                    { id: 13, nome: 'Gerador Elétrico', descricao: 'Gerador elétrico de energia', tipo_mobilidade: 'fixo', requer_horimetro: true, requer_potencia: true, requer_localizacao: true, requer_acoplamento: false, ativo: true },
                    { id: 14, nome: 'Motor Elétrico', descricao: 'Motor elétrico para acionamento', tipo_mobilidade: 'fixo', requer_horimetro: false, requer_potencia: true, requer_localizacao: true, requer_acoplamento: false, ativo: true },
                    { id: 15, nome: 'Motor a Combustão', descricao: 'Motor à combustão para acionamento', tipo_mobilidade: 'fixo', requer_horimetro: true, requer_potencia: true, requer_localizacao: true, requer_acoplamento: false, ativo: true },
                    { id: 16, nome: 'Sistema de Irrigação Fixo', descricao: 'Irrigação fixa no terreno', tipo_mobilidade: 'fixo', requer_horimetro: false, requer_potencia: false, requer_localizacao: true, requer_acoplamento: false, ativo: true },
                    { id: 17, nome: 'Secador de Grãos', descricao: 'Secador de grãos estacionário', tipo_mobilidade: 'fixo', requer_horimetro: true, requer_potencia: true, requer_localizacao: true, requer_acoplamento: false, ativo: true }
                ];
                
                console.warn('[EquipamentoForm] Usando fallback com 18 categorias reais do banco de dados');
                setCategorias(categoriasReais);
            }
            finally {
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
    const [errors, setErrors] = useState({});
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        try {
            const dataToSave = {
                nome: formData.nome,
                ano_fabricacao: formData.ano_fabricacao,
                categoria: formData.categoria,
                tipo_mobilidade: formData.tipo_mobilidade,
                status: formData.status,
                marca: formData.marca || undefined,
                modelo: formData.modelo || undefined,
                numero_serie: formData.numero_serie || undefined,
                potencia_cv: formData.potencia_cv > 0 ? formData.potencia_cv : undefined,
                capacidade_litros: formData.capacidade_litros > 0 ? formData.capacidade_litros : undefined,
                horimetro_atual: formData.horimetro_atual > 0 ? formData.horimetro_atual : undefined,
                valor_aquisicao: formData.valor_aquisicao, // Campo obrigatório, sempre enviar
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
        }
        catch (error) {
            console.error('Erro ao salvar equipamento:', error);
            // Tentativa de mapear erros do DRF e mostrar inline
            if (error?.response?.data && typeof error.response.data === 'object') {
                setErrors(error.response.data);
            }
            else {
                alert('Erro ao salvar equipamento. Tente novamente.');
            }
        }
        finally {
            setLoading(false);
        }
    };
    const handleChange = (e) => {
        const { name, value, type } = e.target;
        let processedValue = value;
        if (type === 'number') {
            processedValue = value === '' ? 0 : Number(value);
        }
        else if (name === 'categoria') {
            // Categoria deve ser number (ID) ou undefined
            processedValue = value === '' ? null : Number(value);
        }
        setFormData(prev => ({
            ...prev,
            [name]: processedValue
        }));
    };
    return (_jsxs("div", { className: "card border-0 shadow-sm", children: [_jsxs("div", { className: "card-header bg-primary text-white d-flex align-items-center", children: [_jsx("i", { className: "bi bi-truck me-2" }), _jsx("h5", { className: "mb-0", children: equipamento ? 'Editar Equipamento' : 'Novo Equipamento' })] }), _jsx("div", { className: "card-body p-3 p-md-4", children: _jsx("form", { onSubmit: handleSubmit, children: _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "nome", className: "form-label", children: [_jsx("i", { className: "bi bi-tag me-1" }), "Nome *"] }), _jsx("input", { type: "text", className: "form-control", id: "nome", name: "nome", value: formData.nome, onChange: handleChange, required: true })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "categoria", className: "form-label", children: [_jsx("i", { className: "bi bi-list-ul me-1" }), "Categoria *"] }), _jsxs("select", { className: "form-select", id: "categoria", name: "categoria", value: formData.categoria || '', onChange: handleChange, required: true, disabled: loadingCategorias, children: [_jsx("option", { value: "", children: loadingCategorias ? 'Carregando categorias...' : 'Selecione uma categoria' }), categorias.map(cat => (_jsx("option", { value: cat.id, children: cat.nome }, cat.id)))] })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "tipo_mobilidade", className: "form-label", children: [_jsx("i", { className: "bi bi-arrow-left-right me-1" }), "Tipo de Mobilidade *"] }), _jsx("input", { type: "text", className: "form-control bg-light", id: "tipo_mobilidade", name: "tipo_mobilidade", value: formData.tipo_mobilidade || 'Selecione uma categoria', disabled: true, readOnly: true }), _jsx("small", { className: "text-muted", children: "Preenchido automaticamente pela categoria" })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "status", className: "form-label", children: [_jsx("i", { className: "bi bi-check-circle me-1" }), "Status *"] }), _jsxs("select", { className: "form-select", id: "status", name: "status", value: formData.status, onChange: handleChange, required: true, children: [_jsx("option", { value: "ativo", children: "Ativo" }), _jsx("option", { value: "inativo", children: "Inativo" }), _jsx("option", { value: "manutencao", children: "Em Manuten\u00E7\u00E3o" }), _jsx("option", { value: "vendido", children: "Vendido" })] })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "marca", className: "form-label", children: [_jsx("i", { className: "bi bi-building me-1" }), "Marca *"] }), _jsx("input", { type: "text", className: `form-control ${errors.marca ? 'is-invalid' : ''}`, id: "marca", name: "marca", value: formData.marca, onChange: handleChange, required: true }), errors.marca && (_jsx("div", { className: "invalid-feedback", children: errors.marca.join(' ') }))] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { htmlFor: "modelo", className: "form-label", children: "Modelo *" }), _jsx("input", { type: "text", className: `form-control ${errors.modelo ? 'is-invalid' : ''}`, id: "modelo", name: "modelo", value: formData.modelo, onChange: handleChange, required: true }), errors.modelo && (_jsx("div", { className: "invalid-feedback", children: errors.modelo.join(' ') }))] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { htmlFor: "ano_fabricacao", className: "form-label", children: "Ano de Fabrica\u00E7\u00E3o *" }), _jsx("input", { type: "number", className: `form-control ${errors.ano_fabricacao ? 'is-invalid' : ''}`, id: "ano_fabricacao", name: "ano_fabricacao", value: formData.ano_fabricacao, onChange: handleChange, min: "1900", max: new Date().getFullYear() + 1, required: true }), errors.ano_fabricacao && (_jsx("div", { className: "invalid-feedback", children: errors.ano_fabricacao.join(' ') }))] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { htmlFor: "numero_serie", className: "form-label", children: "N\u00FAmero de S\u00E9rie" }), _jsx("input", { type: "text", className: "form-control", id: "numero_serie", name: "numero_serie", value: formData.numero_serie, onChange: handleChange })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { htmlFor: "potencia_cv", className: "form-label", children: "Pot\u00EAncia (CV)" }), _jsx("input", { type: "number", className: "form-control", id: "potencia_cv", name: "potencia_cv", value: formData.potencia_cv, onChange: handleChange, min: "0", step: "0.1" })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { htmlFor: "capacidade_litros", className: "form-label", children: "Capacidade (Litros)" }), _jsx("input", { type: "number", className: "form-control", id: "capacidade_litros", name: "capacidade_litros", value: formData.capacidade_litros, onChange: handleChange, min: "0", step: "0.1" })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { htmlFor: "horimetro_atual", className: "form-label", children: "Hor\u00EDmetro Atual" }), _jsx("input", { type: "number", className: "form-control", id: "horimetro_atual", name: "horimetro_atual", value: formData.horimetro_atual, onChange: handleChange, min: "0", step: "0.1" })] }), formData.categoria && categorias.length > 0 && (() => {
                                const categoria = categorias.find(c => c.id === formData.categoria);
                                return (_jsx(_Fragment, { children: categoria?.requer_localizacao && (_jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "local_instalacao", className: "form-label", children: [_jsx("i", { className: "bi bi-geo-alt me-1" }), "Local de Instala\u00E7\u00E3o *"] }), _jsx("input", { type: "text", className: "form-control", id: "local_instalacao", name: "local_instalacao", value: formData.local_instalacao, onChange: handleChange, required: true, placeholder: "Ex: Fazenda Santa Rita - Pivot 1" }), _jsx("small", { className: "text-muted", children: "Para equipamentos fixos (pivot, bomba, gerador)" })] })) }));
                            })(), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "valor_aquisicao", className: "form-label", children: [_jsx("i", { className: "bi bi-currency-dollar me-1" }), "Valor de Aquisi\u00E7\u00E3o (R$) *"] }), _jsx("input", { type: "number", className: `form-control ${errors.valor_aquisicao ? 'is-invalid' : ''}`, id: "valor_aquisicao", name: "valor_aquisicao", value: formData.valor_aquisicao, onChange: handleChange, min: "0", step: "0.01", required: true }), errors.valor_aquisicao && (_jsx("div", { className: "invalid-feedback", children: errors.valor_aquisicao.join(' ') }))] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "data_aquisicao", className: "form-label", children: [_jsx("i", { className: "bi bi-calendar me-1" }), "Data de Aquisi\u00E7\u00E3o *"] }), _jsx("input", { type: "date", className: `form-control ${errors.data_aquisicao ? 'is-invalid' : ''}`, id: "data_aquisicao", name: "data_aquisicao", value: formData.data_aquisicao, onChange: handleChange, required: true }), errors.data_aquisicao && (_jsx("div", { className: "invalid-feedback", children: errors.data_aquisicao.join(' ') }))] }), _jsxs("div", { className: "col-12", children: [_jsxs("label", { htmlFor: "observacoes", className: "form-label", children: [_jsx("i", { className: "bi bi-chat-left-text me-1" }), "Observa\u00E7\u00F5es"] }), _jsx("textarea", { className: "form-control", id: "observacoes", name: "observacoes", rows: 3, value: formData.observacoes, onChange: handleChange })] }), _jsx("div", { className: "col-12", children: _jsxs("div", { className: "d-flex flex-column flex-sm-row gap-2 justify-content-end mt-3", children: [_jsxs("button", { type: "button", className: "btn btn-outline-secondary", onClick: onCancel, disabled: loading, children: [_jsx("i", { className: "bi bi-x-circle me-2" }), "Cancelar"] }), _jsxs("button", { type: "submit", className: "btn btn-primary", disabled: loading, children: [_jsx("i", { className: "bi bi-check-circle me-2" }), loading ? 'Salvando...' : (equipamento ? 'Atualizar' : 'Cadastrar')] })] }) })] }) }) })] }));
};
export default EquipamentoForm;
