/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useHistory } from 'react-router-dom';
import { useRis } from '../RisContext';
import Icon from '../components/Icon';
import {
  Button, EmptyRow, Field, FileDrop, Modal, PageHeader, YearSelect
} from '../components/Ui';
import OutputDefinitionFields from '../components/OutputDefinitionFields';
import { formatCurrency, uid } from '../data';
import {
  REPORT_TYPE, REPORT_TYPE_LABEL, REPORT_TYPE_OPTIONS, validateReportingSchedule
} from '../reportingWorkflow';
import {
  BASE_ATTACHMENT_REQUIREMENTS,
  emptyAttachmentRequirement,
  emptyOutputDefinition,
  isOutputDefinitionComplete,
  normalizeSchemeAttachmentRequirements,
} from '../schemeConfiguration';

const positionLabels = {
  tenaga_pengajar: 'Tenaga Pengajar', asisten_ahli: 'Asisten Ahli', lektor: 'Lektor', lektor_kepala: 'Lektor Kepala', profesor: 'Profesor'
};
const statusLabels = { fulltime: 'Penuh Waktu', homebase: 'Dosen Tetap Program Studi' };
const reportLabel = (type, periods) => {
  const count = periods.filter(period => period.type === type).length + 1;
  return type === REPORT_TYPE.INTERIM ? `${REPORT_TYPE_LABEL[type]} Periode ${count}` : REPORT_TYPE_LABEL[type];
};
const newPeriod = (type, periods) => ({ id: uid(`report-${type}`), type, label: reportLabel(type, periods), openAt: '', dueAt: '', extensions: [] });
const TEMPLATE_MAX_SIZE = 2 * 1024 * 1024;
const readTemplateFile = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve({
    name: file.name,
    size: file.size,
    type: file.type || '',
    lastModified: file.lastModified,
    dataUrl: reader.result,
  });
  reader.onerror = () => reject(new Error('Template tidak dapat dibaca.'));
  reader.readAsDataURL(file);
});

const ToggleGroup = ({ values, selected, onChange }) => (
  <div className="ris-check-group">{values.map(value => <label key={value}><input type="checkbox" checked={selected.includes(value)} onChange={() => onChange(selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value])} />{value}</label>)}</div>
);

