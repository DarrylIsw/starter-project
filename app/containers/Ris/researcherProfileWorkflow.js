/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import { ROLE, isAdmin, isResearcher, normalizeRole } from './workflow';

export const PROFILE_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
};

export const VERIFICATION_STATUS = {
  UNVERIFIED: 'unverified',
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
};

export const PROFILE_STATUS_META = {
  [PROFILE_STATUS.DRAFT]: { label: 'Draft', tone: 'gray' },
  [PROFILE_STATUS.ACTIVE]: { label: 'Aktif', tone: 'green' },
  [PROFILE_STATUS.INACTIVE]: { label: 'Nonaktif', tone: 'red' },
  [PROFILE_STATUS.SUSPENDED]: { label: 'Suspended', tone: 'orange' },
};

export const VERIFICATION_STATUS_META = {
  [VERIFICATION_STATUS.UNVERIFIED]: { label: 'Belum diverifikasi', tone: 'gray' },
  [VERIFICATION_STATUS.PENDING]: { label: 'Menunggu Verifikasi', tone: 'yellow' },
  [VERIFICATION_STATUS.VERIFIED]: { label: 'Terverifikasi', tone: 'green' },
  [VERIFICATION_STATUS.REJECTED]: { label: 'Ditolak', tone: 'red' },
};

export const DOCUMENT_TYPES = [
  { value: 'KTP', label: 'KTP', required: true },
  { value: 'NPWP', label: 'NPWP', required: false },
  { value: 'CV', label: 'CV', required: true },
  { value: 'SK_JABATAN', label: 'SK Jabatan', required: false },
  { value: 'SIGNATURE', label: 'Tanda Tangan', required: false },
];

export const REQUIRED_DOCUMENT_TYPES = DOCUMENT_TYPES.filter(item => item.required).map(item => item.value);
export const ALLOWED_PROFILE_DOCUMENT_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg'];
export const MAX_PROFILE_DOCUMENT_SIZE = 5 * 1024 * 1024;

export const MANDATORY_PROFILE_FIELDS = [
  'fullName',
  'institutionEmail',
  'nidn',
  'faculty',
  'studyProgram',
  'position',
  'phoneNumber',
];

export const RESEARCH_IDENTITY_FIELDS = ['orcid', 'googleScholar', 'sintaId'];

export const PROFILE_SECTION_LABELS = {
  basic: 'Informasi Dasar',
  contact: 'Kontak',
  institution: 'Institusi',
  researchIdentity: 'Research Identity',
  finance: 'Keuangan',
  emergency: 'Kontak Darurat',
};

export const DEFAULT_PROFILE_FORM = {
  profilePhoto: null,
  fullName: '',
  frontTitle: '',
  backTitle: '',
  nidn: '',
  nik: '',
  birthPlace: '',
  birthDate: '',
  gender: '',
  nationality: 'Indonesia',
  institutionEmail: '',
  alternateEmail: '',
  phoneNumber: '',
  domicileAddress: '',
  correspondenceAddress: '',
  faculty: '',
  studyProgram: '',
  unit: '',
  position: '',
  functionalPosition: '',
  nip: '',
  orcid: '',
  googleScholar: '',
  sintaId: '',
  bankName: '',
  bankAccountNumber: '',
  bankAccountName: '',
  emergencyContactName: '',
  emergencyContactRelation: '',
  emergencyContactPhone: '',
};

const hasValue = value => value !== null && value !== undefined && String(value).trim() !== '';
const getExtension = name => String(name || '').split('.').pop().toLowerCase();
const nowIso = () => new Date().toISOString();

export const isProfileAdmin = user => isAdmin(user) || normalizeRole(user && user.role) === ROLE.SUPER_ADMIN;
export const canOpenProfileModule = user => Boolean(user) && (isProfileAdmin(user) || isResearcher(user));
export const isOwnProfile = (profile, user) => Boolean(profile && user && profile.userId === user.id);
export const canViewProfile = (profile, user) => Boolean(profile && user) && (isProfileAdmin(user) || isOwnProfile(profile, user));
const protectedTargetRoles = [ROLE.SUPER_ADMIN, ROLE.LPPM_ADMIN, ROLE.FINANCE];

export const canManageProfile = (profile, user, targetAccount = null) => {
  if (!isProfileAdmin(user) || !profile) return false;
  if (isOwnProfile(profile, user)) return true;
  const actorRole = normalizeRole(user && user.role);
  const targetRole = normalizeRole(targetAccount && targetAccount.role);
  if (actorRole === ROLE.SUPER_ADMIN) return true;
  if (actorRole === ROLE.LPPM_ADMIN) return !protectedTargetRoles.includes(targetRole);
  return false;
};

