/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import { ROLE, STATUS } from './workflow';
import { EXTERNAL_STATUS } from './externalResearchWorkflow';
import { PROFILE_STATUS, VERIFICATION_STATUS, calculateProfileCompleteness } from './researcherProfileWorkflow';

export const DEMO_ACCOUNTS = [
  {
    id: 'user-lecturer', name: 'Dr. Budi Santoso', email: 'lecturer@umn.ac.id', password: 'password', role: ROLE.RESEARCHER, profileId: 'lecturer-1'
  },
  {
    id: 'user-admin', name: 'Admin LPPM', email: 'admin@umn.ac.id', password: 'password', role: ROLE.LPPM_ADMIN, profileId: 'admin-1'
  },
  {
    id: 'user-reviewer', name: 'Dr. Maya Putri', email: 'reviewer@umn.ac.id', password: 'password', role: ROLE.REVIEWER, profileId: 'reviewer-1'
  },
  {
    id: 'user-manager', name: 'Kepala LPPM', email: 'manager@umn.ac.id', password: 'password', role: ROLE.SUPER_ADMIN, profileId: 'manager-1'
  },
  {
    id: 'user-student', name: 'Ayu Larasati', email: 'student@umn.ac.id', password: 'password', role: ROLE.RESEARCHER, profileId: 'student-1', applicantType: 'Mahasiswa S1', identifier: '00000078910'
  },
];

export const SDGS = [
  'No Poverty', 'Zero Hunger', 'Good Health and Well-being',
  'Quality Education', 'Gender Equality', 'Clean Water and Sanitation',
  'Affordable and Clean Energy', 'Decent Work and Economic Growth',
  'Industry, Innovation and Infrastructure', 'Reduced Inequalities',
  'Sustainable Cities and Communities', 'Responsible Consumption and Production',
  'Climate Action', 'Life Below Water', 'Life on Land',
  'Peace, Justice and Strong Institutions', 'Partnerships for the Goals'
].map((name, index) => ({ id: index + 1, code: index + 1, name }));

export const BUDGET_TABS = [
  { key: 'materials', label: 'Bahan dan Peralatan', components: ['Bahan habis pakai', 'Peralatan penelitian'] },
  { key: 'field', label: 'Pengumpulan Data', components: ['Transportasi', 'Akomodasi', 'Konsumsi'] },
  { key: 'analysis', label: 'Analisis Data', components: ['Pengolahan data', 'Sewa perangkat'] },
  { key: 'reporting', label: 'Pelaporan Hasil Penelitian dan Luaran Wajib', components: ['Publikasi', 'Seminar', 'Penyusunan laporan'] },
];

export const OUTPUT_EMPTY = {
  planValue: '',
  planLabel: '',
  title: '',
  targetYear: '',
  description: '',
  category: '',
  journalTargetLevel: '',
  journalIndexTarget: '',
  publicationType: '',
  targetQuartile: '',
  proceedingType: '',
  indexTarget: '',
  bookType: '',
  publisherTarget: '',
  isbnPlan: '',
  hkiType: '',
  targetRegistrationYear: '',
  productType: '',
  targetTkt: '',
  expectedOutputForm: '',
};

export const REVIEW_CRITERIA = [
  {
    code: 'kejelasan_masalah', label: 'Kejelasan masalah (1-100)', group: 'Kualitas Proposal (30%)', weight: 10
  },
  {
    code: 'kebaruan_penelitian', label: 'Kebaruan penelitian (1-100)', group: 'Kualitas Proposal (30%)', weight: 10
  },
  {
    code: 'metodologi', label: 'Metodologi (1-100)', group: 'Kualitas Proposal (30%)', weight: 10
  },
  {
    code: 'kompetensi_ketua', label: 'Kompetensi ketua', group: 'Kelayakan Tim (15%)', weight: 8
  },
  {
    code: 'komposisi_tim', label: 'Komposisi tim', group: 'Kelayakan Tim (15%)', weight: 7
  },
  {
    code: 'kesesuaian_luaran', label: 'Kesesuaian Luaran Wajib', group: 'Luaran Penelitian (20%)', weight: 10
  },
  {
    code: 'realisme_target', label: 'Realisme Target', group: 'Luaran Penelitian (20%)', weight: 10
  },
  {
    code: 'kewajaran_biaya', label: 'Kewajaran Biaya', group: 'Anggaran (20%)', weight: 10
  },
  {
    code: 'kesesuaian_kegiatan', label: 'Kesesuaian dengan Kegiatan', group: 'Anggaran (20%)', weight: 10
  },
  {
    code: 'rip', label: 'RIP', group: 'Kesesuaian Strategis (15%)', weight: 5
  },
  {
    code: 'sdg', label: 'SDG', group: 'Kesesuaian Strategis (15%)', weight: 5
  },
  {
    code: 'research_center', label: 'Research Center', group: 'Kesesuaian Strategis (15%)', weight: 5
  },
];

export const STATUS_META = {
  [STATUS.DRAFT]: { label: 'Draft', tone: 'gray' },
  [STATUS.SUBMITTED]: { label: 'Telah Diajukan', tone: 'cyan' },
  [STATUS.UNDER_REVIEW]: { label: 'Dalam Review', tone: 'blue' },
  [STATUS.REVISION]: { label: 'Revisi', tone: 'orange' },
  [STATUS.APPROVED]: { label: 'Disetujui', tone: 'green' },
  [STATUS.REJECTED]: { label: 'Ditolak', tone: 'red' },
  incomplete_data: { label: 'Data Tidak Lengkap', tone: 'yellow' },
  assigned: { label: 'Menunggu Peninjauan', tone: 'blue' },
  reviewed: { label: 'Menunggu Keputusan', tone: 'purple' },
  revision_required: { label: 'Revisi', tone: 'orange' },
};

