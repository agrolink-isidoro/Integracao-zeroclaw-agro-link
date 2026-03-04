/**
 * Testes para useManifestacaoPolling - SOLUÇÃO 2
 * 
 * CRÍTICO: Garantir que polling funciona corretamente para UX fluida
 * 
 * Seguindo TEST_POLICY_CORE:
 * - Proteger comportamento essencial observável
 * - Evitar testes de implementação
 * - Focar em contratos públicos
 */

import { renderHook, act } from '@testing-library/react';
import { useManifestacaoPolling } from '../hooks/useManifestacaoPolling';
import * as fiscalService from '../services/fiscal';

// Mock do serviço fiscal
jest.mock('../services/fiscal', () => ({
  listManifestacoesForNfe: jest.fn()
}));

const mockListManifestacoesForNfe = fiscalService.listManifestacoesForNfe as jest.MockedFunction<typeof fiscalService.listManifestacoesForNfe>;

describe('useManifestacaoPolling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('deve iniciar polling quando startPolling é chamado', () => {
    // ARRANGE
    const { result } = renderHook(() => 
      useManifestacaoPolling({ nfeId: 123 })
    );

    // ACT
    act(() => {
      result.current.startPolling('pending');
    });

    // ASSERT
    expect(result.current.isPolling).toBe(true);
    expect(result.current.currentStatus).toBe('pending');
  });

  it('deve parar polling quando status muda para "sent"', async () => {
    // ARRANGE
    const onStatusChange = jest.fn();
    mockListManifestacoesForNfe.mockResolvedValue({
      data: {
        results: [{
          criado_em: new Date().toISOString(),
          status_envio: 'sent'
        }]
      }
    } as any);

    const { result } = renderHook(() => 
      useManifestacaoPolling({ 
        nfeId: 123, 
        onStatusChange,
        intervalMs: 1000 
      })
    );

    // ACT
    act(() => {
      result.current.startPolling('pending');
    });

    // Simular passagem de tempo para trigger do interval
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve(); // Aguardar promises pendentes
    });

    // ASSERT
    expect(result.current.isPolling).toBe(false);
    expect(onStatusChange).toHaveBeenCalledWith('sent', null);
  });

  it('deve parar polling após maxAttempts sem mudança de status', async () => {
    // ARRANGE
    mockListManifestacoesForNfe.mockResolvedValue({
      data: {
        results: [{
          criado_em: new Date().toISOString(),
          status_envio: 'pending'
        }]
      }
    } as any);

    const { result } = renderHook(() => 
      useManifestacaoPolling({ 
        nfeId: 123,
        intervalMs: 100,
        maxAttempts: 3
      })
    );

    // ACT
    act(() => {
      result.current.startPolling('pending');
    });

    // Simular 3 tentativas
    await act(async () => {
      for (let i = 0; i < 3; i++) {
        jest.advanceTimersByTime(100);
        await Promise.resolve();
      }
    });

    // ASSERT
    expect(result.current.isPolling).toBe(false);
    expect(result.current.attempts).toBe(0); // Reset após stop
  });

  it('deve continuar polling se não houver manifestações', async () => {
    // ARRANGE
    mockListManifestacoesForNfe.mockResolvedValue({
      data: { results: [] }
    } as any);

    const { result } = renderHook(() => 
      useManifestacaoPolling({ 
        nfeId: 123,
        intervalMs: 100,
        maxAttempts: 5
      })
    );

    // ACT
    act(() => {
      result.current.startPolling('pending');
    });

    // Simular 2 tentativas
    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    });

    // ASSERT
    expect(result.current.isPolling).toBe(true);
    expect(mockListManifestacoesForNfe).toHaveBeenCalledTimes(2);
  });

  it('deve permitir parar polling manualmente', () => {
    // ARRANGE
    const { result } = renderHook(() => 
      useManifestacaoPolling({ nfeId: 123 })
    );

    act(() => {
      result.current.startPolling('pending');
    });

    // ACT
    act(() => {
      result.current.stopPolling();
    });

    // ASSERT
    expect(result.current.isPolling).toBe(false);
    expect(result.current.currentStatus).toBe(null);
  });

  it('deve lidar com erros de API sem quebrar polling', async () => {
    // ARRANGE
    mockListManifestacoesForNfe.mockRejectedValue(new Error('API Error'));
    
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const { result } = renderHook(() => 
      useManifestacaoPolling({ 
        nfeId: 123,
        intervalMs: 100,
        maxAttempts: 5
      })
    );

    // ACT
    act(() => {
      result.current.startPolling('pending');
    });

    await act(async () => {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    });

    // ASSERT
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Erro ao verificar status da manifestação:', 
      expect.any(Error)
    );
    expect(result.current.isPolling).toBe(true); // Continua ativo

    consoleWarnSpy.mockRestore();
  });
});