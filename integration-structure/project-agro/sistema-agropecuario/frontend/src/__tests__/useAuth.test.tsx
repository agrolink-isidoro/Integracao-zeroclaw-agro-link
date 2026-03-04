import { getStoredTokens, setStoredTokens, clearTokens } from '../hooks/useAuth'

describe('useAuth storage helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('defaults to empty object', () => {
    const t = getStoredTokens()
    expect(t).toEqual({})
  })

  test('set and get tokens', () => {
    setStoredTokens({ access: 'a', refresh: 'r' })
    const t = getStoredTokens()
    expect(t.access).toBe('a')
    expect(t.refresh).toBe('r')
  })

  test('clear removes tokens', () => {
    setStoredTokens({ access: 'a' })
    clearTokens()
    expect(getStoredTokens()).toEqual({})
  })
})