const lecturers = [
  {
    id: 'lecturer-1', userId: 'user-lecturer', name: 'Dr. Budi Santoso', nidn: '0312048501', faculty: 'Teknik dan Informatika', program: 'Sistem Informasi', educationLevel: 'S3', functionalPosition: 'lektor', employmentStatus: 'fulltime', sintaScore: 612, researchCount: 14, lastResearchYear: 2026, orcid: '0000000218250097'
  },
  {
    id: 'lecturer-2', userId: 'user-lecturer-2', name: 'Dr. Andini Prameswari', nidn: '0308078602', faculty: 'Teknik dan Informatika', program: 'Informatika', educationLevel: 'S3', functionalPosition: 'lektor_kepala', employmentStatus: 'homebase', sintaScore: 780, researchCount: 20, lastResearchYear: 2026, orcid: '0000000319261188'
  },
  {
    id: 'lecturer-3', userId: 'user-lecturer-3', name: 'Rizky Kurniawan, M.T.', nidn: '0321019003', faculty: 'Teknik dan Informatika', program: 'Teknik Komputer', educationLevel: 'S2', functionalPosition: 'asisten_ahli', employmentStatus: 'fulltime', sintaScore: 388, researchCount: 7, lastResearchYear: 2025, orcid: ''
  },
  {
    id: 'lecturer-4', userId: 'user-lecturer-4', name: 'Dr. Nadia Kusuma', nidn: '0317098804', faculty: 'Bisnis', program: 'Manajemen', educationLevel: 'S3', functionalPosition: 'lektor', employmentStatus: 'homebase', sintaScore: 540, researchCount: 11, lastResearchYear: 2026, orcid: ''
  },
];

const reviewers = [
  {
    id: 'reviewer-1', userId: 'user-reviewer', name: 'Dr. Maya Putri', affiliation: 'Internal', expertise: ['Sistem Informasi', 'Data Science'], reviewCount: 8
  },
  {
    id: 'reviewer-2', userId: 'user-reviewer-2', name: 'Prof. Arif Wijaya', affiliation: 'Internal', expertise: ['Artificial Intelligence'], reviewCount: 12
  },
  {
    id: 'reviewer-3', userId: 'user-reviewer-3', name: 'Dr. Sinta Maharani', affiliation: 'Internal', expertise: ['Manajemen Inovasi'], reviewCount: 6
  },
];


const systemUsers = DEMO_ACCOUNTS.map(account => ({
  id: account.id,
  name: account.name,
  email: account.email,
  password: account.password,
  role: account.role,
  profileId: account.profileId,
  applicantType: account.applicantType || null,
  identifier: account.identifier || null,
  isActive: true,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
}));

const researcherExpertise = [
  { expertiseId: 'expertise-ai', name: 'Artificial Intelligence' },
  { expertiseId: 'expertise-ml', name: 'Machine Learning' },
  { expertiseId: 'expertise-cv', name: 'Computer Vision' },
  { expertiseId: 'expertise-si', name: 'Sistem Informasi' },
  { expertiseId: 'expertise-ds', name: 'Data Science' },
  { expertiseId: 'expertise-bisnis', name: 'Digital Business' },
];

