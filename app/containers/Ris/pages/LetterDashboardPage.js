/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import React from 'react';
import { useHistory } from 'react-router-dom';
import { useRis } from '../RisContext';
import Icon from '../components/Icon';
import { Button, EmptyRow } from '../components/Ui';
import { formatDate } from '../data';
import { isAdmin, isManager } from '../workflow';
import {
  LETTER_STATUS,
  LETTER_TYPES,
  canAdminReviewLetter,
  canDownloadFinalLetter,
  canEditLetter,
  canGenerateLetter,
  getActiveLettersForUser,
  getAdminLetterQueue,
  getLetterPurposeMeta,
  getLetterTitle,
  letterStatusMeta,
} from '../letterWorkflow';

export default function LetterDashboardPage() {
  const { data, user } = useRis();
  const history = useHistory();
  const admin = isAdmin(user);
  const manager = isManager(user);
  const visibleLetters = manager ? getActiveLettersForUser(data, user) : (admin ? getAdminLetterQueue(data) : getActiveLettersForUser(data, user));
  const allUserLetters = getActiveLettersForUser(data, user);
  const stats = {
    total: allUserLetters.length,
    process: allUserLetters.filter(item => [LETTER_STATUS.SUBMITTED, LETTER_STATUS.PRECHECKED, LETTER_STATUS.APPROVED].includes(item.status)).length,
    revision: allUserLetters.filter(item => [LETTER_STATUS.DRAFT_REVISION, LETTER_STATUS.REVISION_REQUIRED].includes(item.status)).length,
    done: allUserLetters.filter(item => item.status === LETTER_STATUS.GENERATED).length,
  };

  const actionFor = letter => {
    if (canAdminReviewLetter(letter, user)) return { label: 'Verifikasi', tone: 'cyan', path: `/ris/pengajuan-surat/${letter.id}/admin` };
    if (canGenerateLetter(letter, user)) return { label: 'Generate', tone: 'green', path: `/ris/pengajuan-surat/${letter.id}/admin` };
    if (canEditLetter(letter, user)) return { label: 'Edit', tone: 'yellow', path: `/ris/pengajuan-surat/${letter.id}/edit` };
    if (canDownloadFinalLetter(letter, user)) return { label: 'Lihat Final', tone: 'green', path: `/ris/pengajuan-surat/${letter.id}/detail` };
    return { label: 'Detail', tone: 'gray', path: `/ris/pengajuan-surat/${letter.id}/detail` };
  };

  return (
    <div className="ris-page ris-workspace-page ris-letter-page">
      <div className="ris-page-heading">
        <div>
          <h1>Pengajuan Surat</h1>
          <p>Workflow surat akademik dan penelitian: draft, precheck sistem, verifikasi admin, approval, generate surat, dan arsip.</p>
        </div>
        <div className="ris-heading-actions">
          {(!admin || manager) && <Button tone="blue" onClick={() => history.push('/ris/pengajuan-surat/new/research_assignment')}>Buat Pengajuan</Button>}
        </div>
      </div>

      {!admin && (
        <>
          <section className="ris-letter-stats">
            <div><span>Total Pengajuan</span><strong>{stats.total}</strong></div>
            <div><span>Dalam Proses</span><strong>{stats.process}</strong></div>
            <div><span>Perlu Revisi</span><strong>{stats.revision}</strong></div>
            <div><span>Selesai</span><strong>{stats.done}</strong></div>
          </section>

          <section className="ris-section-spaced">
            <div className="ris-section-title">
              <h2>Pilih Jenis Surat</h2>
            </div>
            <div className="ris-letter-type-grid">
              {LETTER_TYPES.map(item => (
                <button key={item.value} type="button" className="ris-letter-type-card" onClick={() => history.push(`/ris/pengajuan-surat/new/${item.value}`)}>
                  <span><Icon name={item.icon} /></span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {admin && (
        <section className="ris-admin-summary">
          <div className="ris-alert ris-alert-success">
            <strong>Queue Admin LPPM</strong>
            <span>Menampilkan surat dengan status Prechecked dan Approved. Status Generated otomatis menjadi arsip dan tetap bisa dilihat melalui detail.</span>
          </div>
        </section>
      )}

      <section className="ris-section-spaced">
        <div className="ris-section-title">
          <h2>{admin ? 'Queue Verifikasi Surat' : 'Riwayat Pengajuan Surat'}</h2>
        </div>
        <div className="ris-table-wrap">
          <table className="ris-table ris-action-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Jenis Surat</th>
                <th>Kepentingan</th>
                <th>Judul/Kegiatan</th>
                {admin && <th>Pemohon</th>}
                <th>Tanggal Submit</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visibleLetters.map((letter, index) => {
                const meta = letterStatusMeta(letter);
                const typeMeta = LETTER_TYPES.find(item => item.value === letter.type) || {};
                const purpose = getLetterPurposeMeta(letter.type, letter.purpose);
                const action = actionFor(letter);
                return (
                  <tr key={letter.id}>
                    <td>{index + 1}.</td>
                    <td>{typeMeta.shortLabel || typeMeta.label}</td>
                    <td>{purpose.label}</td>
                    <td className="ris-title-cell" title={getLetterTitle(letter)}>{getLetterTitle(letter)}</td>
                    {admin && <td>{letter.applicant ? letter.applicant.name : '-'}</td>}
                    <td>{formatDate(letter.submittedAt || letter.createdAt)}</td>
                    <td><span className={`ris-badge ${meta.tone}`}>{meta.label}</span></td>
                    <td><button type="button" className={`ris-action ${action.tone}`} onClick={() => history.push(action.path)}>{action.label}</button></td>
                  </tr>
                );
              })}
              {visibleLetters.length === 0 && <EmptyRow colSpan={admin ? 8 : 7}>{admin ? 'Belum ada surat yang menunggu verifikasi.' : 'Belum ada riwayat pengajuan surat.'}</EmptyRow>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
