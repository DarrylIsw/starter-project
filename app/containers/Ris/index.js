/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { Redirect, Route, Switch } from 'react-router-dom';
import { RisProvider, useRis } from './RisContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SchemesPage from './pages/SchemesPage';
import SchemeCreatePage from './pages/SchemeCreatePage';
import ProposalWizardPage from './pages/ProposalWizardPage';
import ProposalPreviewPage from './pages/ProposalPreviewPage';
import ReviewerAssignmentPage from './pages/ReviewerAssignmentPage';
import ReviewScoringPage from './pages/ReviewScoringPage';
import ContractPage from './pages/ContractPage';
import OutputReportPage from './pages/OutputReportPage';
import LogbookPage from './pages/LogbookPage';
import LetterDashboardPage from './pages/LetterDashboardPage';
import LetterWizardPage from './pages/LetterWizardPage';
import LetterDetailPage from './pages/LetterDetailPage';
import ExternalResearchDashboardPage from './pages/ExternalResearchDashboardPage';
import ExternalResearchWizardPage from './pages/ExternalResearchWizardPage';
import ExternalResearchDetailPage from './pages/ExternalResearchDetailPage';
import ResearcherProfileDashboardPage from './pages/ResearcherProfileDashboardPage';
import ResearcherProfileEditorPage from './pages/ResearcherProfileEditorPage';
import ResearcherProfileDetailPage from './pages/ResearcherProfileDetailPage';
import {
  canAccessExternalResearch,
  canAccessLetters,
  canAccessResearchReports,
  canAccessResearchSubmission,
  canAccessSchemeManagement,
  canAssignReviewer,
  canDecideDraft,
  canReviewerViewDraft,
  canScoreDraft,
  canSignContract,
  canVerifyDraft,
  isAdmin,
  isManager,
  isResearcher,
  isStudentApplicant,
} from './workflow';
import { canEditLetter, canViewLetter, isApplicantUser } from './letterWorkflow';
import {
  canAdminReviewExternalReport,
  canArchiveExternalReport,
  canCreateExternalReport,
  canEditExternalReport,
  canViewExternalReport,
} from './externalResearchWorkflow';
import { canOpenProfileModule, canViewProfile, canEditProfile, getProfileById } from './researcherProfileWorkflow';
import './ris.css';

function LoginRoute() {
  const { user } = useRis();
  return user ? <Redirect to="/ris" /> : <LoginPage />;
}

function Unauthorized() {
  return (
    <div className="ris-page">
      <h1>Akses tidak diizinkan</h1>
      <p className="ris-muted">Halaman ini tidak sesuai dengan role, status proposal, atau penugasan akun aktif.</p>
    </div>
  );
}

function GuardedRoute({ component: Component, render, allow, ...rest }) {
  const { data, user } = useRis();
  return (
    <Route
      {...rest}
      render={props => {
        if (!allow({ data, user, props })) return <Unauthorized />;
        if (Component) return <Component {...props} />;
        return render(props);
      }}
    />
  );
}

GuardedRoute.propTypes = {
  component: PropTypes.elementType,
  render: PropTypes.func,
  allow: PropTypes.func.isRequired,
};
GuardedRoute.defaultProps = { component: null, render: null };

const draftFor = (data, props) => data.drafts.find(item => item.id === props.match.params.draftId);
const letterFor = (data, props) => (data.letterRequests || []).find(item => item.id === props.match.params.letterId);
const externalReportFor = (data, props) => (data.externalResearchReports || []).find(item => item.id === props.match.params.reportId);
const researcherProfileFor = (data, props) => getProfileById(data, props.match.params.profileId);

