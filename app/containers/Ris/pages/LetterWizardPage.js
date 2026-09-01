/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, react/prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { useHistory } from 'react-router-dom';
import { useRis } from '../RisContext';
import {
  Button, Field, PageBack, StatusBadge
} from '../components/Ui';
import { uid } from '../data';
import { getFundedResearches } from '../schemeDataWorkflow';
import {
  LETTER_STATUS,
  LETTER_TYPE,
  LETTER_TYPES,
  canEditLetter,
  createLetterRequest,
  getLetterPurposeOptions,
  getLetterResearchTitle,
  letterStatusMeta,
  renderLetterPlainText,
  transitionLetterStatus,
  updateLetterHistory,
  validateLetterApplicantData,
} from '../letterWorkflow';

const selectableTypes = LETTER_TYPES;

function ResearchSummary({ research, scheme }) {
  const leader = (research.members || []).find(item => item.role === 'ketua');
  return (
    <div className="ris-letter-research-summary">
      <div><span>Judul Penelitian</span><strong>{research.project && research.project.title}</strong></div>
      <div><span>Skema</span><strong>{scheme ? scheme.name : '-'}</strong></div>
      <div><span>Ketua Penelitian</span><strong>{leader ? leader.name : research.userName}</strong></div>
      <div><span>Tahun</span><strong>{scheme ? scheme.year : '-'}</strong></div>
    </div>
  );
}

ResearchSummary.propTypes = { research: PropTypes.object.isRequired, scheme: PropTypes.object };
ResearchSummary.defaultProps = { scheme: null };

