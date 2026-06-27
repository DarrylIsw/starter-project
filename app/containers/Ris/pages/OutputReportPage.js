/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import React, { useMemo, useState } from 'react';
import { useRis } from '../RisContext';
import { Button, Field, FileDrop } from '../components/Ui';
import { fileMeta } from '../data';
import { canReportResearch, getSchemeTitle } from '../workflow';

export default function OutputReportPage() {
  const { data, setData, user } = useRis();
  const researches = data.drafts.filter(item => canReportResearch(item, user));
  const [draftId, setDraftId] = useState(researches[0] ? researches[0].id : '');
  const draft = useMemo(() => researches.find(item => item.id === draftId), [researches, draftId]);
  const existing = draft && draft.outputReports ? draft.outputReports : {};
  const [reports, setReports] = useState(existing);
  const [saved, setSaved] = useState(false);

  const update = (outputId, key, value) => setReports(current => ({ ...current, [outputId]: { ...(current[outputId] || {}), [key]: value } }));
  const save = () => {
    setData(current => ({ ...current, drafts: current.drafts.map(item => (item.id === draft.id ? { ...item, outputReports: reports } : item)) }));
    setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  return <div className="ris-page ris-workspace-page ris-output-report-page"><h1>Form Pengumpulan Laporan Luaran</h1><div className="ris-research-picker"><label>Judul penelitian</label><select value={draftId} onChange={event => { setDraftId(event.target.value); const found = researches.find(item => item.id === event.target.value); setReports(found && found.outputReports ? found.outputReports : {}); }}><option value="">-- Pilih Penelitian --</option>{researches.map(item => <option key={item.id} value={item.id}>{item.project.title}</option>)}</select></div>
    {!draft && <div className="ris-empty-state">Belum ada penelitian yang disetujui untuk dilaporkan.</div>}
    {draft && <React.Fragment><section className="ris-proposal-info"><h2>Data Proposal Pengajuan Penelitian Internal</h2><p><span>Judul Penelitian</span>{draft.project.title}</p><p><span>Ketua Peneliti</span>{draft.members[0] ? draft.members[0].name : '-'}</p><p><span>Skema Penelitian</span>{getSchemeTitle(data.schemes.find(item => item.id === draft.schemeId))}</p></section><section className="ris-form-section"><h2>Laporan Luaran</h2>{draft.outputs.map((output, index) => { const report = reports[output.id] || {}; return <div className="ris-form-card" key={output.id}><h3>{output.type === 'wajib' ? 'Luaran Wajib' : `Luaran Tambahan ${index}`}</h3><Field label="Judul"><input disabled value={output.title} /></Field><Field label="Target tahun"><input disabled value={output.targetYear} /></Field><Field label="Status" required><select value={report.status || ''} onChange={event => update(output.id, 'status', event.target.value)}><option value="">-- Pilih Status --</option><option value="draft">Draft</option><option value="submitted">Submitted</option><option value="published">Published</option><option value="rejected">Rejected</option></select></Field><Field label="Link"><input value={report.link || ''} onChange={event => update(output.id, 'link', event.target.value)} placeholder="https://linkpublisher.com" /></Field><Field label="Kategori File"><select value={report.fileCategory || ''} onChange={event => update(output.id, 'fileCategory', event.target.value)}><option value="">-- Pilih Kategori File --</option><option value="jurnal">Jurnal</option><option value="prosiding">Prosiding</option><option value="buku">Buku</option><option value="hki">HKI</option><option value="produk_prototipe">Produk/Prototipe</option></select></Field><FileDrop file={report.file || null} onFile={file => update(output.id, 'file', fileMeta(file))} label="Upload File Luaran" /></div>; })}<div className="ris-centered">{saved && <span className="ris-saved">Data berhasil disimpan.</span>}<Button type="button" className="ris-wide-button" onClick={save}>SIMPAN</Button></div></section></React.Fragment>}
  </div>;
}