function ProtectedArea() {
  const { user } = useRis();
  if (!user) return <Redirect to="/login" />;
  return (
    <Layout>
      <Switch>
        <Route exact path="/ris" component={DashboardPage} />
        <GuardedRoute exact path="/ris/pengajuan-penelitian-internal" component={SchemesPage} allow={({ user: activeUser }) => canAccessResearchSubmission(activeUser)} />
        <GuardedRoute exact path="/ris/skema/create" component={SchemeCreatePage} allow={({ user: activeUser }) => canAccessSchemeManagement(activeUser)} />
        <GuardedRoute exact path="/ris/pengajuan-penelitian-internal/scheme/:schemeId" component={ProposalWizardPage} allow={({ user: activeUser }) => (isResearcher(activeUser) && !isStudentApplicant(activeUser)) || isManager(activeUser)} />
        <GuardedRoute exact path="/ris/pengajuan-penelitian-internal/:draftId/verifikasi" render={() => <ProposalPreviewPage mode="verify" />} allow={({ data, user: activeUser, props }) => canVerifyDraft(draftFor(data, props), activeUser)} />
        <GuardedRoute exact path="/ris/pengajuan-penelitian-internal/:draftId/reviewer-preview" render={() => <ProposalPreviewPage mode="reviewer" />} allow={({ data, user: activeUser, props }) => canReviewerViewDraft(draftFor(data, props), activeUser)} />
        <GuardedRoute exact path="/ris/pengajuan-penelitian-internal/:draftId/buat-keputusan" render={() => <ProposalPreviewPage mode="decision" />} allow={({ data, user: activeUser, props }) => canDecideDraft(draftFor(data, props), activeUser)} />
        <GuardedRoute exact path="/ris/pengajuan-penelitian-internal/:draftId/pemilihan-reviewer" component={ReviewerAssignmentPage} allow={({ data, user: activeUser, props }) => canAssignReviewer(draftFor(data, props), activeUser)} />
        <GuardedRoute exact path="/ris/pengajuan-penelitian-internal/:draftId/penilaian" component={ReviewScoringPage} allow={({ data, user: activeUser, props }) => canScoreDraft(draftFor(data, props), activeUser)} />
        <GuardedRoute exact path="/ris/pengajuan-penelitian-internal/:draftId/ttd-kontrak" component={ContractPage} allow={({ data, user: activeUser, props }) => canSignContract(draftFor(data, props), activeUser)} />
        <Route exact path="/ris/pengajuan-penelitian-internal/:draftId/preview" render={() => <ProposalPreviewPage mode="preview" />} />
        <GuardedRoute exact path="/ris/pengajuan-surat" component={LetterDashboardPage} allow={({ user: activeUser }) => canAccessLetters(activeUser)} />
        <GuardedRoute exact path="/ris/pengajuan-surat/new/:letterType" component={LetterWizardPage} allow={({ user: activeUser }) => isApplicantUser(activeUser)} />
        <GuardedRoute exact path="/ris/pengajuan-surat/:letterId/edit" component={LetterWizardPage} allow={({ data, user: activeUser, props }) => canEditLetter(letterFor(data, props), activeUser)} />
        <GuardedRoute exact path="/ris/pengajuan-surat/:letterId/detail" component={LetterDetailPage} allow={({ data, user: activeUser, props }) => canViewLetter(letterFor(data, props), activeUser)} />
        <GuardedRoute exact path="/ris/pengajuan-surat/:letterId/admin" render={props => <LetterDetailPage {...props} mode="admin" />} allow={({ data, user: activeUser, props }) => isAdmin(activeUser) && canViewLetter(letterFor(data, props), activeUser)} />
        <GuardedRoute exact path="/ris/penelitian-eksternal" component={ExternalResearchDashboardPage} allow={({ user: activeUser }) => canAccessExternalResearch(activeUser)} />
        <GuardedRoute exact path="/ris/penelitian-eksternal/new" component={ExternalResearchWizardPage} allow={({ user: activeUser }) => canCreateExternalReport(activeUser)} />
        <GuardedRoute exact path="/ris/penelitian-eksternal/:reportId/edit" component={ExternalResearchWizardPage} allow={({ data, user: activeUser, props }) => canEditExternalReport(externalReportFor(data, props), activeUser)} />
        <GuardedRoute exact path="/ris/penelitian-eksternal/:reportId/detail" component={ExternalResearchDetailPage} allow={({ data, user: activeUser, props }) => canViewExternalReport(externalReportFor(data, props), activeUser)} />
        <GuardedRoute exact path="/ris/penelitian-eksternal/:reportId/admin" render={props => <ExternalResearchDetailPage {...props} mode="admin" />} allow={({ data, user: activeUser, props }) => (canAdminReviewExternalReport(externalReportFor(data, props), activeUser) || canArchiveExternalReport(externalReportFor(data, props), activeUser))} />
        <GuardedRoute exact path="/ris/profil-peneliti" component={ResearcherProfileDashboardPage} allow={({ user: activeUser }) => canOpenProfileModule(activeUser)} />
        <GuardedRoute exact path="/ris/profil-peneliti/:profileId/detail" component={ResearcherProfileDetailPage} allow={({ data, user: activeUser, props }) => canViewProfile(researcherProfileFor(data, props), activeUser)} />
        <GuardedRoute exact path="/ris/profil-peneliti/:profileId/edit" component={ResearcherProfileEditorPage} allow={({ data, user: activeUser, props }) => props.match.params.profileId === 'me' || canEditProfile(researcherProfileFor(data, props), activeUser)} />
        <GuardedRoute exact path="/ris/laporan-luaran" component={OutputReportPage} allow={({ user: activeUser }) => canAccessResearchReports(activeUser)} />
        <GuardedRoute exact path="/ris/logbook" component={LogbookPage} allow={({ user: activeUser }) => canAccessResearchReports(activeUser)} />
        <Redirect to="/ris" />
      </Switch>
    </Layout>
  );
}

export default function RisApp() {
  return <RisProvider><Switch><Route exact path="/login" component={LoginRoute} /><Route path="/ris" component={ProtectedArea} /><Redirect exact from="/" to="/login" /><Redirect to="/login" /></Switch></RisProvider>;
}
