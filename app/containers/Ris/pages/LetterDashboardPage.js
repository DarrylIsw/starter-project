/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, react/prop-types */
import React from 'react';
import { useHistory } from 'react-router-dom';
import { useRis } from '../RisContext';
import { EmptyRow, StatusBadge } from '../components/Ui';
import { formatDate } from '../data';
import { getFundedResearches } from '../schemeDataWorkflow';
import { canManageLetters } from '../workflow';
import {
  LETTER_STATUS,
  getAdminLetterQueue,
  getLettersOwnedByUser,
  getLetterResearchTitle,
  getLetterTitle,
  getLetterTypeMeta,
  letterStatusMeta,
  renderLetterPlainText,
} from '../letterWorkflow';

const PROCESS_FILTERS = [
  { value: 'all', label: 'Semua Status' },
  { value: LETTER_STATUS.SUBMITTED, label: 'Menunggu Verifikasi' },
  { value: LETTER_STATUS.FORM_DESIGN, label: 'Penyusunan Form' },
  { value: LETTER_STATUS.DATA_REQUIRED, label: 'Menunggu Data Lecturer' },
  { value: LETTER_STATUS.DATA_SUBMITTED, label: 'Verifikasi Data' },
  { value: LETTER_STATUS.REVISION_REQUIRED, label: 'Perlu Perbaikan' },
  { value: LETTER_STATUS.GENERATED, label: 'Diterbitkan' },
  { value: LETTER_STATUS.REJECTED, label: 'Ditolak' },
];

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

const managementAction = letter => {
  if (letter.status === LETTER_STATUS.SUBMITTED) return { label: 'Periksa', tone: 'cyan' };
  if (letter.status === LETTER_STATUS.FORM_DESIGN) return { label: 'Susun Form', tone: 'blue' };
  if ([LETTER_STATUS.DATA_SUBMITTED, LETTER_STATUS.PRECHECKED, LETTER_STATUS.APPROVED].includes(letter.status)) return { label: 'Finalisasi', tone: 'green' };
  return { label: 'Detail', tone: 'gray' };
};

const lecturerAction = letter => {
  if ([LETTER_STATUS.DATA_REQUIRED, LETTER_STATUS.REVISION_REQUIRED].includes(letter.status)) return { label: 'Input Data', tone: 'orange', path: `/ris/pengajuan-surat/${letter.id}/edit` };
  return { label: 'Detail', tone: 'gray', path: `/ris/pengajuan-surat/${letter.id}/detail` };
};