function RequestForm({ researchId }) {
  const { data, setData, user } = useRis();
  const history = useHistory();
  const research = getFundedResearches(data, user).find(item => item.id === researchId);
  const scheme = research && (data.schemes || []).find(item => item.id === research.schemeId);
  const [type, setType] = React.useState(LETTER_TYPE.RESEARCH_ASSIGNMENT);
  const [purpose, setPurpose] = React.useState((getLetterPurposeOptions(LETTER_TYPE.RESEARCH_ASSIGNMENT)[0] || {}).value || '');
  const [customName, setCustomName] = React.useState('');
  const [error, setError] = React.useState('');

  if (!research) return <div className="ris-page"><h1>Penelitian tidak ditemukan</h1><Button tone="gray" onClick={() => history.push('/ris/pengajuan-surat')}>Kembali</Button></div>;

  const selectType = value => {
    setType(value);
    setPurpose((getLetterPurposeOptions(value)[0] || {}).value || '');
    setCustomName('');
  };

  const submit = () => {
    if (type === LETTER_TYPE.CUSTOM && !customName.trim()) {
      setError('Nama surat custom wajib diisi.');
      return;
    }
    if (type !== LETTER_TYPE.CUSTOM && !purpose) {
      setError('Subkategori surat wajib dipilih.');
      return;
    }
    const request = createLetterRequest({ researchId, type, purpose, customName }, user, data, uid);
    setData(current => ({ ...current, letterRequests: [...(current.letterRequests || []), request] }));
    history.push('/ris/pengajuan-surat');
  };

  return (
    <div className="ris-page ris-workspace-page ris-letter-request-page">
      <PageBack onClick={() => history.push('/ris/pengajuan-surat')} />
      <div className="ris-page-heading"><div><h1>Permintaan Surat Baru</h1><p>Pilih jenis surat. Data penelitian dan identitas Anda akan terisi otomatis.</p></div></div>
      <ResearchSummary research={research} scheme={scheme} />
      {error && <div className="ris-alert ris-alert-error">{error}</div>}
      <section className="ris-form-card ris-letter-request-card">
        <div className="ris-form-section-heading"><h2>Kebutuhan Surat</h2><p>Admin akan menyiapkan template dan field tambahan setelah permintaan diterima.</p></div>
        <Field label="Kategori Surat" required>
          <select value={type} onChange={event => selectType(event.target.value)}>
            {selectableTypes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </Field>
        {type !== LETTER_TYPE.CUSTOM && <Field label="Subkategori Surat" required>
          <select value={purpose} onChange={event => setPurpose(event.target.value)}>
            {getLetterPurposeOptions(type).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </Field>}
        {type === LETTER_TYPE.CUSTOM && <Field label="Nama Surat" required hint="Tuliskan nama surat yang Anda perlukan.">
          <input value={customName} onChange={event => setCustomName(event.target.value)} placeholder="Contoh: Surat Keterangan Pelaksanaan Uji Lapangan" />
        </Field>}
        <div className="ris-align-right"><Button tone="green" onClick={submit}>Kirim Permintaan</Button></div>
      </section>
    </div>
  );
}

RequestForm.propTypes = { researchId: PropTypes.string.isRequired };

const fieldControl = (field, value, onChange) => {
  const common = { value: value === undefined || value === null ? '' : value, onChange: event => onChange(field.key, event.target.value), placeholder: field.placeholder || '' };
  if (field.type === 'textarea') return <textarea {...common} rows="4" />;
  if (field.type === 'select') return <select {...common}><option value="">Pilih</option>{(field.options || []).map(option => <option key={String(option.value || option)} value={option.value || option}>{option.label || option}</option>)}</select>;
  return <input {...common} type={field.type || 'text'} />;
};

function ApplicantDataForm({ letterId }) {
  const { data, setData, user } = useRis();
  const history = useHistory();
  const letter = (data.letterRequests || []).find(item => item.id === letterId);
  const [values, setValues] = React.useState(() => ({ ...((letter && letter.form) || {}) }));
  const [errors, setErrors] = React.useState([]);

  if (!letter) return <div className="ris-page"><h1>Pengajuan surat tidak ditemukan</h1><Button tone="gray" onClick={() => history.push('/ris/pengajuan-surat')}>Kembali</Button></div>;
  const editable = canEditLetter(letter, user);
  const meta = letterStatusMeta(letter);

  const submit = () => {
    const candidate = { ...letter, form: values };
    const validation = validateLetterApplicantData(candidate);
    if (validation.length) {
      setErrors(validation);
      return;
    }
    const now = new Date().toISOString();
    setData(current => ({
      ...current,
      letterRequests: (current.letterRequests || []).map(item => {
        if (item.id !== letter.id) return item;
        const transitioned = transitionLetterStatus({ ...item, form: values }, LETTER_STATUS.DATA_SUBMITTED, { dataSubmittedAt: now });
        return transitioned ? updateLetterHistory(transitioned, LETTER_STATUS.DATA_SUBMITTED, 'Data surat telah dilengkapi dan dikirim untuk verifikasi final.', user) : item;
      }),
    }));
    history.push(`/ris/pengajuan-surat/${letter.id}/detail`);
  };

  return (
    <div className="ris-page ris-workspace-page ris-letter-data-page">
      <PageBack onClick={() => history.push('/ris/pengajuan-surat')} />
      <div className="ris-page-heading"><div><h1>Lengkapi Data Surat</h1><p>{getLetterResearchTitle(letter, data)}</p></div><StatusBadge tone={meta.tone}>{meta.label}</StatusBadge></div>
      {errors.length > 0 && <div className="ris-alert ris-alert-error"><strong>Data belum lengkap</strong>{errors.map(message => <span key={message}>{message}</span>)}</div>}
      <div className="ris-letter-data-layout">
        <section className="ris-form-card">
          <div className="ris-form-section-heading"><h2>Data Otomatis</h2><p>Informasi ini bersumber dari profil dan penelitian yang telah didanai.</p></div>
          <dl className="ris-info-list ris-letter-autofill-list">
            {Object.entries(letter.autoFill || {}).map(([key, value]) => <div key={key}><dt>{({ applicantName: 'Nama', applicantIdentifier: 'NIDN/NIP', applicantEmail: 'Email', studyProgram: 'Program Studi', faculty: 'Fakultas', researchTitle: 'Judul Penelitian', researchYear: 'Tahun', researchScheme: 'Skema', researchRole: 'Peran' })[key] || key}</dt><dd>{value || '-'}</dd></div>)}
          </dl>
        </section>
        <section className="ris-form-card">
          <div className="ris-form-section-heading"><h2>Data Tambahan</h2><p>Field berikut disiapkan oleh admin sesuai kebutuhan surat.</p></div>
          {(letter.templateFields || []).map(field => <Field key={field.id || field.key} label={field.label} required={field.required} hint={field.helpText || ''} alignStart={field.type === 'textarea'}>{fieldControl(field, values[field.key], (key, value) => setValues(current => ({ ...current, [key]: value })))}</Field>)}
          {(!letter.templateFields || letter.templateFields.length === 0) && <div className="ris-empty-state">Admin belum menambahkan field tambahan.</div>}
        </section>
      </div>
      <section className="ris-form-card ris-letter-live-preview"><div className="ris-form-section-heading"><h2>Pratinjau Isi</h2><p>Versi sementara dalam format teks sampai generator PDF diaktifkan.</p></div><pre className="ris-letter-preview-text">{renderLetterPlainText({ ...letter, form: values })}</pre></section>
      <div className="ris-bottom-bar"><div>Data hanya dikirim saat tombol submit ditekan.</div><div><Button tone="gray" onClick={() => history.push('/ris/pengajuan-surat')}>Batal</Button>{editable && <Button tone="green" onClick={submit}>Submit Data</Button>}</div></div>
    </div>
  );
}

ApplicantDataForm.propTypes = { letterId: PropTypes.string.isRequired };

export default function LetterWizardPage({ match }) {
  if (match.params.researchId) return <RequestForm researchId={match.params.researchId} />;
  return <ApplicantDataForm letterId={match.params.letterId} />;
}

LetterWizardPage.propTypes = { match: PropTypes.object.isRequired };
