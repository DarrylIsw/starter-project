/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import {
  ROLE, isAdmin, isManager, normalizeRole
} from './workflow';

export const EXTERNAL_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  REVISION_REQUESTED: 'revision_requested',
  VALIDATED: 'validated',
  ARCHIVED: 'archived',
};

export const EXTERNAL_STATUS_META = {
  [EXTERNAL_STATUS.DRAFT]: { label: 'Draft', tone: 'gray' },
  [EXTERNAL_STATUS.SUBMITTED]: { label: 'Submitted', tone: 'cyan' },
  [EXTERNAL_STATUS.UNDER_REVIEW]: { label: 'Under Review', tone: 'blue' },
  [EXTERNAL_STATUS.REVISION_REQUESTED]: { label: 'Revision Requested', tone: 'orange' },
  [EXTERNAL_STATUS.VALIDATED]: { label: 'Validated', tone: 'green' },
  [EXTERNAL_STATUS.ARCHIVED]: { label: 'Archived', tone: 'purple' },
};

export const ACTIVITY_STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
];

export const ACTIVITY_TYPE_OPTIONS = [
  { value: 'external', label: 'External' },
  { value: 'mandiri', label: 'Mandiri' },
];

export const ROLE_IN_RESEARCH_OPTIONS = [
  { value: 'ketua', label: 'Ketua' },
  { value: 'anggota', label: 'Anggota' },
];

export const RIP_OPTIONS = [
  'ICT-Based',
  'Business, Digital Behavior & Technopreneurship',
  'Digital Content & Digital Media Management',
  'Design, Product & Multimedia for Industry',
].map(item => ({ value: item, label: item }));

export const RESEARCH_CATEGORY_OPTIONS = [
  { value: 'grant', label: 'Grant / Hibah', description: 'Hibah penelitian nasional atau internasional.', icon: 'document' },
  { value: 'partner', label: 'Partner Collaboration', description: 'Kerja sama penelitian dengan mitra non-perguruan tinggi.', icon: 'layers' },
  { value: 'university', label: 'University Collaboration', description: 'Kerja sama dengan universitas dalam atau luar negeri.', icon: 'dashboard' },
  { value: 'independent', label: 'Independent / Mandiri', description: 'Penelitian mandiri, PRO-STEP, atau kerja sama mandiri.', icon: 'report' },
];

export const GRANT_TYPE_OPTIONS = [
  { value: 'nasional', label: 'Nasional' },
  { value: 'internasional', label: 'Internasional' },
];

export const INDEPENDENT_TYPE_OPTIONS = [
  { value: 'mandiri', label: 'Mandiri' },
  { value: 'prostep', label: 'PRO-STEP' },
  { value: 'kerjasama_dn', label: 'Kerja Sama Dalam Negeri' },
  { value: 'kerjasama_ln', label: 'Kerja Sama Luar Negeri' },
];

export const OUTPUT_TYPE_OPTIONS = [
  { value: 'journal', label: 'Journal' },
  { value: 'prototype', label: 'Prototype' },
  { value: 'proceeding', label: 'Proceeding' },
  { value: 'hki', label: 'HKI' },
  { value: 'book', label: 'Book' },
];

export const EXTERNAL_DOCUMENT_TYPES = [
  { value: 'proposal', label: 'Proposal' },
  { value: 'budget_plan', label: 'Budget Plan / RAB' },
  { value: 'contract', label: 'Contract' },
  { value: 'mou', label: 'MoU / MoA' },
  { value: 'collaboration_proof', label: 'Collaboration Proof' },
  { value: 'student_involvement', label: 'Student Involvement' },
  { value: 'final_report', label: 'Final Report' },
  { value: 'integration_proof', label: 'Integration Proof' },
  { value: 'other', label: 'Other Supporting Document' },
];

export const REQUIRED_DOCUMENTS_BY_ACTIVITY_STATUS = {
  planned: ['proposal', 'budget_plan'],
  ongoing: ['proposal', 'budget_plan', 'contract'],
  completed: ['proposal', 'budget_plan', 'contract', 'final_report'],
};

export const ALLOWED_EXTERNAL_FILE_EXTENSIONS = ['pdf', 'docx', 'xlsx', 'pptx'];
export const MAX_EXTERNAL_FILE_SIZE = 15 * 1024 * 1024;

