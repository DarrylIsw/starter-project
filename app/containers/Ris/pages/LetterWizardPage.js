/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { useHistory } from 'react-router-dom';
import { useRis } from '../RisContext';
import {
  Button, EmptyRow, Field, FileDrop, PageBack
} from '../components/Ui';
import { fileMeta, uid } from '../data';
import {
  FILE_TYPES,
  LETTER_STATUS,
  LETTER_TYPES,
  canEditLetter,
  canSubmitLetter,
  createLetterDraft,
  fileTypeLabel,
  getLetterPurposeMeta,
  getLetterPurposeOptions,
  getLetterTitle,
  getRelatedResearchOptions,
  getRequiredAttachmentSummary,
  isCollaborationPurpose,
  isGrantPurpose,
  isPublicationPurpose,
  isResearchPurpose,
  letterStatusMeta,
  requiredAttachmentTypes,
  renderLetterPlainText,
  runLetterPrecheck,
  toDbLetterSnapshot,
  updateLetterHistory,
} from '../letterWorkflow';

const stepLabels = ['Jenis Surat', 'Data Surat', 'Lampiran', 'Preview'];
const textAreaProps = { rows: 3 };

function Stepper({ step }) {
  return (
    <div className="ris-stepper ris-letter-stepper">
      {stepLabels.map((label, index) => (
        <div key={label} className={`${step === index + 1 ? 'active' : ''} ${step > index + 1 ? 'done' : ''}`}>
          <span>{index + 1}</span>
          <small>{label}</small>
        </div>
      ))}
    </div>
  );
}

Stepper.propTypes = { step: PropTypes.number.isRequired };

function PreviewRows({ letter }) {
  const form = letter.form || {};
  const typeMeta = LETTER_TYPES.find(item => item.value === letter.type) || {};
  const purpose = getLetterPurposeMeta(letter.type, letter.purpose);
  const rows = [
    ['Jenis Surat', typeMeta.label],
    ['Kepentingan', purpose.label],
    ['Status', letterStatusMeta(letter).label],
    ['Judul/Kegiatan', getLetterTitle(letter)],
    ['Pemohon', letter.applicant ? letter.applicant.name : '-'],
    ['NIK/NIDN/NIM', letter.applicant ? letter.applicant.identifier : '-'],
    ['Program Studi', letter.applicant ? letter.applicant.program : '-'],
    ['Fakultas', letter.applicant ? letter.applicant.faculty : '-'],
  ];
  const dynamicRows = Object.keys(form).filter(key => form[key]).map(key => [key, form[key]]);
  return (
    <dl>
      {[...rows, ...dynamicRows].map(([label, value]) => (
        <div className="ris-preview-row" key={label}>
          <dt>{label}</dt>
          <dd>{String(value || '-')}</dd>
        </div>
      ))}
    </dl>
  );
}

PreviewRows.propTypes = { letter: PropTypes.object.isRequired };

