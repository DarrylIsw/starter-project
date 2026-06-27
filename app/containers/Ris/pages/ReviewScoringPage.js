/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import React, { useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useRis } from '../RisContext';
import { Button } from '../components/Ui';
import { REVIEW_CRITERIA, uid } from '../data';
import {
  ROLE, STATUS, canScoreDraft, normalizeRole
} from '../workflow';

export default function ReviewScoringPage() {
  const { draftId } = useParams();
  const { data, setData, user } = useRis();
  const history = useHistory();
  const draft = data.drafts.find(item => item.id === draftId);
  const initial = draft && draft.review ? draft.review : {};
  const [scores, setScores] = useState(initial.scores || Object.fromEntries(REVIEW_CRITERIA.map(item => [item.code, 0])));
  const [recommendation, setRecommendation] = useState(initial.recommendation || 'approve');
  const [notes, setNotes] = useState({
    strengths: initial.strengths || '', weaknesses: initial.weaknesses || '', budgetNotes: initial.budgetNotes || '', outputNotes: initial.outputNotes || '', revisionNotes: initial.revisionNotes || ''
  });
  const groups = useMemo(() => REVIEW_CRITERIA.reduce((result, item) => ({ ...result, [item.group]: [...(result[item.group] || []), item] }), {}), []);
  const weightedScore = REVIEW_CRITERIA.reduce((sum, item) => sum + (((Number(scores[item.code]) || 0) * item.weight) / 100), 0);
  const totalScore = Math.round(weightedScore * 100) / 100;
  const autoRecommendation = totalScore >= 80 ? 'Approve' : totalScore >= 55 ? 'Revise' : 'Reject';
  if (!draft) return <div className="ris-page"><h1>Pengajuan tidak ditemukan</h1></div>;
  if (!canScoreDraft(draft, user)) return <div className="ris-page"><h1>Penilaian tidak dapat diproses</h1></div>;

  const updateScore = (code, value) => setScores(current => ({ ...current, [code]: Math.max(0, Math.min(100, Number(value))) }));
  const updateNote = (key, value) => setNotes(current => ({ ...current, [key]: value }));
  const submit = () => {
    const submittedAt = new Date().toISOString();
    const review = {
      scores, totalScore, recommendation, ...notes, submittedAt
    };
    setData(current => {
      const managers = (current.systemUsers || []).filter(item => normalizeRole(item.role) === ROLE.SUPER_ADMIN && item.isActive !== false);
      const notifications = managers.map(manager => ({
        id: uid('notif'),
        userId: manager.id,
        fromUserId: user.id,
        entityType: 'research_draft',
        entityId: draft.id,
        type: 'review_submitted',
        message: `Penilaian reviewer untuk "${draft.project.title}" sudah disubmit dan menunggu keputusan Kepala LPPM.`,
        createdAt: submittedAt,
        isRead: false,
      }));
      return {
        ...current,
        drafts: current.drafts.map(item => (item.id === draft.id ? { ...item, status: STATUS.UNDER_REVIEW, draftStatus: STATUS.UNDER_REVIEW, assignment: { ...(item.assignment || {}), status: 'submitted', submittedAt: review.submittedAt }, review } : item)),
        notifications: [...(current.notifications || []), ...notifications],
      };
    });
    history.push('/ris');
  };

  return <div className="ris-page"><div className="ris-page-heading"><div><h1>Form Penilaian Review</h1><p>{draft.project.title}</p></div></div><div className="ris-scoring-layout"><div>{Object.entries(groups).map(([group, items]) => <section className="ris-score-group" key={group}><h2>{group}:</h2>{items.map(item => <label key={item.code}><span>{item.label}</span><input type="number" min="0" max="100" value={scores[item.code]} onChange={event => updateScore(item.code, event.target.value)} /></label>)}</section>)}</div><div><section className="ris-score-summary"><h2>Total Skor Perhitungan Penilaian Review</h2><strong>{totalScore}</strong><p>Rekomendasi Keputusan: <em>{autoRecommendation}</em></p><label><span>Pilih Rekomendasi Keputusan Final</span><select value={recommendation} onChange={event => setRecommendation(event.target.value)}><option value="approve">Approve</option><option value="revise">Revise</option><option value="reject">Reject</option></select></label></section><section className="ris-notes-box"><h2>Catatan Tambahan</h2>{[['strengths', 'Kekuatan', 'Kekuatan proposal...'], ['weaknesses', 'Kekurangan', 'Kekurangan proposal...'], ['budgetNotes', 'Catatan Anggaran', 'Catatan terkait anggaran...'], ['outputNotes', 'Catatan Luaran', 'Catatan terkait luaran...'], ['revisionNotes', 'Catatan Revisi', 'Catatan revisi yang diperlukan...']].map(([key, label, placeholder]) => <label key={key}><span>{label}</span><textarea rows="2" value={notes[key]} onChange={event => updateNote(key, event.target.value)} placeholder={placeholder} /></label>)}</section></div></div><div className="ris-wizard-actions"><Button type="button" tone="gray" pill onClick={() => history.goBack()}>Back</Button><Button type="button" pill onClick={submit}>Submit Penilaian</Button></div></div>;
}