export default function SchemeCreatePage() {
  const { data, setData } = useRis();
  const history = useHistory();
  const [form, setForm] = useState({
    name: '', description: '', startDate: '', endDate: '', registrationStartDate: '', registrationEndDate: '', maximumBudget: ''
  });
  const [filters, setFilters] = useState({
    education: [], positions: [], statuses: [], minSinta: '', maxSinta: '', minResearch: '', lastYear: ''
  });
  const [eligibleIds, setEligibleIds] = useState([]);
  const [reportingSchedule, setReportingSchedule] = useState([]);
  const [outputOptions, setOutputOptions] = useState([]);
  const [attachmentRequirements, setAttachmentRequirements] = useState(() => normalizeSchemeAttachmentRequirements({ attachmentRequirements: BASE_ATTACHMENT_REQUIREMENTS }));
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const updateFilter = (key, value) => setFilters(current => ({ ...current, [key]: value }));
  const updatePeriod = (id, key, value) => setReportingSchedule(current => current.map(period => (period.id === id ? { ...period, [key]: value } : period)));
  const updatePeriodType = (id, type) => setReportingSchedule(current => current.map(period => (period.id === id ? { ...period, type, label: reportLabel(type, current.filter(item => item.id !== id)) } : period)));
  const removePeriod = id => setReportingSchedule(current => current.filter(period => period.id !== id));
  const addReport = () => setReportingSchedule(current => [...current, newPeriod(REPORT_TYPE.INTERIM, current)]);
  const addOutputOption = () => setOutputOptions(current => [...current, emptyOutputDefinition(uid('scheme-output'))]);
  const updateOutputOption = (id, value) => setOutputOptions(current => current.map(item => (item.id === id ? value : item)));
  const addAttachment = () => setAttachmentRequirements(current => [...current, emptyAttachmentRequirement(uid('scheme-attachment'))]);
  const updateAttachment = (id, patch) => setAttachmentRequirements(current => current.map(item => (item.id === id ? { ...item, ...patch } : item)));
  const attachTemplate = async (id, file) => {
    try {
      const template = await readTemplateFile(file);
      updateAttachment(id, { template });
      setError('');
    } catch (fileError) {
      setError(fileError.message);
    }
  };
  const eligible = eligibleIds.map(id => data.lecturers.find(item => item.id === id)).filter(Boolean);
  const searchResults = useMemo(() => (search.length < 2 ? [] : data.lecturers.filter(item => `${item.name} ${item.nidn}`.toLowerCase().includes(search.toLowerCase()) && !eligibleIds.includes(item.id))), [search, data.lecturers, eligibleIds]);

  const checkEligible = () => {
    if (!filters.education.length || !filters.positions.length || !filters.statuses.length) {
      setError('Pilih minimal satu tingkat edukasi, jabatan fungsional, dan status pekerjaan ketua penelitian.');
      return;
    }
    setError('');
    const found = data.lecturers.filter(item => filters.education.includes(item.educationLevel)
      && filters.positions.includes(positionLabels[item.functionalPosition])
      && filters.statuses.includes(statusLabels[item.employmentStatus])
      && (filters.minSinta === '' || item.sintaScore >= Number(filters.minSinta))
      && (filters.maxSinta === '' || item.sintaScore <= Number(filters.maxSinta))
      && (filters.minResearch === '' || item.researchCount >= Number(filters.minResearch))
      && (filters.lastYear === '' || item.lastResearchYear >= Number(filters.lastYear)));
    setEligibleIds(found.map(item => item.id));
  };

  const submit = event => {
    event.preventDefault();
    if (new Date(form.endDate) < new Date(form.startDate) || new Date(form.registrationEndDate) < new Date(form.registrationStartDate)) {
      setError('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
      return;
    }
    if (Number(form.maximumBudget) <= 0) {
      setError('Maksimum anggaran wajib lebih besar dari Rp 0.');
      return;
    }
    if (!outputOptions.length || outputOptions.some(item => !item.name.trim() || !isOutputDefinitionComplete(item))) {
      setError('Tambahkan minimal satu pilihan luaran wajib dan lengkapi seluruh pengaturannya.');
      return;
    }
    if (attachmentRequirements.some(item => !item.name.trim())) {
      setError('Nama setiap lampiran wajib diisi.');
      return;
    }
    const missingMainTemplate = attachmentRequirements.some(item => ['proposal', 'rab'].includes(item.category) && !(item.template && item.template.dataUrl));
    if (missingMainTemplate) {
      setError('Template Proposal dan RAB wajib diunggah sebelum skema disimpan.');
      return;
    }
    const scheduleError = validateReportingSchedule(reportingSchedule);
    if (scheduleError) {
      setError(scheduleError);
      return;
    }
    const eligibleUsers = eligibleIds.map(id => data.lecturers.find(item => item.id === id)).filter(Boolean).map(item => item.userId);
    const scheme = {
      id: uid('scheme'),
      ...form,
      year: Number(form.startDate.slice(0, 4)),
      maximumBudget: Number(form.maximumBudget),
      status: 'open',
      schemeStatus: 'open',
      eligibleProfileIds: eligibleIds,
      eligibleUserIds: eligibleUsers,
      eligibleLecturerIds: eligibleIds,
      filters,
      reportingSchedule,
      outputOptions,
      attachmentRequirements,
    };
    setData(current => ({ ...current, schemes: [scheme, ...current.schemes] }));
    history.push('/ris/skema');
  };

  const addSelected = () => {
    if (selected) setEligibleIds(current => [...current, selected.id]);
    setSelected(null); setSearch(''); setModalOpen(false);
  };

  return (
    <div className="ris-page ris-page-narrow ris-workspace-page ris-scheme-create-page">
      <PageHeader title="Formulir Pembuatan Skema Baru" description="Tentukan masa pendaftaran, batas anggaran, kelayakan ketua, dan jadwal pelaporan." onBack={() => history.goBack()} />
      {error && <div className="ris-alert ris-alert-error">{error}</div>}
      <form onSubmit={submit}>
        <section className="ris-form-section"><h2>Informasi Skema</h2>
          <Field label="Nama" required><input required value={form.name} onChange={event => update('name', event.target.value)} placeholder="Skema..." /></Field>
          <Field label="Deskripsi" alignStart><textarea rows="3" value={form.description} onChange={event => update('description', event.target.value)} placeholder="Lorem ipsum..." /></Field>
          <Field label="Tanggal Skema Dimulai" required><input required type="date" value={form.startDate} onChange={event => update('startDate', event.target.value)} /></Field>
          <Field label="Tanggal Skema Selesai" required><input required type="date" value={form.endDate} onChange={event => update('endDate', event.target.value)} /></Field>
          <Field label="Tanggal Pendaftaran Dibuka" required><input required type="datetime-local" value={form.registrationStartDate} onChange={event => update('registrationStartDate', event.target.value)} /></Field>
          <Field label="Tanggal Pendaftaran Ditutup" required><input required type="datetime-local" value={form.registrationEndDate} onChange={event => update('registrationEndDate', event.target.value)} /></Field>
          <Field label="Maksimum Anggaran" required hint={form.maximumBudget ? formatCurrency(Number(form.maximumBudget)) : 'Batas total RAB untuk satu pengajuan.'}><input required type="number" min="1" step="1" inputMode="numeric" value={form.maximumBudget} onChange={event => update('maximumBudget', event.target.value)} placeholder="Contoh: 50000000" /></Field>
        </section>
        <section className="ris-form-section ris-scheme-output-editor">
          <div className="ris-section-title"><div><h2>Tipe Luaran Wajib</h2><p className="ris-muted">Dosen dapat memilih satu atau beberapa opsi ini. Atribut kategori yang ditetapkan akan dikunci pada proposal.</p></div><Button type="button" tone="blue" onClick={addOutputOption}><Icon name="plus" size={16} />Tambah Tipe Luaran</Button></div>
          {outputOptions.length === 0 && <div className="ris-empty-state">Belum ada pilihan luaran wajib. Tambahkan minimal satu pilihan.</div>}
          {outputOptions.map((output, index) => <div className="ris-form-card ris-scheme-config-card" key={output.id}><div className="ris-card-heading"><h3>Pilihan Luaran {index + 1}</h3><button type="button" className="ris-text-danger" onClick={() => setOutputOptions(current => current.filter(item => item.id !== output.id))}>Hapus</button></div><OutputDefinitionFields definition={output} includeName includeDescription={false} onChange={value => updateOutputOption(output.id, value)} /></div>)}
        </section>
        <section className="ris-form-section ris-scheme-attachment-editor">
          <div className="ris-section-title"><div><h2>Templat dan Lampiran Proposal</h2><p className="ris-muted">Templat Proposal dan RAB dapat diunduh dosen. Lampiran tambahan ditampilkan berdasarkan nama yang Anda tetapkan.</p></div><Button type="button" tone="blue" onClick={addAttachment}><Icon name="plus" size={16} />Tambah Lampiran</Button></div>
          {attachmentRequirements.map((requirement, index) => <div className="ris-form-card ris-scheme-config-card" key={requirement.id}><div className="ris-card-heading"><h3>{requirement.custom ? `Lampiran Tambahan ${index - 1}` : requirement.name}</h3>{requirement.custom && <button type="button" className="ris-text-danger" onClick={() => setAttachmentRequirements(current => current.filter(item => item.id !== requirement.id))}>Hapus</button>}</div>{requirement.custom && <Field label="Nama Lampiran" required><input value={requirement.name} onChange={event => updateAttachment(requirement.id, { name: event.target.value })} placeholder="Contoh: Surat Pernyataan Mitra" /></Field>}<Field label={requirement.custom ? 'Templat Lampiran (opsional)' : `Templat ${requirement.name}`} required={!requirement.custom} alignStart><FileDrop file={requirement.template} accept={requirement.templateAccept} maxSize={TEMPLATE_MAX_SIZE} onError={setError} onFile={file => attachTemplate(requirement.id, file)} label={`Pilih templat ${requirement.name || 'lampiran'} (maksimal 2 MB)`} />{requirement.template && <button type="button" className="ris-text-danger ris-inline-remove" onClick={() => updateAttachment(requirement.id, { template: null })}>Hapus templat</button>}</Field></div>)}
        </section>
        <section className="ris-form-section ris-report-schedule-editor">
          <div className="ris-section-title"><div><h2>Jadwal Pelaporan</h2><p className="ris-muted">Satu laporan akhir wajib tersedia. Laporan sementara dan luaran dapat disesuaikan kebutuhan skema.</p></div><Button type="button" tone="blue" onClick={addReport}><Icon name="plus" size={16} />Tambah Laporan</Button></div>
          <div className={`ris-schedule-requirement ${reportingSchedule.filter(period => period.type === REPORT_TYPE.FINAL).length === 1 ? 'complete' : 'pending'}`}><Icon name={reportingSchedule.some(period => period.type === REPORT_TYPE.FINAL) ? 'check' : 'document'} size={17} /><span>{reportingSchedule.some(period => period.type === REPORT_TYPE.FINAL) ? 'Laporan Akhir sudah tersedia' : 'Laporan Akhir belum ditambahkan'}</span></div>
          {reportingSchedule.length === 0 && <div className="ris-empty-state ris-schedule-empty">Belum ada jadwal laporan.</div>}
          {reportingSchedule.map(period => <div className="ris-schedule-editor-row" key={period.id}>
            <Field label="Jenis" required><select value={period.type} onChange={event => updatePeriodType(period.id, event.target.value)}>{REPORT_TYPE_OPTIONS.map(item => <option key={item.value} value={item.value} disabled={item.value === REPORT_TYPE.FINAL && reportingSchedule.some(existing => existing.id !== period.id && existing.type === REPORT_TYPE.FINAL)}>{item.label}</option>)}</select></Field>
            <Field label="Nama Periode" required><input required value={period.label} onChange={event => updatePeriod(period.id, 'label', event.target.value)} /></Field>
            <Field label="Dibuka" required><input required type="datetime-local" value={period.openAt} onChange={event => updatePeriod(period.id, 'openAt', event.target.value)} /></Field>
            <Field label="Tenggat" required><input required type="datetime-local" value={period.dueAt} onChange={event => updatePeriod(period.id, 'dueAt', event.target.value)} /></Field>
            <button type="button" className="ris-action red" onClick={() => removePeriod(period.id)}>Hapus</button>
          </div>)}
        </section>
        <section className="ris-form-section"><div className="ris-section-title"><div><h2>Filter Ketua Penelitian</h2><p className="ris-muted">Kriteria profil dan rekam jejak menentukan dosen yang dapat mendaftar.</p></div></div>
          <Field label="Tingkat Edukasi"><ToggleGroup values={['S1', 'S2', 'S3']} selected={filters.education} onChange={value => updateFilter('education', value)} /></Field>
          <Field label="Jabatan Fungsional"><ToggleGroup values={['Tenaga Pengajar', 'Lektor', 'Profesor', 'Lektor Kepala', 'Asisten Ahli']} selected={filters.positions} onChange={value => updateFilter('positions', value)} /></Field>
          <Field label="Status Pekerjaan"><ToggleGroup values={['Penuh Waktu', 'Dosen Tetap Program Studi']} selected={filters.statuses} onChange={value => updateFilter('statuses', value)} /></Field>
          <Field label="Nilai Minimum Skor SINTA"><input type="number" min="0" value={filters.minSinta} onChange={event => updateFilter('minSinta', event.target.value)} /></Field>
          <Field label="Nilai Maksimum Skor SINTA"><input type="number" min="0" value={filters.maxSinta} onChange={event => updateFilter('maxSinta', event.target.value)} /></Field>
          <Field label="Nilai Minimum Jumlah Penelitian"><input type="number" min="0" value={filters.minResearch} onChange={event => updateFilter('minResearch', event.target.value)} /></Field>
          <Field label="Tahun Terakhir Penelitian"><YearSelect value={filters.lastYear} onChange={event => updateFilter('lastYear', event.target.value)} /></Field>
        </section>
        <div className="ris-centered"><Button type="button" onClick={checkEligible}>Tampilkan Dosen yang Memenuhi Kriteria</Button></div>
        <section className="ris-form-section">
          <div className="ris-section-title"><h2>Ketua Penelitian yang Memenuhi Syarat</h2><Button type="button" onClick={() => setModalOpen(true)}>Tambah Dosen Lain +</Button></div>
          <div className="ris-table-wrap"><table className="ris-table ris-table-left"><thead><tr><th>No.</th><th>Nama Dosen</th><th>NIDN</th><th>Fakultas</th><th>Program Studi</th><th>Tingkat Edukasi</th><th>Jabatan</th><th>Status</th><th>Skor SINTA</th><th>Jumlah Penelitian</th><th /></tr></thead>
            <tbody>{eligible.map((item, index) => <tr key={item.id}><td>{index + 1}.</td><td>{item.name}</td><td>{item.nidn}</td><td>{item.faculty}</td><td>{item.program}</td><td>{item.educationLevel}</td><td>{positionLabels[item.functionalPosition]}</td><td>{statusLabels[item.employmentStatus]}</td><td>{item.sintaScore}</td><td>{item.researchCount}</td><td><button type="button" className="ris-action red" onClick={() => setEligibleIds(current => current.filter(id => id !== item.id))}>Hapus</button></td></tr>)}{eligible.length === 0 && <EmptyRow colSpan={11}>Belum ada dosen yang dipilih dari filter atau penambahan manual.</EmptyRow>}</tbody>
          </table></div>
        </section>
        <div className="ris-centered"><Button type="submit" className="ris-wide-button">SIMPAN</Button></div>
      </form>
      {modalOpen && <Modal title="Tambah Dosen Lain" onClose={() => setModalOpen(false)}><div className="ris-modal-body"><p className="ris-modal-intro">Cari Nama atau NIDN dosen di bawah ini</p><input value={search} onChange={event => { setSearch(event.target.value); setSelected(null); }} placeholder="Ketik nama atau NIDN dosen..." />{!selected && searchResults.length > 0 && <div className="ris-autocomplete">{searchResults.map(item => <button type="button" key={item.id} onClick={() => { setSelected(item); setSearch(item.name); }}>{item.name} — {item.nidn}</button>)}</div>}{selected && <dl className="ris-info-list"><div><dt>Nama</dt><dd>{selected.name}</dd></div><div><dt>NIDN</dt><dd>{selected.nidn}</dd></div><div><dt>Fakultas</dt><dd>{selected.faculty}</dd></div><div><dt>Program Studi</dt><dd>{selected.program}</dd></div><div><dt>Tingkat Edukasi</dt><dd>{selected.educationLevel}</dd></div></dl>}<div className="ris-modal-actions"><Button type="button" tone="gray" onClick={() => setModalOpen(false)}>Batal</Button><Button type="button" disabled={!selected} onClick={addSelected}>Tambah</Button></div></div></Modal>}
    </div>
  );
}

ToggleGroup.propTypes = {
  values: PropTypes.array.isRequired,
  selected: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
};
