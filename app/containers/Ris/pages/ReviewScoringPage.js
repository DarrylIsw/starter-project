/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import React, { useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useRis } from '../RisContext';
import { Button } from '../components/Ui';
import { REVIEW_CRITERIA, uid } from '../data';
import {
  STATUS, canManageResearch, canScoreDraft, draftReviewerAssignments, draftReviews, reviewerAssignmentForUser, transitionDraftStatus
} from '../workflow';

export default function ReviewScoringPage() {
  const { draftId } = useParams();
  const { data, setData, user } = useRis();
  const history = useHistory();
  const draft = data.drafts.find(item => item.id === draftId);
  const initial = {};
  const [scores, setScores] = useState(initial.scores || Object.fromEntries(REVIEW_CRITERIA.map(item => [item.code, 0])));
  const [recommendation, setRecommendation] = useState(initial.recommendation || 'approve');
  const [notes, setNotes] = useState({
    strengths: initial.strengths || '', weaknesses: initial.weaknesses || '', budgetNotes: initial.budgetNotes || '', outputNotes: initial.outputNotes || '', revisionNotes: initial.revisionNotes || ''
  });
  const groups = useMemo(() => REVIEW_CRITERIA.reduce((result, item) => ({ ...result, [item.group]: [...(result[item.group] || []), item] }), {}), []);
  const weightedScore = REVIEW_CRITERIA.reduce((sum, item) => sum + (((Number(scores[item.code]) || 0) * item.weight) / 100), 0);
  const totalScore = Math.round(weightedScore * 100) / 100;
  const autoRecommendation = totalScore >= 80 ? 'Disetujui' : totalScore >= 55 ? 'Perlu Revisi' : 'Ditolak';
  if (!draft) return <div className="ris-page"><h1>Pengajuan tidak ditemukan</h1></div>;
  if (!canScoreDraft(draft, user)) return <div className="ris-page"><h1>Penilaian tidak dapat diproses</h1></div>;

  const updateScore = (code, value) => setScores(current => ({ ...current, [code]: Math.max(0, Math.min(100, Number(value))) }));
  const updateNote = (key, value) => setNotes(current => ({ ...current, [key]: value }));
  const submit = () => {
    const submittedAt = new Date().toISOString();
    const assignment = reviewerAssignmentForUser(draft, user);
    const review = {
      id: uid('review'), reviewerUserId: user.id, reviewerProfileId: user.profileId || (assignment && assignment.reviewerProfileId), reviewerName: user.name, scores, totalScore, recommendation, ...notes, submittedAt
    };
    setData(current => {
      const decisionMakers = (current.systemUsers || []).filter(item => canManageResearch(item) && item.isActive !== false);
      const notifications = decisionMakers.map(decisionMaker => ({
        id: uid('notif'),
        userId: decisionMaker.id,
        fromUserId: user.id,
        entityType: 'research_draft',
        entityId: draft.id,
        type: 'review_submitted',
        message: `Penilaian untuk "${draft.project.title}" sudah dikirim dan menunggu keputusan akhir.`,
        createdAt: submittedAt,
        isRead: false,
      }));
      const currentDraft = current.drafts.find(item => item.id === draft.id);
      const assignments = draftReviewerAssignments(currentDraft).map(item => (item.reviewerUserId === user.id || item.reviewerProfileId === user.profileId ? { ...item, status: 'submitted', submittedAt } : item));
      const reviews = [...draftReviews(currentDraft).filter(item => item.reviewerUserId !== user.id), review];
      const updatedDraft = currentDraft.status === STATUS.UNDER_REVIEW
        ? transitionDraftStatus(currentDraft, STATUS.REVIEWED, { assignments, reviews })
        : { ...currentDraft, status: STATUS.REVIEWED, draftStatus: STATUS.REVIEWED, assignments, reviews };
      return {
        ...current,
        drafts: current.drafts.map(item => (item.id === draft.id ? updatedDraft : item)),
        notifications: [...(current.notifications || []), ...notifications],
      };
    });
    history.push('/ris');
  };

  return <div className="ris-page"><div className="ris-page-heading"><div><h1>Formulir Penilaian</h1><p>{draft.project.title}</p></div></div><div className="ris-scoring-layout"><div>{Object.entries(groups).map(([group, items]) => <section className="ris-score-group" key={group}><h2>{group}:</h2>{items.map(item => <label key={item.code}><span>{item.label}</span><input type="number" min="0" max="100" value={scores[item.code]} onChange={event => updateScore(item.code, event.target.value)} /></label>)}</section>)}</div><div><section className="ris-score-summary"><h2>Total Skor Penilaian</h2><strong>{totalScore}</strong><p>Rekomendasi Keputusan: <em>{autoRecommendation}</em></p><label><span>Pilih Rekomendasi Keputusan Akhir</span><select value={recommendation} onChange={event => setRecommendation(event.target.value)}><option value="approve">Setujui</option><option value="revise">Perlu Revisi</option><option value="reject">Tolak</option></select></label></section><section className="ris-notes-box"><h2>Catatan Tambahan</h2>{[['strengths', 'Kekuatan', 'Kekuatan proposal...'], ['weaknesses', 'Kekurangan', 'Kekurangan proposal...'], ['budgetNotes', 'Catatan Anggaran', 'Catatan terkait anggaran...'], ['outputNotes', 'Catatan Luaran', 'Catatan terkait luaran...'], ['revisionNotes', 'Catatan Revisi', 'Catatan revisi yang diperlukan...']].map(([key, label, placeholder]) => <label key={key}><span>{label}</span><textarea rows="2" value={notes[key]} onChange={event => updateNote(key, event.target.value)} placeholder={placeholder} /></label>)}</section></div></div><div className="ris-wizard-actions"><Button type="button" tone="gray" pill onClick={() => history.goBack()}>Kembali</Button><Button type="button" pill onClick={submit}>Kirim Penilaian</Button></div></div>;
}