export const canEditProfile = (profile, user, targetAccount = null) => Boolean(profile && user) && (isOwnProfile(profile, user) || canManageProfile(profile, user, targetAccount)) && profile.profileStatus !== PROFILE_STATUS.INACTIVE;
export const canVerifyProfile = (profile, user, targetAccount = null) => isProfileAdmin(user) && Boolean(profile) && !isOwnProfile(profile, user) && canManageProfile(profile, user, targetAccount) && profile.verificationStatus !== VERIFICATION_STATUS.VERIFIED;
export const canDeactivateProfile = (profile, user, targetAccount = null) => {
  if (!profile || profile.profileStatus === PROFILE_STATUS.INACTIVE || isOwnProfile(profile, user)) return false;
  return canManageProfile(profile, user, targetAccount);
};

export const getProfileStatusMeta = status => PROFILE_STATUS_META[status] || PROFILE_STATUS_META[PROFILE_STATUS.DRAFT];
export const getVerificationMeta = status => VERIFICATION_STATUS_META[status] || VERIFICATION_STATUS_META[VERIFICATION_STATUS.UNVERIFIED];
export const getDocumentTypeLabel = type => (DOCUMENT_TYPES.find(item => item.value === type) || {}).label || type || '-';

export const getProfileByUser = (data, user) => (data.researcherProfiles || []).find(item => item.userId === (user && user.id));
export const getProfileById = (data, profileId) => (data.researcherProfiles || []).find(item => item.profileId === profileId || item.id === profileId);
export const getProfileDocuments = (data, profileId) => (data.researcherDocuments || []).filter(item => item.profileId === profileId && item.isActive !== false);
export const getExpertiseForProfile = (data, profileId) => {
  const ids = (data.researcherExpertiseMap || []).filter(item => item.profileId === profileId).map(item => item.expertiseId);
  return (data.researcherExpertise || []).filter(item => ids.includes(item.expertiseId));
};
export const getProfileAdmin = (data, profileId) => {
  const assignment = (data.adminAssignments || []).find(item => item.profileId === profileId);
  if (!assignment) return null;
  return (data.systemUsers || []).find(item => item.id === assignment.adminId) || null;
};

export const calculateProfileCompleteness = (profile, documents = []) => {
  const mandatoryCount = MANDATORY_PROFILE_FIELDS.filter(field => hasValue(profile && profile[field])).length;
  const mandatoryScore = Math.round((mandatoryCount / MANDATORY_PROFILE_FIELDS.length) * 60);

  const activeDocs = documents.filter(item => item && item.isActive !== false);
  const requiredDocCount = REQUIRED_DOCUMENT_TYPES.filter(type => activeDocs.some(doc => doc.documentType === type)).length;
  const documentScore = Math.round((requiredDocCount / REQUIRED_DOCUMENT_TYPES.length) * 25);

  const identityCount = RESEARCH_IDENTITY_FIELDS.filter(field => hasValue(profile && profile[field])).length;
  const identityScore = Math.round((identityCount / RESEARCH_IDENTITY_FIELDS.length) * 15);

  return Math.min(100, mandatoryScore + documentScore + identityScore);
};

export const getCompletenessLabel = (completeness, verificationStatus) => {
  if (completeness >= 100 && verificationStatus === VERIFICATION_STATUS.VERIFIED) return 'Verified';
  if (completeness >= 80) return 'Complete';
  if (completeness >= 50) return 'Partial';
  return 'Incomplete';
};

export const getCompletenessTone = completeness => {
  if (completeness >= 100) return 'green';
  if (completeness >= 80) return 'blue';
  if (completeness >= 50) return 'yellow';
  return 'red';
};

export const buildProfileFromUser = (user, uid) => {
  const now = nowIso();
  const role = normalizeRole(user && user.role);
  const roleDefaults = role === ROLE.LPPM_ADMIN ? {
    nidn: user.identifier || 'ADM-LPPM',
    faculty: 'LPPM',
    studyProgram: 'Administrasi Riset',
    unit: 'LPPM',
    position: 'Admin LPPM',
    functionalPosition: 'Administrator',
  } : (role === ROLE.SUPER_ADMIN ? {
    nidn: user.identifier || 'MGR-LPPM',
    faculty: 'LPPM',
    studyProgram: 'Manajemen Riset',
    unit: 'LPPM',
    position: 'Kepala LPPM',
    functionalPosition: 'Manager',
  } : {});
  return {
    ...DEFAULT_PROFILE_FORM,
    ...roleDefaults,
    profileId: uid('profile'),
    id: uid('profile-ref'),
    userId: user.id,
    fullName: user.name || '',
    institutionEmail: user.email || '',
    nidn: user.identifier || roleDefaults.nidn || '',
    profileStatus: PROFILE_STATUS.DRAFT,
    profileCompleteness: 0,
    verificationStatus: VERIFICATION_STATUS.PENDING,
    lastUpdatedAt: now,
    lastUpdatedBy: user.id,
    createdAt: now,
    updatedAt: now,
  };
};

