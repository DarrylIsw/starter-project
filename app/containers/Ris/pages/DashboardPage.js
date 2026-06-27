/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import React from 'react';
import { useHistory } from 'react-router-dom';
import { useRis } from '../RisContext';
import { Button, EmptyRow } from '../components/Ui';
import Icon from '../components/Icon';
import {
  STATUS_META, formatCurrency, formatDate, totalBudget
} from '../data';
import {
  STATUS,
  canAccessExternalResearch,
  canAccessLetters,
  canAccessResearchSubmission,
  canAccessResearcherProfiles,
  canAssignReviewer,
  canDecideDraft,
  canEditDraft,
  canReviewerViewDraft,
  canSignContract,
  canVerifyDraft,
  draftStatus,
  getSchemeTitle,
  isAdmin,
  isManager,
  isResearcher,
  isReviewer,
} from '../workflow';
import { getVisibleExternalReports, getAdminExternalQueue, getExternalMetrics } from '../externalResearchWorkflow';
import { getProfileByUser, getProfileMetrics, isProfileAdmin } from '../researcherProfileWorkflow';

const recommendationMeta = {
  approve: { label: 'Direkomendasikan', tone: 'green' },
  revise: { label: 'Perlu Revisi', tone: 'yellow' },
  reject: { label: 'Ditolak', tone: 'red' },
};