export default function LetterWizardPage({ match }) {
  const { data, setData, user } = useRis();
  const history = useHistory();
  const [step, setStep] = React.useState(1);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [optionalType, setOptionalType] = React.useState('supporting_document');
  const { letterId, letterType } = match.params;
  const letter = (data.letterRequests || []).find(item => item.id === letterId);

  React.useEffect(() => {
    if (!letterType) return;
    const draft = createLetterDraft(letterType, user, data, uid);
    setData(current => ({
      ...current,
      letterRequests: [...(current.letterRequests || []), draft],
      notifications: [...(current.notifications || []), {
        id: uid('notif'), userId: user.id, entityType: 'letter_request', entityId: draft.id, type: 'draft_created', message: `Draft ${draft.id} berhasil dibuat.`, isRead: false, createdAt: new Date().toISOString(),
      }],
    }));
    history.replace(`/ris/pengajuan-surat/${draft.id}/edit`);
  }, []);

  if (letterType) {
    return <div className="ris-page"><h1>Membuat draft surat...</h1></div>;
  }

  if (!letter) {
    return <div className="ris-page"><h1>Surat tidak ditemukan</h1><Button tone="gray" onClick={() => history.push('/ris/pengajuan-surat')}>Kembali</Button></div>;
  }

  const editable = canEditLetter(letter, user);
  const form = letter.form || {};
  const requiredFiles = requiredAttachmentTypes(letter);
  const relatedResearchOptions = getRelatedResearchOptions(data, user);
  const previousClearances = (data.previousEthicsClearances || []).filter(item => item.userId === letter.userId);

  const saveLetter = updater => {
    setData(current => ({
      ...current,
      letterRequests: (current.letterRequests || []).map(item => {
        if (item.id !== letter.id) return item;
        const next = typeof updater === 'function' ? updater(item) : { ...item, ...updater };
        return { ...next, updatedAt: new Date().toISOString() };
      }),
    }));
  };

  const updateField = (name, value) => saveLetter(current => ({
    ...current,
    form: { ...(current.form || {}), [name]: value },
  }));

  const updateRoot = (name, value) => saveLetter(current => ({
    ...current,
    [name]: value,
    form: name === 'purpose' ? {} : current.form,
    attachments: name === 'purpose' ? [] : current.attachments,
  }));

  const attachFile = (fileType, file) => {
    if (!file) return;
    const meta = fileMeta(file);
    saveLetter(current => ({
      ...current,
      attachments: [
        ...(current.attachments || []).filter(item => item.fileType !== fileType),
        {
          ...meta,
          fileType,
          category: fileType,
          fileName: meta.name,
          fileSize: meta.size,
          uploadedAt: new Date().toISOString(),
        },
      ],
    }));
  };

  const removeFile = fileId => saveLetter(current => ({
    ...current,
    attachments: (current.attachments || []).filter(item => item.id !== fileId),
  }));

  const selectClearance = value => {
    const found = previousClearances.find(item => item.id === value);
    saveLetter(current => ({
      ...current,
      form: {
        ...(current.form || {}),
        previousClearanceId: value,
        previousClearanceNumber: found ? found.number : '',
        expiryDate: found ? found.expiryDate : '',
      },
    }));
  };

  const submitLetter = () => {
    setError('');
    setSuccess('');
    if (!canSubmitLetter(letter, user)) {
      setError('Status surat ini tidak dapat disubmit ulang.');
      return;
    }
    const precheck = runLetterPrecheck(letter, data);
    const nextStatus = precheck.passed ? LETTER_STATUS.PRECHECKED : LETTER_STATUS.DRAFT_REVISION;
    const nextNote = precheck.passed ? 'Precheck sistem berhasil. Pengajuan masuk queue admin.' : 'Precheck sistem gagal. User perlu memperbaiki draft.';
    const now = new Date().toISOString();
    const nextPrecheck = {
      id: uid('precheck'),
      letterId: letter.id,
      status: precheck.passed ? 'passed' : 'failed',
      errors: precheck.errors,
      checkedAt: now,
      checkedBy: 'system',
    };
    saveLetter(current => updateLetterHistory({
      ...current,
      status: nextStatus,
      submittedAt: current.submittedAt || now,
      prechecks: [...(current.prechecks || []), nextPrecheck],
    }, nextStatus, nextNote, user));
    setSuccess(precheck.passed ? 'Pengajuan lolos precheck dan masuk queue admin.' : 'Precheck gagal. Lihat daftar error dan perbaiki data.');
    if (precheck.passed) history.push(`/ris/pengajuan-surat/${letter.id}/detail`);
  };

  const goNext = () => {
    setError('');
    if (step === 1 && !letter.purpose) {
      setError('Pilih kepentingan surat terlebih dahulu.');
      return;
    }
    setStep(value => Math.min(value + 1, 4));
  };

  const input = (label, name, required, type = 'text', props = {}) => (
    <Field label={label} required={required}>
      <input type={type} value={form[name] || ''} onChange={event => updateField(name, event.target.value)} disabled={!editable} {...props} />
    </Field>
  );

  const textarea = (label, name, required) => (
    <Field label={label} required={required} alignStart>
      <textarea value={form[name] || ''} onChange={event => updateField(name, event.target.value)} disabled={!editable} {...textAreaProps} />
    </Field>
  );

  const select = (label, name, options, required) => (
    <Field label={label} required={required}>
      <select value={form[name] || ''} onChange={event => updateField(name, event.target.value)} disabled={!editable}>
        <option value="">Pilih</option>
        {options.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}
      </select>
    </Field>
  );

  const relatedResearchSelect = () => (
    <Field label="Kaitkan dengan Penelitian" required={false}>
      <select value={letter.researchId || form.relatedResearchId || ''} onChange={event => saveLetter(current => ({ ...current, researchId: event.target.value, form: { ...(current.form || {}), relatedResearchId: event.target.value } }))} disabled={!editable}>
        <option value="">Tidak dikaitkan</option>
        {relatedResearchOptions.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}
      </select>
    </Field>
  );

  const renderResearchFields = () => (
    <>
      {input('Judul Penelitian', 'researchTitle', true)}
      {input('Tahun Penelitian', 'researchYear', true, 'number')}
      {input('Durasi Penelitian', 'researchDuration', true, 'text', { placeholder: 'Contoh: Januari - Desember 2026' })}
      {input('Lokasi Penelitian', 'researchLocation', true)}
      {input('Peran dalam Penelitian', 'researchRole', true, 'text', { placeholder: 'Ketua / Anggota / Narasumber' })}
      {textarea('Tim Penelitian', 'researchTeam', true)}
      {isCollaborationPurpose(letter.purpose) && input('Nama Mitra', 'partnerName', true)}
      {isCollaborationPurpose(letter.purpose) && input('Institusi Mitra', 'partnerInstitution', true)}
      {letter.purpose === 'international_university_collaboration' && input('Negara Mitra', 'partnerCountry', true)}
      {isGrantPurpose(letter.purpose) && input('Nama Program Hibah', 'programName', true)}
      {isGrantPurpose(letter.purpose) && input('URL Program Hibah', 'programUrl', false, 'url')}
      {isGrantPurpose(letter.purpose) && input('Skema Penelitian', 'researchScheme', true)}
      {letter.purpose === 'industry_research' && input('Nama Mitra Industri', 'partnerName', true)}
      {letter.purpose === 'industry_research' && select('Asal Mitra', 'partnerOrigin', [{ value: 'local', label: 'Lokal' }, { value: 'national', label: 'Nasional' }, { value: 'international', label: 'Internasional' }], true)}
      {letter.purpose === 'industry_research' && select('Skala Mitra', 'partnerScale', [{ value: 'umkm', label: 'UMKM' }, { value: 'enterprise', label: 'Enterprise' }, { value: 'government', label: 'Pemerintah' }], true)}
    </>
  );

  const renderPublicationFields = () => (
    <>
      {input('Judul Publikasi', 'title', true)}
      {input('Nama Jurnal / Prosiding / Penerbit', 'publicationName', true)}
      {select('Kategori', 'category', [{ value: 'nasional', label: 'Nasional' }, { value: 'internasional', label: 'Internasional' }, { value: 'terakreditasi', label: 'Terakreditasi' }], true)}
      {input('Indexing / ISBN / ISSN', 'indexing', false)}
      {input('URL Publikasi / Submission', 'url', false, 'url')}
      {select('Peran Publikasi', 'publicationRole', [{ value: 'author', label: 'Author' }, { value: 'co_author', label: 'Co-author' }, { value: 'corresponding_author', label: 'Corresponding Author' }], true)}
      {input('Posisi Penulis', 'authorPosition', false, 'text', { placeholder: 'Contoh: Penulis pertama' })}
      {select('Status Publikasi', 'publicationStatus', [{ value: 'draft', label: 'Draft' }, { value: 'submitted', label: 'Submitted' }, { value: 'accepted', label: 'Accepted' }, { value: 'published', label: 'Published' }], true)}
    </>
  );

  const renderEventFields = () => (
    <>
      {input('Nama Seminar', 'eventName', true)}
      {select('Kategori Seminar', 'eventCategory', [{ value: 'nasional', label: 'Nasional' }, { value: 'internasional', label: 'Internasional' }], true)}
      {input('Lokasi Seminar', 'eventLocation', true)}
      {input('Penyelenggara', 'eventOrganizer', true)}
      {input('Peran', 'role', true, 'text', { placeholder: 'Pemakalah / Peserta / Narasumber' })}
    </>
  );

  const renderArtworkFields = () => (
    <>
      {select('Jenis Karya', 'outputType', [{ value: 'artwork', label: 'Karya Seni' }, { value: 'design', label: 'Desain' }, { value: 'prototype', label: 'Prototipe Kreatif' }], true)}
      {input('Judul Karya', 'title', true)}
      {input('Lokasi/Publikasi Karya', 'location', true)}
      {input('Penyelenggara', 'organizer', true)}
    </>
  );

  const renderDataFields = () => {
    if (letter.type === 'research_assignment' && isResearchPurpose(letter.purpose)) return renderResearchFields();
    if (letter.type === 'research_assignment' && isPublicationPurpose(letter.purpose)) return renderPublicationFields();
    if (letter.type === 'research_assignment' && letter.purpose === 'scientific_seminar') return renderEventFields();
    if (letter.type === 'research_assignment' && letter.purpose === 'artwork') return renderArtworkFields();
    if (letter.type === 'support') {
      return (
        <>
          {relatedResearchSelect()}
          {input('Nama Penerima Surat', 'recipientName', true)}
          {input('Jabatan Penerima', 'recipientPosition', true)}
          {input('Tanggal/Waktu Kegiatan', 'eventDatetime', true, 'datetime-local')}
          {input('Nama Kegiatan', 'activityName', true)}
          {textarea('Tujuan Kegiatan', 'activityPurpose', true)}
        </>
      );
    }
    if (letter.type === 'ethics') {
      return (
        <>
          {input('Judul Riset', 'researchTitle', true)}
          {input('Tanggal Mulai Riset', 'researchStartDate', true, 'date')}
          {letter.purpose === 'extension' && (
            <Field label="Klirens Sebelumnya" required>
              <select value={form.previousClearanceId || ''} onChange={event => selectClearance(event.target.value)} disabled={!editable}>
                <option value="">Pilih klirens sebelumnya</option>
                {previousClearances.map(item => <option value={item.id} key={item.id}>{item.number} - {item.researchTitle}</option>)}
              </select>
            </Field>
          )}
          {letter.purpose === 'extension' && input('Nomor Klirens Sebelumnya', 'previousClearanceNumber', true)}
          {letter.purpose === 'extension' && input('Tanggal Kedaluwarsa', 'expiryDate', true, 'date')}
        </>
      );
    }
    if (letter.type === 'travel') {
      return (
        <>
          {relatedResearchSelect()}
          {input('Nama Kegiatan', 'activityName', true)}
          {input('Tujuan Perjalanan', 'travelDestination', true)}
          {input('Tanggal Berangkat', 'departureDate', true, 'date')}
          {input('Tanggal Kembali', 'returnDate', true, 'date')}
          {select('Moda Transportasi', 'transportMode', [{ value: 'airplane', label: 'Pesawat' }, { value: 'train', label: 'Kereta' }, { value: 'car', label: 'Mobil' }, { value: 'other', label: 'Lainnya' }], true)}
          {textarea('Tujuan Perjalanan', 'activityPurpose', true)}
          {input('Sumber Dana', 'fundingSource', false)}
        </>
      );
    }
    return <div className="ris-empty-state">Pilih jenis surat dan kepentingan terlebih dahulu.</div>;
  };

  const errors = letter.prechecks && letter.prechecks.length ? [...letter.prechecks].reverse().find(item => item.status === 'failed') : null;

  return (
    <div className="ris-page ris-page-narrow ris-workspace-page ris-letter-wizard-page">
      <PageBack onClick={() => history.push('/ris/pengajuan-surat')} />
      <div className="ris-page-heading">
        <div>
          <h1>Form Pengajuan Surat</h1>
          <p>{getLetterTitle(letter)}</p>
        </div>
        <span className={`ris-badge ${letterStatusMeta(letter).tone}`}>{letterStatusMeta(letter).label}</span>
      </div>

      <Stepper step={step} />
      {error && <div className="ris-alert ris-alert-error">{error}</div>}
      {success && <div className="ris-alert ris-alert-success">{success}</div>}
      {errors && errors.errors && errors.errors.length > 0 && (
        <div className="ris-alert ris-alert-error">
          <strong>Catatan precheck terakhir:</strong>
          {errors.errors.map(item => <span key={`${item.field}-${item.message}`}>• {item.message}</span>)}
        </div>
      )}
      {!editable && <div className="ris-alert ris-alert-success">Pengajuan ini sudah masuk proses. Data hanya dapat dilihat, tidak dapat diedit.</div>}

      {step === 1 && (
        <section className="ris-form-section">
          <h2>Jenis Surat dan Kepentingan</h2>
          <div className="ris-form-card">
            <Field label="Jenis Surat" required>
              <select value={letter.type} onChange={event => saveLetter(current => ({ ...current, type: event.target.value, purpose: (getLetterPurposeOptions(event.target.value)[0] || {}).value || '', form: {}, attachments: [] }))} disabled={!editable}>
                {LETTER_TYPES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </Field>
            <Field label="Kepentingan Surat" required>
              <select value={letter.purpose || ''} onChange={event => updateRoot('purpose', event.target.value)} disabled={!editable}>
                {getLetterPurposeOptions(letter.type).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </Field>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="ris-form-section">
          <h2>Data Surat Dinamis</h2>
          <p className="ris-muted">Field berubah sesuai jenis surat dan kepentingan yang dipilih.</p>
          <div className="ris-form-card">{renderDataFields()}</div>
        </section>
      )}

      {step === 3 && (
        <section className="ris-form-section">
          <h2>Lampiran</h2>
          <div className="ris-alert ris-alert-success"><strong>Lampiran wajib</strong><span>{getRequiredAttachmentSummary(letter)}</span></div>
          {requiredFiles.map(fileType => {
            const file = (letter.attachments || []).find(item => item.fileType === fileType);
            return (
              <div className="ris-form-card" key={fileType}>
                <div className="ris-card-heading"><h3>{fileTypeLabel(fileType)}</h3>{file && editable && <button type="button" className="ris-action red" onClick={() => removeFile(file.id)}>Hapus</button>}</div>
                <FileDrop file={file || null} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onFile={selected => attachFile(fileType, selected)} label={`Upload ${fileTypeLabel(fileType)}`} />
              </div>
            );
          })}
          <div className="ris-form-card">
            <h3>Lampiran Tambahan</h3>
            <Field label="Jenis File" required={false}>
              <select value={optionalType} onChange={event => setOptionalType(event.target.value)} disabled={!editable}>
                {FILE_TYPES.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}
              </select>
            </Field>
            <FileDrop accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onFile={selected => attachFile(optionalType, selected)} label="Upload lampiran tambahan" />
          </div>
          <div className="ris-table-wrap">
            <table className="ris-table">
              <thead><tr><th>No.</th><th>Jenis File</th><th>Nama File</th><th>Ukuran</th><th>Aksi</th></tr></thead>
              <tbody>
                {(letter.attachments || []).map((file, index) => (
                  <tr key={file.id}>
                    <td>{index + 1}.</td>
                    <td>{fileTypeLabel(file.fileType)}</td>
                    <td>{file.name}</td>
                    <td>{file.size ? `${(file.size / 1048576).toFixed(2)} MB` : '-'}</td>
                    <td>{editable && <button type="button" className="ris-action red" onClick={() => removeFile(file.id)}>Hapus</button>}</td>
                  </tr>
                ))}
                {(!letter.attachments || letter.attachments.length === 0) && <EmptyRow colSpan={5}>Belum ada lampiran.</EmptyRow>}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="ris-form-section">
          <h2>Preview Pengajuan</h2>
          <div className="ris-form-card ris-preview">
            <section>
              <h2>Identitas dan Data Surat</h2>
              <PreviewRows letter={letter} />
            </section>
            <section>
              <h2>Preview Surat</h2>
              <pre className="ris-letter-preview-text">{renderLetterPlainText(letter)}</pre>
            </section>
            <section>
              <h2>Snapshot Database</h2>
              <pre className="ris-db-preview">{JSON.stringify(toDbLetterSnapshot(letter), null, 2)}</pre>
            </section>
          </div>
        </section>
      )}

      <div className="ris-bottom-bar">
        <div>Data tersimpan otomatis di localStorage demo. Integrasi API nanti tinggal mengganti operasi di `RisContext`/service.</div>
        <div>
          <Button tone="gray" disabled={step === 1} onClick={() => setStep(value => Math.max(value - 1, 1))}>Sebelumnya</Button>
          {step < 4 && <Button tone="blue" onClick={goNext}>Selanjutnya</Button>}
          {step === 4 && editable && <Button tone="green" onClick={submitLetter}>Submit Pengajuan</Button>}
        </div>
      </div>
    </div>
  );
}

LetterWizardPage.propTypes = { match: PropTypes.object.isRequired };
