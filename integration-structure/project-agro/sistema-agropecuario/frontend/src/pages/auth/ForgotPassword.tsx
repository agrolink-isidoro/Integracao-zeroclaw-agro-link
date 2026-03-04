import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import { Link } from 'react-router-dom';

interface ForgotFormData {
  email: string;
}

const ForgotPassword: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ForgotFormData>();

  const onSubmit = async (data: ForgotFormData) => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/auth/forgot-password/', { email: data.email });
      setSuccess('Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.');
    } catch (err) {
      setError('Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#18181b', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '28rem', width: '100%', padding: '2rem', background: 'rgba(36,41,47,0.98)', borderRadius: '1rem', boxShadow: '0 8px 32px 0 rgba(31, 41, 55, 0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#22c55e', letterSpacing: '-0.02em' }}>Agro-link</h2>
          <div style={{ fontSize: '1.1rem', color: '#fff', marginTop: '0.5rem' }}>Agro-link - Sua gestão otimizada via Inteligência artificial</div>
        </div>
        <form style={{ marginTop: '2rem' }} onSubmit={handleSubmit(onSubmit)}>
          {(errors.email || error || success) && (
            <div style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              background: error ? '#fee2e2' : '#d1fae5',
              border: '1px solid',
              borderColor: error ? '#fecaca' : '#6ee7b7',
              borderRadius: '0.5rem',
              color: error ? '#b91c1c' : '#065f46',
              fontSize: '0.95rem',
              fontWeight: 500
            }}>
              {errors.email && <div>{errors.email.message}</div>}
              {error && <div>{error}</div>}
              {success && <div>{success}</div>}
            </div>
          )}
          <div style={{ marginBottom: '1rem' }}>
            <input
              {...register('email', {
                required: 'Email é obrigatório',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Email inválido'
                }
              })}
              type="email"
              required
              style={{
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
              }}
              placeholder="Email"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={isLoading}
              style={{
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
              }}
            >
              {isLoading ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <Link to="/login" style={{ color: '#f59e42', textDecoration: 'none', fontWeight: 500 }}>Voltar para login</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