export default function DashboardPage() {
  const { data, user } = useRis();
  const history = useHistory();
  const admin = isAdmin(user);
  const reviewer = isReviewer(user);
  const manager = isManager(user);
  const researcher = isResearcher(user);
  const visible = data.drafts.filter(draft => {
    if (reviewer) return draft.userId === user.id || canReviewerViewDraft(draft, user);
    if (researcher) return draft.userId === user.id;
    if (admin) return draftStatus(draft) !== STATUS.DRAFT;
    if (manager) return canDecideDraft(draft, user);
    return false;
  });

  const schemeFor = draft => data.schemes.find(item => item.id === draft.schemeId);

  const action = draft => {
    if (canAssignReviewer(draft, user)) return { label: 'Pilih Reviewer', tone: 'blue', path: `/ris/pengajuan-penelitian-internal/${draft.id}/pemilihan-reviewer` };
    if (canVerifyDraft(draft, user)) return { label: 'Verifikasi', tone: 'cyan', path: `/ris/pengajuan-penelitian-internal/${draft.id}/verifikasi` };
    if (canReviewerViewDraft(draft, user) && !draft.review) return { label: 'Review', tone: 'blue', path: `/ris/pengajuan-penelitian-internal/${draft.id}/reviewer-preview` };
    if (canDecideDraft(draft, user)) return { label: 'Buat Keputusan', tone: 'cyan', path: `/ris/pengajuan-penelitian-internal/${draft.id}/buat-keputusan` };
    if (canEditDraft(draft, user)) return { label: 'Edit', tone: 'yellow', path: `/ris/pengajuan-penelitian-internal/scheme/${draft.schemeId}` };
    return { label: 'Lihat', tone: 'gray', path: `/ris/pengajuan-penelitian-internal/${draft.id}/preview` };
  };

  const userLetters = (data.letterRequests || []).filter(letter => admin || letter.userId === user.id);
  const letterQueue = admin ? userLetters.filter(letter => ['prechecked', 'approved'].includes(letter.status)).length : userLetters.length;
  const externalReports = admin ? getAdminExternalQueue(data) : getVisibleExternalReports(data, user);
  const externalMetrics = getExternalMetrics(externalReports);
  const profileMetrics = getProfileMetrics(data);
  const ownProfile = getProfileByUser(data, user);
  const profileAdmin = isProfileAdmin(user);
  const featureCards = [
    {
      id: 'internal-research',
      label: 'Riset Internal',
      icon: 'document',
      title: 'Pengajuan Penelitian Internal',
      description: `${visible.length} proposal terlihat untuk role aktif, termasuk draft, review, keputusan, kontrak, logbook, dan luaran.`,
      tone: 'blue',
      path: '/ris/pengajuan-penelitian-internal',
      visible: canAccessResearchSubmission(user),
    },
    {
      id: 'letters',
      label: 'Surat',
      icon: 'mail',
      title: 'Pengajuan Surat',
      description: admin ? `${letterQueue} surat menunggu proses admin.` : `${letterQueue} riwayat pengajuan surat milik akun ini.`,
      tone: 'green',
      path: '/ris/pengajuan-surat',
      visible: canAccessLetters(user),
    },
    {
      id: 'external-research',
      label: 'Riset Eksternal',
      icon: 'report',
      title: 'Pelaporan Penelitian Eksternal & Mandiri',
      description: admin ? `${externalMetrics.totalReports} laporan dalam monitoring LPPM.` : `${externalMetrics.totalReports} laporan eksternal/mandiri milik akun ini.`,
      tone: 'blue',
      path: '/ris/penelitian-eksternal',
      visible: canAccessExternalResearch(user),
    },
    {
      id: 'researcher-profile',
      label: 'Profil Peneliti',
      icon: 'user',
      title: 'Manajemen Informasi Peneliti',
      description: profileAdmin ? `${profileMetrics.totalProfiles} profil peneliti, ${profileMetrics.pendingProfiles} menunggu verifikasi.` : (ownProfile ? `Kelengkapan profil Anda ${ownProfile.profileCompleteness || 0}%.` : 'Mulai initial profile setup sebagai single source of truth RIS.'),
      tone: 'green',
      path: '/ris/profil-peneliti',
      visible: canAccessResearcherProfiles(user),
    },
  ].filter(card => card.visible);
  const decisionQueue = data.drafts.filter(draft => canDecideDraft(draft, user));

  return (
    <div className="ris-page">
      <div className="ris-page-heading">
        <div>
          <h1>Dashboard</h1>
          <p>Ringkasan layanan RIS sesuai role aktif: penelitian internal, surat, penelitian eksternal/mandiri, dan profil peneliti.</p>
        </div>
      </div>
      {featureCards.length > 0 && <section className="ris-module-grid ris-dashboard-modules">
        {featureCards.map(card => (
          <article className="ris-module-card active" key={card.id}>
            <div className="ris-module-icon"><Icon name={card.icon} /></div>
            <span>{card.label}</span>
            <h2>{card.title}</h2>
            <p>{card.description}</p>
            <div className="ris-module-card-footer">
              <Button tone={card.tone} onClick={() => history.push(card.path)}>Buka</Button>
            </div>
          </article>
        ))}
      </section>}
      <section className="ris-section-spaced">
        <h2>List Pengajuan Penelitian Internal</h2>
        <div className="ris-table-wrap">
          <table className="ris-table ris-action-table">
            <thead><tr>
              <th>No.</th><th>Judul Penelitian</th>
              {(admin || reviewer || manager) && <th>Dibuat Oleh</th>}
              <th>Skema Penelitian</th><th>Tanggal Pengajuan</th>
              <th>Batas Pengajuan</th>
              <th>Status</th>
              {reviewer && <th>Total Anggota<br />(Termasuk Ketua)</th>}
              {reviewer && <th>Total Anggaran</th>}
              <th>Aksi</th>
            </tr></thead>
            <tbody>
              {visible.map((draft, index) => {
                const scheme = schemeFor(draft) || {};
                const meta = STATUS_META[draftStatus(draft)] || STATUS_META.draft;
                const link = action(draft);
                return (
                  <tr key={draft.id}>
                    <td>{index + 1}.</td><td className="ris-title-cell" title={draft.project.title}>{draft.project.title}</td>
                    {(admin || reviewer || manager) && <td>{draft.userName}</td>}
                    <td>{getSchemeTitle(scheme)}</td><td>{formatDate(draft.submittedAt)}</td>
                    <td>{formatDate(scheme.registrationEndDate)}</td>
                    <td><span className={`ris-badge ${meta.tone}`}>{meta.label}</span></td>
                    {reviewer && <td>{(draft.members || []).length}</td>}
                    {reviewer && <td>{formatCurrency(totalBudget(draft))}</td>}
                    <td>
                      <button type="button" className={`ris-action ${link.tone}`} onClick={() => history.push(link.path)}>{link.label}</button>
                      {canSignContract(draft, user) && <button type="button" className="ris-action green" onClick={() => history.push(`/ris/pengajuan-penelitian-internal/${draft.id}/ttd-kontrak`)}>TTD Kontrak</button>}
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && <EmptyRow colSpan={10}>Belum ada pengajuan penelitian internal.</EmptyRow>}
            </tbody>
          </table>
        </div>
      </section>

      {manager && (
        <section className="ris-section-spaced">
          <h2>List Pengajuan Menunggu Keputusan</h2>
          <div className="ris-table-wrap">
            <table className="ris-table ris-action-table"><thead><tr><th>No.</th><th>Judul Penelitian</th><th>Dibuat Oleh</th><th>Skema Penelitian</th><th>Reviewer</th><th>Skor</th><th>Rekomendasi</th><th>Aksi</th></tr></thead>
              <tbody>{decisionQueue.map((draft, index) => {
                const review = draft.review || {};
                const rec = recommendationMeta[review.recommendation] || { label: '-', tone: 'gray' };
                const reviewerData = data.reviewers.find(item => draft.assignment && (item.userId === draft.assignment.reviewerUserId || item.id === draft.assignment.reviewerId));
                return <tr key={draft.id}><td>{index + 1}.</td><td>{draft.project.title}</td><td>{draft.userName}</td><td>{getSchemeTitle(schemeFor(draft))}</td><td>{reviewerData ? reviewerData.name : '-'}</td><td>{review.totalScore || '-'}</td><td><span className={`ris-badge ${rec.tone}`}>{rec.label}</span></td><td><button type="button" className="ris-action cyan" onClick={() => history.push(`/ris/pengajuan-penelitian-internal/${draft.id}/buat-keputusan`)}>Buat Keputusan</button></td></tr>;
              })}{decisionQueue.length === 0 && <EmptyRow colSpan={8}>Belum ada pengajuan yang menunggu keputusan.</EmptyRow>}</tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
