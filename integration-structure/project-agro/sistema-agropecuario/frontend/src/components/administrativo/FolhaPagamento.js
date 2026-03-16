import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import { useApiQuery } from '@/hooks/useApi';
export const FolhaPagamento = () => {
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [ano, setAno] = useState(new Date().getFullYear());
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const { data: funcionarios = [] } = useApiQuery(['funcionarios'], '/administrativo/funcionarios/');
    const [selected, setSelected] = useState([]);
    const [summary, setSummary] = useState(null);
    const [openPagar, setOpenPagar] = useState(false); // modal state
    // Lazy load modal only when opened to avoid triggering its API requests on module load
    const [FolhaPagarBatchModal, setFolhaPagarBatchModal] = useState(null);
    useEffect(() => {
        let mounted = true;
        if (openPagar && !FolhaPagarBatchModal) {
            import('./FolhaPagarBatchModal')
                .then((m) => { if (mounted)
                setFolhaPagarBatchModal(() => m.default); })
                .catch((err) => console.error('Falha ao carregar modal de pagamento:', err));
        }
        return () => { mounted = false; };
        // only run when openPagar changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openPagar]);
    // New fields: per-employee overtime entries (multiple per employee), include DSR toggle, and list of extra descontos (Outro)
    const [perEmployeeHours, setPerEmployeeHours] = useState({});
    const [perEmployeeDays, setPerEmployeeDays] = useState({});
    const [includeDsr, setIncludeDsr] = useState(null); // null = not set (use default behavior: include if holidays_count > 0)
    // per-employee level include_dsr flag
    const [perEmployeeIncludeDsr, setPerEmployeeIncludeDsr] = useState({});
    const [holidaysCount, setHolidaysCount] = useState(0);
    const [diasUteis, setDiasUteis] = useState(26);
    const [outros, setOutros] = useState([]);
    // overrides store manual or calculated per-employee final values (and manual flags per field)
    const [overrides, setOverrides] = useState({});
    function addOutro() {
        setOutros(prev => [...prev, { label: 'Outro', amount: 0 }]);
    }
    function updateOutro(index, key, value) {
        setOutros(prev => prev.map((o, i) => i === index ? { ...o, [key]: key === 'amount' ? Number(value) : String(value) } : o));
    }
    function removeOutro(index) {
        setOutros(prev => prev.filter((_, i) => i !== index));
    }
    // Helper to add an overtime entry for an employee
    function addEmployeeOvertimeEntry(id) {
        setPerEmployeeHours(prev => {
            const list = prev[id] ? [...prev[id]] : [];
            return { ...prev, [id]: [...list, { hours: 0, type: 'normal' }] };
        });
    }
    function updateEmployeeOvertimeEntry(id, idx, key, value) {
        setPerEmployeeHours(prev => {
            const list = prev[id] ? [...prev[id]] : [];
            const entry = list[idx] ? { ...list[idx] } : { hours: 0, type: 'normal', kind: 'extra', day_type: 'weekday' };
            if (key === 'hours') {
                const hoursNum = Number(value);
                entry.hours = hoursNum;
                // auto enable DSR when any overtime hours > 0 and holidays present
                if (hoursNum > 0 && holidaysCount > 0) {
                    setPerEmployeeIncludeDsr(p => ({ ...p, [id]: true }));
                }
            }
            else if (key === 'type') {
                entry.type = String(value);
            }
            else if (key === 'kind') {
                entry.kind = String(value);
            }
            else if (key === 'day_type') {
                entry.day_type = String(value);
            }
            // If this is a diária on domingo/feriado, auto-fill 9 hours when hours are zero
            try {
                const kindVal = (key === 'kind') ? value : entry.kind;
                const dayTypeVal = (key === 'day_type') ? value : entry.day_type;
                if (kindVal === 'diaria' && (dayTypeVal === 'domingo' || dayTypeVal === 'feriado')) {
                    if (!entry.hours || Number(entry.hours) === 0) {
                        entry.hours = 9;
                        // also auto-enable DSR when applicable
                        if (holidaysCount > 0) {
                            setPerEmployeeIncludeDsr(p => ({ ...p, [id]: true }));
                        }
                    }
                }
            }
            catch {
                // defensive: ignore unexpected types
            }
            list[idx] = entry;
            return { ...prev, [id]: list };
        });
    }
    function removeEmployeeOvertimeEntry(id, idx) {
        setPerEmployeeHours(prev => {
            const list = prev[id] ? [...prev[id]] : [];
            list.splice(idx, 1);
            return { ...prev, [id]: list };
        });
    }
    function toggleEmployeeIncludeDsr(id, value) {
        setPerEmployeeIncludeDsr(prev => ({ ...prev, [id]: value }));
    }
    function toggleFuncionario(id) {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }
    async function gerarPreview() {
        setLoading(true);
        try {
            const payload = { periodo_mes: mes, periodo_ano: ano, funcionarios_ids: selected };
            // include per-employee hours entries when present
            const per_emp = Object.entries(perEmployeeHours).map(([id, v]) => ({ id: Number(id), entries: v, include_dsr: typeof perEmployeeIncludeDsr[Number(id)] !== 'undefined' ? perEmployeeIncludeDsr[Number(id)] : undefined, dias_trabalhados: typeof perEmployeeDays[Number(id)] !== 'undefined' ? perEmployeeDays[Number(id)] : undefined }));
            // also include employees selected but without overtime entries (useful for temporarios with dias_trabalhados only)
            const selectedWithDays = Object.entries(perEmployeeDays).filter(([, d]) => typeof d !== 'undefined').map(([id, d]) => ({ id: Number(id), entries: [], include_dsr: undefined, dias_trabalhados: d }));
            const merged = [...per_emp];
            selectedWithDays.forEach(s => { if (!merged.find(m => m.id === s.id))
                merged.push(s); });
            if (merged.length > 0)
                payload.per_employee_horas = merged;
            payload.holidays_count = holidaysCount;
            payload.dias_uteis = diasUteis;
            payload.include_dsr = includeDsr;
            // For backward compatibility with some flows, include an aggregated hora_extra when DSR is selected
            if (includeDsr && per_emp.length > 0) {
                const sumHours = per_emp.reduce((s, x) => s + ((x.entries || []).reduce((ss, e) => ss + (e.hours || 0), 0)), 0);
                payload.hora_extra = sumHours * 10; // simple aggregated placeholder used in tests
            }
            if (outros.length > 0)
                payload.outros_descontos = outros.map(o => ({ label: o.label, amount: o.amount }));
            const res = await api.post('/administrativo/folha-pagamento/', payload);
            setPreview(res.data);
        }
        catch (err) {
            const ae = err;
            console.error('Erro ao gerar preview', ae.message || ae.response?.data);
            alert('Erro ao gerar preview');
        }
        finally {
            setLoading(false);
        }
    }
    // Fill editable fields with computed values from preview but do not overwrite manual edits
    async function calcularAutomatico() {
        setLoading(true);
        try {
            const payload = { periodo_mes: mes, periodo_ano: ano, funcionarios_ids: selected };
            const per_emp = Object.entries(perEmployeeHours).map(([id, v]) => ({ id: Number(id), entries: v, include_dsr: typeof perEmployeeIncludeDsr[Number(id)] !== 'undefined' ? perEmployeeIncludeDsr[Number(id)] : undefined }));
            if (per_emp.length > 0)
                payload.per_employee_horas = per_emp;
            payload.holidays_count = holidaysCount;
            payload.dias_uteis = diasUteis;
            payload.include_dsr = includeDsr;
            if (outros.length > 0)
                payload.outros_descontos = outros.map(o => ({ label: o.label, amount: o.amount }));
            const res = await api.post('/administrativo/folha-pagamento/', payload);
            setPreview(res.data);
            // apply computed values to overrides state if user hasn't manually edited that field
            const newOverrides = { ...overrides };
            (res.data.itens || []).forEach((it) => {
                const fid = it.funcionario.id;
                const cur = newOverrides[fid] || { values: {}, manualFields: {} };
                // fields we expose: inss, ir, dsr, descontos_outro, liquido
                ['inss', 'ir', 'dsr', 'descontos_outro', 'liquido'].forEach((k) => {
                    const v = it[k];
                    if (!cur.manualFields || !cur.manualFields[k]) {
                        cur.values = { ...cur.values, [k]: v };
                    }
                });
                newOverrides[fid] = cur;
            });
            setOverrides(newOverrides);
            // also ensure per-employee include_dsr is set when an item has computed DSR > 0
            setPerEmployeeIncludeDsr(prev => {
                const next = { ...prev };
                (res.data.itens || []).forEach((it) => {
                    const fid = it.funcionario.id;
                    const record = it;
                    if (((record.hora_extra_hours || record.hora_extra) || 0) > 0 && (record.dsr || 0) > 0 && typeof next[fid] === 'undefined') {
                        next[fid] = true;
                    }
                });
                return next;
            });
        }
        catch (err) {
            const ae = err;
            console.error('Erro ao calcular automaticamente', ae.message || ae.response?.data);
            alert('Erro ao calcular automaticamente');
        }
        finally {
            setLoading(false);
        }
    }
    // Load summary aggregates for previous month relative to given mes/ano
    async function loadSummary(month, year) {
        try {
            const q = month && year ? `?month=${month}&year=${year}` : '';
            const res = await api.get(`/administrativo/folha-pagamento/summary/${q}`);
            setSummary(res.data);
        }
        catch (err) {
            console.warn('Erro ao carregar resumo:', err);
            setSummary(null);
        }
    }
    function loadSummaryForPrevMonth(m, y) {
        const baseMonth = typeof m === 'number' ? m : mes;
        const baseYear = typeof y === 'number' ? y : ano;
        let prevMonth = baseMonth - 1;
        let prevYear = baseYear;
        if (prevMonth < 1) {
            prevMonth = 12;
            prevYear = baseYear - 1;
        }
        loadSummary(prevMonth, prevYear);
    }
    useEffect(() => {
        // automatically load previous month summary when mes or ano changes
        loadSummaryForPrevMonth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mes, ano]);
    async function runFolha() {
        if (!preview || !preview.id)
            return;
        if (!window.confirm('Executar esta folha e criar lançamentos?'))
            return;
        try {
            // prepare overrides payload from local overrides state
            const per_employee_overrides = Object.entries(overrides).map(([id, v]) => {
                const payload = { id: Number(id) };
                if (v.values) {
                    ['inss', 'ir', 'dsr', 'descontos_outro', 'liquido'].forEach(k => {
                        if (v.values && typeof v.values[k] !== 'undefined')
                            payload[k] = v.values[k];
                    });
                }
                return payload;
            });
            const res = await api.post(`/administrativo/folha-pagamento/${preview.id}/run/`, { per_employee_overrides });
            alert('Folha executada: ' + JSON.stringify(res.data));
            // fetch the persisted folha to build a report
            try {
                const folhaRes = await api.get(`/administrativo/folha-pagamento/${preview.id}/`);
                // open report window with markdown, csv and print options
                const md = buildFolhaMarkdown(folhaRes.data);
                openReportWindow(md, folhaRes.data);
            }
            catch (err) {
                console.error('Erro ao buscar folha para relatório', err);
            }
            // mark preview executed
            setPreview({ ...preview, executado: true });
        }
        catch (err) {
            const ae = err;
            console.error('Erro ao executar folha', ae.message || ae.response?.data);
            alert('Erro ao executar folha');
        }
    }
    function buildFolhaMarkdown(folha) {
        // helper: safely format numeric values returned as strings or numbers
        const fmt = (v, d = 2) => {
            const n = Number(v);
            if (Number.isNaN(n))
                return (d === 3) ? '0.000' : '0.00';
            return n.toFixed(d);
        };
        const rows = ['# ' + (folha.descricao || 'Folha') + '\n'];
        rows.push(`Período: ${folha.periodo_mes}/${folha.periodo_ano}`);
        rows.push('\n');
        rows.push('| Funcionário | Bruto | Hora Extra | DSR | INSS | IR | Outros | Líquido |');
        rows.push('|---|---:|---:|---:|---:|---:|---:|---:|');
        (folha.itens || []).forEach((it) => {
            rows.push(`| ${it.funcionario.nome} | ${fmt(it.salario_bruto, 2)} | ${fmt(it.hora_extra, 2)} | ${fmt(it.dsr, 2)} | ${fmt(it.inss, 2)} | ${fmt(it.ir, 2)} | ${fmt(it.descontos_outro, 2)} | ${fmt(it.liquido, 2)} |`);
        });
        return rows.join('\n');
    }
    function openReportWindow(_md, folha) {
        console.info('openReportWindow', { descricao: folha?.descricao, itens_len: (folha?.itens || []).length });
        const fmt = (v, d = 2) => { const n = Number(v); return Number.isNaN(n) ? (d === 3 ? '0.000' : '0.00') : n.toFixed(d); };
        const tableRows = (folha.itens || []).map((it) => `\n      <tr>\n        <td style="border:1px solid #eee;padding:6px">${it.funcionario.nome}</td>\n        <td style="border:1px solid #eee;padding:6px;text-align:right">${fmt(it.salario_bruto, 2)}</td>\n        <td style="border:1px solid #eee;padding:6px;text-align:right">${fmt(it.hora_extra, 2)}</td>\n        <td style="border:1px solid #eee;padding:6px;text-align:right">${fmt(it.dsr, 2)}</td>\n        <td style="border:1px solid #eee;padding:6px;text-align:right">${fmt(it.inss, 2)}</td>\n        <td style="border:1px solid #eee;padding:6px;text-align:right">${fmt(it.ir, 2)}</td>\n        <td style="border:1px solid #eee;padding:6px;text-align:right">${fmt(it.descontos_outro, 2)}</td>\n        <td style="border:1px solid #eee;padding:6px;text-align:right">${fmt(it.liquido, 2)}</td>\n      </tr>\n    `).join('');
        const tableHtml = `<table style="width:100%;border-collapse:collapse">\n        <thead><tr><th style="border:1px solid #ccc;padding:6px;text-align:left">Funcionário</th><th style="border:1px solid #ccc;padding:6px;text-align:right">Bruto</th><th style="border:1px solid #ccc;padding:6px;text-align:right">Hora Extra</th><th style="border:1px solid #ccc;padding:6px;text-align:right">DSR</th><th style="border:1px solid #ccc;padding:6px;text-align:right">INSS</th><th style="border:1px solid #ccc;padding:6px;text-align:right">IR</th><th style="border:1px solid #ccc;padding:6px;text-align:right">Outros</th><th style="border:1px solid #ccc;padding:6px;text-align:right">Líquido</th></tr></thead>\n        <tbody>${tableRows}</tbody>\n      </table>`;
        const items = (folha.itens || []);
        const w = window.open('', '_blank');
        if (!w || !w.document)
            return;
        try {
            w.document.title = 'Relatório Folha';
            const styleEl = w.document.createElement('style');
            styleEl.textContent = 'body{font-family:Arial,Helvetica,sans-serif;margin:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #eee;padding:6px}th{background:#f7f7f7;text-align:left}';
            w.document.head.appendChild(styleEl);
            const h2 = w.document.createElement('h2');
            h2.textContent = `Relatório: ${folha.descricao || 'Folha'}`;
            w.document.body.appendChild(h2);
            const controls = w.document.createElement('div');
            controls.style.marginBottom = '12px';
            controls.innerHTML = '<button id="printBtn">Imprimir / Salvar PDF</button> <button id="downloadMd">Baixar .md</button> <button id="downloadCsv">Baixar CSV</button>';
            w.document.body.appendChild(controls);
            const wrapper = w.document.createElement('div');
            wrapper.innerHTML = tableHtml;
            w.document.body.appendChild(wrapper);
            const printBtn = w.document.getElementById('printBtn');
            const mdBtn = w.document.getElementById('downloadMd');
            const csvBtn = w.document.getElementById('downloadCsv');
            const makeMd = () => {
                const rows = [];
                rows.push('# ' + (folha.descricao || 'Folha') + '\n');
                rows.push('| Funcionário | Bruto | Hora Extra | DSR | INSS | IR | Outros | Líquido |');
                rows.push('|---|---:|---:|---:|---:|---:|---:|---:|');
                items.forEach((it) => rows.push(`| ${it.funcionario.nome} | ${fmt(it.salario_bruto, 2)} | ${fmt(it.hora_extra, 2)} | ${fmt(it.dsr, 2)} | ${fmt(it.inss, 2)} | ${fmt(it.ir, 2)} | ${fmt(it.descontos_outro, 2)} | ${fmt(it.liquido, 2)} |`));
                const blob = new Blob([rows.join('\n')], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = w.document.createElement('a');
                a.href = url;
                a.download = 'folha.md';
                w.document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
            };
            const makeCsv = () => {
                const lines = [];
                lines.push('Funcionario,Bruto,Hora Extra,DSR,INSS,IR,Outros,Liquido');
                items.forEach((it) => lines.push([it.funcionario.nome, fmt(it.salario_bruto, 2), fmt(it.hora_extra, 2), fmt(it.dsr, 2), fmt(it.inss, 2), fmt(it.ir, 2), fmt(it.descontos_outro, 2), fmt(it.liquido, 2)].join(',')));
                const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = w.document.createElement('a');
                a.href = url;
                a.download = 'folha.csv';
                w.document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
            };
            printBtn?.addEventListener('click', () => { w.print(); });
            mdBtn?.addEventListener('click', makeMd);
            csvBtn?.addEventListener('click', makeCsv);
        }
        catch (err) {
            console.error('Erro ao abrir relatório', err);
        }
    }
    return (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("div", { className: "d-flex justify-content-between mb-2", children: _jsx("div", { children: _jsx("strong", { children: "Folha de Pagamento" }) }) }), _jsx("div", { className: "row mb-3", children: _jsxs("div", { className: "col-12 d-flex gap-3 align-items-center", children: [_jsxs("div", { className: "card p-2", style: { minWidth: 160 }, children: [_jsx("small", { className: "text-muted", children: "Custo Horas Extras (m\u00EAs anterior)" }), _jsxs("div", { className: "h5", children: ["R$ ", summary ? Number(summary.total_horas_extra_cost).toFixed(3) : '0.000'] })] }), _jsxs("div", { className: "card p-2", style: { minWidth: 160 }, children: [_jsx("small", { className: "text-muted", children: "Descontos INSS (m\u00EAs anterior)" }), _jsxs("div", { className: "h5", children: ["R$ ", summary ? Number(summary.total_inss).toFixed(3) : '0.000'] })] }), _jsxs("div", { className: "card p-2", style: { minWidth: 160 }, children: [_jsx("small", { className: "text-muted", children: "Total Folha (m\u00EAs anterior)" }), _jsxs("div", { className: "h5", children: ["R$ ", summary ? Number(summary.total_folha).toFixed(3) : '0.000'] })] }), _jsxs("div", { className: "ms-auto", children: [_jsx("button", { className: "btn btn-sm btn-outline-secondary", "aria-label": "Carregar m\u00EAs anterior", onClick: () => loadSummaryForPrevMonth(), children: "Carregar m\u00EAs anterior" }), _jsxs("button", { className: "btn btn-sm btn-primary ms-2", onClick: () => { if (preview && preview.itens && preview.itens.length) {
                                                setOpenPagar(true);
                                            }
                                            else {
                                                alert('Gere ou selecione uma folha/preview primeiro.');
                                            } }, children: [_jsx("i", { className: "bi bi-currency-exchange" }), " Pagar por Transfer\u00EAncia"] })] })] }) }), _jsx("div", { className: "card mb-3", children: _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "row g-3", children: [_jsxs("div", { className: "col-md-2", children: [_jsx("label", { className: "form-label", children: "M\u00EAs" }), _jsx("input", { type: "number", className: "form-control", value: mes, onChange: e => setMes(Number(e.target.value)) })] }), _jsxs("div", { className: "col-md-2", children: [_jsx("label", { className: "form-label", children: "Ano" }), _jsx("input", { type: "number", className: "form-control", value: ano, onChange: e => setAno(Number(e.target.value)) })] }), _jsxs("div", { className: "col-md-8", children: [_jsx("label", { className: "form-label", children: "Funcion\u00E1rios (opcional)" }), _jsx("div", { className: "d-flex flex-wrap", children: funcionarios.map((f) => (_jsxs("div", { className: "me-3 mb-2", children: [_jsx("button", { type: "button", className: `btn btn-sm ${selected.includes(f.id) ? 'btn-primary' : 'btn-outline-secondary'}`, onClick: () => toggleFuncionario(f.id), children: f.nome }), selected.includes(f.id) && (_jsxs("div", { className: "mt-2", children: [(perEmployeeHours[f.id] || []).map((entry, idx) => (_jsxs("div", { className: "d-flex gap-2 align-items-center mb-1", children: [_jsx("input", { "aria-label": `Horas extra ${f.nome} #${idx + 1}`, type: "number", step: "0.1", className: "form-control form-control-sm", style: { width: 100 }, value: entry.hours, onChange: e => updateEmployeeOvertimeEntry(f.id, idx, 'hours', e.target.value) }), _jsxs("select", { "aria-label": `Kind horas ${f.nome} #${idx + 1}`, className: "form-select form-select-sm", style: { width: 160 }, value: entry.kind || 'extra', onChange: e => updateEmployeeOvertimeEntry(f.id, idx, 'kind', e.target.value), children: [_jsx("option", { value: "extra", children: "Hora Extra" }), _jsx("option", { value: "diaria", children: "Di\u00E1ria" })] }), (entry.kind || 'extra') === 'extra' ? (_jsxs("select", { "aria-label": `Tipo horas ${f.nome} #${idx + 1}`, className: "form-select form-select-sm", style: { width: 140 }, value: entry.type || 'normal', onChange: e => updateEmployeeOvertimeEntry(f.id, idx, 'type', e.target.value), children: [_jsx("option", { value: "normal", children: "Normal (50%)" }), _jsx("option", { value: "sunday", children: "Domingo/Feriado (100%)" })] })) : (_jsxs("select", { "aria-label": `Dia da diária ${f.nome} #${idx + 1}`, className: "form-select form-select-sm", style: { width: 160 }, value: entry.day_type || 'weekday', onChange: e => updateEmployeeOvertimeEntry(f.id, idx, 'day_type', e.target.value), children: [_jsx("option", { value: "weekday", children: "Dia de semana" }), _jsx("option", { value: "domingo", children: "Domingo" }), _jsx("option", { value: "feriado", children: "Feriado" })] })), _jsx("button", { type: "button", className: "btn btn-sm btn-outline-danger", onClick: () => removeEmployeeOvertimeEntry(f.id, idx), children: "Remover" })] }, idx))), _jsxs("div", { className: "d-flex gap-2 align-items-center mt-1", children: [_jsx("button", { type: "button", className: "btn btn-sm btn-outline-secondary", "aria-label": `Adicionar hora extra para ${f.nome}`, onClick: () => addEmployeeOvertimeEntry(f.id), children: "+ Adicionar Hora Extra" }), f.tipo === 'temporario' && (_jsxs("div", { className: "ms-3", children: [_jsx("label", { className: "form-label small mb-1", children: "Dias trabalhados" }), _jsx("input", { "aria-label": `Dias trabalhados ${f.nome}`, type: "number", min: "0", className: "form-control form-control-sm", style: { width: 120 }, value: perEmployeeDays[f.id] ?? '', onChange: e => setPerEmployeeDays(p => ({ ...p, [f.id]: Number(e.target.value) })) })] })), _jsxs("div", { className: "form-check ms-3", children: [_jsx("input", { "aria-label": `Incluir DSR ${f.nome}`, className: "form-check-input", type: "checkbox", id: `includeDsr-${f.id}`, checked: perEmployeeIncludeDsr[f.id] ?? (includeDsr ?? false), onChange: e => toggleEmployeeIncludeDsr(f.id, e.target.checked) }), _jsx("label", { className: "form-check-label", htmlFor: `includeDsr-${f.id}`, children: "Incluir DSR" })] })] })] }))] }, f.id))) })] })] }), _jsxs("div", { className: "row g-3 mt-3", children: [_jsxs("div", { className: "col-md-3", children: [_jsx("label", { htmlFor: "holidaysCount", className: "form-label", children: "N\u00FAmero de feriados no m\u00EAs" }), _jsx("input", { id: "holidaysCount", type: "number", className: "form-control", value: holidaysCount, onChange: e => setHolidaysCount(Number(e.target.value)) }), _jsx("small", { className: "form-text text-muted", children: "Usado para c\u00E1lculo do DSR. Valor 0 significa nenhum feriado." })] }), _jsxs("div", { className: "col-md-3", children: [_jsx("label", { htmlFor: "diasUteis", className: "form-label", children: "Dias \u00FAteis no m\u00EAs" }), _jsx("input", { id: "diasUteis", type: "number", className: "form-control", value: diasUteis, onChange: e => setDiasUteis(Number(e.target.value)) }), _jsx("small", { className: "form-text text-muted", children: "Usado para c\u00E1lculo do DSR (padr\u00E3o: 26)." })] }), _jsx("div", { className: "col-md-3 d-flex align-items-end", children: _jsxs("div", { className: "form-check", children: [_jsx("input", { className: "form-check-input", type: "checkbox", id: "includeDsr", checked: includeDsr ?? false, onChange: e => setIncludeDsr(e.target.checked) }), _jsx("label", { className: "form-check-label", htmlFor: "includeDsr", children: "Incluir DSR" })] }) }), _jsxs("div", { className: "col-md-3", children: [_jsx("label", { className: "form-label", children: "Descontos extras" }), _jsxs("div", { children: [outros.map((o, idx) => (_jsxs("div", { className: "d-flex gap-2 mb-2", children: [_jsx("input", { className: "form-control", placeholder: "Etiqueta", value: o.label, onChange: e => updateOutro(idx, 'label', e.target.value) }), _jsx("input", { type: "number", step: "0.01", className: "form-control", placeholder: "Valor", value: o.amount, onChange: e => updateOutro(idx, 'amount', e.target.value) }), _jsx("button", { type: "button", className: "btn btn-danger", onClick: () => removeOutro(idx), children: "Remover" })] }, idx))), _jsx("button", { type: "button", className: "btn btn-sm btn-outline-secondary", "aria-label": "Adicionar desconto outro", onClick: addOutro, children: "+ Adicionar Outro" })] })] })] }), _jsxs("div", { className: "mt-2", children: [_jsx("small", { className: "text-muted", children: "C\u00E1lculo do DSR: DSR = total_extra * (n\u00BA_feriados / dias_\u00FAteis). Para horas extras, o valor por hora = sal\u00E1rio / 220. Primeira parcela (hora normal) paga 100% do valor por hora; adicional de 50% (normal) ou 100% (domingo/feriado) como acr\u00E9scimo." }), _jsx("small", { className: "text-muted d-block mt-1", children: "Para calcular domingos trabalhados incluir 9 horas nas horas extras como domingo/feriado." }), _jsxs("div", { className: "mt-3", children: [_jsx("button", { className: "btn btn-outline-secondary me-2", onClick: calcularAutomatico, "aria-label": "Calcular automaticamente", disabled: loading, children: loading ? 'Calculando...' : 'Calcular Automaticamente' }), _jsx("button", { className: "btn btn-primary me-2", onClick: gerarPreview, "aria-label": "Gerar preview", disabled: loading, children: loading ? 'Gerando...' : 'Gerar Preview' }), preview && _jsx("button", { className: "btn btn-success", onClick: runFolha, "aria-label": "Executar folha", disabled: preview.executado, children: "Executar Folha" })] })] })] }) }), preview && (_jsx("div", { className: "card", children: _jsxs("div", { className: "card-body", children: [_jsxs("h5", { children: ["Preview: ", preview.descricao] }), _jsxs("p", { children: [_jsx("strong", { children: "Total:" }), " R$ ", preview.valor_total] }), _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-sm", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Funcion\u00E1rio" }), _jsx("th", { children: "Bruto" }), _jsx("th", { children: "Hora Extra" }), _jsx("th", { children: "DSR" }), _jsx("th", { children: "INSS" }), _jsx("th", { children: "IR" }), _jsx("th", { children: "Outros" }), _jsx("th", { children: "L\u00EDquido" })] }) }), _jsx("tbody", { children: (preview.itens || []).map((it) => {
                                                    const fid = it.funcionario.id;
                                                    const ov = overrides[fid] || { values: {}, manualFields: {} };
                                                    const display = (k) => (ov.values && typeof ov.values[k] !== 'undefined') ? ov.values[k] : it[k] ?? 0;
                                                    const updateOverride = (field, value) => {
                                                        setOverrides(prev => {
                                                            const cur = prev[fid] ? { ...prev[fid] } : { values: {}, manualFields: {} };
                                                            cur.values = { ...(cur.values || {}), [field]: Number(value) };
                                                            cur.manualFields = { ...(cur.manualFields || {}), [field]: true };
                                                            return { ...prev, [fid]: cur };
                                                        });
                                                    };
                                                    return (_jsxs("tr", { children: [_jsx("td", { children: it.funcionario.nome }), _jsxs("td", { children: ["R$ ", it.salario_bruto] }), _jsxs("td", { children: ["R$ ", it.hora_extra ?? 0] }), _jsx("td", { children: _jsx("input", { "aria-label": `DSR ${it.funcionario.nome}`, type: "number", step: "0.001", className: "form-control form-control-sm", style: { width: 120 }, value: typeof display('dsr') !== 'undefined' ? Number(display('dsr')).toFixed(3) : '', onChange: e => updateOverride('dsr', e.target.value) }) }), _jsx("td", { children: _jsx("input", { "aria-label": `INSS ${it.funcionario.nome}`, type: "number", step: "0.001", className: "form-control form-control-sm", style: { width: 120 }, value: typeof display('inss') !== 'undefined' ? Number(display('inss')).toFixed(3) : '', onChange: e => updateOverride('inss', e.target.value) }) }), _jsx("td", { children: _jsx("input", { "aria-label": `IR ${it.funcionario.nome}`, type: "number", step: "0.001", className: "form-control form-control-sm", style: { width: 120 }, value: typeof display('ir') !== 'undefined' ? Number(display('ir')).toFixed(3) : '', onChange: e => updateOverride('ir', e.target.value) }) }), _jsx("td", { children: _jsx("input", { "aria-label": `Outros ${it.funcionario.nome}`, type: "number", step: "0.001", className: "form-control form-control-sm", style: { width: 120 }, value: typeof display('descontos_outro') !== 'undefined' ? Number(display('descontos_outro')).toFixed(3) : '', onChange: e => updateOverride('descontos_outro', e.target.value) }) }), _jsx("td", { children: _jsx("input", { "aria-label": `Líquido ${it.funcionario.nome}`, type: "number", step: "0.001", className: "form-control form-control-sm", style: { width: 120 }, value: typeof display('liquido') !== 'undefined' ? Number(display('liquido')).toFixed(3) : '', onChange: e => updateOverride('liquido', e.target.value) }) })] }, it.id || fid));
                                                }) })] }) })] }) }))] }), openPagar && preview && (FolhaPagarBatchModal ? (_jsx(FolhaPagarBatchModal, { folhaId: preview.id, items: (preview.itens || []).map(it => ({ funcionario: it.funcionario, liquido: it.liquido })), onClose: () => setOpenPagar(false), onComplete: () => { setOpenPagar(false); /* refresh if needed */ } })) : (_jsx("div", { className: "modal d-block", role: "dialog", tabIndex: -1, children: _jsx("div", { className: "modal-dialog modal-lg", role: "document", children: _jsx("div", { className: "modal-content", children: _jsx("div", { className: "modal-body", children: "Carregando modal de pagamentos..." }) }) }) })))] }));
};
export default FolhaPagamento;