const hasValue = value => value !== null && value !== undefined && String(value).trim() !== '';
const numberValue = value => Number(value || 0);
const getExtension = name => String(name || '').split('.').pop().toLowerCase();
const fieldError = (field, message) => ({ field, message });

export const isExternalReporter = user => [ROLE.RESEARCHER, ROLE.REVIEWER].includes(normalizeRole(user && user.role));
export const externalStatus = report => (report && report.submissionStatus) || EXTERNAL_STATUS.DRAFT;
export const externalStatusMeta = report => EXTERNAL_STATUS_META[externalStatus(report)] || EXTERNAL_STATUS_META[EXTERNAL_STATUS.DRAFT];
export const getCategoryMeta = category => RESEARCH_CATEGORY_OPTIONS.find(item => item.value === category) || RESEARCH_CATEGORY_OPTIONS[0];
export const getOutputTypeLabel = value => (OUTPUT_TYPE_OPTIONS.find(item => item.value === value) || {}).label || value || '-';
export const getDocumentTypeLabel = value => (EXTERNAL_DOCUMENT_TYPES.find(item => item.value === value) || {}).label || value || '-';

export const canCreateExternalReport = user => isExternalReporter(user) || isManager(user);
export const canViewExternalReport = (report, user) => {
  if (!report || !user) return false;
  if (isAdmin(user)) return true;
  return report.userId === user.id || report.createdBy === user.id;
};
export const canEditExternalReport = (report, user) => canViewExternalReport(report, user)
  && (isExternalReporter(user) || isManager(user))
  && [EXTERNAL_STATUS.DRAFT, EXTERNAL_STATUS.REVISION_REQUESTED].includes(externalStatus(report));
export const canSubmitExternalReport = (report, user) => canEditExternalReport(report, user);
export const canAdminReviewExternalReport = (report, user) => isAdmin(user)
  && [EXTERNAL_STATUS.SUBMITTED, EXTERNAL_STATUS.UNDER_REVIEW].includes(externalStatus(report));
export const canArchiveExternalReport = (report, user) => isAdmin(user) && externalStatus(report) === EXTERNAL_STATUS.VALIDATED;

export const createExternalReportDraft = (user, uid) => {
  const now = new Date().toISOString();
  return {
    id: uid('external-report'),
    userId: user.id,
    createdBy: user.id,
    activityName: '',
    researchTitle: '',
    activityYear: new Date().getFullYear(),
    activityStatus: 'planned',
    activityType: 'external',
    roleInResearch: 'ketua',
    organizerOrigin: '',
    fundingSource: '',
    fundingAmount: 0,
    currency: 'IDR',
    submissionStatus: EXTERNAL_STATUS.DRAFT,
    category: 'grant',
    metadata: {
      ripRelation: '',
      tktTarget: 1,
      sdgInvolvement: false,
      sdgs: [],
      integrationToTeaching: false,
      courseName: '',
      academicYear: '',
      integrationProofFile: null,
    },
    typeDetail: {},
    documents: [],
    outputs: [],
    reviews: [],
    history: [{ status: EXTERNAL_STATUS.DRAFT, note: 'Draft laporan penelitian eksternal/mandiri dibuat.', at: now, by: user.id }],
    createdAt: now,
    updatedAt: now,
    submittedAt: null,
    validatedAt: null,
    archivedAt: null,
  };
};

export const addExternalHistory = (report, status, note, user) => ({
  ...report,
  submissionStatus: status,
  history: [
    ...(report.history || []),
    { status, note, at: new Date().toISOString(), by: user ? user.id : null },
  ],
  updatedAt: new Date().toISOString(),
});

export const externalReportTitle = report => (report && (report.researchTitle || report.activityName)) || 'Laporan Penelitian Eksternal';

export const getRequiredDocumentTypes = report => REQUIRED_DOCUMENTS_BY_ACTIVITY_STATUS[(report && report.activityStatus) || 'planned'] || [];