export default function LetterDashboardPage() {
  const { data, user } = useRis();
  const history = useHistory();
  const management = canManageLetters(user);
  const letters = management ? (data.letterRequests || []) : getLettersOwnedByUser(data, user);
  const fundedResearches = management ? [] : getFundedResearches(data, user);
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const filteredLetters = letters.filter(letter => {
    if (statusFilter !== 'all' && letter.status !== statusFilter) return false;
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [getLetterTitle(letter), getLetterResearchTitle(letter, data), letter.applicant && letter.applicant.name]
      .some(value => String(value || '').toLowerCase().includes(term));
  });
  const stats = {
    total: letters.length,
    request: letters.filter(item => item.status === LETTER_STATUS.SUBMITTED).length,
    building: letters.filter(item => item.status === LETTER_STATUS.FORM_DESIGN).length,
    waiting: letters.filter(item => item.status === LETTER_STATUS.DATA_REQUIRED).length,
    verification: letters.filter(item => [LETTER_STATUS.DATA_SUBMITTED, LETTER_STATUS.PRECHECKED, LETTER_STATUS.APPROVED].includes(item.status)).length,
    done: letters.filter(item => item.status === LETTER_STATUS.GENERATED).length,
  };

  return (
    <div className="ris-page ris-workspace-page ris-letter-page">
      <div className="ris-page-heading"><div><h1>Pengajuan Surat</h1><p>{management ? 'Kelola permintaan, susun kebutuhan data, verifikasi, dan terbitkan surat penelitian.' : 'Ajukan surat dari penelitian yang telah didanai dan pantau proses penerbitannya.'}</p></div></div>

      <section className="ris-letter-stats">
        <div><span>Total Pengajuan</span><strong>{stats.total}</strong></div>
        <div><span>{management ? 'Perlu Diperiksa' : 'Dalam Proses'}</span><strong>{management ? stats.request : stats.request + stats.building + stats.waiting + stats.verification}</strong></div>
        {management && <div><span>Form Disusun</span><strong>{stats.building}</strong></div>}
        <div><span>{management ? 'Verifikasi Final' : 'Perlu Input Data'}</span><strong>{management ? stats.verification : stats.waiting}</strong></div>
        <div><span>Surat Diterbitkan</span><strong>{stats.done}</strong></div>
      </section>

      {!management && <section className="ris-section-spaced">
        <div className="ris-section-title"><div><h2>Penelitian Didanai</h2><p>Pilih penelitian sebagai dasar surat. Setiap penelitian dapat memiliki lebih dari satu pengajuan.</p></div></div>
        <div className="ris-table-wrap">
          <table className="ris-table ris-action-table">
            <thead><tr><th>No.</th><th>Penelitian</th><th>Skema</th><th>Tahun</th><th>Jumlah Surat</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {fundedResearches.map((research, index) => {
                const scheme = (data.schemes || []).find(item => item.id === research.schemeId);
                const count = letters.filter(letter => letter.researchId === research.id).length;
                return <tr key={research.id}><td>{index + 1}.</td><td className="ris-proposal-cell"><strong>{research.project && research.project.title}</strong><small>{research.userName || user.name}</small></td><td>{scheme ? scheme.name : '-'}</td><td>{scheme ? scheme.year : '-'}</td><td>{count} pengajuan</td><td><StatusBadge tone="green">Didanai</StatusBadge></td><td><button type="button" className="ris-action blue" onClick={() => history.push(`/ris/pengajuan-surat/new/${research.id}`)}>Buat Surat</button></td></tr>;
              })}
              {fundedResearches.length === 0 && <EmptyRow colSpan={7}>Belum ada penelitian didanai yang dapat digunakan untuk mengajukan surat.</EmptyRow>}
            </tbody>
          </table>
        </div>
      </section>}

      <section className="ris-section-spaced">
        <div className="ris-section-title"><div><h2>{management ? 'Monitoring Pengajuan Surat' : 'Riwayat Pengajuan Surat'}</h2><p>{management ? `${getAdminLetterQueue(data).length} pengajuan membutuhkan tindakan pengelola.` : 'Status diperbarui pada setiap perpindahan proses.'}</p></div></div>
        <div className="ris-letter-filterbar">
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari penelitian, surat, atau pemohon" aria-label="Cari pengajuan surat" />
          <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter status surat">{PROCESS_FILTERS.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</select>
        </div>
        <div className="ris-table-wrap">
          <table className="ris-table ris-action-table">
            <thead><tr><th>No.</th><th>Penelitian</th><th>Jenis Surat</th>{management && <th>Pemohon</th>}<th>Terakhir Diperbarui</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {filteredLetters.map((letter, index) => {
                const meta = letterStatusMeta(letter);
                const type = getLetterTypeMeta(letter.type);
                const action = management ? managementAction(letter) : lecturerAction(letter);
                const path = management ? `/ris/pengajuan-surat/${letter.id}/admin` : action.path;
                return <tr key={letter.id}><td>{index + 1}.</td><td className="ris-proposal-cell"><strong>{getLetterResearchTitle(letter, data)}</strong><small>{letter.id}</small></td><td><strong>{letter.customName || type.shortLabel || type.label}</strong><small className="ris-table-subline">{getLetterTitle(letter)}</small></td>{management && <td>{(letter.applicant && letter.applicant.name) || '-'}</td>}<td>{formatDate(letter.updatedAt || letter.submittedAt)}</td><td><StatusBadge tone={meta.tone}>{meta.label}</StatusBadge></td><td><div className="ris-row-actions"><button type="button" className={`ris-action ${action.tone}`} onClick={() => history.push(path)}>{action.label}</button>{!management && letter.status === LETTER_STATUS.GENERATED && <button type="button" className="ris-action green" onClick={() => downloadFinal(letter)}>Unduh TXT</button>}</div></td></tr>;
              })}
              {filteredLetters.length === 0 && <EmptyRow colSpan={management ? 7 : 6}>Tidak ada pengajuan yang sesuai filter.</EmptyRow>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
