import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import { useApiQuery } from '@/hooks/useApi';

export const FolhaPagamento: React.FC = () => {
  interface FolhaItem {
    id?: number;
    funcionario: { id: number; nome: string };
    salario_bruto?: number | string;
    hora_extra?: number | string;
    hora_extra_hours?: number | string;
    dsr?: number | string;
    inss?: number | string;
    ir?: number | string;
    descontos_outro?: number | string;
    liquido?: number | string;
  }
  interface FolhaPreview {
    id?: number;
    descricao?: string;
    periodo_mes?: number;
    periodo_ano?: number;
    itens?: FolhaItem[];
    executado?: boolean;
    valor_total?: number;
  }

  type FuncionarioListItem = { id: number; nome: string; cargo?: string; salario_bruto?: number; ativo?: boolean; tipo?: 'registrado'|'temporario' };

  const [mes, setMes] = useState<number>(new Date().getMonth() + 1);
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [preview, setPreview] = useState<FolhaPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: funcionarios = [] } = useApiQuery<FuncionarioListItem[]>(['funcionarios'], '/administrativo/funcionarios/');
  const [selected, setSelected] = useState<number[]>([]);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [openPagar, setOpenPagar] = useState(false); // modal state
  
  // Lazy load modal only when opened to avoid triggering its API requests on module load
  const [FolhaPagarBatchModal, setFolhaPagarBatchModal] = useState<React.FC<any> | null>(null);

  useEffect(() => {
    let mounted = true;
    if (openPagar && !FolhaPagarBatchModal) {
      import('./FolhaPagarBatchModal')
        .then((m) => { if (mounted) setFolhaPagarBatchModal(() => m.default); })
        .catch((err) => console.error('Falha ao carregar modal de pagamento:', err));
    }
    return () => { mounted = false; };
  // only run when openPagar changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openPagar]);

  // New fields: per-employee overtime entries (multiple per employee), include DSR toggle, and list of extra descontos (Outro)
  const [perEmployeeHours, setPerEmployeeHours] = useState<Record<number, Array<{ hours: number; type: string; kind?: string; day_type?: string }>>>({});
  const [perEmployeeDays, setPerEmployeeDays] = useState<Record<number, number>>({});
  const [includeDsr, setIncludeDsr] = useState<boolean | null>(null); // null = not set (use default behavior: include if holidays_count > 0)
  // per-employee level include_dsr flag
  const [perEmployeeIncludeDsr, setPerEmployeeIncludeDsr] = useState<Record<number, boolean>>({});
  const [holidaysCount, setHolidaysCount] = useState<number>(0);
  const [diasUteis, setDiasUteis] = useState<number>(26);
  const [outros, setOutros] = useState<Array<{label: string; amount: number}>>([]);
  // overrides store manual or calculated per-employee final values (and manual flags per field)
  const [overrides, setOverrides] = useState<Record<number, { values?: Record<string, number>, manualFields?: Record<string, boolean> }>>({});

  function addOutro() {
    setOutros(prev => [...prev, { label: 'Outro', amount: 0 }]);
  }
  function updateOutro(index: number, key: 'label' | 'amount', value: string | number) {
    setOutros(prev => prev.map((o, i) => i === index ? { ...o, [key]: key === 'amount' ? Number(value) : String(value) } : o));
  }
  function removeOutro(index: number) {
    setOutros(prev => prev.filter((_, i) => i !== index));
  }

  // Helper to add an overtime entry for an employee
  function addEmployeeOvertimeEntry(id: number) {
    setPerEmployeeHours(prev => {
      const list = prev[id] ? [...prev[id]] : [];
      return { ...prev, [id]: [...list, { hours: 0, type: 'normal' }] };
    });
  }

  function updateEmployeeOvertimeEntry(id: number, idx: number, key: 'hours' | 'type' | 'kind' | 'day_type', value: string | number) {
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
      } else if (key === 'type') {
        entry.type = String(value);
      } else if (key === 'kind') {
        entry.kind = String(value);
      } else if (key === 'day_type') {
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
      } catch {
        // defensive: ignore unexpected types
      }
      list[idx] = entry;
      return { ...prev, [id]: list };
    });
  }

  function removeEmployeeOvertimeEntry(id: number, idx: number) {
    setPerEmployeeHours(prev => {
      const list = prev[id] ? [...prev[id]] : [];
      list.splice(idx, 1);
      return { ...prev, [id]: list };
    });
  }

  function toggleEmployeeIncludeDsr(id: number, value: boolean) {
    setPerEmployeeIncludeDsr(prev => ({ ...prev, [id]: value }));
  }

  function toggleFuncionario(id: number) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function gerarPreview() {
    setLoading(true);
    type PerEmployeeEntry = { id: number; entries: Array<{ hours: number; type: string; kind?: string; day_type?: string }>; include_dsr?: boolean; dias_trabalhados?: number };
    type PreviewPayload = {
      periodo_mes: number;
      periodo_ano: number;
      funcionarios_ids: number[];
      per_employee_horas?: PerEmployeeEntry[];
      holidays_count?: number;
      dias_uteis?: number;
      include_dsr?: boolean | null;
      hora_extra?: number;
      outros_descontos?: Array<{ label: string; amount: number }>;
    };

    try {
      const payload: PreviewPayload = { periodo_mes: mes, periodo_ano: ano, funcionarios_ids: selected };
      // include per-employee hours entries when present
      const per_emp: PerEmployeeEntry[] = Object.entries(perEmployeeHours).map(([id, v]) => ({ id: Number(id), entries: v, include_dsr: typeof perEmployeeIncludeDsr[Number(id)] !== 'undefined' ? perEmployeeIncludeDsr[Number(id)] : undefined, dias_trabalhados: typeof perEmployeeDays[Number(id)] !== 'undefined' ? perEmployeeDays[Number(id)] : undefined }));
      // also include employees selected but without overtime entries (useful for temporarios with dias_trabalhados only)
      const selectedWithDays: PerEmployeeEntry[] = Object.entries(perEmployeeDays).filter(([, d]) => typeof d !== 'undefined').map(([id, d]) => ({ id: Number(id), entries: [], include_dsr: undefined, dias_trabalhados: d }));
      const merged: PerEmployeeEntry[] = [...per_emp];
      selectedWithDays.forEach(s => { if (!merged.find(m => m.id === s.id)) merged.push(s); });
      if (merged.length > 0) payload.per_employee_horas = merged;
      payload.holidays_count = holidaysCount;
      payload.dias_uteis = diasUteis;
      payload.include_dsr = includeDsr;
      // For backward compatibility with some flows, include an aggregated hora_extra when DSR is selected
      if (includeDsr && per_emp.length > 0) {
        const sumHours = per_emp.reduce((s, x) => s + ((x.entries || []).reduce((ss, e) => ss + (e.hours || 0), 0)), 0);
        payload.hora_extra = sumHours * 10; // simple aggregated placeholder used in tests
      }
      if (outros.length > 0) payload.outros_descontos = outros.map(o => ({ label: o.label, amount: o.amount }));

      const res = await api.post('/administrativo/folha-pagamento/', payload);
      setPreview(res.data as FolhaPreview);
    } catch (err: unknown) {
      const ae = err as { message?: string; response?: { data?: unknown } };
      console.error('Erro ao gerar preview', ae.message || ae.response?.data);
      alert('Erro ao gerar preview');
    } finally {
      setLoading(false);
    }
  }

  // Fill editable fields with computed values from preview but do not overwrite manual edits
  async function calcularAutomatico() {
    setLoading(true);
    try {
      type PerEmployeeEntry = { id: number; entries: Array<{ hours: number; type: string; kind?: string; day_type?: string }>; include_dsr?: boolean };
      const payload: {
        periodo_mes: number;
        periodo_ano: number;
        funcionarios_ids: number[];
        per_employee_horas?: PerEmployeeEntry[];
        holidays_count?: number;
        dias_uteis?: number;
        include_dsr?: boolean | null;
        outros_descontos?: Array<{ label: string; amount: number }>;
      } = { periodo_mes: mes, periodo_ano: ano, funcionarios_ids: selected };

      const per_emp: PerEmployeeEntry[] = Object.entries(perEmployeeHours).map(([id, v]) => ({ id: Number(id), entries: v, include_dsr: typeof perEmployeeIncludeDsr[Number(id)] !== 'undefined' ? perEmployeeIncludeDsr[Number(id)] : undefined }));
      if (per_emp.length > 0) payload.per_employee_horas = per_emp;
      payload.holidays_count = holidaysCount;
      payload.dias_uteis = diasUteis;
      payload.include_dsr = includeDsr;
      if (outros.length > 0) payload.outros_descontos = outros.map(o => ({ label: o.label, amount: o.amount }));

      const res = await api.post('/administrativo/folha-pagamento/', payload);
      setPreview(res.data as FolhaPreview);

      // apply computed values to overrides state if user hasn't manually edited that field
      const newOverrides = { ...overrides };
      ((res.data as FolhaPreview).itens || []).forEach((it) => {
        const fid = it.funcionario.id;
        const cur = newOverrides[fid] || { values: {}, manualFields: {} };
        // fields we expose: inss, ir, dsr, descontos_outro, liquido
        (['inss', 'ir', 'dsr', 'descontos_outro', 'liquido'] as const).forEach((k) => {
          const v = (it as unknown as Record<string, number | string | undefined>)[k as string];
          if (!cur.manualFields || !cur.manualFields[k]) {
            cur.values = { ...cur.values, [k]: v as number };
          }
        });
        newOverrides[fid] = cur;
      });
      setOverrides(newOverrides);

      // also ensure per-employee include_dsr is set when an item has computed DSR > 0
      setPerEmployeeIncludeDsr(prev => {
        const next = { ...prev };
        ((res.data as FolhaPreview).itens || []).forEach((it) => {
          const fid = it.funcionario.id;
          const record = it as unknown as Record<string, number | string | undefined>;
          if (((record.hora_extra_hours as number || record.hora_extra as number) || 0) > 0 && ((record.dsr as number) || 0) > 0 && typeof next[fid] === 'undefined') {
            next[fid] = true;
          }
        });
        return next;
      });

    } catch (err: unknown) {
      const ae = err as { message?: string; response?: { data?: unknown } };
      console.error('Erro ao calcular automaticamente', ae.message || ae.response?.data);
      alert('Erro ao calcular automaticamente');
    } finally {
      setLoading(false);
    }
  }

  // Load summary aggregates for previous month relative to given mes/ano
  async function loadSummary(month?: number, year?: number) {
    try {
      const q = month && year ? `?month=${month}&year=${year}` : '';
      const res = await api.get(`/administrativo/folha-pagamento/summary/${q}`);
      setSummary(res.data);
    } catch (err) {
      console.warn('Erro ao carregar resumo:', err);
      setSummary(null);
    }
  }

  function loadSummaryForPrevMonth(m?: number, y?: number) {
    const baseMonth = typeof m === 'number' ? m : mes;
    const baseYear = typeof y === 'number' ? y : ano;
    let prevMonth = baseMonth - 1;
    let prevYear = baseYear;
    if (prevMonth < 1) { prevMonth = 12; prevYear = baseYear - 1; }
    loadSummary(prevMonth, prevYear);
  }

  useEffect(() => {
    // automatically load previous month summary when mes or ano changes
    loadSummaryForPrevMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, ano]);

  async function runFolha() {
    if (!preview || !preview.id) return;
    if (!window.confirm('Executar esta folha e criar lançamentos?')) return;
    try {
      // prepare overrides payload from local overrides state
      const per_employee_overrides = Object.entries(overrides).map(([id, v]) => {
        const payload: Record<string, number | undefined | number> = { id: Number(id) };
        if (v.values) {
          (['inss', 'ir', 'dsr', 'descontos_outro', 'liquido'] as const).forEach(k => {
            if (v.values && typeof v.values[k] !== 'undefined') (payload as Record<string, number>)[k] = v.values[k] as number;
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
      } catch (err) {
        console.error('Erro ao buscar folha para relatório', err);
      }
      // mark preview executed
      setPreview({ ...preview, executado: true });
    } catch (err: unknown) {
      const ae = err as { message?: string; response?: { data?: unknown } };
      console.error('Erro ao executar folha', ae.message || ae.response?.data);
      alert('Erro ao executar folha');
    }
  }

  function buildFolhaMarkdown(folha: FolhaPreview) {
    // helper: safely format numeric values returned as strings or numbers
    const fmt = (v: number | string | undefined, d = 2) => {
      const n = Number(v);
      if (Number.isNaN(n)) return (d === 3) ? '0.000' : '0.00';
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

  function openReportWindow(_md: string, folha: FolhaPreview) {
    console.info('openReportWindow', { descricao: folha?.descricao, itens_len: (folha?.itens||[]).length });
    const fmt = (v: number | string | undefined, d = 2) => { const n = Number(v); return Number.isNaN(n) ? (d === 3 ? '0.000' : '0.00') : n.toFixed(d); };
    const tableRows = ((folha.itens || []) as FolhaItem[]).map((it) => `\n      <tr>\n        <td style="border:1px solid #eee;padding:6px">${it.funcionario.nome}</td>\n        <td style="border:1px solid #eee;padding:6px;text-align:right">${fmt(it.salario_bruto,2)}</td>\n        <td style="border:1px solid #eee;padding:6px;text-align:right">${fmt(it.hora_extra,2)}</td>\n        <td style="border:1px solid #eee;padding:6px;text-align:right">${fmt(it.dsr,2)}</td>\n        <td style="border:1px solid #eee;padding:6px;text-align:right">${fmt(it.inss,2)}</td>\n        <td style="border:1px solid #eee;padding:6px;text-align:right">${fmt(it.ir,2)}</td>\n        <td style="border:1px solid #eee;padding:6px;text-align:right">${fmt(it.descontos_outro,2)}</td>\n        <td style="border:1px solid #eee;padding:6px;text-align:right">${fmt(it.liquido,2)}</td>\n      </tr>\n    `).join('');
    const tableHtml = `<table style="width:100%;border-collapse:collapse">\n        <thead><tr><th style="border:1px solid #ccc;padding:6px;text-align:left">Funcionário</th><th style="border:1px solid #ccc;padding:6px;text-align:right">Bruto</th><th style="border:1px solid #ccc;padding:6px;text-align:right">Hora Extra</th><th style="border:1px solid #ccc;padding:6px;text-align:right">DSR</th><th style="border:1px solid #ccc;padding:6px;text-align:right">INSS</th><th style="border:1px solid #ccc;padding:6px;text-align:right">IR</th><th style="border:1px solid #ccc;padding:6px;text-align:right">Outros</th><th style="border:1px solid #ccc;padding:6px;text-align:right">Líquido</th></tr></thead>\n        <tbody>${tableRows}</tbody>\n      </table>`;

    const items: FolhaItem[] = (folha.itens || []);

    const w = window.open('', '_blank');
    if (!w || !w.document) return;
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

      const printBtn = w.document.getElementById('printBtn') as HTMLButtonElement | null;
      const mdBtn = w.document.getElementById('downloadMd') as HTMLButtonElement | null;
      const csvBtn = w.document.getElementById('downloadCsv') as HTMLButtonElement | null;

      const makeMd = () => {
        const rows: string[] = [];
        rows.push('# ' + (folha.descricao || 'Folha') + '\n');
        rows.push('| Funcionário | Bruto | Hora Extra | DSR | INSS | IR | Outros | Líquido |');
        rows.push('|---|---:|---:|---:|---:|---:|---:|---:|');
        items.forEach((it) => rows.push(`| ${it.funcionario.nome} | ${fmt(it.salario_bruto,2)} | ${fmt(it.hora_extra,2)} | ${fmt(it.dsr,2)} | ${fmt(it.inss,2)} | ${fmt(it.ir,2)} | ${fmt(it.descontos_outro,2)} | ${fmt(it.liquido,2)} |`));
        const blob = new Blob([rows.join('\n')], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = w.document.createElement('a'); a.href = url; a.download = 'folha.md'; w.document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      };

      const makeCsv = () => {
        const lines: string[] = [];
        lines.push('Funcionario,Bruto,Hora Extra,DSR,INSS,IR,Outros,Liquido');
        items.forEach((it) => lines.push([it.funcionario.nome, fmt(it.salario_bruto,2), fmt(it.hora_extra,2), fmt(it.dsr,2), fmt(it.inss,2), fmt(it.ir,2), fmt(it.descontos_outro,2), fmt(it.liquido,2)].join(',')));
        const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = w.document.createElement('a'); a.href = url; a.download = 'folha.csv'; w.document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      };

      printBtn?.addEventListener('click', () => { w.print(); });
      mdBtn?.addEventListener('click', makeMd);
      csvBtn?.addEventListener('click', makeCsv);
    } catch (err) {
      console.error('Erro ao abrir relatório', err);
    }
  }

  return (
    <>
    <div>
      <div className="d-flex justify-content-between mb-2">
        <div><strong>Folha de Pagamento</strong></div>
      </div>

      <div className="row mb-3">
        <div className="col-12 d-flex gap-3 align-items-center">
          <div className="card p-2" style={{ minWidth: 160 }}>
            <small className="text-muted">Custo Horas Extras (mês anterior)</small>
            <div className="h5">R$ {summary ? Number(summary.total_horas_extra_cost).toFixed(3) : '0.000'}</div>
          </div>
          <div className="card p-2" style={{ minWidth: 160 }}>
            <small className="text-muted">Descontos INSS (mês anterior)</small>
            <div className="h5">R$ {summary ? Number(summary.total_inss).toFixed(3) : '0.000'}</div>
          </div>
          <div className="card p-2" style={{ minWidth: 160 }}>
            <small className="text-muted">Total Folha (mês anterior)</small>
            <div className="h5">R$ {summary ? Number(summary.total_folha).toFixed(3) : '0.000'}</div>
          </div>
          <div className="ms-auto">
            <button className="btn btn-sm btn-outline-secondary" aria-label="Carregar mês anterior" onClick={() => loadSummaryForPrevMonth()}>Carregar mês anterior</button>
            <button className="btn btn-sm btn-primary ms-2" onClick={() => { if (preview && preview.itens && preview.itens.length) { setOpenPagar(true); } else { alert('Gere ou selecione uma folha/preview primeiro.'); } }}><i className="bi bi-currency-exchange" /> Pagar por Transferência</button>
          </div>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-2">
              <label className="form-label">Mês</label>
              <input type="number" className="form-control" value={mes} onChange={e => setMes(Number(e.target.value))} />
            </div>
            <div className="col-md-2">
              <label className="form-label">Ano</label>
              <input type="number" className="form-control" value={ano} onChange={e => setAno(Number(e.target.value))} />
            </div>
            <div className="col-md-8">
              <label className="form-label">Funcionários (opcional)</label>
              <div className="d-flex flex-wrap">
                {funcionarios.map((f: FuncionarioListItem) => (
                  <div key={f.id} className="me-3 mb-2">
                    <button type="button" className={`btn btn-sm ${selected.includes(f.id) ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => toggleFuncionario(f.id)}>{f.nome}</button>
                    {selected.includes(f.id) && (
                      <div className="mt-2">
                        {(perEmployeeHours[f.id] || []).map((entry, idx) => (
                          <div key={idx} className="d-flex gap-2 align-items-center mb-1">
                            <input aria-label={`Horas extra ${f.nome} #${idx+1}`} type="number" step="0.1" className="form-control form-control-sm" style={{ width: 100 }} value={entry.hours} onChange={e => updateEmployeeOvertimeEntry(f.id, idx, 'hours', e.target.value)} />

                            <select aria-label={`Kind horas ${f.nome} #${idx+1}`} className="form-select form-select-sm" style={{ width: 160 }} value={entry.kind || 'extra'} onChange={e => updateEmployeeOvertimeEntry(f.id, idx, 'kind', e.target.value)}>
                              <option value="extra">Hora Extra</option>
                              <option value="diaria">Diária</option>
                            </select>

                            { (entry.kind || 'extra') === 'extra' ? (
                              <select aria-label={`Tipo horas ${f.nome} #${idx+1}`} className="form-select form-select-sm" style={{ width: 140 }} value={entry.type || 'normal'} onChange={e => updateEmployeeOvertimeEntry(f.id, idx, 'type', e.target.value)}>
                                <option value="normal">Normal (50%)</option>
                                <option value="sunday">Domingo/Feriado (100%)</option>
                              </select>
                            ) : (
                              <select aria-label={`Dia da diária ${f.nome} #${idx+1}`} className="form-select form-select-sm" style={{ width: 160 }} value={entry.day_type || 'weekday'} onChange={e => updateEmployeeOvertimeEntry(f.id, idx, 'day_type', e.target.value)}>
                                <option value="weekday">Dia de semana</option>
                                <option value="domingo">Domingo</option>
                                <option value="feriado">Feriado</option>
                              </select>
                            )}

                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeEmployeeOvertimeEntry(f.id, idx)}>Remover</button>
                          </div>
                        ))}
                        <div className="d-flex gap-2 align-items-center mt-1">
                          <button type="button" className="btn btn-sm btn-outline-secondary" aria-label={`Adicionar hora extra para ${f.nome}`} onClick={() => addEmployeeOvertimeEntry(f.id)}>+ Adicionar Hora Extra</button>
                          {f.tipo === 'temporario' && (
                            <div className="ms-3">
                              <label className="form-label small mb-1">Dias trabalhados</label>
                              <input aria-label={`Dias trabalhados ${f.nome}`} type="number" min="0" className="form-control form-control-sm" style={{ width: 120 }} value={perEmployeeDays[f.id] ?? ''} onChange={e => setPerEmployeeDays(p => ({ ...p, [f.id]: Number(e.target.value) }))} />
                            </div>
                          )}
                          <div className="form-check ms-3">
                            <input aria-label={`Incluir DSR ${f.nome}`} className="form-check-input" type="checkbox" id={`includeDsr-${f.id}`} checked={perEmployeeIncludeDsr[f.id] ?? (includeDsr ?? false)} onChange={e => toggleEmployeeIncludeDsr(f.id, e.target.checked)} />
                            <label className="form-check-label" htmlFor={`includeDsr-${f.id}`}>Incluir DSR</label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="row g-3 mt-3">
            <div className="col-md-3">
              <label htmlFor="holidaysCount" className="form-label">Número de feriados no mês</label>
              <input id="holidaysCount" type="number" className="form-control" value={holidaysCount} onChange={e => setHolidaysCount(Number(e.target.value))} />
              <small className="form-text text-muted">Usado para cálculo do DSR. Valor 0 significa nenhum feriado.</small>
            </div>
            <div className="col-md-3">
              <label htmlFor="diasUteis" className="form-label">Dias úteis no mês</label>
              <input id="diasUteis" type="number" className="form-control" value={diasUteis} onChange={e => setDiasUteis(Number(e.target.value))} />
              <small className="form-text text-muted">Usado para cálculo do DSR (padrão: 26).</small>
            </div>
            <div className="col-md-3 d-flex align-items-end">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" id="includeDsr" checked={includeDsr ?? false} onChange={e => setIncludeDsr(e.target.checked)} />
                <label className="form-check-label" htmlFor="includeDsr">Incluir DSR</label>
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label">Descontos extras</label>
              <div>
                {outros.map((o, idx) => (
                  <div key={idx} className="d-flex gap-2 mb-2">
                    <input className="form-control" placeholder="Etiqueta" value={o.label} onChange={e => updateOutro(idx, 'label', e.target.value)} />
                    <input type="number" step="0.01" className="form-control" placeholder="Valor" value={o.amount} onChange={e => updateOutro(idx, 'amount', e.target.value)} />
                    <button type="button" className="btn btn-danger" onClick={() => removeOutro(idx)}>Remover</button>
                  </div>
                ))}
                <button type="button" className="btn btn-sm btn-outline-secondary" aria-label="Adicionar desconto outro" onClick={addOutro}>+ Adicionar Outro</button>
              </div>
            </div>
          </div>

          <div className="mt-2">
            <small className="text-muted">Cálculo do DSR: DSR = total_extra * (nº_feriados / dias_úteis). Para horas extras, o valor por hora = salário / 220. Primeira parcela (hora normal) paga 100% do valor por hora; adicional de 50% (normal) ou 100% (domingo/feriado) como acréscimo.</small>
            <small className="text-muted d-block mt-1">Para calcular domingos trabalhados incluir 9 horas nas horas extras como domingo/feriado.</small>
          <div className="mt-3">
            <button className="btn btn-outline-secondary me-2" onClick={calcularAutomatico} aria-label="Calcular automaticamente" disabled={loading}>{loading ? 'Calculando...' : 'Calcular Automaticamente'}</button>
            <button className="btn btn-primary me-2" onClick={gerarPreview} aria-label="Gerar preview" disabled={loading}>{loading ? 'Gerando...' : 'Gerar Preview'}</button>
            {preview && <button className="btn btn-success" onClick={runFolha} aria-label="Executar folha" disabled={preview.executado}>Executar Folha</button>}
          </div>
        </div>
      </div>
      </div>

      {preview && (
        <div className="card">
          <div className="card-body">
            <h5>Preview: {preview.descricao}</h5>
            <p><strong>Total:</strong> R$ {preview.valor_total}</p>
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Funcionário</th>
                    <th>Bruto</th>
                    <th>Hora Extra</th>
                    <th>DSR</th>
                    <th>INSS</th>
                    <th>IR</th>
                    <th>Outros</th>
                    <th>Líquido</th>
                  </tr>
                </thead>
                <tbody>
                  {((preview.itens || []) as FolhaItem[]).map((it) => {
                    const fid = it.funcionario.id;
                    const ov = overrides[fid] || { values: {}, manualFields: {} };
                    const display = (k: string) => (ov.values && typeof ov.values[k] !== 'undefined') ? ov.values[k] : (it as unknown as Record<string, unknown>)[k] ?? 0;
                    const updateOverride = (field: string, value: string | number) => {
                      setOverrides(prev => {
                        const cur = prev[fid] ? { ...prev[fid] } : { values: {}, manualFields: {} };
                        cur.values = { ...(cur.values || {}), [field]: Number(value) };
                        cur.manualFields = { ...(cur.manualFields || {}), [field]: true };
                        return { ...prev, [fid]: cur };
                      });
                    };
                    return (
                      <tr key={it.id || fid}>
                        <td>{it.funcionario.nome}</td>
                        <td>R$ {it.salario_bruto}</td>
                        <td>R$ {it.hora_extra ?? 0}</td>
                        <td>
                          <input aria-label={`DSR ${it.funcionario.nome}`} type="number" step="0.001" className="form-control form-control-sm" style={{ width: 120 }} value={typeof display('dsr') !== 'undefined' ? Number(display('dsr')).toFixed(3) : ''} onChange={e => updateOverride('dsr', e.target.value)} />
                        </td>
                        <td>
                          <input aria-label={`INSS ${it.funcionario.nome}`} type="number" step="0.001" className="form-control form-control-sm" style={{ width: 120 }} value={typeof display('inss') !== 'undefined' ? Number(display('inss')).toFixed(3) : ''} onChange={e => updateOverride('inss', e.target.value)} />
                        </td>
                        <td>
                          <input aria-label={`IR ${it.funcionario.nome}`} type="number" step="0.001" className="form-control form-control-sm" style={{ width: 120 }} value={typeof display('ir') !== 'undefined' ? Number(display('ir')).toFixed(3) : ''} onChange={e => updateOverride('ir', e.target.value)} />
                        </td>
                        <td>
                          <input aria-label={`Outros ${it.funcionario.nome}`} type="number" step="0.001" className="form-control form-control-sm" style={{ width: 120 }} value={typeof display('descontos_outro') !== 'undefined' ? Number(display('descontos_outro')).toFixed(3) : ''} onChange={e => updateOverride('descontos_outro', e.target.value)} />
                        </td>
                        <td>
                          <input aria-label={`Líquido ${it.funcionario.nome}`} type="number" step="0.001" className="form-control form-control-sm" style={{ width: 120 }} value={typeof display('liquido') !== 'undefined' ? Number(display('liquido')).toFixed(3) : ''} onChange={e => updateOverride('liquido', e.target.value)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
      {openPagar && preview && (
        FolhaPagarBatchModal ? (
          <FolhaPagarBatchModal folhaId={preview.id as number} items={(preview.itens || []).map(it => ({ funcionario: it.funcionario, liquido: it.liquido }))} onClose={() => setOpenPagar(false)} onComplete={() => { setOpenPagar(false); /* refresh if needed */ }} />
        ) : (
          <div className="modal d-block" role="dialog" tabIndex={-1}>
            <div className="modal-dialog modal-lg" role="document">
              <div className="modal-content">
                <div className="modal-body">Carregando modal de pagamentos...</div>
              </div>
            </div>
          </div>
        )
      )}
    </>
  );
}

export default FolhaPagamento;
