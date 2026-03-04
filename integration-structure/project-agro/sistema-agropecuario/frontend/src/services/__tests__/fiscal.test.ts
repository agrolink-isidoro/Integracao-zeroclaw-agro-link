import api from '../../services/api';
import { uploadXml, uploadCert } from '../fiscal';

jest.mock('../../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('fiscal service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uploadXml should call api.post without explicit Content-Type header', async () => {
    mockedApi.post.mockResolvedValue({ data: {} } as any);
    const fd = new FormData();
    fd.append('xml_file', new File(['<xml></xml>'], 'teste.xml', { type: 'text/xml' } as any));

    await uploadXml(fd as any);

    expect(mockedApi.post).toHaveBeenCalledWith('/fiscal/nfes/upload_xml/', fd);
  });

  it('uploadCert should call api.post without explicit Content-Type header', async () => {
    mockedApi.post.mockResolvedValue({ data: {} } as any);
    const fd = new FormData();
    fd.append('arquivo', new File(['data'], 'cert.p12') as any);

    await uploadCert(fd as any);

    expect(mockedApi.post).toHaveBeenCalledWith('/fiscal/certificados/', fd);
  });
});
