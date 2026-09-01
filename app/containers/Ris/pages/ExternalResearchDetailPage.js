/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useHistory } from 'react-router-dom';
import { useRis } from '../RisContext';
import { Button, EmptyRow, Field, PageBack } from '../components/Ui';
import { formatCurrency, formatDate, uid } from '../data';
import { canManageResearch } from '../workflow';
import {
  ACTIVITY_STATUS_OPTIONS,
  ACTIVITY_TYPE_OPTIONS,
  EXTERNAL_STATUS,
  canAdminReviewExternalReport,
  canArchiveExternalReport,
  canEditExternalReport,
  externalReportTitle,
  externalStatusMeta,
  getCategoryMeta,
  getDocumentTypeLabel,
  getExternalTypeDetailRows,
  getOutputTypeLabel,
  transitionExternalStatus,
} from '../externalResearchWorkflow';

const REVIEW_CHECKLIST = [
  ['fieldComplete', 'Kolom lengkap'],
  ['documentsComplete', 'Dokumen lengkap'],
  ['documentsValid', 'Dokumen valid'],
  ['notDuplicate', 'Tidak duplikat'],
  ['statusConsistent', 'Status penelitian sesuai'],
];

export default function ExternalResearchDetailPage({ match, mode }) {
  const { data, setData, user } = useRis();
  const history = useHistory();
  const report = (data.externalResearchReports || []).find(item => item.id === match.params.reportId);
  const admin = canManageResearch(user);
  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState({ fieldComplete: true, documentsComplete: true, documentsValid: true, notDuplicate: true, statusConsistent: true });

  if (!report) return <div className="ris-page"><PageBack onClick={() => history.push('/ris/penelitian-eksternal')} /><h1>Laporan tidak ditemukan</h1></div>;

  const meta = externalStatusMeta(report);
  const category = getCategoryMeta(report.category);

  const updateReport = nextReport => {
    setData(current => ({
      ...current,
      externalResearchReports: (current.externalResearchReports || []).map(item => (item.id === report.id
        ? (transitionExternalStatus(item, nextReport.submissionStatus, nextReport) || item)
        : item)),
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
      history: [...(report.history || []), { status: EXTERNAL_STATUS.UNDER_REVIEW, note: 'Administrator LPPM mulai melakukan penilaian administratif.', at: now, by: user.id }],
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
    const content = `ARSIP LAPORAN PENELITIAN EKSTERNAL / MANDIRI\n\nJudul: ${report.researchTitle}\nAktivitas: ${report.activityName}\nTahun: ${report.activityYear}\nStatus: ${report.submissionStatus}\nKategori: ${category.label}\nPendanaan: ${report.currency} ${formatCurrency(report.fundingAmount).replace('Rp ', '')}\n`;
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
          <p>Detail laporan: identitas, metadata, dokumen, luaran, penilaian administrator, dan riwayat status.</p>
        </div>
        <div className="ris-heading-actions">
          <span className={`ris-badge ${meta.tone}`}>{meta.label}</span>
          {canEditExternalReport(report, user) && <Button tone="yellow" onClick={() => history.push(`/ris/penelitian-eksternal/${report.id}/edit`)}>Ubah</Button>}
          {[EXTERNAL_STATUS.VALIDATED, EXTERNAL_STATUS.ARCHIVED].includes(report.submissionStatus) && <Button tone="gray" onClick={downloadArchive}>Unduh Arsip</Button>}
        </div>
      </div>

      <section className="ris-form-section">
        <h2>Informasi Dasar</h2>
        <dl className="ris-info-list">
          <div><dt>Nama Aktivitas</dt><dd>{report.activityName || '-'}</dd></div>
          <div><dt>Judul Penelitian</dt><dd>{report.researchTitle || '-'}</dd></div>
          <div><dt>Tahun Aktivitas</dt><dd>{report.activityYear || '-'}</dd></div>
          <div><dt>Status Aktivitas</dt><dd>{(ACTIVITY_STATUS_OPTIONS.find(item => item.value === report.activityStatus) || {}).label || '-'}</dd></div>
          <div><dt>Tipe Aktivitas</dt><dd>{(ACTIVITY_TYPE_OPTIONS.find(item => item.value === report.activityType) || {}).label || '-'}</dd></div>
          <div><dt>Peran dalam Penelitian</dt><dd>{report.roleInResearch || '-'}</dd></div>
          <div><dt>Asal Penyelenggara</dt><dd>{report.organizerOrigin || '-'}</dd></div>
          <div><dt>Pendanaan</dt><dd>{report.fundingSource || '-'} - {report.currency} {formatCurrency(report.fundingAmount).replace('Rp ', '')}</dd></div>
        </dl>
      </section>

      <section className="ris-form-section">
        <h2>Metadata Penelitian</h2>
        <dl className="ris-info-list">
          <div><dt>Relasi RIP</dt><dd>{(report.metadata || {}).ripRelation || '-'}</dd></div>
          <div><dt>Target TKT</dt><dd>{(report.metadata || {}).tktTarget || '-'}</dd></div>
          <div><dt>SDG</dt><dd>{(report.metadata || {}).sdgInvolvement ? ((report.metadata || {}).sdgs || []).join(', ') : 'Tidak'}</dd></div>
          <div><dt>Integrasi Pembelajaran</dt><dd>{(report.metadata || {}).integrationToTeaching ? `${report.metadata.courseName} (${report.metadata.academicYear})` : 'Tidak'}</dd></div>
        </dl>
      </section>

      <section className="ris-form-section">
        <h2>Detail Jenis Penelitian</h2>
        <dl className="ris-info-list">
          <div><dt>Kategori</dt><dd>{category.label}</dd></div>
          {getExternalTypeDetailRows(report.typeDetail).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
      </section>

      <section className="ris-form-section">
        <h2>Dokumen</h2>
        <div className="ris-table-wrap">
          <table className="ris-table">
            <thead><tr><th>No.</th><th>Jenis Berkas</th><th>Nama Berkas</th><th>Ukuran</th><th>Waktu Unggah</th></tr></thead>
            <tbody>{(report.documents || []).map((file, index) => <tr key={file.id}><td>{index + 1}.</td><td>{getDocumentTypeLabel(file.fileType)}</td><td>{file.name || file.fileName}</td><td>{((file.size || 0) / 1048576).toFixed(2)} MB</td><td>{formatDate(file.uploadedAt)}</td></tr>)}{(report.documents || []).length === 0 && <EmptyRow colSpan={5}>Belum ada dokumen.</EmptyRow>}</tbody>
          </table>
        </div>
      </section>

      <section className="ris-form-section">
        <h2>Luaran</h2>
        <div className="ris-table-wrap">
          <table className="ris-table">
            <thead><tr><th>No.</th><th>Jenis</th><th>Judul</th><th>Tahun</th><th>Tautan</th><th>Berkas</th></tr></thead>
            <tbody>{(report.outputs || []).map((output, index) => <tr key={output.id}><td>{index + 1}.</td><td>{getOutputTypeLabel(output.outputType)}</td><td className="ris-title-cell">{output.title}</td><td>{output.year}</td><td>{output.link || '-'}</td><td>{output.file ? output.file.name : '-'}</td></tr>)}{(report.outputs || []).length === 0 && <EmptyRow colSpan={6}>Belum ada luaran.</EmptyRow>}</tbody>
          </table>
        </div>
      </section>

      {admin && mode === 'admin' && (
        <section className="ris-form-section">
          <h2>Penilaian Administrator</h2>
          {report.submissionStatus === EXTERNAL_STATUS.SUBMITTED && <Button tone="blue" onClick={startReview}>Mulai Penilaian Administratif</Button>}
          {canAdminReviewExternalReport(report, user) && (
            <div className="ris-admin-review-box">
              <div className="ris-checklist-card">
                {REVIEW_CHECKLIST.map(([key, label]) => (
                  <label key={key}><input type="checkbox" checked={Boolean(checklist[key])} onChange={event => setChecklist(current => ({ ...current, [key]: event.target.checked }))} /> {label}</label>
                ))}
              </div>
              <Field label="Catatan Administrator" alignStart><textarea rows="4" value={notes} onChange={event => setNotes(event.target.value)} placeholder="Isi catatan validasi atau revisi untuk pengguna" /></Field>
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
          {(report.reviews || []).map(review => <div key={review.id}><b>{externalStatusMeta({ submissionStatus: review.decision }).label}</b><span>{formatDate(review.reviewedAt)} oleh {review.reviewerId}</span><p>{review.notes || '-'}</p></div>)}
          {(report.reviews || []).length === 0 && <div><b>Belum ada penilaian</b><p>Administrator belum memberikan keputusan administratif.</p></div>}
        </div>
      </section>

      <section className="ris-form-section">
        <h2>Riwayat Status</h2>
        <div className="ris-timeline">
          {(report.history || []).map(item => <div key={`${item.status}-${item.at}`}><b>{externalStatusMeta({ submissionStatus: item.status }).label}</b><span>{formatDate(item.at)} oleh {item.by || 'sistem'}</span><p>{item.note}</p></div>)}
        </div>
      </section>

    </div>
  );
}

ExternalResearchDetailPage.propTypes = { match: PropTypes.object.isRequired, mode: PropTypes.string };
ExternalResearchDetailPage.defaultProps = { mode: 'detail' };
