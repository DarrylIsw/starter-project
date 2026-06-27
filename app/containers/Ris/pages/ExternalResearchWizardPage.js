/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useHistory } from 'react-router-dom';
import { useRis } from '../RisContext';
import { Field, Button, FileDrop, PageBack } from '../components/Ui';
import { SDGS, fileMeta, formatCurrency, uid } from '../data';
import {
  ACTIVITY_STATUS_OPTIONS,
  ACTIVITY_TYPE_OPTIONS,
  EXTERNAL_DOCUMENT_TYPES,
  EXTERNAL_STATUS,
  GRANT_TYPE_OPTIONS,
  INDEPENDENT_TYPE_OPTIONS,
  OUTPUT_TYPE_OPTIONS,
  RESEARCH_CATEGORY_OPTIONS,
  RIP_OPTIONS,
  ROLE_IN_RESEARCH_OPTIONS,
  canSubmitExternalReport,
  createExternalReportDraft,
  externalReportTitle,
  getDocumentTypeLabel,
  getRequiredDocumentTypes,
  makeExternalDocument,
  makeExternalOutput,
  toDbExternalResearchSnapshot,
  validateExternalReport,
} from '../externalResearchWorkflow';

const STEPS = ['Basic Information', 'Metadata', 'Research Type', 'Documents', 'Outputs', 'Review & Submit'];

const inputValue = value => (value === null || value === undefined ? '' : value);

