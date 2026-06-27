/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
export const ROLE = {
  SUPER_ADMIN: 'super_admin',
  LPPM_ADMIN: 'lppm_admin',
  REVIEWER: 'reviewer',
  RESEARCHER: 'researcher',
  FINANCE: 'finance',
  GUEST: 'guest',
};

export const LEGACY_ROLE_MAP = {
  lecturer: ROLE.RESEARCHER,
  admin: ROLE.LPPM_ADMIN,
  approval_manager: ROLE.SUPER_ADMIN,
};

export const STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  REVISION: 'revision',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const LEGACY_STATUS_MAP = {
  incomplete_data: STATUS.REVISION,
  assigned: STATUS.UNDER_REVIEW,
  reviewed: STATUS.UNDER_REVIEW,
  revision_required: STATUS.REVISION,
};

export const ROLE_LABELS = {
  [ROLE.RESEARCHER]: 'Dosen / Peneliti',
  [ROLE.LPPM_ADMIN]: 'Admin LPPM',
  [ROLE.REVIEWER]: 'Reviewer',
  [ROLE.SUPER_ADMIN]: 'Kepala LPPM',
  [ROLE.FINANCE]: 'Keuangan',
  [ROLE.GUEST]: 'Guest',
};

export const normalizeRole = role => LEGACY_ROLE_MAP[role] || role;
export const normalizeStatus = status => LEGACY_STATUS_MAP[status] || status;
export const isResearcher = user => [ROLE.RESEARCHER, ROLE.REVIEWER].includes(normalizeRole(user && user.role));
export const isManager = user => normalizeRole(user && user.role) === ROLE.SUPER_ADMIN;
export const hasFullAccess = isManager;
export const isAdmin = user => [ROLE.LPPM_ADMIN, ROLE.SUPER_ADMIN].includes(normalizeRole(user && user.role));
export const isReviewer = user => normalizeRole(user && user.role) === ROLE.REVIEWER;
export const isStudentApplicant = user => {
  const role = normalizeRole(user && user.role);
  const applicantType = String((user && (user.applicantType || user.applicantKind)) || '').toLowerCase();
  return role === 'student' || applicantType.includes('mahasiswa') || applicantType.includes('student');
};

export const canAccessResearchSubmission = user => Boolean(user) && !isStudentApplicant(user) && (isResearcher(user) || isAdmin(user));
export const canAccessSchemeManagement = user => Boolean(user) && isAdmin(user);
export const canAccessLetters = user => Boolean(user) && (isResearcher(user) || isAdmin(user));
export const canAccessExternalResearch = user => Boolean(user) && (isResearcher(user) || isAdmin(user));
export const canAccessResearcherProfiles = user => Boolean(user) && (isResearcher(user) || isAdmin(user));
export const canAccessResearchReports = user => Boolean(user) && (isResearcher(user) || isAdmin(user));

export const getRoleLabel = user => (user && user.applicantType) || ROLE_LABELS[normalizeRole(user && user.role)] || 'User';

export const isOpenScheme = scheme => ['open', 'published', 'active'].includes(scheme && (scheme.status || scheme.schemeStatus || scheme.scheme_status));

const schemeEligibleProfiles = scheme => scheme && (scheme.eligibleProfileIds || scheme.eligibleLecturerIds || []);
const schemeEligibleUsers = scheme => scheme && (scheme.eligibleUserIds || []);

export const isEligibleForScheme = (scheme, user) => {
  if (hasFullAccess(user)) return true;
  if (!scheme || !isResearcher(user) || isStudentApplicant(user)) return false;
  const profileIds = schemeEligibleProfiles(scheme);
  const userIds = schemeEligibleUsers(scheme);
  if (!profileIds.length && !userIds.length) return true;
  return profileIds.includes(user.profileId) || userIds.includes(user.id);
};

export const getSchemeTitle = scheme => (scheme && (scheme.name || scheme.schemeName || scheme.scheme_name)) || '-';
export const getSchemeDescription = scheme => (scheme && (scheme.description || scheme.schemeDescription || scheme.scheme_description)) || '';

