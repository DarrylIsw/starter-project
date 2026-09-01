/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, react/prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { useHistory } from 'react-router-dom';
import { useRis } from '../RisContext';
import {
  Button, EmptyRow, Field, PageBack, StatusBadge
} from '../components/Ui';
import { formatDate, uid } from '../data';
import {
  LETTER_FORM_FIELD_TYPES,
  LETTER_STATUS,
  canConfigureLetterForm,
  canDownloadFinalLetter,
  canEditLetter,
  canGenerateLetter,
  createLetterFieldKey,
  generateLetterNumber,
  getDefaultLetterTemplate,
  getLetterPurposeMeta,
  getLetterResearchTitle,
  getLetterTypeMeta,
  letterStatusMeta,
  renderLetterPlainText,
  transitionLetterStatus,
  updateLetterHistory,
  validateLetterTemplateFields,
} from '../letterWorkflow';

const AUTO_FILL_LABELS = {
  applicantName: 'Nama Pemohon', applicantIdentifier: 'NIDN/NIP', applicantEmail: 'Email', studyProgram: 'Program Studi', faculty: 'Fakultas', researchTitle: 'Judul Penelitian', researchYear: 'Tahun Penelitian', researchScheme: 'Skema Penelitian', researchRole: 'Peran Penelitian'
};

function InfoRows({ rows }) {
  return <dl className="ris-info-list">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value === undefined || value === null || value === '' ? '-' : String(value)}</dd></div>)}</dl>;
}

InfoRows.propTypes = { rows: PropTypes.array.isRequired };

const normalizeBuilderFields = fields => (fields || []).map(field => ({
  ...field,
  optionsText: field.optionsText !== undefined ? field.optionsText : (field.options || []).map(option => option.label || option.value || option).join('\n'),
}));

const publishedFields = fields => fields.map(field => ({
  id: field.id,
  key: field.key,
  label: String(field.label || '').trim(),
  type: field.type,
  required: Boolean(field.required),
  placeholder: String(field.placeholder || '').trim(),
  helpText: String(field.helpText || '').trim(),
  options: field.type === 'select' ? String(field.optionsText || '').split('\n').map(value => value.trim()).filter(Boolean) : [],
}));

const downloadFinal = letter => {
  const content = letter.generated && letter.generated.content ? letter.generated.content : renderLetterPlainText(letter);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = (letter.generated && letter.generated.fileName) || `${letter.id}.txt`;
  link.click();
  URL.revokeObjectURL(url);
};