const baseResearcherProfiles = [
  {
    profileId: 'lecturer-1', id: 'lecturer-1', userId: 'user-lecturer', fullName: 'Budi Santoso', frontTitle: 'Dr.', backTitle: '', nidn: '0312048501', nik: '3671010101850001', birthPlace: 'Jakarta', birthDate: '1985-12-04', gender: 'Laki-laki', nationality: 'Indonesia', institutionEmail: 'lecturer@umn.ac.id', alternateEmail: 'budi.santoso@example.com', phoneNumber: '081234567890', domicileAddress: 'Tangerang', correspondenceAddress: 'Tangerang', faculty: 'Teknik dan Informatika', studyProgram: 'Sistem Informasi', unit: 'LPPM', position: 'Dosen Fulltime', functionalPosition: 'Lektor', nip: '201203001', orcid: '0000000218250097', googleScholar: 'https://scholar.google.com/citations?user=budi', sintaId: '612001', bankName: 'BCA', bankAccountNumber: '1234567890', bankAccountName: 'Budi Santoso', emergencyContactName: 'Dewi Santoso', emergencyContactRelation: 'Istri', emergencyContactPhone: '081299988877', profileStatus: PROFILE_STATUS.ACTIVE, verificationStatus: VERIFICATION_STATUS.VERIFIED, lastUpdatedAt: '2026-06-05T03:00:00.000Z', lastUpdatedBy: 'user-admin', createdAt: '2026-01-10T03:00:00.000Z', updatedAt: '2026-06-05T03:00:00.000Z'
  },
  {
    profileId: 'lecturer-2', id: 'lecturer-2', userId: 'user-lecturer-2', fullName: 'Andini Prameswari', frontTitle: 'Dr.', backTitle: '', nidn: '0308078602', nik: '3671010807860002', birthPlace: 'Bandung', birthDate: '1986-07-08', gender: 'Perempuan', nationality: 'Indonesia', institutionEmail: 'andini@umn.ac.id', alternateEmail: '', phoneNumber: '081233344455', domicileAddress: 'Tangerang Selatan', correspondenceAddress: 'Tangerang Selatan', faculty: 'Teknik dan Informatika', studyProgram: 'Informatika', unit: 'Fakultas Teknik dan Informatika', position: 'Dosen Homebase', functionalPosition: 'Lektor Kepala', nip: '201108002', orcid: '0000000319261188', googleScholar: 'https://scholar.google.com/citations?user=andini', sintaId: '780002', bankName: 'Mandiri', bankAccountNumber: '9876543210', bankAccountName: 'Andini Prameswari', emergencyContactName: 'Raka Prameswara', emergencyContactRelation: 'Suami', emergencyContactPhone: '081277766655', profileStatus: PROFILE_STATUS.ACTIVE, verificationStatus: VERIFICATION_STATUS.PENDING, lastUpdatedAt: '2026-06-12T03:00:00.000Z', lastUpdatedBy: 'user-lecturer-2', createdAt: '2026-01-11T03:00:00.000Z', updatedAt: '2026-06-12T03:00:00.000Z'
  },
  {
    profileId: 'lecturer-3', id: 'lecturer-3', userId: 'user-lecturer-3', fullName: 'Rizky Kurniawan', frontTitle: '', backTitle: 'M.T.', nidn: '0321019003', nik: '', birthPlace: '', birthDate: '', gender: 'Laki-laki', nationality: 'Indonesia', institutionEmail: 'rizky@umn.ac.id', alternateEmail: '', phoneNumber: '081211122233', domicileAddress: '', correspondenceAddress: '', faculty: 'Teknik dan Informatika', studyProgram: 'Teknik Komputer', unit: '', position: 'Dosen Fulltime', functionalPosition: 'Asisten Ahli', nip: '', orcid: '', googleScholar: '', sintaId: '', bankName: '', bankAccountNumber: '', bankAccountName: '', emergencyContactName: '', emergencyContactRelation: '', emergencyContactPhone: '', profileStatus: PROFILE_STATUS.DRAFT, verificationStatus: VERIFICATION_STATUS.PENDING, lastUpdatedAt: '2026-06-15T03:00:00.000Z', lastUpdatedBy: 'user-lecturer-3', createdAt: '2026-02-01T03:00:00.000Z', updatedAt: '2026-06-15T03:00:00.000Z'
  },
  {
    profileId: 'lecturer-4', id: 'lecturer-4', userId: 'user-lecturer-4', fullName: 'Nadia Kusuma', frontTitle: 'Dr.', backTitle: '', nidn: '0317098804', nik: '3671011709880004', birthPlace: 'Surabaya', birthDate: '1988-09-17', gender: 'Perempuan', nationality: 'Indonesia', institutionEmail: 'nadia@umn.ac.id', alternateEmail: '', phoneNumber: '081266655544', domicileAddress: 'Jakarta Barat', correspondenceAddress: 'Jakarta Barat', faculty: 'Bisnis', studyProgram: 'Manajemen', unit: 'Fakultas Bisnis', position: 'Dosen Homebase', functionalPosition: 'Lektor', nip: '201407004', orcid: '', googleScholar: 'https://scholar.google.com/citations?user=nadia', sintaId: '540004', bankName: 'BNI', bankAccountNumber: '7654321000', bankAccountName: 'Nadia Kusuma', emergencyContactName: 'Ari Kusuma', emergencyContactRelation: 'Saudara', emergencyContactPhone: '081255544433', profileStatus: PROFILE_STATUS.ACTIVE, verificationStatus: VERIFICATION_STATUS.UNVERIFIED, lastUpdatedAt: '2026-05-10T03:00:00.000Z', lastUpdatedBy: 'user-lecturer-4', createdAt: '2026-01-20T03:00:00.000Z', updatedAt: '2026-05-10T03:00:00.000Z'
  },
  {
    profileId: 'admin-1', id: 'admin-1', userId: 'user-admin', fullName: 'Admin LPPM', frontTitle: '', backTitle: '', nidn: 'ADM-LPPM-001', nik: '3671010101900005', birthPlace: 'Tangerang', birthDate: '1990-01-01', gender: 'Laki-laki', nationality: 'Indonesia', institutionEmail: 'admin@umn.ac.id', alternateEmail: '', phoneNumber: '081200000001', domicileAddress: 'Tangerang', correspondenceAddress: 'Universitas Multimedia Nusantara', faculty: 'LPPM', studyProgram: 'Administrasi Riset', unit: 'LPPM', position: 'Admin LPPM', functionalPosition: 'Administrator', nip: 'ADM001', orcid: '', googleScholar: '', sintaId: '', bankName: '', bankAccountNumber: '', bankAccountName: '', emergencyContactName: '', emergencyContactRelation: '', emergencyContactPhone: '', profileStatus: PROFILE_STATUS.ACTIVE, verificationStatus: VERIFICATION_STATUS.VERIFIED, lastUpdatedAt: '2026-06-01T03:00:00.000Z', lastUpdatedBy: 'user-manager', createdAt: '2026-06-01T03:00:00.000Z', updatedAt: '2026-06-01T03:00:00.000Z'
  },
  {
    profileId: 'manager-1', id: 'manager-1', userId: 'user-manager', fullName: 'Kepala LPPM', frontTitle: '', backTitle: '', nidn: 'MGR-LPPM-001', nik: '3671010101880006', birthPlace: 'Tangerang', birthDate: '1988-01-01', gender: 'Laki-laki', nationality: 'Indonesia', institutionEmail: 'manager@umn.ac.id', alternateEmail: '', phoneNumber: '081200000002', domicileAddress: 'Tangerang', correspondenceAddress: 'Universitas Multimedia Nusantara', faculty: 'LPPM', studyProgram: 'Manajemen Riset', unit: 'LPPM', position: 'Kepala LPPM', functionalPosition: 'Manager', nip: 'MGR001', orcid: '', googleScholar: '', sintaId: '', bankName: '', bankAccountNumber: '', bankAccountName: '', emergencyContactName: '', emergencyContactRelation: '', emergencyContactPhone: '', profileStatus: PROFILE_STATUS.ACTIVE, verificationStatus: VERIFICATION_STATUS.VERIFIED, lastUpdatedAt: '2026-06-01T03:00:00.000Z', lastUpdatedBy: 'user-manager', createdAt: '2026-06-01T03:00:00.000Z', updatedAt: '2026-06-01T03:00:00.000Z'
  },
];

