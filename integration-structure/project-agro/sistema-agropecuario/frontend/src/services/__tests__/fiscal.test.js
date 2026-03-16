import api from '../../services/api';
import { uploadXml, uploadCert } from '../fiscal';
jest.mock('../../services/api');
const mockedApi = api;
describe('fiscal service', () => {
    beforeEach(() => jest.clearAllMocks());
    it('uploadXml should call api.post without explicit Content-Type header', async () => {
        mockedApi.post.mockResolvedValue({ data: {} });
        const fd = new FormData();
        fd.append('xml_file', new File(['<xml></xml>'], 'teste.xml', { type: 'text/xml' }));
        await uploadXml(fd);
        expect(mockedApi.post).toHaveBeenCalledWith('/fiscal/nfes/upload_xml/', fd);
    });
    it('uploadCert should call api.post without explicit Content-Type header', async () => {
        mockedApi.post.mockResolvedValue({ data: {} });
        const fd = new FormData();
        fd.append('arquivo', new File(['data'], 'cert.p12'));
        await uploadCert(fd);
        expect(mockedApi.post).toHaveBeenCalledWith('/fiscal/certificados/', fd);
    });
});
