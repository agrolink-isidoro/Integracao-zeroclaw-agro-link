import produtosService from '../services/produtos';
import api from '../services/api';

jest.mock('../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('ProdutosService.listar', () => {
  it('normaliza resposta quando backend retorna array', async () => {
    const fakeArray = [{ id: 1, codigo: 'T1', nome: 'Teste 1' }];
    mockedApi.get = jest.fn().mockResolvedValue({ data: fakeArray });

    const res = await produtosService.listar();
    expect(res).toHaveProperty('results');
    expect(res.results).toEqual(fakeArray);
    expect(res.count).toBe(fakeArray.length);
  });

  it('retorna paginado quando backend já retorna objeto', async () => {
    const fakePaged = { count: 1, next: null, previous: null, results: [{ id: 2, codigo: 'T2', nome: 'Teste 2' }] };
    mockedApi.get = jest.fn().mockResolvedValue({ data: fakePaged });

    const res = await produtosService.listar();
    expect(res).toEqual(fakePaged);
  });
});