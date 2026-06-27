/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { useHistory } from 'react-router-dom';
import { useRis } from '../RisContext';
import Icon from '../components/Icon';
import { Button, EmptyRow } from '../components/Ui';
import { formatCurrency } from '../data';
import { isAdmin, isManager } from '../workflow';
import {
  EXTERNAL_STATUS,
  RESEARCH_CATEGORY_OPTIONS,
  canAdminReviewExternalReport,
  canArchiveExternalReport,
  canEditExternalReport,
  externalReportTitle,
  externalStatusMeta,
  getAdminExternalQueue,
  getCategoryMeta,
  getExternalMetrics,
  getVisibleExternalReports,
} from '../externalResearchWorkflow';

function MetricCard({ label, value }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

MetricCard.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.number.isRequired };

export default function ExternalResearchDashboardPage() {
  const { data, user } = useRis();
  const history = useHistory();
  const admin = isAdmin(user);
  const manager = isManager(user);
  const visibleReports = manager ? (data.externalResearchReports || []) : (admin ? getAdminExternalQueue(data) : getVisibleExternalReports(data, user));
  const metricsBase = admin ? (data.externalResearchReports || []) : visibleReports;
  const metrics = getExternalMetrics(metricsBase);

  const actionFor = report => {
    if (canAdminReviewExternalReport(report, user)) return { label: report.submissionStatus === EXTERNAL_STATUS.SUBMITTED ? 'Review' : 'Lanjut Review', tone: 'cyan', path: `/ris/penelitian-eksternal/${report.id}/admin` };
    if (canArchiveExternalReport(report, user)) return { label: 'Arsipkan', tone: 'purple', path: `/ris/penelitian-eksternal/${report.id}/admin` };
    if (canEditExternalReport(report, user)) return { label: 'Edit', tone: 'yellow', path: `/ris/penelitian-eksternal/${report.id}/edit` };
    return { label: 'Detail', tone: 'gray', path: `/ris/penelitian-eksternal/${report.id}/detail` };
  };

  return (
    <div className="ris-page">
      <div className="ris-page-heading">
        <div>
          <h1>Pelaporan Penelitian Eksternal & Mandiri</h1>
          <p>Mencatat aktivitas riset di luar skema internal: hibah, kerja sama mitra, kerja sama universitas, mandiri, PRO-STEP, dokumen, luaran, SDG, TKT, dan validasi LPPM.</p>
        </div>
        <div className="ris-heading-actions">
          {(!admin || manager) && <Button tone="blue" onClick={() => history.push('/ris/penelitian-eksternal/new')}>Buat Laporan</Button>}
        </div>
      </div>

      <section className="ris-letter-stats ris-external-stats">
        <MetricCard label="Total Laporan" value={metrics.totalReports} />
        <MetricCard label="Diajukan" value={metrics.submittedReports} />
        <MetricCard label="Direview" value={metrics.underReviewReports} />
        <MetricCard label="Revisi" value={metrics.revisionReports} />
        <MetricCard label="Tervalidasi" value={metrics.validatedReports} />
        <MetricCard label="Arsip" value={metrics.archivedReports} />
        <MetricCard label="Eksternal" value={metrics.externalReports} />
        <MetricCard label="Mandiri" value={metrics.independentReports} />
      </section>

      {admin && (
        <section className="ris-section-spaced">
          <div className="ris-section-title">
            <h2>Monitoring Statistik Pelaporan</h2>
          </div>
          <div className="ris-breakdown-grid">
            <div className="ris-breakdown-card">
              <h3>Breakdown Kategori</h3>
              <p><span>Grant</span><strong>{metrics.grantReports}</strong></p>
              <p><span>Partner</span><strong>{metrics.partnerReports}</strong></p>
              <p><span>University</span><strong>{metrics.universityReports}</strong></p>
              <p><span>Independent</span><strong>{metrics.independentReports}</strong></p>
            </div>
            <div className="ris-breakdown-card">
              <h3>Metrik Luaran</h3>
              <p><span>Jurnal</span><strong>{metrics.totalJournals}</strong></p>
              <p><span>Buku</span><strong>{metrics.totalBooks}</strong></p>
              <p><span>HKI</span><strong>{metrics.totalHki}</strong></p>
              <p><span>Prototipe</span><strong>{metrics.totalPrototypes}</strong></p>
              <p><span>Prosiding</span><strong>{metrics.totalProceedings}</strong></p>
            </div>
          </div>
        </section>
      )}

      {!admin && (
        <section className="ris-section-spaced">
          <div className="ris-section-title"><h2>Jenis Laporan yang Didukung</h2></div>
          <div className="ris-letter-type-grid">
            {RESEARCH_CATEGORY_OPTIONS.map(item => (
              <button key={item.value} type="button" className="ris-letter-type-card" onClick={() => history.push('/ris/penelitian-eksternal/new')}>
                <span><Icon name={item.icon} /></span>
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="ris-section-spaced">
        <div className="ris-section-title">
          <h2>{admin ? 'Queue Monitoring Admin LPPM' : 'Riwayat Laporan Saya'}</h2>
          {!admin && visibleReports.some(item => item.submissionStatus === EXTERNAL_STATUS.DRAFT) && <span className="ris-badge gray">Draft tersedia</span>}
        </div>
        <div className="ris-table-wrap">
          <table className="ris-table ris-action-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Judul Penelitian</th>
                {admin && <th>Dosen</th>}
                <th>Tahun</th>
                <th>Aktivitas</th>
                <th>Kategori</th>
                <th>Pendanaan</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visibleReports.map((report, index) => {
                const meta = externalStatusMeta(report);
                const category = getCategoryMeta(report.category);
                const action = actionFor(report);
                return (
                  <tr key={report.id}>
                    <td>{index + 1}.</td>
                    <td className="ris-title-cell" title={externalReportTitle(report)}>{externalReportTitle(report)}</td>
                    {admin && <td>{report.userName || report.applicantName || report.userId}</td>}
                    <td>{report.activityYear}</td>
                    <td>{report.activityStatus} / {report.activityType}</td>
                    <td>{category.label}</td>
                    <td>{report.currency || 'IDR'} {formatCurrency(report.fundingAmount).replace('Rp ', '')}</td>
                    <td><span className={`ris-badge ${meta.tone}`}>{meta.label}</span></td>
                    <td><button type="button" className={`ris-action ${action.tone}`} onClick={() => history.push(action.path)}>{action.label}</button></td>
                  </tr>
                );
              })}
              {visibleReports.length === 0 && <EmptyRow colSpan={admin ? 9 : 8}>{admin ? 'Belum ada laporan yang perlu diproses.' : 'Belum ada laporan eksternal/mandiri.'}</EmptyRow>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ris-section-spaced">
        <div className="ris-alert ris-alert-success">
          <strong>Database-aware</strong>
          <span>Data UI disiapkan untuk mapping ke external_research, external_research_sdg, external_research_teaching, external_research_grants, external_research_partners, external_research_universities, external_research_independent, external_research_outputs, dan external_research_files.</span>
        </div>
      </section>
    </div>
  );
}
