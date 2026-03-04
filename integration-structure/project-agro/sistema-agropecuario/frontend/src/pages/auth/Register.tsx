import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
}

interface AuthResponse {
  access: string;
  refresh: string;
  user: {
    id: number;
    username: string;
    email: string;
  };
}

const Register: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<RegisterFormData>();

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    if (data.password !== data.password_confirm) {
      setError('As senhas não coincidem');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const resp = await api.post('/auth/register/', {
        username: data.username,
        email: data.email,
        password: data.password,
      });
      const authData: AuthResponse = resp.data;
      localStorage.setItem('access_token', authData.access);
      localStorage.setItem('refresh_token', authData.refresh);
      localStorage.setItem('user', JSON.stringify(authData.user));
      navigate('/dashboard');
    } catch (err) {
      const e = err as any;
      const msg = e?.response?.data?.detail || 'Erro ao criar conta';
      setError(msg);
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
              {...register('username', {
                required: 'Usuário é obrigatório',
                minLength: { value: 3, message: 'Usuário deve ter pelo menos 3 caracteres' }
              })}
              type="text"
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
              placeholder="Usuário"
            />
          </div>
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
          <div style={{ marginBottom: '1rem' }}>
            <input
              {...register('password', {
                required: 'Senha é obrigatória',
                minLength: { value: 6, message: 'Senha deve ter pelo menos 6 caracteres' }
              })}
              type="password"
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
              placeholder="Senha"
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <input
              {...register('password_confirm', {
                required: 'Confirmação de senha é obrigatória',
                validate: value => value === password || 'As senhas não coincidem'
              })}
              type="password"
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
              placeholder="Confirmar Senha"
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
              {isLoading ? 'Criando...' : 'Criar Conta'}
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link to="/login" style={{ color: '#f59e42', textDecoration: 'none', fontWeight: 500 }}>Já tem uma conta? Faça login</Link>
            <Link to="/forgot-password" style={{ color: '#22c55e', textDecoration: 'none', fontWeight: 500 }}>Esqueceu a senha?</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;