export const validateProfileForm = profile => {
  const errors = [];
  MANDATORY_PROFILE_FIELDS.forEach(field => {
    if (!hasValue(profile[field])) errors.push(`${field} wajib diisi.`);
  });
  if (profile.institutionEmail && !String(profile.institutionEmail).includes('@')) errors.push('Email institusi tidak valid.');
  if (profile.alternateEmail && !String(profile.alternateEmail).includes('@')) errors.push('Email alternatif tidak valid.');
  return errors;
};

export const validateProfileDocument = file => {
  if (!file) return 'File wajib dipilih.';
  const ext = getExtension(file.name);
  if (!ALLOWED_PROFILE_DOCUMENT_EXTENSIONS.includes(ext)) return `Format file ${ext || '-'} tidak diizinkan.`;
  if (Number(file.size || 0) > MAX_PROFILE_DOCUMENT_SIZE) return 'Ukuran file maksimal 5 MB.';
  return '';
};

export const createProfileDocumentMeta = (file, documentType, profileId, user, uid) => ({
  id: uid('researcher-doc'),
  profileId,
  documentType,
  fileUrl: `mock://researcher-documents/${profileId}/${file.name}`,
  fileName: file.name,
  fileSize: file.size,
  fileFormat: getExtension(file.name).toUpperCase(),
  uploadedAt: nowIso(),
  uploadedBy: user.id,
  isActive: true,
});

export const createActivityLog = (user, action, entityType, entityId, oldData, newData, uid) => ({
  id: uid('activity-log'),
  logId: uid('system-log'),
  userId: user && user.id,
  action,
  entityType,
  entityId,
  oldData: oldData || null,
  newData: newData || null,
  createdAt: nowIso(),
});

export const createStatusHistory = (profile, oldStatus, newStatus, user, uid) => ({
  id: uid('profile-status'),
  profileId: profile.profileId,
  oldStatus,
  newStatus,
  changedBy: user && user.id,
  changedAt: nowIso(),
});

export const createNotification = (userId, senderId, type, message, uid) => ({
  id: uid('notification'),
  notificationId: uid('notif'),
  userId,
  researchId: null,
  senderId: senderId || null,
  entityType: 'researcher_profile',
  entityId: userId,
  notificationType: type,
  message,
  isRead: false,
  createdAt: nowIso(),
});

export const createEmailNotification = ({ to, subject, message, userId, entityId, type }, uid) => ({
  id: uid('email-outbox'),
  emailId: uid('email'),
  to,
  subject,
  message,
  userId: userId || null,
  entityType: 'researcher_profile',
  entityId: entityId || userId || null,
  notificationType: type || 'profile_email',
  status: 'queued',
  queuedAt: nowIso(),
  sentAt: null,
});

export const normalizeProfileForSave = (profile, documents, actor) => {
  const completeness = calculateProfileCompleteness(profile, documents);
  const verificationStatus = completeness >= 80 && profile.verificationStatus === VERIFICATION_STATUS.UNVERIFIED
    ? VERIFICATION_STATUS.PENDING
    : (profile.verificationStatus || VERIFICATION_STATUS.PENDING);
  const profileStatus = profile.profileStatus === PROFILE_STATUS.INACTIVE ? PROFILE_STATUS.INACTIVE : (completeness >= 50 ? PROFILE_STATUS.ACTIVE : PROFILE_STATUS.DRAFT);
  return {
    ...profile,
    profileStatus,
    profileCompleteness: completeness,
    verificationStatus,
    lastUpdatedAt: nowIso(),
    lastUpdatedBy: actor && actor.id,
    updatedAt: nowIso(),
  };
};

