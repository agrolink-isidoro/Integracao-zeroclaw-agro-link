import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import { Link } from 'react-router-dom';
const ForgotPassword = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { register, handleSubmit, formState: { errors } } = useForm();
    const onSubmit = async (data) => {
        setIsLoading(true);
        setError('');
        setSuccess('');
        try {
            await api.post('/auth/forgot-password/', { email: data.email });
            setSuccess('Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.');
        }
        catch (err) {
            setError('Erro ao enviar solicitação. Tente novamente.');
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsx("div", { style: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#18181b', fontFamily: 'Inter, sans-serif' }, children: _jsxs("div", { style: { maxWidth: '28rem', width: '100%', padding: '2rem', background: 'rgba(36,41,47,0.98)', borderRadius: '1rem', boxShadow: '0 8px 32px 0 rgba(31, 41, 55, 0.2)' }, children: [_jsxs("div", { style: { textAlign: 'center', marginBottom: '2rem' }, children: [_jsx("h2", { style: { fontSize: '2rem', fontWeight: '800', color: '#22c55e', letterSpacing: '-0.02em' }, children: "Agro-link" }), _jsx("div", { style: { fontSize: '1.1rem', color: '#fff', marginTop: '0.5rem' }, children: "Agro-link - Sua gest\u00E3o otimizada via Intelig\u00EAncia artificial" })] }), _jsxs("form", { style: { marginTop: '2rem' }, onSubmit: handleSubmit(onSubmit), children: [(errors.email || error || success) && (_jsxs("div", { style: {
                                padding: '0.75rem',
                                marginBottom: '1rem',
                                background: error ? '#fee2e2' : '#d1fae5',
                                border: '1px solid',
                                borderColor: error ? '#fecaca' : '#6ee7b7',
                                borderRadius: '0.5rem',
                                color: error ? '#b91c1c' : '#065f46',
                                fontSize: '0.95rem',
                                fontWeight: 500
                            }, children: [errors.email && _jsx("div", { children: errors.email.message }), error && _jsx("div", { children: error }), success && _jsx("div", { children: success })] })), _jsx("div", { style: { marginBottom: '1rem' }, children: _jsx("input", { ...register('email', {
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
                                }, placeholder: "Email" }) }), _jsx("div", { children: _jsx("button", { type: "submit", disabled: isLoading, style: {
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
                                }, children: isLoading ? 'Enviando...' : 'Enviar' }) }), _jsx("div", { style: { textAlign: 'center', marginTop: '1.5rem' }, children: _jsx(Link, { to: "/login", style: { color: '#f59e42', textDecoration: 'none', fontWeight: 500 }, children: "Voltar para login" }) })] })] }) }));
};
export default ForgotPassword;
