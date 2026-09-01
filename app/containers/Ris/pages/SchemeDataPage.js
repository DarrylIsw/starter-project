/* eslint-disable object-curly-newline, object-property-newline, react/prop-types */
import React from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { useRis } from '../RisContext';
import ContractCollectionPanel from '../components/ContractCollectionPanel';
import MonevPanel from '../components/MonevPanel';
import ResearchLogbookPanel from '../components/ResearchLogbookPanel';
import ResearchReportPanel from '../components/ResearchReportPanel';
import { Button, PageHeader, StatusBadge } from '../components/Ui';
import { formatCurrency, formatDate, totalBudget } from '../data';
import { canManageResearch, getSchemeTitle } from '../workflow';
import { getSchemeDataProgress, SCHEME_DATA_TAB, SCHEME_DATA_TABS } from '../schemeDataWorkflow';

export default function SchemeDataPage() {
  const { draftId } = useParams();
  const { data, user } = useRis();
  const history = useHistory();
  const location = useLocation();
  const draft = data.drafts.find(item => item.id === draftId);
  const scheme = draft && data.schemes.find(item => item.id === draft.schemeId);
  const requestedTab = new URLSearchParams(location.search).get('tab');
  const activeTab = SCHEME_DATA_TABS.some(tab => tab.value === requestedTab) ? requestedTab : SCHEME_DATA_TAB.CONTRACT;

  if (!draft || !scheme) return <div className="ris-page"><h1>Penelitian tidak ditemukan</h1></div>;

  const setActiveTab = tab => history.replace(`${location.pathname}?tab=${tab}`);
  const signed = draft.contract && (draft.contract.status === 'signed' || draft.contract.contractStatus === 'signed');
  const managementMode = canManageResearch(user);
  const progress = getSchemeDataProgress(data, draft, scheme);

  return (
    <div className="ris-page ris-scheme-data-page">
      <PageHeader title={managementMode ? 'Pemantauan Pendataan Skema' : 'Pendataan Skema'} description={(draft.project && draft.project.title) || 'Penelitian didanai'} onBack={() => history.push('/ris/pengajuan-penelitian-internal/penelitian-didanai')} actions={managementMode ? <Button tone="blue" onClick={() => history.push('/ris/skema')}>Atur Tenggat</Button> : null} />
      {managementMode && <div className="ris-monitoring-banner"><StatusBadge tone="blue">Mode Pemantauan</StatusBadge><span>Laporan dan catatan kegiatan milik <strong>{draft.userName || (draft.members && draft.members[0] && draft.members[0].name) || '-'}</strong> ditampilkan hanya untuk dibaca. Pengelola dapat menerbitkan Monev dan mengatur penilai.</span></div>}
      <section className="ris-scheme-data-summary">
        <div><span>Skema</span><strong>{getSchemeTitle(scheme)}</strong></div>
        {managementMode && <div><span>Ketua Penelitian</span><strong>{draft.userName || (draft.members && draft.members[0] && draft.members[0].name) || '-'}</strong></div>}
        <div><span>Periode Penelitian</span><strong>{formatDate(scheme.startDate)} - {formatDate(scheme.endDate)}</strong></div>
        <div><span>Anggaran Proposal</span><strong>{formatCurrency(totalBudget(draft))}</strong></div>
        <div><span>Status Kontrak</span><strong><StatusBadge tone={signed ? 'green' : 'yellow'}>{signed ? 'Sudah Ditandatangani' : 'Menunggu TTD'}</StatusBadge></strong></div>
      </section>
      <section className="ris-scheme-progress-summary" aria-label="Ringkasan pendataan">
        <div><span>Progres Keseluruhan</span><strong>{progress.percentage}%</strong><small>{progress.completed} dari {progress.required} kebutuhan selesai</small></div>
        <div><span>Monev</span><strong>{progress.monev.completed}/{progress.monev.required}</strong><small>hasil diterbitkan</small></div>
        <div><span>Laporan Penelitian</span><strong>{progress.reports.completed}/{progress.reports.required}</strong><small>laporan dikirim</small></div>
        <div><span>Laporan Luaran</span><strong>{progress.outputs.completed}/{progress.outputs.required}</strong><small>luaran dikirim</small></div>
        <div><span>Catatan Kegiatan</span><strong>{progress.logbooks}</strong><small>aktivitas tercatat</small></div>
      </section>
      <div className="ris-tabs ris-scheme-data-tabs" role="tablist" aria-label="Pendataan penelitian">{SCHEME_DATA_TABS.map(tab => <button type="button" role="tab" aria-selected={activeTab === tab.value} className={activeTab === tab.value ? 'active' : ''} key={tab.value} onClick={() => setActiveTab(tab.value)}>{tab.label}</button>)}</div>
      <div className="ris-scheme-data-content">
        {activeTab === SCHEME_DATA_TAB.CONTRACT && <ContractCollectionPanel draft={draft} readOnly={managementMode} />}
        {activeTab === SCHEME_DATA_TAB.MONEV && <MonevPanel draft={draft} scheme={scheme} managementMode={managementMode} />}
        {activeTab === SCHEME_DATA_TAB.FINAL_REPORT && <ResearchReportPanel draft={draft} scheme={scheme} mode="progress" readOnly={managementMode} />}
        {activeTab === SCHEME_DATA_TAB.OUTPUT_REPORT && <ResearchReportPanel draft={draft} scheme={scheme} mode="output" readOnly={managementMode} />}
        {activeTab === SCHEME_DATA_TAB.LOGBOOK && <ResearchLogbookPanel draft={draft} readOnly={managementMode} />}
      </div>
    </div>
  );
}
