/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { useHistory } from 'react-router-dom';
import { useRis } from '../RisContext';
import {
  Button, EmptyRow, Field, PageBack
} from '../components/Ui';
import { formatDate, uid } from '../data';
import {
  LETTER_STATUS,
  canAdminReviewLetter,
  canDownloadFinalLetter,
  canEditLetter,
  canGenerateLetter,
  fileTypeLabel,
  generateLetterNumber,
  getLetterPurposeMeta,
  getLetterTitle,
  letterStatusMeta,
  renderLetterPlainText,
  toDbLetterSnapshot,
  updateLetterHistory,
} from '../letterWorkflow';

function InfoRows({ rows }) {
  return (
    <dl className="ris-info-list">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value || '-'}</dd>
        </div>
      ))}
    </dl>
  );
}

InfoRows.propTypes = { rows: PropTypes.array.isRequired };

export default function LetterDetailPage({ match, mode }) {
  const { data, setData, user } = useRis();
  const history = useHistory();
  const letter = (data.letterRequests || []).find(item => item.id === match.params.letterId);
  const [reviewNotes, setReviewNotes] = React.useState('');
  const [success, setSuccess] = React.useState('');

  if (!letter) return <div className="ris-page"><h1>Surat tidak ditemukan</h1><Button tone="gray" onClick={() => history.push('/ris/pengajuan-surat')}>Kembali</Button></div>;

  const form = letter.form || {};
  const applicant = letter.applicant || {};
  const meta = letterStatusMeta(letter);
  const purpose = getLetterPurposeMeta(letter.type, letter.purpose);
  const dbSnapshot = toDbLetterSnapshot(letter);
  const latestPrecheck = letter.prechecks && letter.prechecks.length ? letter.prechecks[letter.prechecks.length - 1] : null;

  const saveLetter = updater => {
    setData(current => ({
      ...current,
      letterRequests: (current.letterRequests || []).map(item => (item.id === letter.id ? updater(item, current) : item)),
    }));
  };

  const addNotification = (current, targetUserId, message, type) => ({
    ...current,
    notifications: [...(current.notifications || []), {
      id: uid('notif'),
      userId: targetUserId,
      entityType: 'letter_request',
      entityId: letter.id,
      type,
      message,
      isRead: false,
      createdAt: new Date().toISOString(),
    }],
  });

  const adminDecision = decision => {
    const decisionStatus = {
      revision: LETTER_STATUS.REVISION_REQUIRED,
      approved: LETTER_STATUS.APPROVED,
      rejected: LETTER_STATUS.REJECTED,
    }[decision];
    const note = reviewNotes || (decision === 'approved' ? 'Pengajuan disetujui.' : 'Tidak ada catatan tambahan.');
    saveLetter(currentLetter => {
      const reviewed = updateLetterHistory({
        ...currentLetter,
        reviews: [...(currentLetter.reviews || []), {
          id: uid('letter-review'),
          letterId: currentLetter.id,
          reviewerId: user.id,
          decision,
          notes: note,
          reviewedAt: new Date().toISOString(),
        }],
      }, decisionStatus, note, user);
      return reviewed;
    });
    setData(current => addNotification(current, letter.userId, `Pengajuan surat ${purpose.label} ${decision === 'approved' ? 'disetujui' : decision === 'revision' ? 'perlu revisi' : 'ditolak'}.`, `letter_${decision}`));
    setSuccess('Keputusan admin berhasil disimpan.');
  };

  const generateFinal = () => {
    const nextSequence = (data.letterSequence || 1);
    const letterNumber = generateLetterNumber(letter, nextSequence);
    saveLetter(currentLetter => {
      const generated = {
        ...currentLetter,
        generated: {
          letterNumber,
          fileName: `${letterNumber.replace(/\//g, '-')}.txt`,
          fileUrl: `archive://${currentLetter.id}`,
          generatedAt: new Date().toISOString(),
          content: renderLetterPlainText({ ...currentLetter, generated: { letterNumber } }),
        },
      };
      return updateLetterHistory(generated, LETTER_STATUS.GENERATED, 'Surat final berhasil dibuat dan diarsipkan.', user);
    });
    setData(current => ({ ...addNotification(current, letter.userId, `Surat final ${purpose.label} sudah selesai dibuat.`, 'letter_generated'), letterSequence: nextSequence + 1 }));
    setSuccess('Surat final berhasil dibuat.');
  };

  const downloadFinal = () => {
    const content = letter.generated && letter.generated.content ? letter.generated.content : renderLetterPlainText(letter);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = letter.generated && letter.generated.fileName ? letter.generated.fileName : `${letter.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ris-page ris-page-narrow ris-workspace-page ris-letter-page">
      <PageBack onClick={() => history.push('/ris/pengajuan-surat')} />
      <div className="ris-page-heading">
        <div>
          <h1>Detail Pengajuan Surat</h1>
          <p>{getLetterTitle(letter)}</p>
        </div>
        <span className={`ris-badge ${meta.tone}`}>{meta.label}</span>
      </div>

      {success && <div className="ris-alert ris-alert-success">{success}</div>}

      <section className="ris-preview">
        <section>
          <h2>Identitas Pengajuan</h2>
          <InfoRows rows={[
            ['Request ID', letter.id],
            ['Pemohon', applicant.name],
            ['NIK/NIDN/NIM', applicant.identifier],
            ['Program Studi', applicant.program],
            ['Fakultas', applicant.faculty],
            ['Kepentingan', purpose.label],
            ['Tanggal Submit', formatDate(letter.submittedAt || letter.createdAt)],
          ]}
          />
        </section>

        <section>
          <h2>Data Surat</h2>
          <InfoRows rows={Object.keys(form).map(key => [key, String(form[key] || '-')])} />
        </section>

        <section>
          <h2>Lampiran</h2>
          <div className="ris-table-wrap">
            <table className="ris-table">
              <thead><tr><th>No.</th><th>Jenis File</th><th>Nama File</th><th>Ukuran</th></tr></thead>
              <tbody>
                {(letter.attachments || []).map((file, index) => (
                  <tr key={file.id}><td>{index + 1}.</td><td>{fileTypeLabel(file.fileType)}</td><td>{file.name}</td><td>{file.size ? `${(file.size / 1048576).toFixed(2)} MB` : '-'}</td></tr>
                ))}
                {(!letter.attachments || letter.attachments.length === 0) && <EmptyRow colSpan={4}>Belum ada lampiran.</EmptyRow>}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2>Preview Surat</h2>
          <pre className="ris-letter-preview-text">{renderLetterPlainText(letter)}</pre>
        </section>

        {latestPrecheck && (
          <section>
            <h2>Hasil Precheck Sistem</h2>
            <div className={`ris-alert ${latestPrecheck.status === 'passed' ? 'ris-alert-success' : 'ris-alert-error'}`}>
              <strong>{latestPrecheck.status === 'passed' ? 'Lolos precheck' : 'Gagal precheck'}</strong>
              {latestPrecheck.errors && latestPrecheck.errors.map(item => <span key={`${item.field}-${item.message}`}>• {item.message}</span>)}
            </div>
          </section>
        )}

        <section>
          <h2>Riwayat Status</h2>
          <div className="ris-timeline">
            {(letter.history || []).map(item => (
              <div key={`${item.status}-${item.at}`}>
                <b>{item.status}</b>
                <span>{formatDate(item.at)}</span>
                <p>{item.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2>Riwayat Verifikasi</h2>
          <div className="ris-table-wrap">
            <table className="ris-table">
              <thead><tr><th>No.</th><th>Decision</th><th>Catatan</th><th>Tanggal</th></tr></thead>
              <tbody>
                {(letter.reviews || []).map((review, index) => <tr key={review.id}><td>{index + 1}.</td><td>{review.decision}</td><td>{review.notes}</td><td>{formatDate(review.reviewedAt)}</td></tr>)}
                {(!letter.reviews || letter.reviews.length === 0) && <EmptyRow colSpan={4}>Belum ada verifikasi admin.</EmptyRow>}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2>Snapshot Database</h2>
          <pre className="ris-db-preview">{JSON.stringify(dbSnapshot, null, 2)}</pre>
        </section>
      </section>

      {mode === 'admin' && canAdminReviewLetter(letter, user) && (
        <section className="ris-decision-box">
          <h2>Verifikasi Admin</h2>
          <Field label="Catatan Admin" required={false} alignStart>
            <textarea value={reviewNotes} rows={4} onChange={event => setReviewNotes(event.target.value)} placeholder="Tulis catatan revisi, validasi, atau alasan keputusan." />
          </Field>
          <div className="ris-align-right">
            <Button tone="amber" onClick={() => adminDecision('revision')}>Minta Revisi</Button>
            <Button tone="red" onClick={() => adminDecision('rejected')}>Reject</Button>
            <Button tone="green" onClick={() => adminDecision('approved')}>Approve</Button>
          </div>
        </section>
      )}

      {mode === 'admin' && canGenerateLetter(letter, user) && (
        <section className="ris-decision-box">
          <h2>Generate Surat</h2>
          <p className="ris-muted">Status sudah Approved. Sistem akan membuat nomor surat, render file final, dan menyimpan arsip demo.</p>
          <Button tone="green" onClick={generateFinal}>Generate Surat Final</Button>
        </section>
      )}

      <div className="ris-bottom-bar">
        <div>{letter.generated && letter.generated.letterNumber ? `Nomor surat: ${letter.generated.letterNumber}` : 'Surat final belum dibuat.'}</div>
        <div>
          {canEditLetter(letter, user) && <Button tone="amber" onClick={() => history.push(`/ris/pengajuan-surat/${letter.id}/edit`)}>Edit</Button>}
          {canDownloadFinalLetter(letter, user) && <Button tone="green" onClick={downloadFinal}>Download Final</Button>}
        </div>
      </div>
    </div>
  );
}

LetterDetailPage.propTypes = { match: PropTypes.object.isRequired, mode: PropTypes.string };
LetterDetailPage.defaultProps = { mode: 'detail' };