export const validateExternalReport = (report, data, user, options = {}) => {
  const errors = [];
  const basic = [
    ['activityName', 'Nama aktivitas wajib diisi.'],
    ['researchTitle', 'Judul penelitian wajib diisi.'],
    ['activityYear', 'Tahun aktivitas wajib diisi.'],
    ['activityStatus', 'Status penelitian wajib dipilih.'],
    ['activityType', 'Tipe aktivitas wajib dipilih.'],
    ['roleInResearch', 'Peran dalam penelitian wajib dipilih.'],
    ['organizerOrigin', 'Asal penyelenggara/mitra wajib diisi.'],
    ['fundingSource', 'Sumber pendanaan wajib diisi.'],
    ['currency', 'Mata uang wajib diisi.'],
  ];

  basic.forEach(([field, message]) => {
    if (!hasValue(report[field])) errors.push(fieldError(field, message));
  });

  const year = Number(report.activityYear);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) errors.push(fieldError('activityYear', 'Tahun aktivitas harus angka valid.'));
  if (numberValue(report.fundingAmount) < 0) errors.push(fieldError('fundingAmount', 'Nominal pendanaan tidak boleh negatif.'));
  if (!['planned', 'ongoing', 'completed'].includes(report.activityStatus)) errors.push(fieldError('activityStatus', 'Status aktivitas hanya planned, ongoing, atau completed.'));
  if (!['external', 'mandiri'].includes(report.activityType)) errors.push(fieldError('activityType', 'Tipe aktivitas hanya external atau mandiri.'));

  const metadata = report.metadata || {};
  if (!hasValue(metadata.ripRelation)) errors.push(fieldError('metadata.ripRelation', 'Relasi RIP wajib dipilih.'));
  const tkt = Number(metadata.tktTarget);
  if (!Number.isInteger(tkt) || tkt < 1 || tkt > 9) errors.push(fieldError('metadata.tktTarget', 'TKT harus berada pada rentang 1 sampai 9.'));
  if (metadata.sdgInvolvement) {
    if (!Array.isArray(metadata.sdgs) || metadata.sdgs.length === 0) errors.push(fieldError('metadata.sdgs', 'Pilih minimal satu SDG.'));
    (metadata.sdgs || []).forEach(sdg => {
      const code = Number(sdg);
      if (!Number.isInteger(code) || code < 1 || code > 17) errors.push(fieldError('metadata.sdgs', 'Kode SDG harus berada pada rentang 1 sampai 17.'));
    });
  }
  if (metadata.integrationToTeaching) {
    if (!hasValue(metadata.courseName)) errors.push(fieldError('metadata.courseName', 'Nama mata kuliah wajib diisi jika integrasi pembelajaran aktif.'));
    if (!hasValue(metadata.academicYear)) errors.push(fieldError('metadata.academicYear', 'Tahun akademik wajib diisi jika integrasi pembelajaran aktif.'));
    if (!metadata.integrationProofFile) errors.push(fieldError('metadata.integrationProofFile', 'Bukti integrasi pembelajaran wajib diunggah.'));
  }

  const detail = report.typeDetail || {};
  if (!['grant', 'partner', 'university', 'independent'].includes(report.category)) errors.push(fieldError('category', 'Kategori penelitian wajib dipilih.'));
  if (report.category === 'grant') {
    if (!hasValue(detail.grantType)) errors.push(fieldError('typeDetail.grantType', 'Jenis hibah wajib dipilih.'));
    if (!hasValue(detail.grantName)) errors.push(fieldError('typeDetail.grantName', 'Nama hibah wajib diisi.'));
    if (!hasValue(detail.researchStatus)) errors.push(fieldError('typeDetail.researchStatus', 'Status hibah wajib diisi.'));
    if (detail.fundingAmount !== undefined && numberValue(detail.fundingAmount) < 0) errors.push(fieldError('typeDetail.fundingAmount', 'Pendanaan hibah tidak boleh negatif.'));
  }
  if (report.category === 'partner') {
    if (!hasValue(detail.partnerName)) errors.push(fieldError('typeDetail.partnerName', 'Nama mitra wajib diisi.'));
    if (!hasValue(detail.partnerRepresentative)) errors.push(fieldError('typeDetail.partnerRepresentative', 'Perwakilan mitra wajib diisi.'));
    if (!hasValue(detail.partnerOrigin)) errors.push(fieldError('typeDetail.partnerOrigin', 'Asal mitra wajib diisi.'));
  }
  if (report.category === 'university') {
    if (!hasValue(detail.partnerUniversity)) errors.push(fieldError('typeDetail.partnerUniversity', 'Nama universitas mitra wajib diisi.'));
    if (!hasValue(detail.partnerOrigin)) errors.push(fieldError('typeDetail.partnerOrigin', 'Asal universitas wajib diisi.'));
    if (!hasValue(detail.mouStatus)) errors.push(fieldError('typeDetail.mouStatus', 'Status MoU wajib dipilih.'));
  }
  if (report.category === 'independent') {
    if (!hasValue(detail.independentType)) errors.push(fieldError('typeDetail.independentType', 'Jenis penelitian mandiri wajib dipilih.'));
  }

  const documents = report.documents || [];
  const requiredDocs = getRequiredDocumentTypes(report);
  requiredDocs.forEach(type => {
    if (!documents.some(item => item.fileType === type)) {
      errors.push(fieldError(`documents.${type}`, `Dokumen ${getDocumentTypeLabel(type)} wajib diunggah untuk status ${report.activityStatus}.`));
    }
  });
  documents.forEach(item => {
    const ext = getExtension(item.name || item.fileName || item.fileUrl);
    if (!ALLOWED_EXTERNAL_FILE_EXTENSIONS.includes(ext)) errors.push(fieldError('documents', `Format file ${item.name || item.fileName} tidak didukung. Gunakan pdf, docx, xlsx, atau pptx.`));
    if (Number(item.size || item.fileSize || 0) > MAX_EXTERNAL_FILE_SIZE) errors.push(fieldError('documents', `Ukuran file ${item.name || item.fileName} melebihi 15 MB.`));
  });

  (report.outputs || []).forEach((output, index) => {
    if (!hasValue(output.outputType)) errors.push(fieldError(`outputs.${index}.outputType`, 'Jenis luaran wajib dipilih.'));
    if (!hasValue(output.title)) errors.push(fieldError(`outputs.${index}.title`, 'Judul luaran wajib diisi.'));
    const outputYear = Number(output.year);
    if (!Number.isInteger(outputYear) || outputYear < 2000 || outputYear > 2100) errors.push(fieldError(`outputs.${index}.year`, 'Tahun luaran harus angka valid.'));
  });

  const duplicate = !options.skipDuplicate && (data.externalResearchReports || []).some(item => item.id !== report.id
    && item.userId === (report.userId || (user && user.id))
    && String(item.researchTitle || '').trim().toLowerCase() === String(report.researchTitle || '').trim().toLowerCase()
    && Number(item.activityYear) === Number(report.activityYear));
  if (duplicate) errors.push(fieldError('duplicate', 'Laporan dengan user, judul penelitian, dan tahun yang sama sudah ada.'));

  return { valid: errors.length === 0, errors };
};

