import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';

interface LoginFormData {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuthContext();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    // during development, prefill credentials so we can quickly log in
    defaultValues: {
      username: process.env.NODE_ENV === 'development' ? 'admin' : '',
      password: process.env.NODE_ENV === 'development' ? 'admin123' : ''
    }
  });

  const onSubmit = async (data: LoginFormData) => {
    console.debug('Submitting login form', data);
    setIsLoading(true);
    setError('');
    try {
      const result = await login(data.username, data.password);
      if (result.success) {
        navigate('/');
      } else {
        // show message returned by hook; if absent, fall back to generic
        setError(result.error || 'Erro ao fazer login');
      }
    } catch (err) {
      // only reachable if something unexpected threw
      console.error('Unexpected error during login:', err);
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#18181b', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '28rem', width: '100%', padding: '2rem', background: 'rgba(36,41,47,0.98)', borderRadius: '1rem', boxShadow: '0 8px 32px 0 rgba(31, 41, 55, 0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#22c55e', letterSpacing: '-0.02em' }}>
            Agro-link
          </h2>
          <div style={{ fontSize: '1.1rem', color: '#cbd5e1', marginTop: '0.5rem' }}>Agro-link - Sua gestão otimizada via Inteligência artificial</div>
        </div>
        <form style={{ marginTop: '2rem' }} onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '0.5rem',
              color: '#b91c1c',
              fontSize: '0.95rem',
              fontWeight: 500
            }}>
              {error}
            </div>
          )}
          <div style={{ marginBottom: '1rem' }}>
            <input
              {...register('username', { required: 'Usuário é obrigatório' })}
              type="text"
              required
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #22c55e',
                borderRadius: '0.5rem',
                color: '#f1f5f9',
                backgroundColor: '#27272a',
                fontSize: '1rem',
                marginBottom: '0.5rem',
                outline: 'none',
                boxShadow: '0 1px 2px 0 rgba(31,41,55,0.04)'
              }}
              placeholder="Usuário ou Email"
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <input
              {...register('password', { required: 'Senha é obrigatória' })}
              type="password"
              required
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #22c55e',
                borderRadius: '0.5rem',
                color: '#f1f5f9',
                backgroundColor: '#27272a',
                fontSize: '1rem',
                marginBottom: '0.5rem',
                outline: 'none',
                boxShadow: '0 1px 2px 0 rgba(31,41,55,0.04)'
              }}
              placeholder="Senha"
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
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
            <a href="/register" style={{ color: '#f59e42', textDecoration: 'none', fontWeight: 500 }}>Criar conta</a>
            <a href="/forgot-password" style={{ color: '#22c55e', textDecoration: 'none', fontWeight: 500 }}>Recuperar senha</a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;