/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useRis } from '../RisContext';
import Icon from '../components/Icon';
import { Button, EmptyRow } from '../components/Ui';
import { formatDate } from '../data';
import {
  canEditDraft,
  getSchemeDescription,
  getSchemeTitle,
  hasActiveDraftForScheme,
  hasFullAccess,
  isAdmin,
  isEligibleForScheme,
  isOpenScheme,
  isResearcher,
  isStudentApplicant,
} from '../workflow';

const PAGE_SIZE = 5;

export default function SchemesPage() {
  const { data, user } = useRis();
  const history = useHistory();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const schemes = useMemo(() => data.schemes.filter(item => isOpenScheme(item) && `${getSchemeTitle(item)} ${getSchemeDescription(item)}`.toLowerCase().includes(search.toLowerCase())), [data.schemes, search]);
  const pages = Math.max(1, Math.ceil(schemes.length / PAGE_SIZE));
  const rows = schemes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const draftForScheme = scheme => (data.drafts || []).find(item => item.schemeId === scheme.id && item.userId === (user && user.id));

  const disabledReason = scheme => {
    if (hasFullAccess(user)) return '';
    if (isStudentApplicant(user)) return 'Mahasiswa tidak dapat mendaftar skema penelitian internal.';
    if (!isResearcher(user)) return 'Hanya dosen/peneliti yang dapat mendaftar.';
    if (!isEligibleForScheme(scheme, user)) return 'Akun ini tidak termasuk snapshot dosen eligible.';
    const draft = draftForScheme(scheme);
    if (draft && canEditDraft(draft, user)) return '';
    if (hasActiveDraftForScheme(data, user, scheme.id)) return 'Sudah ada draft/pengajuan aktif untuk skema ini.';
    return '';
  };

  return (
    <div className="ris-page">
      <div className="ris-page-heading">
        <div>
          <h1>Skema Penelitian Internal</h1>
          <p>Pilih skema yang masih dibuka dan sesuai eligibility akun aktif.</p>
        </div>
        <div className="ris-heading-actions">
          {isAdmin(user) && <Button tone="green" onClick={() => history.push('/ris/skema/create')}>Buat Skema</Button>}
          <div className="ris-search"><Icon name="search" size={17} /><input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Cari skema..." /></div>
        </div>
      </div>
      <div className="ris-table-wrap">
        <table className="ris-table ris-action-table">
          <thead><tr><th>No.</th><th>Nama skema</th><th>Deskripsi</th><th>Periode</th><th>Aksi</th></tr></thead>
          <tbody>
            {rows.map((scheme, index) => {
              const reason = disabledReason(scheme);
              const draft = draftForScheme(scheme);
              const canContinue = draft && canEditDraft(draft, user);
              return <tr key={scheme.id}><td>{(page - 1) * PAGE_SIZE + index + 1}.</td><td>{getSchemeTitle(scheme)}</td><td>{getSchemeDescription(scheme)}</td><td>{formatDate(scheme.startDate)} - {formatDate(scheme.endDate)}</td><td><button type="button" disabled={Boolean(reason)} title={reason} className={`ris-action ${reason ? 'disabled' : canContinue ? 'yellow' : 'green'}`} onClick={() => history.push(`/ris/pengajuan-penelitian-internal/scheme/${scheme.id}`)}>{canContinue ? 'Lanjutkan' : 'Daftar'}</button></td></tr>;
            })}
            {rows.length === 0 && <EmptyRow colSpan={5}>Tidak ada skema tersedia.</EmptyRow>}
          </tbody>
        </table>
      </div>
      <div className="ris-pagination">
        <button type="button" disabled={page === 1} onClick={() => setPage(value => value - 1)}>«</button>
        {Array.from({ length: pages }, (_, index) => index + 1).map(number => <button type="button" key={number} className={number === page ? 'active' : ''} onClick={() => setPage(number)}>{number}</button>)}
        <button type="button" disabled={page === pages} onClick={() => setPage(value => value + 1)}>»</button>
      </div>
    </div>
  );
}
