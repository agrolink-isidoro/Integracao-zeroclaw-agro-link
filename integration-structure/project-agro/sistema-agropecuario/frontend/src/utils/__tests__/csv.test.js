import { toCSV } from '../csv';
describe('CSV helper', () => {
    it('converts objects to CSV correctly', () => {
        const rows = [
            { id: 1, title: 'A', value: 100 },
            { id: 2, title: 'B, comma', value: 200 },
            { id: 3, title: 'C "quote"', value: 300 },
        ];
        const csv = toCSV(rows, ['id', 'title', 'value']);
        expect(csv.split('\n')[0]).toBe('id,title,value');
        expect(csv).toContain('"B, comma"');
        expect(csv).toContain('"C ""quote"""');
    });
});