export const syncProfileToDomainData = (data, savedProfile) => {
  const displayName = `${savedProfile.frontTitle ? `${savedProfile.frontTitle} ` : ''}${savedProfile.fullName || ''}${savedProfile.backTitle ? `, ${savedProfile.backTitle}` : ''}`.trim() || savedProfile.fullName;
  const identifier = savedProfile.nidn || savedProfile.nik || '';
  return {
    ...data,
    lecturers: (data.lecturers || []).map(item => (item.userId === savedProfile.userId ? {
      ...item,
      id: savedProfile.profileId,
      name: displayName,
      nidn: savedProfile.nidn,
      faculty: savedProfile.faculty,
      program: savedProfile.studyProgram,
      functionalPosition: savedProfile.functionalPosition,
      orcid: savedProfile.orcid,
    } : item)),
    applicantProfiles: (data.applicantProfiles || []).map(item => (item.userId === savedProfile.userId ? {
      ...item,
      id: savedProfile.profileId,
      name: displayName,
      identifier,
      faculty: savedProfile.faculty,
      program: savedProfile.studyProgram,
      email: savedProfile.institutionEmail,
      status: savedProfile.profileStatus,
    } : item)),
    drafts: (data.drafts || []).map(item => (item.userId === savedProfile.userId ? { ...item, userName: displayName } : item)),
    letterRequests: (data.letterRequests || []).map(letter => {
      if (letter.userId !== savedProfile.userId) return letter;
      const applicant = {
        ...(letter.applicant || {}),
        id: savedProfile.profileId,
        userId: savedProfile.userId,
        name: displayName,
        identifier,
        faculty: savedProfile.faculty,
        program: savedProfile.studyProgram,
        email: savedProfile.institutionEmail,
      };
      return { ...letter, applicant, applicants: (letter.applicants || []).map(item => (item.userId === savedProfile.userId ? { ...item, ...applicant } : item)) };
    }),
    externalResearchReports: (data.externalResearchReports || []).map(report => (report.userId === savedProfile.userId ? { ...report, userName: displayName } : report)),
  };
};

export const getProfileMetrics = data => {
  const profiles = data.researcherProfiles || [];
  return {
    totalProfiles: profiles.length,
    activeProfiles: profiles.filter(item => item.profileStatus === PROFILE_STATUS.ACTIVE).length,
    inactiveProfiles: profiles.filter(item => item.profileStatus === PROFILE_STATUS.INACTIVE).length,
    pendingProfiles: profiles.filter(item => item.verificationStatus === VERIFICATION_STATUS.PENDING).length,
    verifiedProfiles: profiles.filter(item => item.verificationStatus === VERIFICATION_STATUS.VERIFIED).length,
    incompleteProfiles: profiles.filter(item => Number(item.profileCompleteness || 0) < 50).length,
    completeProfiles: profiles.filter(item => Number(item.profileCompleteness || 0) >= 80).length,
  };
};

export const filterProfiles = (profiles, data, filters) => profiles.filter(profile => {
  const q = String(filters.search || '').toLowerCase();
  const expertises = getExpertiseForProfile(data, profile.profileId).map(item => item.name.toLowerCase());
  const searchable = [profile.fullName, profile.institutionEmail, profile.nidn, profile.faculty, profile.studyProgram].join(' ').toLowerCase();
  if (q && !searchable.includes(q)) return false;
  if (filters.faculty && profile.faculty !== filters.faculty) return false;
  if (filters.studyProgram && profile.studyProgram !== filters.studyProgram) return false;
  if (filters.unit && profile.unit !== filters.unit) return false;
  if (filters.position && profile.position !== filters.position) return false;
  if (filters.verificationStatus && profile.verificationStatus !== filters.verificationStatus) return false;
  if (filters.profileStatus && profile.profileStatus !== filters.profileStatus) return false;
  if (filters.expertise && !expertises.includes(String(filters.expertise).toLowerCase())) return false;
  if (filters.activeStatus === 'active' && profile.profileStatus === PROFILE_STATUS.INACTIVE) return false;
  if (filters.activeStatus === 'inactive' && profile.profileStatus !== PROFILE_STATUS.INACTIVE) return false;
  return true;
});

export const exportProfilesCsv = (profiles, data) => {
  const rows = [
    ['Nama', 'Email Institusi', 'NIDN', 'Fakultas', 'Program Studi', 'Posisi', 'Kelengkapan', 'Verifikasi', 'Bidang Minat'],
    ...profiles.map(profile => [
      profile.fullName,
      profile.institutionEmail,
      profile.nidn,
      profile.faculty,
      profile.studyProgram,
      profile.position,
      `${profile.profileCompleteness || 0}%`,
      profile.verificationStatus,
      getExpertiseForProfile(data, profile.profileId).map(item => item.name).join('; '),
    ]),
  ];
  return rows.map(row => row.map(value => `"${String(value || '').replace(/"/g, '""')}"`).join(',')).join('\n');
};