const researcherDocuments = [
  { id: 'doc-ktp-1', profileId: 'lecturer-1', documentType: 'KTP', fileUrl: 'mock://researcher-documents/lecturer-1/ktp.pdf', fileName: 'ktp-budi.pdf', fileSize: 1024000, fileFormat: 'PDF', uploadedAt: '2026-01-12T03:00:00.000Z', uploadedBy: 'user-lecturer', isActive: true },
  { id: 'doc-cv-1', profileId: 'lecturer-1', documentType: 'CV', fileUrl: 'mock://researcher-documents/lecturer-1/cv.pdf', fileName: 'cv-budi.pdf', fileSize: 2048000, fileFormat: 'PDF', uploadedAt: '2026-01-12T04:00:00.000Z', uploadedBy: 'user-lecturer', isActive: true },
  { id: 'doc-ktp-2', profileId: 'lecturer-2', documentType: 'KTP', fileUrl: 'mock://researcher-documents/lecturer-2/ktp.pdf', fileName: 'ktp-andini.pdf', fileSize: 1124000, fileFormat: 'PDF', uploadedAt: '2026-02-01T03:00:00.000Z', uploadedBy: 'user-lecturer-2', isActive: true },
  { id: 'doc-cv-2', profileId: 'lecturer-2', documentType: 'CV', fileUrl: 'mock://researcher-documents/lecturer-2/cv.pdf', fileName: 'cv-andini.pdf', fileSize: 1848000, fileFormat: 'PDF', uploadedAt: '2026-02-01T04:00:00.000Z', uploadedBy: 'user-lecturer-2', isActive: true },
  { id: 'doc-cv-3', profileId: 'lecturer-3', documentType: 'CV', fileUrl: 'mock://researcher-documents/lecturer-3/cv.pdf', fileName: 'cv-rizky.pdf', fileSize: 1948000, fileFormat: 'PDF', uploadedAt: '2026-03-01T04:00:00.000Z', uploadedBy: 'user-lecturer-3', isActive: true },
  { id: 'doc-ktp-admin', profileId: 'admin-1', documentType: 'KTP', fileUrl: 'mock://researcher-documents/admin-1/ktp.pdf', fileName: 'ktp-admin-lppm.pdf', fileSize: 824000, fileFormat: 'PDF', uploadedAt: '2026-06-01T03:00:00.000Z', uploadedBy: 'user-admin', isActive: true },
  { id: 'doc-cv-admin', profileId: 'admin-1', documentType: 'CV', fileUrl: 'mock://researcher-documents/admin-1/cv.pdf', fileName: 'cv-admin-lppm.pdf', fileSize: 1284000, fileFormat: 'PDF', uploadedAt: '2026-06-01T03:10:00.000Z', uploadedBy: 'user-admin', isActive: true },
  { id: 'doc-ktp-manager', profileId: 'manager-1', documentType: 'KTP', fileUrl: 'mock://researcher-documents/manager-1/ktp.pdf', fileName: 'ktp-kepala-lppm.pdf', fileSize: 826000, fileFormat: 'PDF', uploadedAt: '2026-06-01T03:00:00.000Z', uploadedBy: 'user-manager', isActive: true },
  { id: 'doc-cv-manager', profileId: 'manager-1', documentType: 'CV', fileUrl: 'mock://researcher-documents/manager-1/cv.pdf', fileName: 'cv-kepala-lppm.pdf', fileSize: 1334000, fileFormat: 'PDF', uploadedAt: '2026-06-01T03:10:00.000Z', uploadedBy: 'user-manager', isActive: true },
];

const researcherExpertiseMap = [
  { id: 'map-1', profileId: 'lecturer-1', expertiseId: 'expertise-ai' },
  { id: 'map-2', profileId: 'lecturer-1', expertiseId: 'expertise-ml' },
  { id: 'map-3', profileId: 'lecturer-1', expertiseId: 'expertise-si' },
  { id: 'map-4', profileId: 'lecturer-2', expertiseId: 'expertise-ai' },
  { id: 'map-5', profileId: 'lecturer-2', expertiseId: 'expertise-cv' },
  { id: 'map-6', profileId: 'lecturer-4', expertiseId: 'expertise-bisnis' },
];

const researcherVerifications = [
  { id: 'verification-1', profileId: 'lecturer-1', adminId: 'user-admin', verificationStatus: VERIFICATION_STATUS.VERIFIED, verificationNotes: 'Profil dan dokumen utama lengkap.', verifiedBy: 'user-admin', verifiedAt: '2026-06-05T03:00:00.000Z' },
];

const researcherStatusHistory = [
  { id: 'status-history-1', profileId: 'lecturer-1', oldStatus: PROFILE_STATUS.DRAFT, newStatus: PROFILE_STATUS.ACTIVE, changedBy: 'user-admin', changedAt: '2026-06-05T03:00:00.000Z' },
];

const adminAssignments = [
  { id: 'admin-assignment-1', profileId: 'lecturer-1', adminId: 'user-admin', assignedAt: '2026-06-05T03:00:00.000Z', assignedBy: 'user-manager' },
  { id: 'admin-assignment-2', profileId: 'lecturer-2', adminId: 'user-admin', assignedAt: '2026-06-12T03:00:00.000Z', assignedBy: 'user-manager' },
];

const systemActivityLogs = [
  { id: 'activity-log-1', logId: 'system-log-1', userId: 'user-admin', action: 'verify_profile', entityType: 'researcher_profile', entityId: 'lecturer-1', oldData: { verificationStatus: VERIFICATION_STATUS.PENDING }, newData: { verificationStatus: VERIFICATION_STATUS.VERIFIED }, createdAt: '2026-06-05T03:00:00.000Z' },
];

const researcherProfiles = baseResearcherProfiles.map(profile => ({
  ...profile,
  profileCompleteness: calculateProfileCompleteness(profile, researcherDocuments.filter(doc => doc.profileId === profile.profileId)),
}));

const applicantProfiles = [
  ...lecturers.map(item => ({
    id: item.id,
    userId: item.userId,
    name: item.name,
    identifier: item.nidn,
    applicantRole: item.employmentStatus === 'homebase' ? 'Dosen Homebase' : 'Dosen Fulltime',
    applicantKind: 'lecturer',
    status: item.employmentStatus,
    faculty: item.faculty,
    program: item.program,
    email: `${item.userId.replace('user-', '')}@umn.ac.id`,
  })),
  {
    id: 'student-1', userId: 'user-student', name: 'Ayu Larasati', identifier: '00000078910', applicantRole: 'Mahasiswa S1', applicantKind: 'student_s1', status: 'active', faculty: 'Teknik dan Informatika', program: 'Informatika', email: 'student@umn.ac.id'
  },
  {
    id: 'student-2', userId: 'user-student-2', name: 'Michael Tan', identifier: '00000081234', applicantRole: 'Mahasiswa S2', applicantKind: 'student_s2', status: 'active', faculty: 'Teknik dan Informatika', program: 'Magister Teknologi Informasi', email: 'michael.tan@student.umn.ac.id'
  },
];