export const getVisibleExternalReports = (data, user) => {
  const reports = data.externalResearchReports || [];
  if (isAdmin(user)) return reports;
  return reports.filter(item => item.userId === (user && user.id) || item.createdBy === (user && user.id));
};

export const getAdminExternalQueue = data => (data.externalResearchReports || [])
  .filter(item => [EXTERNAL_STATUS.SUBMITTED, EXTERNAL_STATUS.UNDER_REVIEW, EXTERNAL_STATUS.REVISION_REQUESTED, EXTERNAL_STATUS.VALIDATED].includes(externalStatus(item)));

export const getExternalMetrics = reports => {
  const list = reports || [];
  const byStatus = status => list.filter(item => externalStatus(item) === status).length;
  const byType = type => list.filter(item => item.activityType === type).length;
  const byCategory = category => list.filter(item => item.category === category).length;
  const outputs = list.flatMap(item => item.outputs || []);
  const byOutput = outputType => outputs.filter(item => item.outputType === outputType).length;
  return {
    totalReports: list.length,
    draftReports: byStatus(EXTERNAL_STATUS.DRAFT),
    submittedReports: byStatus(EXTERNAL_STATUS.SUBMITTED),
    underReviewReports: byStatus(EXTERNAL_STATUS.UNDER_REVIEW),
    revisionReports: byStatus(EXTERNAL_STATUS.REVISION_REQUESTED),
    validatedReports: byStatus(EXTERNAL_STATUS.VALIDATED),
    archivedReports: byStatus(EXTERNAL_STATUS.ARCHIVED),
    externalReports: byType('external'),
    independentReports: byType('mandiri'),
    grantReports: byCategory('grant'),
    partnerReports: byCategory('partner'),
    universityReports: byCategory('university'),
    totalJournals: byOutput('journal'),
    totalBooks: byOutput('book'),
    totalHki: byOutput('hki'),
    totalPrototypes: byOutput('prototype'),
    totalProceedings: byOutput('proceeding'),
  };
};

