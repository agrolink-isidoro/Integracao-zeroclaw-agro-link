export function toCSV(rows, headers) {
    if (!rows || rows.length === 0)
        return '';
    const cols = headers || Object.keys(rows[0]);
    const escape = (v) => {
        if (v === null || v === undefined)
            return '';
        const s = String(v);
        if (/[",\n]/.test(s))
            return '"' + s.replace(/"/g, '""') + '"';
        return s;
    };
    const lines = [cols.join(',')];
    for (const r of rows) {
        lines.push(cols.map((c) => escape(r[c])).join(','));
    }
    return lines.join('\n');
}
export function downloadCSV(filename, csvContent) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
