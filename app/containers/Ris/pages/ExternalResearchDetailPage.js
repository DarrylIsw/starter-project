/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useHistory } from 'react-router-dom';
import { useRis } from '../RisContext';
import { Button, EmptyRow, Field, PageBack } from '../components/Ui';
import { formatCurrency, formatDate, uid } from '../data';
import { isAdmin } from '../workflow';
import {
  EXTERNAL_STATUS,
  canAdminReviewExternalReport,
  canArchiveExternalReport,
  canEditExternalReport,
  externalReportTitle,
  externalStatusMeta,
  getCategoryMeta,
  getDocumentTypeLabel,
  getOutputTypeLabel,
  toDbExternalResearchSnapshot,
} from '../externalResearchWorkflow';

const REVIEW_CHECKLIST = [
  ['fieldComplete', 'Field lengkap'],
  ['documentsComplete', 'Dokumen lengkap'],
  ['documentsValid', 'Dokumen valid'],
  ['notDuplicate', 'Tidak duplikat'],
  ['statusConsistent', 'Status penelitian sesuai'],
];

export default function ExternalResearchDetailPage({ match, mode }) {
  const { data, setData, user } = useRis();
  const history = useHistory();
  const report = (data.externalResearchReports || []).find(item => item.id === match.params.reportId);
  const admin = isAdmin(user);
  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState({ fieldComplete: true, documentsComplete: true, documentsValid: true, notDuplicate: true, statusConsistent: true });

  if (!report) return <div className="ris-page"><PageBack onClick={() => history.push('/ris/penelitian-eksternal')} /><h1>Laporan tidak ditemukan</h1></div>;

  const meta = externalStatusMeta(report);
  const category = getCategoryMeta(report.category);
  const dbSnapshot = toDbExternalResearchSnapshot(report);

  const updateReport = nextReport => {
    setData(current => ({
      ...current,
      externalResearchReports: (current.externalResearchReports || []).map(item => (item.id === report.id ? nextReport : item)),
    }));
  };

  const appendReview = (decision, reviewNotes) => ({
    id: uid('external-review'),
    reportId: report.id,
    reviewerId: user.id,
    decision,
    notes: reviewNotes,
    checklist,
    reviewedAt: new Date().toISOString(),
  });

  const startReview = () => {
    const now = new Date().toISOString();
    updateReport({
      ...report,
      submissionStatus: EXTERNAL_STATUS.UNDER_REVIEW,
      updatedAt: now,
      history: [...(report.history || []), { status: EXTERNAL_STATUS.UNDER_REVIEW, note: 'Admin LPPM mulai melakukan review administratif.', at: now, by: user.id }],
    });
  };

  const requestRevision = () => {
    if (!notes.trim()) return;
    const now = new Date().toISOString();
    const review = appendReview(EXTERNAL_STATUS.REVISION_REQUESTED, notes);
    updateReport({
      ...report,
      submissionStatus: EXTERNAL_STATUS.REVISION_REQUESTED,
      reviews: [...(report.reviews || []), review],
      updatedAt: now,
      history: [...(report.history || []), { status: EXTERNAL_STATUS.REVISION_REQUESTED, note: notes, at: now, by: user.id }],
    });
    setNotes('');
  };

  const validateReport = () => {
    const now = new Date().toISOString();
    const review = appendReview(EXTERNAL_STATUS.VALIDATED, notes || 'Laporan tervalidasi oleh Admin LPPM.');
    updateReport({
      ...report,
      submissionStatus: EXTERNAL_STATUS.VALIDATED,
      reviews: [...(report.reviews || []), review],
      validatedAt: now,
      updatedAt: now,
      history: [...(report.history || []), { status: EXTERNAL_STATUS.VALIDATED, note: review.notes, at: now, by: user.id }],
    });
    setNotes('');
  };

  const archiveReport = () => {
    const now = new Date().toISOString();
    updateReport({
      ...report,
      submissionStatus: EXTERNAL_STATUS.ARCHIVED,
      archivedAt: now,
      updatedAt: now,
      history: [...(report.history || []), { status: EXTERNAL_STATUS.ARCHIVED, note: 'Laporan diarsipkan setelah validasi.', at: now, by: user.id }],
    });
  };

  const downloadArchive = () => {
    const content = `ARSIP LAPORAN PENELITIAN EKSTERNAL / MANDIRI\n\nJudul: ${report.researchTitle}\nAktivitas: ${report.activityName}\nTahun: ${report.activityYear}\nStatus: ${report.submissionStatus}\nKategori: ${category.label}\nPendanaan: ${report.currency} ${formatCurrency(report.fundingAmount).replace('Rp ', '')}\n\nDatabase Snapshot:\n${JSON.stringify(dbSnapshot, null, 2)}\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.id}-external-research-archive.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ris-page ris-page-narrow">
      <PageBack onClick={() => history.push('/ris/penelitian-eksternal')} />
      <div className="ris-page-heading">
        <div>
          <h1>{externalReportTitle(report)}</h1>
          <p>Detail laporan: identitas, metadata, dokumen, luaran, review admin, riwayat status, dan snapshot database.</p>
        </div>
        <div className="ris-heading-actions">
          <span className={`ris-badge ${meta.tone}`}>{meta.label}</span>
          {canEditExternalReport(report, user) && <Button tone="yellow" onClick={() => history.push(`/ris/penelitian-eksternal/${report.id}/edit`)}>Edit</Button>}
          {[EXTERNAL_STATUS.VALIDATED, EXTERNAL_STATUS.ARCHIVED].includes(report.submissionStatus) && <Button tone="gray" onClick={downloadArchive}>Download Arsip</Button>}
        </div>
      </div>

      <section className="ris-form-section">
        <h2>Basic Information</h2>
        <dl className="ris-info-list">
          <div><dt>Activity Name</dt><dd>{report.activityName || '-'}</dd></div>
          <div><dt>Research Title</dt><dd>{report.researchTitle || '-'}</dd></div>
          <div><dt>Activity Year</dt><dd>{report.activityYear || '-'}</dd></div>
          <div><dt>Activity Status</dt><dd>{report.activityStatus || '-'}</dd></div>
          <div><dt>Activity Type</dt><dd>{report.activityType || '-'}</dd></div>
          <div><dt>Role in Research</dt><dd>{report.roleInResearch || '-'}</dd></div>
          <div><dt>Organizer Origin</dt><dd>{report.organizerOrigin || '-'}</dd></div>
          <div><dt>Funding</dt><dd>{report.fundingSource || '-'} — {report.currency} {formatCurrency(report.fundingAmount).replace('Rp ', '')}</dd></div>
        </dl>
      </section>

      <section className="ris-form-section">
        <h2>Research Metadata</h2>
        <dl className="ris-info-list">
          <div><dt>RIP Relation</dt><dd>{(report.metadata || {}).ripRelation || '-'}</dd></div>
          <div><dt>TKT Target</dt><dd>{(report.metadata || {}).tktTarget || '-'}</dd></div>
          <div><dt>SDG</dt><dd>{(report.metadata || {}).sdgInvolvement ? ((report.metadata || {}).sdgs || []).join(', ') : 'Tidak'}</dd></div>
          <div><dt>Teaching Integration</dt><dd>{(report.metadata || {}).integrationToTeaching ? `${report.metadata.courseName} (${report.metadata.academicYear})` : 'Tidak'}</dd></div>
        </dl>
      </section>

      <section className="ris-form-section">
        <h2>Research Type Detail</h2>
        <dl className="ris-info-list">
          <div><dt>Kategori</dt><dd>{category.label}</dd></div>
          {Object.entries(report.typeDetail || {}).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value || '-')}</dd></div>)}
        </dl>
      </section>

      <section className="ris-form-section">
        <h2>Documents</h2>
        <div className="ris-table-wrap">
          <table className="ris-table">
            <thead><tr><th>No.</th><th>File Type</th><th>Nama File</th><th>Ukuran</th><th>Uploaded At</th></tr></thead>
            <tbody>{(report.documents || []).map((file, index) => <tr key={file.id}><td>{index + 1}.</td><td>{getDocumentTypeLabel(file.fileType)}</td><td>{file.name || file.fileName}</td><td>{((file.size || 0) / 1048576).toFixed(2)} MB</td><td>{formatDate(file.uploadedAt)}</td></tr>)}{(report.documents || []).length === 0 && <EmptyRow colSpan={5}>Belum ada dokumen.</EmptyRow>}</tbody>
          </table>
        </div>
      </section>

      <section className="ris-form-section">
        <h2>Outputs</h2>
        <div className="ris-table-wrap">
          <table className="ris-table">
            <thead><tr><th>No.</th><th>Type</th><th>Title</th><th>Year</th><th>Link</th><th>File</th></tr></thead>
            <tbody>{(report.outputs || []).map((output, index) => <tr key={output.id}><td>{index + 1}.</td><td>{getOutputTypeLabel(output.outputType)}</td><td className="ris-title-cell">{output.title}</td><td>{output.year}</td><td>{output.link || '-'}</td><td>{output.file ? output.file.name : '-'}</td></tr>)}{(report.outputs || []).length === 0 && <EmptyRow colSpan={6}>Belum ada luaran.</EmptyRow>}</tbody>
          </table>
        </div>
      </section>

      {admin && mode === 'admin' && (
        <section className="ris-form-section">
          <h2>Admin Review</h2>
          {report.submissionStatus === EXTERNAL_STATUS.SUBMITTED && <Button tone="blue" onClick={startReview}>Mulai Review Administratif</Button>}
          {canAdminReviewExternalReport(report, user) && (
            <div className="ris-admin-review-box">
              <div className="ris-checklist-card">
                {REVIEW_CHECKLIST.map(([key, label]) => (
                  <label key={key}><input type="checkbox" checked={Boolean(checklist[key])} onChange={event => setChecklist(current => ({ ...current, [key]: event.target.checked }))} /> {label}</label>
                ))}
              </div>
              <Field label="Catatan Admin" alignStart><textarea rows="4" value={notes} onChange={event => setNotes(event.target.value)} placeholder="Isi catatan validasi atau revisi untuk user" /></Field>
              <div className="ris-align-right">
                <Button tone="amber" disabled={!notes.trim()} onClick={requestRevision}>Minta Revisi</Button>
                <Button tone="green" onClick={validateReport}>Validasi Laporan</Button>
              </div>
            </div>
          )}
          {canArchiveExternalReport(report, user) && <Button tone="gray" onClick={archiveReport}>Arsipkan Laporan</Button>}
        </section>
      )}

      <section className="ris-form-section">
        <h2>Riwayat Verifikasi</h2>
        <div className="ris-timeline">
          {(report.reviews || []).map(review => <div key={review.id}><b>{review.decision}</b><span>{formatDate(review.reviewedAt)} oleh {review.reviewerId}</span><p>{review.notes || '-'}</p></div>)}
          {(report.reviews || []).length === 0 && <div><b>Belum ada review</b><p>Admin belum memberikan keputusan administratif.</p></div>}
        </div>
      </section>

      <section className="ris-form-section">
        <h2>Riwayat Status</h2>
        <div className="ris-timeline">
          {(report.history || []).map(item => <div key={`${item.status}-${item.at}`}><b>{item.status}</b><span>{formatDate(item.at)} oleh {item.by || 'system'}</span><p>{item.note}</p></div>)}
        </div>
      </section>

      <section className="ris-form-section">
        <h2>Database Snapshot</h2>
        <pre className="ris-db-preview">{JSON.stringify(dbSnapshot, null, 2)}</pre>
      </section>
    </div>
  );
}

ExternalResearchDetailPage.propTypes = { match: PropTypes.object.isRequired, mode: PropTypes.string };
ExternalResearchDetailPage.defaultProps = { mode: 'detail' };
