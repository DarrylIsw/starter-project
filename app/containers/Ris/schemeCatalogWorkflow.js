/* eslint-disable object-curly-newline, object-property-newline */
import {
  STATUS,
  canEditDraft,
  draftId,
  draftOwnerId,
  draftSchemeId,
  draftStatus,
  isEligibleForScheme,
  isOpenScheme,
} from './workflow';

const STATUS_PRIORITY = {
  [STATUS.DRAFT]: 80,
  [STATUS.REVISION]: 70,
  [STATUS.FUNDED]: 60,
  [STATUS.REVIEWED]: 50,
  [STATUS.UNDER_REVIEW]: 40,
  [STATUS.SUBMITTED]: 30,
  [STATUS.REJECTED]: 20,
};

const draftTimestamp = draft => new Date(draft.updatedAt || draft.lastSavedAt || draft.submittedAt || draft.createdAt || 0).getTime();

export const getUserDrafts = (data, user) => (data.drafts || []).filter(draft => draftOwnerId(draft) === (user && user.id));

export const getUserDraftForScheme = (data, user, schemeId) => getUserDrafts(data, user)
  .filter(draft => draftSchemeId(draft) === schemeId)
  .sort((left, right) => {
    const priority = (STATUS_PRIORITY[draftStatus(right)] || 0) - (STATUS_PRIORITY[draftStatus(left)] || 0);
    return priority || draftTimestamp(right) - draftTimestamp(left);
  })[0] || null;

export const getSchemeCatalogMetrics = (data, user) => {
  const schemes = data.schemes || [];
  const drafts = getUserDrafts(data, user);
  const opened = schemes.filter(isOpenScheme);
  const eligible = opened.filter(scheme => isEligibleForScheme(scheme, user));
  const ready = eligible.filter(scheme => !getUserDraftForScheme(data, user, scheme.id));
  return {
    opened: opened.length,
    eligible: eligible.length,
    applications: drafts.length,
    ready: ready.length,
    funded: drafts.filter(draft => draftStatus(draft) === STATUS.FUNDED).length,
  };
};

export const partitionSchemeCatalog = (schemes, data, user) => schemes.reduce((sections, scheme) => {
  const draft = getUserDraftForScheme(data, user, scheme.id);
  const item = { scheme, draft };
  if (draft && draftStatus(draft) === STATUS.FUNDED) return sections;
  if (draft && canEditDraft(draft, user)) sections.drafts.push(item);
  else if (draft) sections.applications.push(item);
  else if (isOpenScheme(scheme) && isEligibleForScheme(scheme, user)) sections.eligible.push(item);
  else sections.catalog.push(item);
  return sections;
}, { drafts: [], applications: [], eligible: [], catalog: [] });

export const canDeleteProposalDraft = (draft, user) => Boolean(
  draft
  && draftStatus(draft) === STATUS.DRAFT
  && draftOwnerId(draft) === (user && user.id)
);

export const deleteProposalDraftData = (data, draft) => {
  const id = draftId(draft);
  return {
    ...data,
    drafts: (data.drafts || []).filter(item => draftId(item) !== id),
    logbooks: (data.logbooks || []).filter(item => item.researchId !== id && item.proposalId !== id),
    internalReports: (data.internalReports || []).filter(item => item.researchId !== id && item.proposalId !== id),
    monevRecords: (data.monevRecords || []).filter(item => item.researchId !== id && item.proposalId !== id),
    temporaryRoleAssignments: (data.temporaryRoleAssignments || []).filter(item => item.entityId !== id),
    notifications: (data.notifications || []).filter(item => item.entityId !== id && item.researchId !== id),
  };
};