export default function LetterDetailPage({ match, mode }) {
  const { data, setData, user } = useRis();
  const history = useHistory();
  const letter = (data.letterRequests || []).find(item => item.id === match.params.letterId);
  const initialTemplate = letter && letter.template ? letter.template : (letter ? getDefaultLetterTemplate(letter) : { name: '', content: '' });
  const [templateName, setTemplateName] = React.useState(initialTemplate.name || '');
  const [templateContent, setTemplateContent] = React.useState(initialTemplate.content || '');
  const [fields, setFields] = React.useState(() => normalizeBuilderFields((letter && letter.templateFields) || []));
  const [notes, setNotes] = React.useState('');
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  React.useEffect(() => {
    if (!letter || letter.status !== LETTER_STATUS.FORM_DESIGN) return;
    const template = letter.template || getDefaultLetterTemplate(letter);
    setTemplateName(template.name || '');
    setTemplateContent(template.content || '');
    setFields(normalizeBuilderFields(letter.templateFields || []));
  }, [letter && letter.id, letter && letter.status]);

  if (!letter) return <div className="ris-page"><h1>Surat tidak ditemukan</h1><Button tone="gray" onClick={() => history.push('/ris/pengajuan-surat')}>Kembali</Button></div>;

  const meta = letterStatusMeta(letter);
  const type = getLetterTypeMeta(letter.type);
  const purpose = letter.customName || getLetterPurposeMeta(letter.type, letter.purpose).label;
  const applicant = letter.applicant || {};

  const changeStatus = (nextStatus, changes, note) => {
    setData(current => ({
      ...current,
      letterRequests: (current.letterRequests || []).map(item => {
        if (item.id !== letter.id) return item;
        const transitioned = transitionLetterStatus(item, nextStatus, changes);
        return transitioned ? updateLetterHistory(transitioned, nextStatus, note, user) : item;
      }),
    }));
  };

  const addReview = (decision, reviewNotes) => ({
    reviews: [...(letter.reviews || []), { id: uid('letter-review'), letterId: letter.id, reviewerId: user.id, decision, notes: reviewNotes, reviewedAt: new Date().toISOString() }],
  });

  const acceptRequest = () => {
    const template = letter.template || getDefaultLetterTemplate(letter);
    changeStatus(LETTER_STATUS.FORM_DESIGN, { template, acceptedAt: new Date().toISOString(), acceptedBy: user.id, ...addReview('accepted', notes || 'Permintaan surat diterima.') }, notes || 'Permintaan diterima. Admin menyiapkan template dan kebutuhan data.');
    setSuccess('Permintaan diterima. Form builder siap digunakan.');
  };

  const rejectRequest = () => {
    const reviewNotes = notes.trim() || 'Permintaan surat ditolak oleh pengelola.';
    changeStatus(LETTER_STATUS.REJECTED, addReview('rejected', reviewNotes), reviewNotes);
    setSuccess('Permintaan surat ditolak.');
  };

  const addField = () => {
    const key = createLetterFieldKey('field', fields);
    setFields(current => [...current, { id: uid('letter-field'), key, label: '', type: 'text', required: true, placeholder: '', helpText: '', optionsText: '' }]);
  };

  const updateField = (fieldId, patch) => setFields(current => current.map(field => {
    if (field.id !== fieldId) return field;
    const next = { ...field, ...patch };
    if (Object.prototype.hasOwnProperty.call(patch, 'label')) next.key = createLetterFieldKey(patch.label, current.filter(item => item.id !== fieldId));
    return next;
  }));

  const publishForm = () => {
    const configuredFields = publishedFields(fields);
    const validation = [
      ...(!templateName.trim() ? ['Nama template wajib diisi.'] : []),
      ...(!templateContent.trim() ? ['Isi template wajib diisi.'] : []),
      ...(configuredFields.length === 0 ? ['Tambahkan minimal satu field untuk diisi lecturer.'] : []),
      ...validateLetterTemplateFields(configuredFields),
    ];
    if (validation.length) {
      setError(validation.join(' '));
      return;
    }
    setError('');
    changeStatus(LETTER_STATUS.DATA_REQUIRED, {
      template: { name: templateName.trim(), content: templateContent },
      templateFields: configuredFields,
      configuredAt: new Date().toISOString(),
      configuredBy: user.id,
    }, 'Template dan kebutuhan data telah diterbitkan untuk dilengkapi lecturer.');
    setSuccess('Form berhasil dikirim ke lecturer.');
  };

  const requestRevision = () => {
    const reviewNotes = notes.trim() || 'Data perlu diperbaiki sebelum surat dapat diterbitkan.';
    changeStatus(LETTER_STATUS.REVISION_REQUIRED, addReview('revision', reviewNotes), reviewNotes);
    setSuccess('Permintaan perbaikan dikirim ke lecturer.');
  };

  const issueLetter = () => {
    const sequence = data.letterSequence || 1;
    const letterNumber = generateLetterNumber(letter, sequence);
    const now = new Date().toISOString();
    setData(current => ({
      ...current,
      letterSequence: sequence + 1,
      letterRequests: (current.letterRequests || []).map(item => {
        if (item.id !== letter.id) return item;
        const generatedMeta = { letterNumber, fileName: `${letterNumber.replace(/\//g, '-')}.txt`, fileUrl: `archive://${item.id}`, generatedAt: now };
        const generated = transitionLetterStatus(item, LETTER_STATUS.GENERATED, {
          generated: { ...generatedMeta, content: renderLetterPlainText({ ...item, generated: generatedMeta }) },
          reviews: [...(item.reviews || []), { id: uid('letter-review'), letterId: item.id, reviewerId: user.id, decision: 'generated', notes: notes.trim() || 'Data telah diverifikasi dan surat diterbitkan.', reviewedAt: now }],
        });
        return generated ? updateLetterHistory(generated, LETTER_STATUS.GENERATED, 'Data diverifikasi dan surat final diterbitkan.', user) : item;
      }),
    }));
    setSuccess('Surat final berhasil diterbitkan dan tersedia untuk lecturer.');
  };

  return (
    <div className="ris-page ris-workspace-page ris-letter-detail-page">
      <PageBack onClick={() => history.push('/ris/pengajuan-surat')} />
      <div className="ris-page-heading"><div><h1>{mode === 'admin' ? 'Proses Pengajuan Surat' : 'Detail Pengajuan Surat'}</h1><p>{getLetterResearchTitle(letter, data)}</p></div><StatusBadge tone={meta.tone}>{meta.label}</StatusBadge></div>
      {error && <div className="ris-alert ris-alert-error">{error}</div>}
      {success && <div className="ris-alert ris-alert-success">{success}</div>}

      <div className="ris-letter-overview-grid">
        <section className="ris-form-card"><h2>Permintaan Surat</h2><InfoRows rows={[['ID Pengajuan', letter.id], ['Jenis Surat', type.label], ['Subkategori / Nama Surat', purpose], ['Tanggal Pengajuan', formatDate(letter.submittedAt || letter.createdAt)]]} /></section>
        <section className="ris-form-card"><h2>Pemohon</h2><InfoRows rows={[['Nama', applicant.name], ['NIDN/NIP', applicant.identifier], ['Email', applicant.email], ['Program Studi', applicant.program], ['Fakultas', applicant.faculty]]} /></section>
      </div>

      <section className="ris-form-card ris-letter-autofill-card">
        <div className="ris-form-section-heading"><h2>Data Terisi Otomatis</h2><p>Data ini menjadi konteks dasar template dan tidak perlu diketik ulang oleh lecturer.</p></div>
        <InfoRows rows={Object.entries(letter.autoFill || {}).map(([key, value]) => [AUTO_FILL_LABELS[key] || key, value])} />
      </section>

      {mode === 'admin' && letter.status === LETTER_STATUS.SUBMITTED && <section className="ris-decision-box">
        <div className="ris-form-section-heading"><h2>Verifikasi Permintaan</h2><p>Terima permintaan untuk mulai menyusun template dan field, atau tolak dengan alasan yang jelas.</p></div>
        <Field label="Catatan Pengelola" alignStart><textarea rows="4" value={notes} onChange={event => setNotes(event.target.value)} placeholder="Catatan penerimaan atau alasan penolakan" /></Field>
        <div className="ris-align-right"><Button tone="red" onClick={rejectRequest}>Tolak Permintaan</Button><Button tone="green" onClick={acceptRequest}>Terima & Susun Form</Button></div>
      </section>}

      {mode === 'admin' && canConfigureLetterForm(letter, user) && <section className="ris-letter-builder">
        <div className="ris-form-section-heading"><h2>Template Surat</h2><p>Gunakan placeholder dalam kurung kurawal ganda. Data profil dan penelitian sudah tersedia otomatis.</p></div>
        <div className="ris-letter-placeholder-list">{Object.keys(letter.autoFill || {}).map(key => <code key={key}>{`{{${key}}}`}</code>)}<code>{'{{letterNumber}}'}</code><code>{'{{customFields}}'}</code></div>
        <div className="ris-form-card">
          <Field label="Nama Template" required><input value={templateName} onChange={event => setTemplateName(event.target.value)} /></Field>
          <Field label="Isi Template TXT" required alignStart><textarea rows="16" value={templateContent} onChange={event => setTemplateContent(event.target.value)} /></Field>
        </div>
        <div className="ris-form-section-heading ris-letter-builder-heading"><div><h2>Form untuk Lecturer</h2><p>Tambahkan field yang belum tersedia dari data otomatis.</p></div><Button tone="blue" onClick={addField}>Tambah Field</Button></div>
        <div className="ris-letter-builder-list">
          {fields.map((field, index) => <div className="ris-form-card ris-letter-builder-row" key={field.id}>
            <div className="ris-card-heading"><h3>Field {index + 1}</h3><button type="button" className="ris-action red" onClick={() => setFields(current => current.filter(item => item.id !== field.id))}>Hapus</button></div>
            <div className="ris-letter-builder-grid">
              <Field label="Nama Field" required><input value={field.label} onChange={event => updateField(field.id, { label: event.target.value })} placeholder="Contoh: Nama Instansi Tujuan" /></Field>
              <Field label="Tipe Input" required><select value={field.type} onChange={event => updateField(field.id, { type: event.target.value })}>{LETTER_FORM_FIELD_TYPES.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</select></Field>
              <Field label="Placeholder"><input value={field.placeholder} onChange={event => updateField(field.id, { placeholder: event.target.value })} /></Field>
              <Field label="Petunjuk"><input value={field.helpText} onChange={event => updateField(field.id, { helpText: event.target.value })} /></Field>
            </div>
            {field.type === 'select' && <Field label="Daftar Pilihan" required alignStart hint="Satu pilihan per baris."><textarea rows="4" value={field.optionsText} onChange={event => updateField(field.id, { optionsText: event.target.value })} /></Field>}
            <label className="ris-check-row"><input type="checkbox" checked={field.required} onChange={event => updateField(field.id, { required: event.target.checked })} /><span>Wajib diisi lecturer</span></label>
          </div>)}
          {fields.length === 0 && <div className="ris-empty-state">Belum ada field tambahan. Tambahkan minimal satu field.</div>}
        </div>
        <section className="ris-form-card ris-letter-live-preview"><h3>Pratinjau Template</h3><pre className="ris-letter-preview-text">{renderLetterPlainText({ ...letter, template: { name: templateName, content: templateContent }, templateFields: publishedFields(fields) })}</pre></section>
        <div className="ris-align-right"><Button tone="green" onClick={publishForm}>Kirim Form ke Lecturer</Button></div>
      </section>}

      {letter.template && <section className="ris-form-card ris-letter-template-summary">
        <div className="ris-form-section-heading"><h2>{letter.template.name}</h2><p>{(letter.templateFields || []).length} field tambahan disiapkan oleh pengelola.</p></div>
        <div className="ris-table-wrap"><table className="ris-table"><thead><tr><th>No.</th><th>Field</th><th>Tipe</th><th>Wajib</th><th>Data Lecturer</th></tr></thead><tbody>{(letter.templateFields || []).map((field, index) => <tr key={field.id || field.key}><td>{index + 1}.</td><td>{field.label}</td><td>{(LETTER_FORM_FIELD_TYPES.find(item => item.value === field.type) || {}).label || field.type}</td><td>{field.required ? 'Ya' : 'Tidak'}</td><td>{(letter.form || {})[field.key] || '-'}</td></tr>)}{(!letter.templateFields || letter.templateFields.length === 0) && <EmptyRow colSpan={5}>Belum ada field tambahan.</EmptyRow>}</tbody></table></div>
      </section>}

      {letter.template && <section className="ris-form-card ris-letter-live-preview"><div className="ris-form-section-heading"><h2>Pratinjau Surat</h2><p>Output sementara menggunakan TXT. Struktur ini siap diganti generator PDF pada backend.</p></div><pre className="ris-letter-preview-text">{letter.generated && letter.generated.content ? letter.generated.content : renderLetterPlainText(letter)}</pre></section>}

      {mode === 'admin' && canGenerateLetter(letter, user) && <section className="ris-decision-box">
        <div className="ris-form-section-heading"><h2>Verifikasi dan Penerbitan</h2><p>Periksa data lecturer pada tabel dan pratinjau sebelum menerbitkan surat.</p></div>
        <Field label="Catatan Verifikasi" alignStart><textarea rows="4" value={notes} onChange={event => setNotes(event.target.value)} placeholder="Catatan perbaikan atau finalisasi" /></Field>
        <div className="ris-align-right"><Button tone="amber" onClick={requestRevision}>Minta Perbaikan</Button><Button tone="red" onClick={rejectRequest}>Tolak</Button><Button tone="green" onClick={issueLetter}>Terbitkan Surat</Button></div>
      </section>}

      <section className="ris-form-card"><h2>Riwayat Proses</h2><div className="ris-timeline">{(letter.history || []).map(item => <div key={`${item.status}-${item.at}`}><b>{letterStatusMeta({ status: item.status }).label}</b><span>{formatDate(item.at)}</span><p>{item.note}</p></div>)}</div></section>

      <div className="ris-bottom-bar"><div>{letter.generated && letter.generated.letterNumber ? `Nomor surat: ${letter.generated.letterNumber}` : 'Surat belum diterbitkan.'}</div><div>{canEditLetter(letter, user) && <Button tone="orange" onClick={() => history.push(`/ris/pengajuan-surat/${letter.id}/edit`)}>Input Data</Button>}{canDownloadFinalLetter(letter, user) && <Button tone="green" onClick={() => downloadFinal(letter)}>Unduh Surat TXT</Button>}</div></div>
    </div>
  );
}

LetterDetailPage.propTypes = { match: PropTypes.object.isRequired, mode: PropTypes.string };
LetterDetailPage.defaultProps = { mode: 'detail' };