const previousEthicsClearances = [
  {
    id: 'clearance-1', userId: 'user-lecturer', number: '001/KE-RIS/LPPM/01/2026', researchTitle: 'Studi Interaksi Pengguna pada Sistem Pembelajaran Digital', issuedAt: '2026-01-20', expiryDate: '2026-07-20'
  },
  {
    id: 'clearance-2', userId: 'user-student', number: '014/KE-RIS/LPPM/03/2026', researchTitle: 'Analisis Pengalaman Mahasiswa dalam Pembelajaran Hybrid', issuedAt: '2026-03-12', expiryDate: '2026-09-12'
  },
];

const letterRequests = [
  {
    id: 'letter-prechecked-1',
    userId: 'user-lecturer',
    createdBy: 'user-lecturer',
    researchId: 'draft-approved',
    type: 'support',
    purpose: 'interview',
    status: 'prechecked',
    applicant: { id: 'letter-prechecked-applicant', userId: 'user-lecturer', name: 'Dr. Budi Santoso', identifier: '0312048501', applicantRole: 'Dosen Fulltime', applicantKind: 'lecturer', status: 'fulltime', faculty: 'Teknik dan Informatika', program: 'Sistem Informasi', email: 'lecturer@umn.ac.id', isPrimary: true },
    applicants: [{ id: 'letter-prechecked-applicant', userId: 'user-lecturer', name: 'Dr. Budi Santoso', identifier: '0312048501', applicantRole: 'Dosen Fulltime', applicantKind: 'lecturer', status: 'fulltime', faculty: 'Teknik dan Informatika', program: 'Sistem Informasi', email: 'lecturer@umn.ac.id', isPrimary: true }],
    form: { relatedResearchId: 'draft-approved', recipientName: 'Kepala Dinas Pendidikan Kota Tangerang', recipientPosition: 'Kepala Dinas', eventDatetime: '2026-07-03T09:00', activityName: 'Wawancara validasi kebutuhan sistem', activityPurpose: 'Memperoleh data kebutuhan pengguna untuk penelitian sistem RIS.' },
    attachments: [{ id: 'letter-file-1', fileType: 'supporting_document', category: 'supporting_document', name: 'surat-permohonan-wawancara.pdf', fileName: 'surat-permohonan-wawancara.pdf', size: 524288, type: 'application/pdf', uploadedAt: '2026-06-20T02:10:00.000Z' }],
    prechecks: [{ id: 'precheck-1', letterId: 'letter-prechecked-1', status: 'passed', errors: [], checkedAt: '2026-06-20T02:12:00.000Z', checkedBy: 'system' }],
    reviews: [],
    history: [
      { status: 'draft', note: 'Draft surat dibuat.', at: '2026-06-20T02:00:00.000Z', by: 'user-lecturer' },
      { status: 'prechecked', note: 'Precheck sistem berhasil. Pengajuan masuk queue admin.', at: '2026-06-20T02:12:00.000Z', by: 'user-lecturer' },
    ],
    createdAt: '2026-06-20T02:00:00.000Z',
    updatedAt: '2026-06-20T02:12:00.000Z',
    submittedAt: '2026-06-20T02:12:00.000Z',
  },
  {
    id: 'letter-generated-1',
    userId: 'user-lecturer',
    createdBy: 'user-lecturer',
    researchId: '',
    type: 'research_assignment',
    purpose: 'journal',
    status: 'generated',
    applicant: { id: 'letter-generated-applicant', userId: 'user-lecturer', name: 'Dr. Budi Santoso', identifier: '0312048501', applicantRole: 'Dosen Fulltime', applicantKind: 'lecturer', status: 'fulltime', faculty: 'Teknik dan Informatika', program: 'Sistem Informasi', email: 'lecturer@umn.ac.id', isPrimary: true },
    applicants: [{ id: 'letter-generated-applicant', userId: 'user-lecturer', name: 'Dr. Budi Santoso', identifier: '0312048501', applicantRole: 'Dosen Fulltime', applicantKind: 'lecturer', status: 'fulltime', faculty: 'Teknik dan Informatika', program: 'Sistem Informasi', email: 'lecturer@umn.ac.id', isPrimary: true }],
    form: { title: 'Model Analitik Proposal Penelitian', publicationName: 'Jurnal Sistem Informasi', category: 'nasional', indexing: 'Sinta 2', url: 'https://example.test/article', publicationRole: 'author', authorPosition: 'Penulis pertama', publicationStatus: 'accepted' },
    attachments: [{ id: 'letter-file-2', fileType: 'article', category: 'article', name: 'artikel-ris.pdf', fileName: 'artikel-ris.pdf', size: 1048576, type: 'application/pdf', uploadedAt: '2026-06-12T02:10:00.000Z' }, { id: 'letter-file-3', fileType: 'publication_submission_evidence', category: 'publication_submission_evidence', name: 'loa.pdf', fileName: 'loa.pdf', size: 262144, type: 'application/pdf', uploadedAt: '2026-06-12T02:10:00.000Z' }],
    prechecks: [{ id: 'precheck-2', letterId: 'letter-generated-1', status: 'passed', errors: [], checkedAt: '2026-06-12T02:12:00.000Z', checkedBy: 'system' }],
    reviews: [{ id: 'letter-review-1', letterId: 'letter-generated-1', reviewerId: 'user-admin', decision: 'approved', notes: 'Data dan dokumen lengkap.', reviewedAt: '2026-06-13T03:00:00.000Z' }],
    generated: { letterNumber: '0001/ST-RIS/LPPM/06/2026', fileName: '0001-ST-RIS-LPPM-06-2026.txt', fileUrl: 'archive://letter-generated-1', generatedAt: '2026-06-13T04:00:00.000Z', content: 'Surat final demo RIS.' },
    history: [
      { status: 'draft', note: 'Draft surat dibuat.', at: '2026-06-12T02:00:00.000Z', by: 'user-lecturer' },
      { status: 'prechecked', note: 'Precheck sistem berhasil.', at: '2026-06-12T02:12:00.000Z', by: 'user-lecturer' },
      { status: 'approved', note: 'Data dan dokumen lengkap.', at: '2026-06-13T03:00:00.000Z', by: 'user-admin' },
      { status: 'generated', note: 'Surat final berhasil dibuat dan diarsipkan.', at: '2026-06-13T04:00:00.000Z', by: 'user-admin' },
    ],
    createdAt: '2026-06-12T02:00:00.000Z', updatedAt: '2026-06-13T04:00:00.000Z', submittedAt: '2026-06-12T02:12:00.000Z'
  },
];