export const toDbResearcherProfileSnapshot = (data, profileId) => {
  const profile = getProfileById(data, profileId);
  if (!profile) return null;
  const documents = getProfileDocuments(data, profile.profileId);
  const expertises = getExpertiseForProfile(data, profile.profileId);
  return {
    users: (data.systemUsers || []).filter(item => item.id === profile.userId).map(item => ({
      user_id: item.id,
      email: item.email,
      password_hash: item.password ? 'demo-hash-placeholder' : null,
      is_active: item.isActive !== false,
      created_at: item.createdAt || null,
      updated_at: item.updatedAt || null,
    }))[0] || null,
    researcher_profiles: {
      profile_id: profile.profileId,
      user_id: profile.userId,
      full_name: profile.fullName,
      front_title: profile.frontTitle,
      back_title: profile.backTitle,
      nidn: profile.nidn,
      nik: profile.nik,
      birth_place: profile.birthPlace,
      birth_date: profile.birthDate || null,
      gender: profile.gender,
      nationality: profile.nationality,
      institution_email: profile.institutionEmail,
      alternate_email: profile.alternateEmail,
      phone_number: profile.phoneNumber,
      domicile_address: profile.domicileAddress,
      correspondence_address: profile.correspondenceAddress,
      faculty: profile.faculty,
      study_program: profile.studyProgram,
      unit: profile.unit,
      position: profile.position,
      functional_position: profile.functionalPosition,
      nip: profile.nip,
      orcid: profile.orcid,
      google_scholar: profile.googleScholar,
      sinta_id: profile.sintaId,
      profile_photo_url: profile.profilePhoto && profile.profilePhoto.fileUrl ? profile.profilePhoto.fileUrl : null,
      profile_photo_name: profile.profilePhoto && profile.profilePhoto.name ? profile.profilePhoto.name : null,
      bank_name: profile.bankName,
      bank_account_number: profile.bankAccountNumber,
      bank_account_name: profile.bankAccountName,
      emergency_contact_name: profile.emergencyContactName,
      emergency_contact_relation: profile.emergencyContactRelation,
      emergency_contact_phone: profile.emergencyContactPhone,
      profile_status: profile.profileStatus,
      profile_completeness: profile.profileCompleteness,
      verification_status: profile.verificationStatus,
      last_updated_at: profile.lastUpdatedAt,
      last_updated_by: profile.lastUpdatedBy,
      created_at: profile.createdAt,
      updated_at: profile.updatedAt,
    },
    researcher_documents: documents.map(doc => ({
      id: doc.id,
      profile_id: doc.profileId,
      document_type: doc.documentType,
      file_url: doc.fileUrl,
      file_size: doc.fileSize,
      file_format: doc.fileFormat,
      uploaded_at: doc.uploadedAt,
      uploaded_by: doc.uploadedBy,
      is_active: doc.isActive,
    })),
    researcher_expertise: expertises.map(item => ({ expertise_id: item.expertiseId, name: item.name })),
    researcher_expertise_map: (data.researcherExpertiseMap || []).filter(item => item.profileId === profile.profileId).map(item => ({
      id: item.id,
      profile_id: item.profileId,
      expertise_id: item.expertiseId,
    })),
    researcher_verifications: (data.researcherVerifications || []).filter(item => item.profileId === profile.profileId).map(item => ({
      id: item.id,
      profile_id: item.profileId,
      admin_id: item.adminId,
      verification_status: item.verificationStatus,
      verification_notes: item.verificationNotes,
      verified_by: item.verifiedBy,
      verified_at: item.verifiedAt,
    })),
    researcher_status_history: (data.researcherStatusHistory || []).filter(item => item.profileId === profile.profileId).map(item => ({
      id: item.id,
      profile_id: item.profileId,
      old_status: item.oldStatus,
      new_status: item.newStatus,
      changed_by: item.changedBy,
      changed_at: item.changedAt,
    })),
    admin_assignments: (data.adminAssignments || []).filter(item => item.profileId === profile.profileId).map(item => ({
      id: item.id,
      profile_id: item.profileId,
      admin_id: item.adminId,
      assigned_at: item.assignedAt,
      assigned_by: item.assignedBy,
    })),
    system_activity_logs: (data.systemActivityLogs || []).filter(item => item.entityType === 'researcher_profile' && item.entityId === profile.profileId).map(item => ({
      log_id: item.logId || item.id,
      user_id: item.userId,
      action: item.action,
      entity_type: item.entityType,
      entity_id: item.entityId,
      old_data: item.oldData,
      new_data: item.newData,
      created_at: item.createdAt,
    })),
  };
};