export const draftStatus = draft => normalizeStatus(draft && (draft.status || draft.draftStatus || draft.draft_status));
export const draftOwnerId = draft => draft && (draft.userId || draft.user_id);
export const draftId = draft => draft && (draft.id || draft.draft_id);
export const draftSchemeId = draft => draft && (draft.schemeId || draft.scheme_id);

export const isDraftOwner = (draft, user) => draftOwnerId(draft) === (user && user.id);
export const canEditDraft = (draft, user) => (hasFullAccess(user) || (isResearcher(user) && !isStudentApplicant(user) && isDraftOwner(draft, user))) && [STATUS.DRAFT, STATUS.REVISION].includes(draftStatus(draft));
export const canVerifyDraft = (draft, user) => isAdmin(user) && draftStatus(draft) === STATUS.SUBMITTED;
export const canAssignReviewer = (draft, user) => isAdmin(user) && draftStatus(draft) === STATUS.SUBMITTED && draft && draft.verification && draft.verification.status === 'verified';

export const assignedReviewerId = draft => draft && draft.assignment && (draft.assignment.reviewerUserId || draft.assignment.reviewerId || draft.assignment.reviewer_id);
export const assignedReviewerProfileId = draft => draft && draft.assignment && (draft.assignment.reviewerProfileId || draft.assignment.reviewer_profile_id || draft.assignment.reviewerId);
export const assignmentStatus = draft => draft && draft.assignment && (draft.assignment.status || 'assigned');
export const hasSubmittedReview = draft => Boolean(draft && draft.review && draft.review.submittedAt);

export const canReviewerViewDraft = (draft, user) => {
  if (hasFullAccess(user)) return draftStatus(draft) === STATUS.UNDER_REVIEW;
  if (!isReviewer(user) || draftStatus(draft) !== STATUS.UNDER_REVIEW) return false;
  return assignedReviewerId(draft) === user.id || assignedReviewerProfileId(draft) === user.profileId;
};

export const canScoreDraft = (draft, user) => canReviewerViewDraft(draft, user) && (hasFullAccess(user) || assignmentStatus(draft) !== 'submitted');
export const canDecideDraft = (draft, user) => isManager(user) && draftStatus(draft) === STATUS.UNDER_REVIEW && hasSubmittedReview(draft) && !draft.decision;
export const canSignContract = (draft, user) => (hasFullAccess(user) || (isResearcher(user) && isDraftOwner(draft, user))) && draftStatus(draft) === STATUS.APPROVED;
export const canReportResearch = (draft, user) => draftStatus(draft) === STATUS.APPROVED && (!isResearcher(user) || isDraftOwner(draft, user));

export const hasActiveDraftForScheme = (data, user, schemeId, excludeDraftId) => (data.drafts || []).some(draft => {
  const sameOwner = isDraftOwner(draft, user);
  const sameScheme = draftSchemeId(draft) === schemeId;
  const notExcluded = draftId(draft) !== excludeDraftId;
  const active = [STATUS.DRAFT, STATUS.SUBMITTED, STATUS.UNDER_REVIEW, STATUS.REVISION, STATUS.APPROVED].includes(draftStatus(draft));
  return sameOwner && sameScheme && notExcluded && active;
});

export const validateOutputDetails = output => {
  if (!output.title || !output.targetYear || !output.description || !output.category) return false;
  if (output.category === 'jurnal') return output.journalTargetLevel && output.journalIndexTarget && output.publicationType && (output.publicationType !== 'internasional' || output.targetQuartile);
  if (output.category === 'prosiding') return output.proceedingType && output.indexTarget;
  if (output.category === 'buku') return output.bookType && output.publisherTarget;
  if (output.category === 'hki') return output.hkiType && output.targetRegistrationYear;
  if (output.category === 'produk_prototipe' || output.category === 'product' || output.category === 'prototype') return output.productType && output.targetTkt && output.expectedOutputForm;
  return true;
};