const externalResearchReports = [
  {
    id: 'external-report-1',
    userId: 'user-lecturer',
    createdBy: 'user-lecturer',
    userName: 'Dr. Budi Santoso',
    activityName: 'Hibah Riset Terapan Kemdikbud 2026',
    researchTitle: 'Model Analitik Prediksi Keberhasilan Studi Mahasiswa',
    activityYear: 2026,
    activityStatus: 'ongoing',
    activityType: 'external',
    roleInResearch: 'ketua',
    organizerOrigin: 'Kemdikbudristek',
    fundingSource: 'DRTPM',
    fundingAmount: 150000000,
    currency: 'IDR',
    submissionStatus: EXTERNAL_STATUS.SUBMITTED,
    category: 'grant',
    metadata: {
      ripRelation: 'ICT-Based',
      tktTarget: 5,
      sdgInvolvement: true,
      sdgs: [4, 9],
      integrationToTeaching: true,
      courseName: 'Data Mining',
      academicYear: '2026/2027',
      integrationProofFile: { id: 'external-teach-proof-1', category: 'integration_proof', name: 'rps-data-mining.pdf', size: 280000, type: 'application/pdf', fileUrl: 'rps-data-mining.pdf' },
    },
    typeDetail: {
      grantType: 'nasional',
      grantName: 'Hibah Riset Terapan',
      grantLink: 'https://example.test/hibah',
      researchStatus: 'ongoing',
      fundingAmount: 150000000,
    },
    documents: [
      { id: 'external-file-1', fileType: 'proposal', name: 'proposal-hibah.pdf', fileName: 'proposal-hibah.pdf', fileUrl: 'proposal-hibah.pdf', size: 1200000, type: 'application/pdf', uploadedBy: 'user-lecturer', uploadedAt: '2026-06-03T02:00:00.000Z' },
      { id: 'external-file-2', fileType: 'budget_plan', name: 'rab-hibah.xlsx', fileName: 'rab-hibah.xlsx', fileUrl: 'rab-hibah.xlsx', size: 350000, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', uploadedBy: 'user-lecturer', uploadedAt: '2026-06-03T02:00:00.000Z' },
      { id: 'external-file-3', fileType: 'contract', name: 'kontrak-hibah.pdf', fileName: 'kontrak-hibah.pdf', fileUrl: 'kontrak-hibah.pdf', size: 500000, type: 'application/pdf', uploadedBy: 'user-lecturer', uploadedAt: '2026-06-03T02:00:00.000Z' },
    ],
    outputs: [
      { id: 'external-output-1', outputType: 'journal', title: 'Predictive Analytics for Student Success', year: 2026, description: 'Artikel jurnal terkait model prediksi.', link: '', file: null },
      { id: 'external-output-2', outputType: 'prototype', title: 'Dashboard Prediksi Akademik', year: 2026, description: 'Prototype dashboard analitik.', link: '', file: null },
    ],
    reviews: [],
    history: [
      { status: EXTERNAL_STATUS.DRAFT, note: 'Draft laporan dibuat.', at: '2026-06-02T02:00:00.000Z', by: 'user-lecturer' },
      { status: EXTERNAL_STATUS.SUBMITTED, note: 'Laporan disubmit ke LPPM.', at: '2026-06-03T02:10:00.000Z', by: 'user-lecturer' },
    ],
    createdAt: '2026-06-02T02:00:00.000Z',
    updatedAt: '2026-06-03T02:10:00.000Z',
    submittedAt: '2026-06-03T02:10:00.000Z',
    validatedAt: null,
    archivedAt: null,
  },
  {
    id: 'external-report-2',
    userId: 'user-lecturer',
    createdBy: 'user-lecturer',
    userName: 'Dr. Budi Santoso',
    activityName: 'Penelitian Mandiri PRO-STEP',
    researchTitle: 'Pengembangan Prototipe Sistem Informasi Riset Terintegrasi',
    activityYear: 2025,
    activityStatus: 'completed',
    activityType: 'mandiri',
    roleInResearch: 'ketua',
    organizerOrigin: 'Mandiri',
    fundingSource: 'Mandiri',
    fundingAmount: 25000000,
    currency: 'IDR',
    submissionStatus: EXTERNAL_STATUS.VALIDATED,
    category: 'independent',
    metadata: { ripRelation: 'ICT-Based', tktTarget: 6, sdgInvolvement: true, sdgs: [4, 9], integrationToTeaching: false, courseName: '', academicYear: '', integrationProofFile: null },
    typeDetail: { independentType: 'prostep' },
    documents: [
      { id: 'external-file-4', fileType: 'proposal', name: 'proposal-prostep.pdf', fileName: 'proposal-prostep.pdf', fileUrl: 'proposal-prostep.pdf', size: 920000, type: 'application/pdf', uploadedBy: 'user-lecturer', uploadedAt: '2025-11-03T02:00:00.000Z' },
      { id: 'external-file-5', fileType: 'budget_plan', name: 'rab-prostep.xlsx', fileName: 'rab-prostep.xlsx', fileUrl: 'rab-prostep.xlsx', size: 210000, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', uploadedBy: 'user-lecturer', uploadedAt: '2025-11-03T02:00:00.000Z' },
      { id: 'external-file-6', fileType: 'contract', name: 'surat-tugas-prostep.pdf', fileName: 'surat-tugas-prostep.pdf', fileUrl: 'surat-tugas-prostep.pdf', size: 320000, type: 'application/pdf', uploadedBy: 'user-lecturer', uploadedAt: '2025-11-03T02:00:00.000Z' },
      { id: 'external-file-7', fileType: 'final_report', name: 'laporan-akhir-prostep.pdf', fileName: 'laporan-akhir-prostep.pdf', fileUrl: 'laporan-akhir-prostep.pdf', size: 1800000, type: 'application/pdf', uploadedBy: 'user-lecturer', uploadedAt: '2025-12-12T02:00:00.000Z' },
    ],
    outputs: [{ id: 'external-output-3', outputType: 'prototype', title: 'Prototype RIS', year: 2025, description: 'Prototype dashboard RIS.', link: 'https://example.test/prototype', file: null }],
    reviews: [{ id: 'external-review-1', reportId: 'external-report-2', reviewerId: 'user-admin', decision: EXTERNAL_STATUS.VALIDATED, notes: 'Laporan dan dokumen lengkap.', checklist: { fieldComplete: true, documentsComplete: true, documentsValid: true, notDuplicate: true, statusConsistent: true }, reviewedAt: '2025-12-15T02:00:00.000Z' }],
    history: [
      { status: EXTERNAL_STATUS.DRAFT, note: 'Draft laporan dibuat.', at: '2025-11-03T02:00:00.000Z', by: 'user-lecturer' },
      { status: EXTERNAL_STATUS.SUBMITTED, note: 'Laporan disubmit ke LPPM.', at: '2025-12-12T02:00:00.000Z', by: 'user-lecturer' },
      { status: EXTERNAL_STATUS.VALIDATED, note: 'Laporan divalidasi LPPM.', at: '2025-12-15T02:00:00.000Z', by: 'user-admin' },
    ],
    createdAt: '2025-11-03T02:00:00.000Z', updatedAt: '2025-12-15T02:00:00.000Z', submittedAt: '2025-12-12T02:00:00.000Z', validatedAt: '2025-12-15T02:00:00.000Z', archivedAt: null,
  },
];

const project = {
  title: 'Pengembangan Sistem Analitik Penelitian Berbasis Kecerdasan Buatan',
  mandatoryOutputPlan: 'scopus_q2',
  additionalOutputPlan: 'prototype',
  additionalOutputPlans: ['prototype'],
  targetTkt: 5,
  ripRelation: 'ict_based',
  researchCenterRelation: 'ict_based',
  sdgs: [4, 9],
  integrated: true,
  courseName: 'machine_learning',
  academicYear: '2025/2026',
};

const members = [
  {
    id: 'member-1', role: 'ketua', type: 'internal_lecturer', profileId: 'lecturer-1', name: 'Dr. Budi Santoso', nidn: '0312048501', program: 'Sistem Informasi', faculty: 'Teknik dan Informatika', orcid: '0000000218250097'
  },
  {
    id: 'member-2', role: 'member', type: 'internal_lecturer', profileId: 'lecturer-2', name: 'Dr. Andini Prameswari', nidn: '0308078602', program: 'Informatika', faculty: 'Teknik dan Informatika', orcid: '0000000319261188'
  },
];

const budgets = [
  {
    id: 'budget-1', tab: 'materials', component: 'Bahan habis pakai', name: 'Perangkat sensor', volume: 4, unit: 'unit', unitPrice: 1250000, notes: 'Perangkat prototipe'
  },
  {
    id: 'budget-2', tab: 'analysis', component: 'Pengolahan data', name: 'Cloud computing', volume: 6, unit: 'bulan', unitPrice: 750000, notes: ''
  },
];

const outputs = [
  {
    ...OUTPUT_EMPTY, id: 'output-1', type: 'wajib', title: 'Artikel Analitik Penelitian', targetYear: 2026, description: 'Artikel pada jurnal internasional bereputasi.', category: 'jurnal', journalTargetLevel: 'scopus', journalIndexTarget: 'Scopus Q2', publicationType: 'internasional', targetQuartile: 'Q2'
  },
];

const files = [
  {
    id: 'file-1', category: 'proposal', name: 'proposal-penelitian.pdf', size: 1843200, type: 'application/pdf'
  },
  {
    id: 'file-2', category: 'rab', name: 'rab-penelitian.xlsx', size: 245760, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  },
];

const draftBase = {
  userId: 'user-lecturer', userName: 'Dr. Budi Santoso', schemeId: 'scheme-1', project, members, budgets, outputs, files, createdAt: '2026-05-04T08:30:00.000Z', submittedAt: '2026-05-06T03:15:00.000Z'
};

export const createInitialData = () => ({
  systemUsers,
  researcherProfiles,
  researcherDocuments,
  researcherExpertise,
  researcherExpertiseMap,
  researcherVerifications,
  researcherStatusHistory,
  adminAssignments,
  systemActivityLogs,
  profileSequence: 4,
  lecturers,
  reviewers,
  applicantProfiles,
  previousEthicsClearances,
  letterRequests,
  letterSequence: 2,
  notifications: [],
  emailOutbox: [],
  externalResearchReports,
  externalResearchSequence: 2,
  schemes: [
    {
      id: 'scheme-1', name: 'Penelitian Dosen Pemula 2026', description: 'Pendanaan penelitian internal bagi dosen yang sedang membangun rekam jejak penelitian.', startDate: '2026-07-01', endDate: '2027-06-30', registrationStartDate: '2026-01-01T08:00', registrationEndDate: '2026-12-31T23:59', year: 2026, status: 'open', schemeStatus: 'open', eligibleProfileIds: lecturers.map(item => item.id), eligibleUserIds: lecturers.map(item => item.userId), eligibleLecturerIds: lecturers.map(item => item.id), filters: {}
    },
    {
      id: 'scheme-2', name: 'Hibah Penelitian Kompetitif Internal', description: 'Skema penelitian kompetitif untuk menghasilkan publikasi dan inovasi unggulan.', startDate: '2026-08-01', endDate: '2027-07-31', registrationStartDate: '2026-02-01T08:00', registrationEndDate: '2026-11-30T23:59', year: 2026, status: 'open', schemeStatus: 'open', eligibleProfileIds: ['lecturer-1', 'lecturer-2'], eligibleUserIds: ['user-lecturer', 'user-lecturer-2'], eligibleLecturerIds: ['lecturer-1', 'lecturer-2'], filters: {}
    },
    {
      id: 'scheme-3', name: 'Penelitian Kerjasama Industri', description: 'Penelitian kolaboratif bersama mitra industri strategis.', startDate: '2026-09-01', endDate: '2027-08-31', registrationStartDate: '2026-03-01T08:00', registrationEndDate: '2026-10-31T23:59', year: 2026, status: 'open', schemeStatus: 'open', eligibleProfileIds: ['lecturer-1', 'lecturer-4'], eligibleUserIds: ['user-lecturer', 'user-lecturer-4'], eligibleLecturerIds: ['lecturer-1', 'lecturer-4'], filters: {}
    },
  ],
  drafts: [
    {
      ...draftBase, id: 'draft-submitted', status: STATUS.SUBMITTED, schemeId: 'scheme-1'
    },
    {
      ...draftBase, id: 'draft-assigned', status: STATUS.UNDER_REVIEW, schemeId: 'scheme-2', project: { ...project, title: 'Model Prediksi Keberhasilan Studi Mahasiswa Menggunakan Machine Learning' }, assignment: { reviewerId: 'reviewer-1', reviewerUserId: 'user-reviewer', reviewerProfileId: 'reviewer-1', status: 'assigned', assignedAt: '2026-05-08T07:00:00.000Z' }
    },
    {
      ...draftBase,
      id: 'draft-reviewed',
      status: STATUS.UNDER_REVIEW,
      schemeId: 'scheme-3',
      project: { ...project, title: 'Platform Kolaborasi Riset Universitas dan Industri Kreatif' },
      assignment: { reviewerId: 'reviewer-1', reviewerUserId: 'user-reviewer', reviewerProfileId: 'reviewer-1', status: 'submitted', assignedAt: '2026-05-08T07:00:00.000Z', submittedAt: '2026-05-10T04:00:00.000Z' },
      review: {
        scores: Object.fromEntries(REVIEW_CRITERIA.map(item => [item.code, 82])), totalScore: 82, recommendation: 'approve', strengths: 'Topik relevan dan metodologi jelas.', weaknesses: 'Rencana diseminasi perlu dirinci.', budgetNotes: 'Anggaran wajar.', outputNotes: 'Target luaran realistis.', revisionNotes: '', submittedAt: '2026-05-10T04:00:00.000Z'
      }
    },
    {
      ...draftBase, id: 'draft-approved', status: STATUS.APPROVED, schemeId: 'scheme-1', project: { ...project, title: 'Pengembangan Repositori Riset Terintegrasi' }, decision: { finalDecision: 'approved', notes: 'Proposal disetujui untuk didanai.', decidedAt: '2026-05-12T04:00:00.000Z' }, contract: { status: 'unsigned', templateName: 'template-kontrak.pdf' }
    },
  ],
  logbooks: [
    {
      id: 'log-1', researchId: 'draft-approved', date: '2026-02-03', startTime: '08:00', endTime: '17:00', description: 'Melaksanakan meeting koordinasi dengan tim peneliti terkait rencana kerja penelitian.', fileCount: 1
    },
    {
      id: 'log-2', researchId: 'draft-approved', date: '2026-02-05', startTime: '09:00', endTime: '18:00', description: 'Melanjutkan penyusunan instrumen dan rancangan pengumpulan data.', fileCount: 1
    },
  ],
});

export const normalizeRisData = current => {
  const initial = createInitialData();
  return {
    ...initial,
    ...current,
    systemUsers: current && current.systemUsers ? current.systemUsers : initial.systemUsers,
    researcherProfiles: current && current.researcherProfiles ? current.researcherProfiles : initial.researcherProfiles,
    researcherDocuments: current && current.researcherDocuments ? current.researcherDocuments : initial.researcherDocuments,
    researcherExpertise: current && current.researcherExpertise ? current.researcherExpertise : initial.researcherExpertise,
    researcherExpertiseMap: current && current.researcherExpertiseMap ? current.researcherExpertiseMap : initial.researcherExpertiseMap,
    researcherVerifications: current && current.researcherVerifications ? current.researcherVerifications : initial.researcherVerifications,
    researcherStatusHistory: current && current.researcherStatusHistory ? current.researcherStatusHistory : initial.researcherStatusHistory,
    adminAssignments: current && current.adminAssignments ? current.adminAssignments : initial.adminAssignments,
    systemActivityLogs: current && current.systemActivityLogs ? current.systemActivityLogs : initial.systemActivityLogs,
    profileSequence: current && current.profileSequence ? current.profileSequence : initial.profileSequence,
    lecturers: current && current.lecturers ? current.lecturers : initial.lecturers,
    reviewers: current && current.reviewers ? current.reviewers : initial.reviewers,
    schemes: current && current.schemes ? current.schemes : initial.schemes,
    drafts: current && current.drafts ? current.drafts : initial.drafts,
    logbooks: current && current.logbooks ? current.logbooks : initial.logbooks,
    applicantProfiles: current && current.applicantProfiles ? current.applicantProfiles : initial.applicantProfiles,
    previousEthicsClearances: current && current.previousEthicsClearances ? current.previousEthicsClearances : initial.previousEthicsClearances,
    letterRequests: current && current.letterRequests ? current.letterRequests : initial.letterRequests,
    letterSequence: current && current.letterSequence ? current.letterSequence : initial.letterSequence,
    notifications: current && current.notifications ? current.notifications : initial.notifications,
    emailOutbox: current && current.emailOutbox ? current.emailOutbox : initial.emailOutbox,
    externalResearchReports: current && current.externalResearchReports ? current.externalResearchReports : initial.externalResearchReports,
    externalResearchSequence: current && current.externalResearchSequence ? current.externalResearchSequence : initial.externalResearchSequence,
  };
};

export const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const totalBudget = draft => (draft.budgets || []).reduce((sum, item) => sum + (Number(item.volume) || 0) * (Number(item.unitPrice) || 0), 0);

export const formatCurrency = value => `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value || 0)}`;

export const formatDate = value => (value ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value)) : '-');

export const fileMeta = file => (file ? ({
  id: uid('file'), category: '', name: file.name, size: file.size, type: file.type || '', lastModified: file.lastModified
}) : null);
