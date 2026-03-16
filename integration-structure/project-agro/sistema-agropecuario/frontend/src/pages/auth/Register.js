import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
const Register = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { register, handleSubmit, watch, formState: { errors } } = useForm();
    const password = watch('password');
    const onSubmit = async (data) => {
        if (data.password !== data.password_confirm) {
            setError('As senhas não coincidem');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const resp = await api.post('/core/auth/register/', {
                username: data.username,
                email: data.email,
                password: data.password,
            });
            const authData = resp.data;
            localStorage.setItem('access_token', authData.access);
            localStorage.setItem('refresh_token', authData.refresh);
            localStorage.setItem('user', JSON.stringify(authData.user));
            navigate('/dashboard');
        }
        catch (err) {
            const e = err;
            const msg = e?.response?.data?.detail || 'Erro ao criar conta';
            setError(msg);
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsx("div", { style: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#18181b', fontFamily: 'Inter, sans-serif' }, children: _jsxs("div", { style: { maxWidth: '28rem', width: '100%', padding: '2rem', background: 'rgba(36,41,47,0.98)', borderRadius: '1rem', boxShadow: '0 8px 32px 0 rgba(31, 41, 55, 0.2)' }, children: [_jsxs("div", { style: { textAlign: 'center', marginBottom: '2rem' }, children: [_jsx("h2", { style: { fontSize: '2rem', fontWeight: '800', color: '#22c55e', letterSpacing: '-0.02em' }, children: "Agro-link" }), _jsx("div", { style: { fontSize: '1.1rem', color: '#fff', marginTop: '0.5rem' }, children: "Agro-link - Sua gest\u00E3o otimizada via Intelig\u00EAncia artificial" })] }), _jsxs("form", { style: { marginTop: '2rem' }, onSubmit: handleSubmit(onSubmit), children: [error && (_jsx("div", { style: {
                                padding: '0.75rem',
                                marginBottom: '1rem',
                                backgroundColor: '#fee2e2',
                                border: '1px solid #fecaca',
                                borderRadius: '0.5rem',
                                color: '#b91c1c',
                                fontSize: '0.95rem',
                                fontWeight: 500
                            }, children: error })), _jsx("div", { style: { marginBottom: '1rem' }, children: _jsx("input", { ...register('username', {
                                    required: 'Usuário é obrigatório',
                                    minLength: { value: 3, message: 'Usuário deve ter pelo menos 3 caracteres' }
                                }), type: "text", required: true, style: {
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    border: '1px solid #22c55e',
                                    borderRadius: '0.5rem',
                                    color: '#fff',
                                    backgroundColor: '#27272a',
                                    fontSize: '1rem',
                                    marginBottom: '0.5rem',
                                    outline: 'none',
                                    boxShadow: '0 1px 2px 0 rgba(31,41,55,0.04)'
                                }, placeholder: "Usu\u00E1rio" }) }), _jsx("div", { style: { marginBottom: '1rem' }, children: _jsx("input", { ...register('email', {
                                    required: 'Email é obrigatório',
                                    pattern: {
                                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                        message: 'Email inválido'
                                    }
                                }), type: "email", required: true, style: {
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    border: '1px solid #22c55e',
                                    borderRadius: '0.5rem',
                                    color: '#fff',
                                    backgroundColor: '#27272a',
                                    fontSize: '1rem',
                                    marginBottom: '0.5rem',
                                    outline: 'none',
                                    boxShadow: '0 1px 2px 0 rgba(31,41,55,0.04)'
                                }, placeholder: "Email" }) }), _jsx("div", { style: { marginBottom: '1rem' }, children: _jsx("input", { ...register('password', {
                                    required: 'Senha é obrigatória',
                                    minLength: { value: 6, message: 'Senha deve ter pelo menos 6 caracteres' }
                                }), type: "password", required: true, style: {
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    border: '1px solid #22c55e',
                                    borderRadius: '0.5rem',
                                    color: '#fff',
                                    backgroundColor: '#27272a',
                                    fontSize: '1rem',
                                    marginBottom: '0.5rem',
                                    outline: 'none',
                                    boxShadow: '0 1px 2px 0 rgba(31,41,55,0.04)'
                                }, placeholder: "Senha" }) }), _jsx("div", { style: { marginBottom: '1rem' }, children: _jsx("input", { ...register('password_confirm', {
                                    required: 'Confirmação de senha é obrigatória',
                                    validate: value => value === password || 'As senhas não coincidem'
                                }), type: "password", required: true, style: {
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    border: '1px solid #22c55e',
                                    borderRadius: '0.5rem',
                                    color: '#fff',
                                    backgroundColor: '#27272a',
                                    fontSize: '1rem',
                                    marginBottom: '0.5rem',
                                    outline: 'none',
                                    boxShadow: '0 1px 2px 0 rgba(31,41,55,0.04)'
                                }, placeholder: "Confirmar Senha" }) }), _jsx("div", { children: _jsx("button", { type: "submit", disabled: isLoading, style: {
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    background: isLoading ? '#f59e42' : '#22c55e',
                                    color: 'white',
                                    borderRadius: '0.5rem',
                                    border: 'none',
                                    fontWeight: 700,
                                    fontSize: '1.1rem',
                                    cursor: isLoading ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 2px 8px 0 rgba(31,41,55,0.10)',
                                    transition: 'background 0.2s'
                                }, children: isLoading ? 'Criando...' : 'Criar Conta' }) }), _jsxs("div", { style: { textAlign: 'center', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }, children: [_jsx(Link, { to: "/login", style: { color: '#f59e42', textDecoration: 'none', fontWeight: 500 }, children: "J\u00E1 tem uma conta? Fa\u00E7a login" }), _jsx(Link, { to: "/forgot-password", style: { color: '#22c55e', textDecoration: 'none', fontWeight: 500 }, children: "Esqueceu a senha?" })] })] })] }) }));
};
export default Register;