const outputTypeMap = {
  jurnal: 'journal',
  journal: 'journal',
  prosiding: 'proceeding',
  proceeding: 'proceeding',
  buku: 'book',
  book: 'book',
  hki: 'hki',
  produk_prototipe: 'prototype',
  'produk/prototipe': 'prototype',
  product: 'product',
  prototype: 'prototype',
  other: 'dataset',
};

const memberTypeMap = {
  internal_lecturer: 'internal',
  external_lecturer: 'external',
  student: 'student',
};

const memberRoleMap = {
  ketua: 'leader',
  leader: 'leader',
  member: 'member',
  assistant: 'assistant',
};

export const requiredAttachmentCategories = (scheme, members) => {
  const categories = ['proposal', 'rab'];
  const schemeName = getSchemeTitle(scheme).toLowerCase();
  if (schemeName.includes('kerjasama')) categories.push('moa');
  if ((members || []).some(item => item.type === 'student')) categories.push('student_letter');
  return categories;
};

export const validateDraftSections = (draft, scheme) => {
  const project = draft.project || {};
  const members = draft.members || [];
  const budgets = draft.budgets || [];
  const outputs = draft.outputs || [];
  const files = draft.files || [];
  const projectOk = Boolean(project.title && project.mandatoryOutputPlan && project.targetTkt && project.ripRelation && project.researchCenterRelation && (project.researchCenterRelation !== 'other' || project.researchCenterOther) && (project.sdgs || []).length && project.integrated !== null && (!project.integrated || (project.courseName && project.academicYear)));
  const membersOk = members.length >= 2 && members.some(item => item.role === 'ketua') && members.every(item => item.name && (item.nidn || item.nim) && item.program && item.faculty);
  const budgetOk = budgets.length > 0 && budgets.every(item => item.component && item.name && Number(item.volume) > 0 && item.unit && Number(item.unitPrice) > 0);
  const outputsOk = outputs.length > 0 && outputs.some(item => item.type === 'wajib') && outputs.every(validateOutputDetails);
  const attachmentsOk = requiredAttachmentCategories(scheme, members).every(category => files.some(file => file.category === category && file.name));
  const additionalAttachmentsOk = files.filter(file => !requiredAttachmentCategories(scheme, members).includes(file.category)).every(file => file.category && file.name);
  return {
    project: projectOk,
    members: membersOk,
    budget: budgetOk,
    outputs: outputsOk,
    attachments: attachmentsOk && additionalAttachmentsOk,
  };
};

export const validateDraftForSubmit = (draft, scheme) => {
  const checks = validateDraftSections(draft, scheme);
  if (!checks.project) return 'Lengkapi seluruh data proyek yang wajib diisi.';
  if (!checks.members) return 'Lengkapi data ketua dan minimal satu anggota.';
  if (!checks.budget) return 'Lengkapi minimal satu item anggaran.';
  if (!checks.outputs) return 'Lengkapi data luaran wajib dan tambahan.';
  if (!checks.attachments) return 'Lengkapi seluruh lampiran wajib dan lampiran tambahan.';
  return '';
};