export default function ExternalResearchWizardPage({ match }) {
  const { data, setData, user } = useRis();
  const history = useHistory();
  const createdRef = useRef(false);
  const reportId = match.params.reportId;
  const existing = reportId ? (data.externalResearchReports || []).find(item => item.id === reportId) : null;
  const [report, setReport] = useState(() => existing || createExternalReportDraft(user, uid));
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    if (!reportId && !createdRef.current) {
      createdRef.current = true;
      const draft = createExternalReportDraft(user, uid);
      setData(current => ({
        ...current,
        externalResearchReports: [...(current.externalResearchReports || []), draft],
      }));
      history.replace(`/ris/penelitian-eksternal/${draft.id}/edit`);
    }
  }, [history, reportId, setData, user]);

  useEffect(() => {
    if (existing) setReport(existing);
  }, [existing]);

  const validation = useMemo(() => validateExternalReport(report, data, user), [data, report, user]);
  const requiredDocuments = getRequiredDocumentTypes(report);

  const update = patch => {
    setReport(current => ({ ...current, ...patch, updatedAt: new Date().toISOString() }));
    setMessage('');
    setErrors([]);
  };
  const updateMeta = patch => update({ metadata: { ...(report.metadata || {}), ...patch } });
  const updateDetail = patch => update({ typeDetail: { ...(report.typeDetail || {}), ...patch } });

  const saveDraft = () => {
    setData(current => ({
      ...current,
      externalResearchReports: (current.externalResearchReports || []).map(item => (item.id === report.id ? { ...report, submissionStatus: report.submissionStatus || EXTERNAL_STATUS.DRAFT, updatedAt: new Date().toISOString() } : item)),
    }));
    setMessage('Draft laporan tersimpan di localStorage demo. Nanti bagian ini dapat diganti API external_research.');
  };

  const submitReport = () => {
    const result = validateExternalReport(report, data, user);
    if (!result.valid) {
      setErrors(result.errors);
      setMessage('');
      return;
    }
    if (!canSubmitExternalReport(report, user)) {
      setErrors([{ field: 'permission', message: 'Laporan ini tidak dapat disubmit oleh akun aktif atau statusnya sudah tidak dapat diedit.' }]);
      return;
    }
    const now = new Date().toISOString();
    const submitted = {
      ...report,
      submissionStatus: EXTERNAL_STATUS.SUBMITTED,
      submittedAt: now,
      updatedAt: now,
      history: [
        ...(report.history || []),
        { status: EXTERNAL_STATUS.SUBMITTED, note: 'Laporan disubmit dan masuk antrean review admin LPPM.', at: now, by: user.id },
      ],
    };
    setData(current => ({
      ...current,
      externalResearchReports: (current.externalResearchReports || []).map(item => (item.id === report.id ? submitted : item)),
      notifications: [
        ...(current.notifications || []),
        { id: uid('notif'), userId: 'user-admin', entityType: 'external_research', entityId: report.id, type: 'external_report_submitted', message: `Laporan eksternal ${report.researchTitle} menunggu review.`, createdAt: now, isRead: false },
      ],
    }));
    history.push(`/ris/penelitian-eksternal/${report.id}/detail`);
  };

  const addDocument = (fileType, file) => {
    if (!file) return;
    const doc = makeExternalDocument(uid, fileType, file, user);
    update({ documents: [...(report.documents || []).filter(item => item.fileType !== fileType), doc] });
  };

  const removeDocument = fileId => update({ documents: (report.documents || []).filter(item => item.id !== fileId) });
  const addOutput = () => update({ outputs: [...(report.outputs || []), makeExternalOutput(uid)] });
  const updateOutput = (outputId, patch) => update({ outputs: (report.outputs || []).map(item => (item.id === outputId ? { ...item, ...patch } : item)) });
  const removeOutput = outputId => update({ outputs: (report.outputs || []).filter(item => item.id !== outputId) });

  const attachOutputFile = (outputId, file) => {
    if (!file) return;
    updateOutput(outputId, { file: { ...fileMeta(file), fileUrl: file.name } });
  };

  const errorList = errors.length ? errors : [];

  if (!reportId) return <div className="ris-page"><h1>Membuat draft...</h1></div>;
  if (!existing) return <div className="ris-page"><PageBack onClick={() => history.push('/ris/penelitian-eksternal')} /><h1>Laporan tidak ditemukan</h1></div>;

  return (
    <div className="ris-page ris-page-narrow">
      <PageBack onClick={() => history.push('/ris/penelitian-eksternal')} />
      <div className="ris-page-heading">
        <div>
          <h1>{externalReportTitle(report)}</h1>
          <p>Wizard pelaporan: Basic Information, Metadata, Research Type, Documents, Outputs, dan Review & Submit.</p>
        </div>
        <div className="ris-heading-actions">
          <Button tone="gray" onClick={saveDraft}>Simpan Draft</Button>
        </div>
      </div>

      <div className="ris-stepper ris-external-stepper">
        {STEPS.map((label, index) => <div key={label} className={`${index === step ? 'active' : ''} ${index < step ? 'done' : ''}`}><span>{index + 1}</span><small>{label}</small></div>)}
      </div>

      {message && <div className="ris-alert ris-alert-success"><strong>Berhasil</strong><span>{message}</span></div>}
      {errorList.length > 0 && (
        <div className="ris-alert ris-alert-error">
          <strong>Validasi belum terpenuhi</strong>
          {errorList.slice(0, 8).map(item => <span key={`${item.field}-${item.message}`}>{item.message}</span>)}
          {errorList.length > 8 && <span>Dan {errorList.length - 8} error lainnya.</span>}
        </div>
      )}

      {step === 0 && (
        <section className="ris-form-section">
          <h2>Step 1 — Basic Information</h2>
          <Field label="Nama Aktivitas" required><input value={inputValue(report.activityName)} onChange={event => update({ activityName: event.target.value })} placeholder="Contoh: Hibah Riset Terapan Kemdikbud" /></Field>
          <Field label="Judul Penelitian" required><input value={inputValue(report.researchTitle)} onChange={event => update({ researchTitle: event.target.value })} placeholder="Judul penelitian eksternal/mandiri" /></Field>
          <Field label="Tahun Aktivitas" required><input type="number" min="2000" max="2100" value={inputValue(report.activityYear)} onChange={event => update({ activityYear: event.target.value })} /></Field>
          <Field label="Status Aktivitas" required><select value={report.activityStatus} onChange={event => update({ activityStatus: event.target.value })}>{ACTIVITY_STATUS_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
          <Field label="Tipe Aktivitas" required><select value={report.activityType} onChange={event => update({ activityType: event.target.value })}>{ACTIVITY_TYPE_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
          <Field label="Peran dalam Penelitian" required><select value={report.roleInResearch} onChange={event => update({ roleInResearch: event.target.value })}>{ROLE_IN_RESEARCH_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
          <Field label="Asal Penyelenggara/Mitra" required><input value={inputValue(report.organizerOrigin)} onChange={event => update({ organizerOrigin: event.target.value })} placeholder="Contoh: Kemdikbudristek / Industri / Universitas mitra" /></Field>
          <Field label="Sumber Pendanaan" required><input value={inputValue(report.fundingSource)} onChange={event => update({ fundingSource: event.target.value })} placeholder="Contoh: DRTPM, Industri, Mandiri" /></Field>
          <Field label="Nominal Pendanaan" required><input type="number" min="0" value={inputValue(report.fundingAmount)} onChange={event => update({ fundingAmount: event.target.value })} /></Field>
          <Field label="Mata Uang" required><select value={report.currency} onChange={event => update({ currency: event.target.value })}><option value="IDR">IDR</option><option value="USD">USD</option><option value="EUR">EUR</option></select></Field>
        </section>
      )}

      {step === 1 && (
        <section className="ris-form-section">
          <h2>Step 2 — Research Metadata</h2>
          <Field label="Relasi RIP" required><select value={inputValue(report.metadata.ripRelation)} onChange={event => updateMeta({ ripRelation: event.target.value })}><option value="">Pilih relasi RIP</option>{RIP_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
          <Field label="Target TKT" required><select value={inputValue(report.metadata.tktTarget)} onChange={event => updateMeta({ tktTarget: event.target.value })}>{Array.from({ length: 9 }).map((_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></Field>
          <Field label="Keterlibatan SDG"><label className="ris-toggle-line"><input type="checkbox" checked={Boolean(report.metadata.sdgInvolvement)} onChange={event => updateMeta({ sdgInvolvement: event.target.checked, sdgs: event.target.checked ? report.metadata.sdgs : [] })} /> <span>Penelitian terkait SDG</span></label></Field>
          {report.metadata.sdgInvolvement && (
            <Field label="Pilih SDG" required alignStart>
              <div className="ris-sdg-grid">
                {SDGS.map(item => (
                  <label key={item.id}><input type="checkbox" checked={(report.metadata.sdgs || []).includes(item.code)} onChange={event => {
                    const current = report.metadata.sdgs || [];
                    updateMeta({ sdgs: event.target.checked ? [...current, item.code] : current.filter(code => code !== item.code) });
                  }} /> {item.code}. {item.name}</label>
                ))}
              </div>
            </Field>
          )}
          <Field label="Integrasi Pembelajaran"><label className="ris-toggle-line"><input type="checkbox" checked={Boolean(report.metadata.integrationToTeaching)} onChange={event => updateMeta({ integrationToTeaching: event.target.checked })} /> <span>Digunakan dalam mata kuliah</span></label></Field>
          {report.metadata.integrationToTeaching && (
            <>
              <Field label="Nama Mata Kuliah" required><input value={inputValue(report.metadata.courseName)} onChange={event => updateMeta({ courseName: event.target.value })} /></Field>
              <Field label="Tahun Akademik" required><input value={inputValue(report.metadata.academicYear)} onChange={event => updateMeta({ academicYear: event.target.value })} placeholder="2026/2027" /></Field>
              <Field label="Bukti Integrasi" required alignStart><FileDrop file={report.metadata.integrationProofFile} accept=".pdf,.docx,.pptx" onFile={file => updateMeta({ integrationProofFile: { ...fileMeta(file), fileUrl: file.name } })} label="Upload bukti integrasi pembelajaran" /></Field>
            </>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="ris-form-section">
          <h2>Step 3 — Research Type Engine</h2>
          <div className="ris-category-grid">
            {RESEARCH_CATEGORY_OPTIONS.map(item => (
              <button key={item.value} type="button" className={`ris-category-card ${report.category === item.value ? 'active' : ''}`} onClick={() => update({ category: item.value, typeDetail: {} })}>
                <strong>{item.label}</strong><small>{item.description}</small>
              </button>
            ))}
          </div>
          {report.category === 'grant' && (
            <>
              <Field label="Grant Type" required><select value={inputValue(report.typeDetail.grantType)} onChange={event => updateDetail({ grantType: event.target.value })}><option value="">Pilih tipe hibah</option>{GRANT_TYPE_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
              <Field label="Grant Name" required><input value={inputValue(report.typeDetail.grantName)} onChange={event => updateDetail({ grantName: event.target.value })} /></Field>
              <Field label="Grant Link"><input value={inputValue(report.typeDetail.grantLink)} onChange={event => updateDetail({ grantLink: event.target.value })} /></Field>
              <Field label="Research Status" required><input value={inputValue(report.typeDetail.researchStatus)} onChange={event => updateDetail({ researchStatus: event.target.value })} placeholder="Contoh: awarded / running / completed" /></Field>
              <Field label="Funding Amount"><input type="number" min="0" value={inputValue(report.typeDetail.fundingAmount)} onChange={event => updateDetail({ fundingAmount: event.target.value })} /></Field>
            </>
          )}
          {report.category === 'partner' && (
            <>
              <Field label="Partner Name" required><input value={inputValue(report.typeDetail.partnerName)} onChange={event => updateDetail({ partnerName: event.target.value })} /></Field>
              <Field label="Partner Representative" required><input value={inputValue(report.typeDetail.partnerRepresentative)} onChange={event => updateDetail({ partnerRepresentative: event.target.value })} /></Field>
              <Field label="Partner Origin" required><input value={inputValue(report.typeDetail.partnerOrigin)} onChange={event => updateDetail({ partnerOrigin: event.target.value })} /></Field>
            </>
          )}
          {report.category === 'university' && (
            <>
              <Field label="Partner University" required><input value={inputValue(report.typeDetail.partnerUniversity)} onChange={event => updateDetail({ partnerUniversity: event.target.value })} /></Field>
              <Field label="Origin" required><input value={inputValue(report.typeDetail.partnerOrigin)} onChange={event => updateDetail({ partnerOrigin: event.target.value })} /></Field>
              <Field label="MoU Status" required><select value={inputValue(report.typeDetail.mouStatus)} onChange={event => updateDetail({ mouStatus: event.target.value })}><option value="">Pilih</option><option value="yes">Yes</option><option value="no">No</option></select></Field>
            </>
          )}
          {report.category === 'independent' && (
            <Field label="Independent Type" required><select value={inputValue(report.typeDetail.independentType)} onChange={event => updateDetail({ independentType: event.target.value })}><option value="">Pilih jenis mandiri</option>{INDEPENDENT_TYPE_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
          )}
        </section>
      )}

      {step === 3 && (
        <section className="ris-form-section">
          <h2>Step 4 — Document Management</h2>
          <div className="ris-alert ris-alert-success"><strong>Mandatory Rules</strong><span>Status {report.activityStatus} membutuhkan dokumen: {requiredDocuments.map(getDocumentTypeLabel).join(', ')}.</span></div>
          {EXTERNAL_DOCUMENT_TYPES.map(item => {
            const file = (report.documents || []).find(doc => doc.fileType === item.value);
            return (
              <Field key={item.value} label={item.label} required={requiredDocuments.includes(item.value)} alignStart>
                <FileDrop file={file} accept=".pdf,.docx,.xlsx,.pptx" onFile={selected => addDocument(item.value, selected)} label={`Upload ${item.label}`} />
                {file && <button type="button" className="ris-text-danger" onClick={() => removeDocument(file.id)}>Hapus file ini</button>}
              </Field>
            );
          })}
        </section>
      )}

      {step === 4 && (
        <section className="ris-form-section">
          <div className="ris-section-title"><h2>Step 5 — Output Management</h2><Button tone="blue" onClick={addOutput}>Tambah Luaran</Button></div>
          {(report.outputs || []).map((output, index) => (
            <div key={output.id} className="ris-output-card">
              <div className="ris-card-heading"><h3>Luaran {index + 1}</h3><button type="button" className="ris-text-danger" onClick={() => removeOutput(output.id)}>Hapus</button></div>
              <Field label="Output Type" required><select value={output.outputType} onChange={event => updateOutput(output.id, { outputType: event.target.value })}>{OUTPUT_TYPE_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
              <Field label="Title" required><input value={inputValue(output.title)} onChange={event => updateOutput(output.id, { title: event.target.value })} /></Field>
              <Field label="Year" required><input type="number" min="2000" max="2100" value={inputValue(output.year)} onChange={event => updateOutput(output.id, { year: event.target.value })} /></Field>
              <Field label="Description" alignStart><textarea rows="3" value={inputValue(output.description)} onChange={event => updateOutput(output.id, { description: event.target.value })} /></Field>
              <Field label="Link"><input value={inputValue(output.link)} onChange={event => updateOutput(output.id, { link: event.target.value })} /></Field>
              <Field label="File Luaran" alignStart><FileDrop file={output.file} accept=".pdf,.docx,.xlsx,.pptx" onFile={file => attachOutputFile(output.id, file)} label="Upload file luaran opsional" /></Field>
            </div>
          ))}
          {(report.outputs || []).length === 0 && <div className="ris-empty-state">Belum ada luaran. Luaran boleh lebih dari satu dan dapat diisi jika sudah tersedia.</div>}
        </section>
      )}

      {step === 5 && (
        <section className="ris-form-section">
          <h2>Step 6 — Review & Submit</h2>
          <dl className="ris-info-list">
            <div><dt>Nama Aktivitas</dt><dd>{report.activityName || '-'}</dd></div>
            <div><dt>Judul Penelitian</dt><dd>{report.researchTitle || '-'}</dd></div>
            <div><dt>Tahun / Status</dt><dd>{report.activityYear || '-'} / {report.activityStatus}</dd></div>
            <div><dt>Tipe / Kategori</dt><dd>{report.activityType} / {report.category}</dd></div>
            <div><dt>Pendanaan</dt><dd>{report.currency} {formatCurrency(report.fundingAmount).replace('Rp ', '')}</dd></div>
            <div><dt>RIP / TKT</dt><dd>{report.metadata.ripRelation || '-'} / TKT {report.metadata.tktTarget || '-'}</dd></div>
            <div><dt>SDG</dt><dd>{report.metadata.sdgInvolvement ? (report.metadata.sdgs || []).join(', ') : 'Tidak'}</dd></div>
            <div><dt>Dokumen</dt><dd>{(report.documents || []).length} dokumen</dd></div>
            <div><dt>Luaran</dt><dd>{(report.outputs || []).length} luaran</dd></div>
          </dl>
          <h2>Preview Database Snapshot</h2>
          <pre className="ris-db-preview">{JSON.stringify(toDbExternalResearchSnapshot(report), null, 2)}</pre>
          {!validation.valid && <div className="ris-alert ris-alert-error"><strong>Belum siap submit</strong><span>Masih ada {validation.errors.length} validasi yang belum terpenuhi.</span></div>}
        </section>
      )}

      <div className="ris-bottom-bar">
        <div>{step + 1} dari {STEPS.length}</div>
        <div>
          <Button tone="gray" disabled={step === 0} onClick={() => setStep(value => Math.max(0, value - 1))}>Sebelumnya</Button>
          {step < STEPS.length - 1 && <Button tone="green" onClick={() => setStep(value => Math.min(STEPS.length - 1, value + 1))}>Selanjutnya</Button>}
          {step === STEPS.length - 1 && <Button tone="blue" onClick={submitReport}>Submit Laporan</Button>}
        </div>
      </div>
    </div>
  );
}

ExternalResearchWizardPage.propTypes = { match: PropTypes.object.isRequired };