export const toDbExternalResearchSnapshot = report => {
  const id = report.id;
  const metadata = report.metadata || {};
  const detail = report.typeDetail || {};
  return {
    external_research: {
      id,
      user_id: report.userId,
      created_by: report.createdBy,
      activity_name: report.activityName,
      research_title: report.researchTitle,
      activity_year: Number(report.activityYear) || null,
      activity_status: report.activityStatus,
      activity_type: report.activityType,
      role_in_research: report.roleInResearch,
      organizer_origin: report.organizerOrigin,
      funding_source: report.fundingSource,
      funding_amount: Number(report.fundingAmount) || 0,
      currency: report.currency,
      submission_status: externalStatus(report),
      created_at: report.createdAt,
      submitted_at: report.submittedAt,
    },
    external_research_metadata_virtual: {
      external_id: id,
      rip_relation: metadata.ripRelation,
      tkt_target: Number(metadata.tktTarget) || null,
      sdg_involvement: Boolean(metadata.sdgInvolvement),
      integration_to_teaching: Boolean(metadata.integrationToTeaching),
    },
    external_research_sdg: (metadata.sdgs || []).map(code => ({
      id: `${id}-sdg-${code}`,
      external_id: id,
      sdg_code: String(code),
    })),
    external_research_teaching: metadata.integrationToTeaching ? {
      id: `${id}-teaching`,
      external_id: id,
      course_name: metadata.courseName,
      academic_year: metadata.academicYear,
      proof_file: metadata.integrationProofFile ? (metadata.integrationProofFile.fileUrl || metadata.integrationProofFile.name) : null,
    } : null,
    external_research_grants: report.category === 'grant' ? {
      id: `${id}-grant`,
      external_id: id,
      grant_type: detail.grantType,
      grant_name: detail.grantName,
      grant_link: detail.grantLink,
      research_status: detail.researchStatus,
      funding_amount: Number(detail.fundingAmount || report.fundingAmount) || 0,
      created_at: report.createdAt,
    } : null,
    external_research_partners: report.category === 'partner' ? {
      id: `${id}-partner`,
      external_id: id,
      partner_name: detail.partnerName,
      partner_representative: detail.partnerRepresentative,
      partner_origin: detail.partnerOrigin,
      created_at: report.createdAt,
    } : null,
    external_research_universities: report.category === 'university' ? {
      id: `${id}-university`,
      external_id: id,
      university_name: detail.partnerUniversity,
      origin: detail.partnerOrigin,
      mou_status: detail.mouStatus,
      created_at: report.createdAt,
    } : null,
    external_research_independent: report.category === 'independent' ? {
      id: `${id}-independent`,
      external_id: id,
      independent_type: detail.independentType,
      created_at: report.createdAt,
    } : null,
    external_research_outputs: (report.outputs || []).map(output => ({
      output_id: output.id,
      external_id: id,
      output_type: output.outputType,
      title: output.title,
      year_virtual: Number(output.year) || null,
      description_virtual: output.description || '',
      link_virtual: output.link || '',
      file_virtual: output.file ? (output.file.fileUrl || output.file.name) : null,
    })),
    external_research_files: (report.documents || []).map(file => ({
      id: file.id,
      external_id: id,
      file_type: file.fileType,
      file_url: file.fileUrl || file.name || file.fileName,
      uploaded_by: file.uploadedBy || report.userId,
      uploaded_at: file.uploadedAt,
      file_name_virtual: file.name || file.fileName,
      file_size_virtual: file.size || file.fileSize,
      mime_type_virtual: file.type || file.mimeType,
    })),
    report_reviews_virtual: (report.reviews || []).map(review => ({
      id: review.id,
      external_id: id,
      reviewer_id: review.reviewerId,
      decision: review.decision,
      notes: review.notes,
      reviewed_at: review.reviewedAt,
      checklist: review.checklist || {},
    })),
  };
};

export const makeExternalOutput = uid => ({
  id: uid('external-output'),
  outputType: 'journal',
  title: '',
  year: new Date().getFullYear(),
  description: '',
  link: '',
  file: null,
});

export const makeExternalDocument = (uid, fileType, file, user) => ({
  id: uid('external-file'),
  fileType,
  name: file.name,
  fileName: file.name,
  fileUrl: file.name,
  size: file.size,
  type: file.type || '',
  uploadedBy: user ? user.id : null,
  uploadedAt: new Date().toISOString(),
});
