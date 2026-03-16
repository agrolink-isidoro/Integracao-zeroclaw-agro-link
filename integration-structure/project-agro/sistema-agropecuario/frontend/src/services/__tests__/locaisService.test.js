import api from '../../services/api';
import { LocaisArmazenagemService } from '../../services/produtos';
jest.mock('../../services/api');
const mockedApi = api;
describe('LocaisArmazenagemService', () => {
    const service = new LocaisArmazenagemService();
    beforeEach(() => {
        jest.resetAllMocks();
    });
    it('calls the correct endpoints for listar/obter/criar/atualizar/deletar', async () => {
        mockedApi.get.mockResolvedValue({ data: [{ id: 1, nome: 'Silo A' }] });
        await service.listar();
        expect(mockedApi.get).toHaveBeenCalledWith('/estoque/locais-armazenamento/', { params: undefined });
        mockedApi.get.mockResolvedValue({ data: { id: 1, nome: 'Silo A' } });
        await service.obter(1);
        expect(mockedApi.get).toHaveBeenCalledWith('/estoque/locais-armazenamento/1/');
        mockedApi.post.mockResolvedValue({ data: { id: 2, nome: 'Silo B' } });
        await service.criar({ nome: 'Silo B' });
        expect(mockedApi.post).toHaveBeenCalledWith('/estoque/locais-armazenamento/', { nome: 'Silo B' });
        mockedApi.patch.mockResolvedValue({ data: { id: 2, nome: 'Silo B Updated' } });
        await service.atualizar(2, { nome: 'Silo B Updated' });
        expect(mockedApi.patch).toHaveBeenCalledWith('/estoque/locais-armazenamento/2/', { nome: 'Silo B Updated' });
        mockedApi.delete.mockResolvedValue({});
        await service.deletar(2);
        expect(mockedApi.delete).toHaveBeenCalledWith('/estoque/locais-armazenamento/2/');
    });
});