export const toDbDraftSnapshot = (draft, scheme) => {
  const checks = validateDraftSections(draft, scheme);
  const requiredFiles = requiredAttachmentCategories(scheme, draft.members || []);
  const uploadedRequired = requiredFiles.filter(category => (draft.files || []).some(file => file.category === category && file.name));
  const projectId = `${draft.id}-project`;
  const budgetTotal = (draft.budgets || []).reduce((sum, item) => sum + (Number(item.volume) || 0) * (Number(item.unitPrice) || 0), 0);
  return {
    research_drafts: {
      draft_id: draft.id,
      user_id: draft.userId,
      scheme_id: draft.schemeId,
      created_by: draft.createdBy || draft.userId,
      draft_status: draftStatus(draft),
      current_step: ['project', 'members', 'budget', 'outputs', 'attachments'][Math.max(0, Math.min((draft.currentStep || 1) - 1, 4))],
      completion_project: checks.project,
      completion_member: checks.members,
      completion_budget: checks.budget,
      completion_attachment: checks.attachments,
      attachment_required_count: requiredFiles.length,
      attachment_uploaded_count: uploadedRequired.length,
      submitted_at: draft.submittedAt || null,
      approved_at: draft.approvedAt || null,
      created_at: draft.createdAt || null,
      updated_at: draft.updatedAt || null,
      last_saved_at: draft.lastSavedAt || null,
    },
    draft_projects: {
      id: projectId,
      draft_id: draft.id,
      project_title: draft.project.title,
      research_scheme: getSchemeTitle(scheme),
      mandatory_output_plan: draft.project.mandatoryOutputPlan,
      additional_output_plan: (draft.project.additionalOutputPlans || []).join(', ') || draft.project.additionalOutputPlan || null,
      additional_output_plans: draft.project.additionalOutputPlans || [],
      multitarget_tkt: Number(draft.project.targetTkt) || null,
      rip_relation: draft.project.ripRelation,
      research_center_relation: draft.project.researchCenterRelation,
      research_center_other: draft.project.researchCenterOther || null,
      is_course_integrated: Boolean(draft.project.integrated),
      course_name: draft.project.integrated ? draft.project.courseName : null,
      academic_year: draft.project.integrated ? draft.project.academicYear : null,
    },
    draft_project_sdg: (draft.project.sdgs || []).map(code => ({
      id: `${projectId}-sdg-${code}`,
      project_id: projectId,
      sdg_code: String(code),
    })),
    draft_members: (draft.members || []).map(member => ({
      member_id: member.id,
      draft_id: draft.id,
      member_type: memberTypeMap[member.type] || 'external',
      member_name: member.name,
      member_identifier: member.nidn || member.nim || '',
      member_role: memberRoleMap[member.role] || 'member',
      member_orcid: member.orcid || null,
      member_program: member.program,
      member_faculty: member.faculty,
    })),
    draft_budgets: {
      id: `${draft.id}-budget`,
      draft_id: draft.id,
      budget_status: checks.budget ? 'completed' : 'draft',
      total_budget: budgetTotal,
      total_items: (draft.budgets || []).length,
      mandatory_component_check: checks.budget,
    },
    draft_budget_items: (draft.budgets || []).map(item => ({
      item_id: item.id,
      draft_id: draft.id,
      category_id: item.tab,
      item_name: item.name,
      volume: Number(item.volume) || 0,
      unit: item.unit,
      budget_component: item.component,
      unit_price: Number(item.unitPrice) || 0,
      total_price: (Number(item.volume) || 0) * (Number(item.unitPrice) || 0),
      notes: item.notes || null,
    })),
    draft_outputs: (draft.outputs || []).map(output => ({
      id: output.id,
      draft_id: draft.id,
      output_type: outputTypeMap[output.category] || 'dataset',
      output_category: output.type,
      output_title: output.title,
      target_year: Number(output.targetYear) || null,
      description: output.description,
    })),
    draft_output_details: (draft.outputs || []).map(output => ({
      output_id: output.id,
      output_type: outputTypeMap[output.category] || 'dataset',
      title: output.title,
      target_journal: output.journalTargetLevel || null,
      indexing_target: output.journalIndexTarget || output.indexTarget || null,
      target_conference: output.proceedingType || null,
      publisher_plan: output.publisherTarget || null,
      hki_type: output.hkiType || null,
      product_name: output.productType || null,
      technology_field: output.expectedOutputForm || null,
    })),
    draft_files: (draft.files || []).map((file, index) => ({
      file_id: file.id,
      draft_id: draft.id,
      file_category: file.category,
      file_context: 'proposal_submission',
      file_name: file.name,
      file_path: file.filePath || file.name,
      file_size: file.size,
      file_type: file.type,
      file_version: file.fileVersion || index + 1,
      uploaded_by: draft.userId,
      uploaded_at: file.uploadedAt || draft.updatedAt || draft.lastSavedAt || null,
      is_active: true,
    })),
  };
};
