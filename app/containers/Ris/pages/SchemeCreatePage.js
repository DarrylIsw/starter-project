/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useHistory } from 'react-router-dom';
import { useRis } from '../RisContext';
import {
  Button, EmptyRow, Field, Modal, PageBack
} from '../components/Ui';
import { uid } from '../data';

const positionLabels = {
  tenaga_pengajar: 'Tenaga Pengajar', asisten_ahli: 'Asisten Ahli', lektor: 'Lektor', lektor_kepala: 'Lektor Kepala', profesor: 'Profesor'
};
const statusLabels = { fulltime: 'Fulltime', homebase: 'Homebase' };

const ToggleGroup = ({ values, selected, onChange }) => (
  <div className="ris-check-group">{values.map(value => <label key={value}><input type="checkbox" checked={selected.includes(value)} onChange={() => onChange(selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value])} />{value}</label>)}</div>
);

export default function SchemeCreatePage() {
  const { data, setData } = useRis();
  const history = useHistory();
  const [form, setForm] = useState({
    name: '', description: '', startDate: '', endDate: '', registrationStartDate: '', registrationEndDate: ''
  });
  const [filters, setFilters] = useState({
    education: [], positions: [], statuses: [], minSinta: '', maxSinta: '', minResearch: '', lastYear: ''
  });
  const [eligibleIds, setEligibleIds] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const updateFilter = (key, value) => setFilters(current => ({ ...current, [key]: value }));
  const eligible = eligibleIds.map(id => data.lecturers.find(item => item.id === id)).filter(Boolean);
  const searchResults = useMemo(() => (search.length < 2 ? [] : data.lecturers.filter(item => `${item.name} ${item.nidn}`.toLowerCase().includes(search.toLowerCase()) && !eligibleIds.includes(item.id))), [search, data.lecturers, eligibleIds]);

  const checkEligible = () => {
    if (!filters.education.length || !filters.positions.length || !filters.statuses.length) {
      setError('Pilih minimal satu Tingkat Edukasi, Jabatan Fungsional, dan Status Pekerjaan.');
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
    const eligibleUsers = eligibleIds.map(id => data.lecturers.find(item => item.id === id)).filter(Boolean).map(item => item.userId);
    const scheme = {
      id: uid('scheme'),
      ...form,
      year: Number(form.startDate.slice(0, 4)),
      status: 'open',
      schemeStatus: 'open',
      eligibleProfileIds: eligibleIds,
      eligibleUserIds: eligibleUsers,
      eligibleLecturerIds: eligibleIds,
      filters,
      db: {
        scheme_name: form.name,
        scheme_description: form.description,
        scheme_year: Number(form.startDate.slice(0, 4)),
        scheme_start_date: form.startDate,
        scheme_end_date: form.endDate,
        registration_start_date: form.registrationStartDate,
        registration_end_date: form.registrationEndDate,
        scheme_status: 'open',
        scheme_filter_rules: filters,
        scheme_eligibility_snapshot: eligibleUsers,
      },
    };
    setData(current => ({ ...current, schemes: [scheme, ...current.schemes] }));
    history.push('/ris/pengajuan-penelitian-internal');
  };

  const addSelected = () => {
    if (selected) setEligibleIds(current => [...current, selected.id]);
    setSelected(null); setSearch(''); setModalOpen(false);
  };

  return (
    <div className="ris-page ris-page-narrow ris-workspace-page ris-scheme-create-page">
      <PageBack onClick={() => history.goBack()} />
      <h1>Form Pembuatan Skema Baru</h1>
      {error && <div className="ris-alert ris-alert-error">{error}</div>}
      <form onSubmit={submit}>
        <section className="ris-form-section"><h2>Informasi Skema</h2>
          <Field label="Nama" required><input required value={form.name} onChange={event => update('name', event.target.value)} placeholder="Skema..." /></Field>
          <Field label="Deskripsi" alignStart><textarea rows="3" value={form.description} onChange={event => update('description', event.target.value)} placeholder="Lorem ipsum..." /></Field>
          <Field label="Tanggal Skema Dimulai" required><input required type="date" value={form.startDate} onChange={event => update('startDate', event.target.value)} /></Field>
          <Field label="Tanggal Skema Selesai" required><input required type="date" value={form.endDate} onChange={event => update('endDate', event.target.value)} /></Field>
          <Field label="Tanggal Pendaftaran Dibuka" required><input required type="datetime-local" value={form.registrationStartDate} onChange={event => update('registrationStartDate', event.target.value)} /></Field>
          <Field label="Tanggal Pendaftaran Ditutup" required><input required type="datetime-local" value={form.registrationEndDate} onChange={event => update('registrationEndDate', event.target.value)} /></Field>
        </section>
        <section className="ris-form-section"><h2>Filter Data Profil Dosen</h2>
          <Field label="Tingkat Edukasi"><ToggleGroup values={['S1', 'S2', 'S3']} selected={filters.education} onChange={value => updateFilter('education', value)} /></Field>
          <Field label="Jabatan Fungsional"><ToggleGroup values={['Tenaga Pengajar', 'Lektor', 'Profesor', 'Lektor Kepala', 'Asisten Ahli']} selected={filters.positions} onChange={value => updateFilter('positions', value)} /></Field>
          <Field label="Status Pekerjaan"><ToggleGroup values={['Fulltime', 'Homebase']} selected={filters.statuses} onChange={value => updateFilter('statuses', value)} /></Field>
        </section>
        <section className="ris-form-section"><h2>Filter Data Kinerja Penelitian</h2>
          <Field label="Nilai Minimum Skor SINTA"><input type="number" min="0" value={filters.minSinta} onChange={event => updateFilter('minSinta', event.target.value)} /></Field>
          <Field label="Nilai Maximum Skor SINTA"><input type="number" min="0" value={filters.maxSinta} onChange={event => updateFilter('maxSinta', event.target.value)} /></Field>
          <Field label="Nilai Minimum Jumlah Penelitian"><input type="number" min="0" value={filters.minResearch} onChange={event => updateFilter('minResearch', event.target.value)} /></Field>
          <Field label="Tahun Terakhir Penelitian"><input type="number" min="2000" max="2100" value={filters.lastYear} onChange={event => updateFilter('lastYear', event.target.value)} /></Field>
        </section>
        <div className="ris-centered"><Button type="button" onClick={checkEligible}>CEK DOSEN ELIGIBLE</Button></div>
        <section className="ris-form-section">
          <div className="ris-section-title"><h2>Dosen Eligible</h2><Button type="button" onClick={() => setModalOpen(true)}>Tambah Dosen Lain +</Button></div>
          <div className="ris-table-wrap"><table className="ris-table ris-table-left"><thead><tr><th>No.</th><th>Nama Dosen</th><th>NIDN</th><th>Fakultas</th><th>Program Studi</th><th>Tingkat Edukasi</th><th>Jabatan</th><th>Status</th><th>Skor SINTA</th><th>Jumlah Penelitian</th><th /></tr></thead>
            <tbody>{eligible.map((item, index) => <tr key={item.id}><td>{index + 1}.</td><td>{item.name}</td><td>{item.nidn}</td><td>{item.faculty}</td><td>{item.program}</td><td>{item.educationLevel}</td><td>{positionLabels[item.functionalPosition]}</td><td>{statusLabels[item.employmentStatus]}</td><td>{item.sintaScore}</td><td>{item.researchCount}</td><td><button type="button" className="ris-action red" onClick={() => setEligibleIds(current => current.filter(id => id !== item.id))}>Hapus</button></td></tr>)}{eligible.length === 0 && <EmptyRow colSpan={11}>Belum ada dosen. Klik “CEK DOSEN ELIGIBLE” atau tambah manual.</EmptyRow>}</tbody>
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
