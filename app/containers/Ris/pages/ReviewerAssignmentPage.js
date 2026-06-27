/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import React, { useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useRis } from '../RisContext';
import { Button, EmptyRow, PageBack } from '../components/Ui';
import { SDGS } from '../data';
import { STATUS, canAssignReviewer, getSchemeTitle } from '../workflow';

export default function ReviewerAssignmentPage() {
  const { draftId } = useParams();
  const { data, setData, user } = useRis();
  const history = useHistory();
  const draft = data.drafts.find(item => item.id === draftId);
  const [selectedId, setSelectedId] = useState(draft && draft.assignment ? draft.assignment.reviewerId : '');
  const [error, setError] = useState('');
  if (!draft) return <div className="ris-page"><h1>Pengajuan tidak ditemukan</h1></div>;
  if (!canAssignReviewer(draft, user)) return <div className="ris-page"><h1>Proposal tidak dapat ditugaskan reviewer</h1></div>;
  const scheme = data.schemes.find(item => item.id === draft.schemeId) || {};
  const selected = data.reviewers.find(item => item.id === selectedId);

  const submit = () => {
    if (!selectedId) { setError('Pilih satu reviewer terlebih dahulu.'); return; }
    setData(current => ({ ...current, drafts: current.drafts.map(item => (item.id === draft.id ? { ...item, status: STATUS.UNDER_REVIEW, draftStatus: STATUS.UNDER_REVIEW, assignment: { reviewerId: selectedId, reviewerUserId: selected.userId, reviewerProfileId: selected.id, status: 'assigned', assignedAt: new Date().toISOString(), assignedBy: user.id } } : item)) }));
    history.push('/ris');
  };

  return <div className="ris-page"><PageBack onClick={() => history.goBack()} /><h1>Pemilihan Reviewer</h1>
    <div className="ris-reviewer-layout"><aside className="ris-proposal-summary"><h2>Ringkasan Proposal</h2><dl><div><dt>Judul Penelitian</dt><dd>{draft.project.title}</dd></div><div><dt>Skema</dt><dd>{getSchemeTitle(scheme)}</dd></div><div><dt>Ketua</dt><dd>{draft.members[0] ? draft.members[0].name : '-'}</dd></div><div><dt>Luaran Utama</dt><dd>{draft.project.mandatoryOutputPlan}</dd></div><div><dt>SDGs</dt><dd>{draft.project.sdgs.map(id => { const sdg = SDGS.find(item => item.id === id); return sdg ? sdg.name : id; }).join(', ')}</dd></div></dl></aside>
      <section className="ris-reviewer-list"><h2>List Reviewer</h2><div className="ris-table-wrap"><table className="ris-table ris-table-left"><thead><tr><th>No.</th><th>Nama Reviewer</th><th>Afiliasi</th><th>Keahlian</th><th>Jumlah Review</th><th /></tr></thead><tbody>{data.reviewers.map((reviewer, index) => <tr key={reviewer.id}><td>{index + 1}.</td><td><strong>{reviewer.name}</strong></td><td>{reviewer.affiliation}</td><td><div className="ris-chip-list">{reviewer.expertise.map(item => <span key={item}>{item}</span>)}</div></td><td>{reviewer.reviewCount}</td><td><button type="button" className={`ris-action ${selectedId === reviewer.id ? 'green' : 'disabled'}`} onClick={() => setSelectedId(reviewer.id)}>Pilih</button></td></tr>)}{data.reviewers.length === 0 && <EmptyRow colSpan={6}>Tidak ada reviewer tersedia.</EmptyRow>}</tbody></table></div></section>
    </div>
    <div className="ris-bottom-bar"><div><strong>Reviewer yang Dipilih: </strong><b>{selected ? selected.name : '-'}</b></div><div>{error && <span className="ris-inline-error">{error}</span>}<Button type="button" tone="gray" onClick={() => setSelectedId('')}>Reset</Button><Button type="button" onClick={submit}>Submit</Button></div></div>
  </div>;
}
