/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import { ROLE, isAdmin, normalizeRole } from './workflow';

export const LETTER_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  DRAFT_REVISION: 'draft_revision',
  PRECHECKED: 'prechecked',
  REVISION_REQUIRED: 'revision_required',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  GENERATED: 'generated',
};

export const LETTER_TYPE = {
  RESEARCH_ASSIGNMENT: 'research_assignment',
  SUPPORT: 'support',
  ETHICS: 'ethics',
  TRAVEL: 'travel',
};

export const LETTER_STATUS_META = {
  [LETTER_STATUS.DRAFT]: { label: 'Draft', tone: 'gray' },
  [LETTER_STATUS.SUBMITTED]: { label: 'Submitted', tone: 'cyan' },
  [LETTER_STATUS.DRAFT_REVISION]: { label: 'Draft Revision', tone: 'yellow' },
  [LETTER_STATUS.PRECHECKED]: { label: 'Prechecked', tone: 'blue' },
  [LETTER_STATUS.REVISION_REQUIRED]: { label: 'Revision Required', tone: 'orange' },
  [LETTER_STATUS.APPROVED]: { label: 'Approved', tone: 'green' },
  [LETTER_STATUS.REJECTED]: { label: 'Rejected', tone: 'red' },
  [LETTER_STATUS.GENERATED]: { label: 'Generated', tone: 'purple' },
};

export const LETTER_TYPES = [
  {
    value: LETTER_TYPE.RESEARCH_ASSIGNMENT,
    label: 'Surat Tugas Penelitian dan Inovasi',
    shortLabel: 'Surat Tugas Penelitian',
    description: 'Untuk penelitian mandiri, kerja sama, hibah, publikasi, seminar ilmiah, buku, dan karya seni.',
    icon: 'document',
  },
  {
    value: LETTER_TYPE.SUPPORT,
    label: 'Surat Pendukung Kegiatan',
    shortLabel: 'Surat Pendukung',
    description: 'Untuk izin penelitian, observasi, wawancara, workshop, FGD, dan kegiatan penelitian lainnya.',
    icon: 'mail',
  },
  {
    value: LETTER_TYPE.ETHICS,
    label: 'Klirens Etik Riset',
    shortLabel: 'Klirens Etik',
    description: 'Untuk permohonan klirens etik baru atau perpanjangan klirens etik riset.',
    icon: 'check',
  },
  {
    value: LETTER_TYPE.TRAVEL,
    label: 'Surat Tugas Perjalanan Dinas',
    shortLabel: 'Perjalanan Dinas',
    description: 'Untuk kegiatan penelitian yang memerlukan perjalanan dinas.',
    icon: 'layers',
  },
];

export const LETTER_PURPOSES = {
  [LETTER_TYPE.RESEARCH_ASSIGNMENT]: [
    { value: 'independent_research', label: 'Penelitian Mandiri' },
    { value: 'domestic_university_collaboration', label: 'Penelitian Kerjasama PT Dalam Negeri' },
    { value: 'international_university_collaboration', label: 'Penelitian Kerjasama PT Luar Negeri' },
    { value: 'internal_grant', label: 'Penelitian Hibah Internal' },
    { value: 'government_grant', label: 'Penelitian Pemerintah' },
    { value: 'industry_research', label: 'Penelitian Industri' },
    { value: 'journal', label: 'Jurnal' },
    { value: 'proceeding', label: 'Prosiding' },
    { value: 'book', label: 'Buku' },
    { value: 'scientific_seminar', label: 'Seminar Ilmiah' },
    { value: 'artwork', label: 'Karya Seni' },
  ],
  [LETTER_TYPE.SUPPORT]: [
    { value: 'research_permission', label: 'Permohonan Izin Penelitian' },
    { value: 'observation', label: 'Observasi' },
    { value: 'interview', label: 'Wawancara' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'fgd', label: 'FGD' },
    { value: 'other_research_activity', label: 'Kegiatan Penelitian Lainnya' },
  ],
  [LETTER_TYPE.ETHICS]: [
    { value: 'new', label: 'Permohonan Baru' },
    { value: 'extension', label: 'Perpanjangan' },
  ],
  [LETTER_TYPE.TRAVEL]: [
    { value: 'research_travel', label: 'Perjalanan Dinas Penelitian' },
  ],
};

export const FILE_TYPES = [
  { value: 'proposal', label: 'Proposal' },
  { value: 'mou', label: 'MoU / MoA / LoA' },
  { value: 'article', label: 'Artikel / Manuskrip' },
  { value: 'publication_submission_evidence', label: 'Bukti Submit / Acceptance' },
  { value: 'ethics_form', label: 'Form Klirens Etik' },
  { value: 'previous_clearance', label: 'Klirens Etik Sebelumnya' },
  { value: 'invitation', label: 'Undangan / Invitation Letter' },
  { value: 'supporting_document', label: 'Dokumen Pendukung' },
  { value: 'travel_schedule', label: 'Jadwal Perjalanan' },
  { value: 'report', label: 'Laporan / Bukti Kegiatan' },
  { value: 'contract', label: 'Kontrak / Surat Kerja Sama' },
];

const PUBLICATION_PURPOSES = ['journal', 'proceeding', 'book'];
const COLLABORATION_PURPOSES = ['domestic_university_collaboration', 'international_university_collaboration'];
const GRANT_PURPOSES = ['internal_grant', 'government_grant'];
const RESEARCH_PURPOSES = ['independent_research', ...COLLABORATION_PURPOSES, ...GRANT_PURPOSES, 'industry_research'];
const ALLOWED_FILE_EXTENSIONS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const getLetterTypeMeta = type => LETTER_TYPES.find(item => item.value === type) || LETTER_TYPES[0];
export const getLetterPurposeOptions = type => LETTER_PURPOSES[type] || [];
export const getLetterPurposeMeta = (type, purpose) => getLetterPurposeOptions(type).find(item => item.value === purpose) || { label: '-' };
export const letterStatus = letter => (letter && letter.status) || LETTER_STATUS.DRAFT;
export const letterStatusMeta = letter => LETTER_STATUS_META[letterStatus(letter)] || LETTER_STATUS_META[LETTER_STATUS.DRAFT];
export const isPublicationPurpose = purpose => PUBLICATION_PURPOSES.includes(purpose);
export const isResearchPurpose = purpose => RESEARCH_PURPOSES.includes(purpose);
export const isCollaborationPurpose = purpose => COLLABORATION_PURPOSES.includes(purpose);
export const isGrantPurpose = purpose => GRANT_PURPOSES.includes(purpose);

export const isApplicantUser = user => {
  const role = normalizeRole(user && user.role);
  return [ROLE.RESEARCHER, ROLE.REVIEWER, ROLE.SUPER_ADMIN, ROLE.GUEST].includes(role);
};

export const canViewLetter = (letter, user) => {
  if (!letter || !user) return false;
  if (isAdmin(user)) return true;
  return letter.userId === user.id || letter.createdBy === user.id;
};

export const canEditLetter = (letter, user) => canViewLetter(letter, user)
  && isApplicantUser(user)
  && [LETTER_STATUS.DRAFT, LETTER_STATUS.DRAFT_REVISION, LETTER_STATUS.REVISION_REQUIRED].includes(letterStatus(letter));

export const canSubmitLetter = (letter, user) => canEditLetter(letter, user);
export const canAdminReviewLetter = (letter, user) => isAdmin(user) && letterStatus(letter) === LETTER_STATUS.PRECHECKED;
export const canGenerateLetter = (letter, user) => isAdmin(user) && letterStatus(letter) === LETTER_STATUS.APPROVED;
export const canDownloadFinalLetter = (letter, user) => canViewLetter(letter, user) && letterStatus(letter) === LETTER_STATUS.GENERATED;

export const getApplicantProfile = (user, data) => {
  const profiles = data.applicantProfiles || [];
  const profile = profiles.find(item => item.userId === (user && user.id) || item.id === (user && user.profileId));
  if (profile) return profile;
  const lecturer = (data.lecturers || []).find(item => item.userId === (user && user.id) || item.id === (user && user.profileId));
  if (lecturer) {
    return {
      id: lecturer.id,
      userId: lecturer.userId,
      name: lecturer.name,
      identifier: lecturer.nidn,
      applicantRole: 'Dosen',
      applicantKind: 'lecturer',
      status: lecturer.employmentStatus || 'fulltime',
      faculty: lecturer.faculty,
      program: lecturer.program,
      email: user.email,
    };
  }
  return {
    id: user.profileId || user.id,
    userId: user.id,
    name: user.name,
    identifier: user.identifier || '-',
    applicantRole: user.applicantType || 'User',
    applicantKind: user.applicantType || 'guest',
    status: 'active',
    faculty: '-',
    program: '-',
    email: user.email,
  };
};

export const createApplicantSnapshot = (user, data) => {
  const profile = getApplicantProfile(user, data);
  return {
    id: `${profile.id}-snapshot-${Date.now()}`,
    userId: profile.userId,
    name: profile.name,
    identifier: profile.identifier,
    applicantRole: profile.applicantRole,
    applicantKind: profile.applicantKind,
    status: profile.status,
    faculty: profile.faculty,
    program: profile.program,
    email: profile.email,
    isPrimary: true,
  };
};

export const createLetterDraft = (type, user, data, uid) => {
  const now = new Date().toISOString();
  const letterType = type || LETTER_TYPE.RESEARCH_ASSIGNMENT;
  const firstPurpose = (LETTER_PURPOSES[letterType] || [])[0];
  const id = uid('letter');
  const applicant = createApplicantSnapshot(user, data);
  return {
    id,
    userId: user.id,
    createdBy: user.id,
    researchId: '',
    type: letterType,
    purpose: firstPurpose ? firstPurpose.value : '',
    status: LETTER_STATUS.DRAFT,
    applicant,
    applicants: [applicant],
    form: {},
    attachments: [],
    prechecks: [],
    reviews: [],
    history: [{ status: LETTER_STATUS.DRAFT, note: 'Draft surat dibuat.', at: now, by: user.id }],
    createdAt: now,
    updatedAt: now,
    submittedAt: null,
  };
};

export const getLetterTitle = letter => {
  if (!letter) return '-';
  const form = letter.form || {};
  return form.researchTitle || form.title || form.activityName || form.eventName || form.research_title || getLetterTypeMeta(letter.type).label;
};

export const updateLetterHistory = (letter, status, note, user) => ({
  ...letter,
  status,
  history: [
    ...(letter.history || []),
    {
      status,
      note,
      at: new Date().toISOString(),
      by: user ? user.id : null,
    },
  ],
  updatedAt: new Date().toISOString(),
});

const hasValue = value => value !== null && value !== undefined && String(value).trim() !== '';
const fieldError = (field, message) => ({ field, message });

export const requiredFieldsForLetter = letter => {
  const type = letter.type;
  const purpose = letter.purpose;
  const required = [];

  if (!purpose) required.push(['purpose', 'Kepentingan surat wajib dipilih.']);

  if (type === LETTER_TYPE.RESEARCH_ASSIGNMENT && isResearchPurpose(purpose)) {
    required.push(
      ['researchTitle', 'Judul penelitian wajib diisi.'],
      ['researchYear', 'Tahun penelitian wajib diisi.'],
      ['researchDuration', 'Durasi penelitian wajib diisi.'],
      ['researchLocation', 'Lokasi penelitian wajib diisi.'],
      ['researchRole', 'Peran dalam penelitian wajib diisi.'],
      ['researchTeam', 'Tim penelitian wajib diisi.'],
    );
    if (isCollaborationPurpose(purpose)) required.push(['partnerName', 'Nama mitra wajib diisi.'], ['partnerInstitution', 'Institusi mitra wajib diisi.']);
    if (purpose === 'international_university_collaboration') required.push(['partnerCountry', 'Negara mitra wajib diisi.']);
    if (isGrantPurpose(purpose)) required.push(['programName', 'Nama program hibah wajib diisi.'], ['researchScheme', 'Skema/program penelitian wajib diisi.']);
    if (purpose === 'industry_research') required.push(['partnerName', 'Nama mitra industri wajib diisi.'], ['partnerOrigin', 'Asal mitra wajib diisi.'], ['partnerScale', 'Skala mitra wajib diisi.']);
  }

  if (type === LETTER_TYPE.RESEARCH_ASSIGNMENT && isPublicationPurpose(purpose)) {
    required.push(
      ['title', 'Judul publikasi wajib diisi.'],
      ['publicationName', 'Nama jurnal/prosiding/penerbit wajib diisi.'],
      ['category', 'Kategori publikasi wajib diisi.'],
      ['publicationRole', 'Peran publikasi wajib diisi.'],
      ['publicationStatus', 'Status publikasi wajib diisi.'],
    );
  }

  if (type === LETTER_TYPE.RESEARCH_ASSIGNMENT && purpose === 'scientific_seminar') {
    required.push(['eventName', 'Nama seminar wajib diisi.'], ['eventCategory', 'Kategori seminar wajib diisi.'], ['eventLocation', 'Lokasi seminar wajib diisi.'], ['eventOrganizer', 'Penyelenggara wajib diisi.'], ['role', 'Peran wajib diisi.']);
  }

  if (type === LETTER_TYPE.RESEARCH_ASSIGNMENT && purpose === 'artwork') {
    required.push(['outputType', 'Jenis karya wajib diisi.'], ['title', 'Judul karya wajib diisi.'], ['location', 'Lokasi/publikasi karya wajib diisi.'], ['organizer', 'Penyelenggara wajib diisi.']);
  }

  if (type === LETTER_TYPE.SUPPORT) {
    required.push(['recipientName', 'Nama penerima surat wajib diisi.'], ['recipientPosition', 'Jabatan penerima wajib diisi.'], ['eventDatetime', 'Waktu kegiatan wajib diisi.'], ['activityName', 'Nama kegiatan wajib diisi.'], ['activityPurpose', 'Tujuan kegiatan wajib diisi.']);
  }

  if (type === LETTER_TYPE.ETHICS) {
    required.push(['researchTitle', 'Judul riset wajib diisi.'], ['researchStartDate', 'Tanggal mulai riset wajib diisi.']);
    if (purpose === 'extension') required.push(['previousClearanceId', 'Klirens etik sebelumnya wajib dipilih.'], ['previousClearanceNumber', 'Nomor klirens sebelumnya wajib diisi.'], ['expiryDate', 'Tanggal kedaluwarsa klirens sebelumnya wajib diisi.']);
  }

  if (type === LETTER_TYPE.TRAVEL) {
    required.push(['activityName', 'Nama kegiatan wajib diisi.'], ['travelDestination', 'Tujuan perjalanan wajib diisi.'], ['departureDate', 'Tanggal berangkat wajib diisi.'], ['returnDate', 'Tanggal kembali wajib diisi.'], ['transportMode', 'Moda transportasi wajib diisi.'], ['activityPurpose', 'Tujuan perjalanan wajib diisi.']);
  }

  return required;
};

export const requiredAttachmentTypes = letter => {
  const type = letter.type;
  const purpose = letter.purpose;
  const form = letter.form || {};
  const files = [];

  if (type === LETTER_TYPE.RESEARCH_ASSIGNMENT && isResearchPurpose(purpose)) files.push('proposal');
  if (type === LETTER_TYPE.RESEARCH_ASSIGNMENT && isCollaborationPurpose(purpose)) files.push('mou');
  if (type === LETTER_TYPE.RESEARCH_ASSIGNMENT && purpose === 'industry_research') files.push('contract');
  if (type === LETTER_TYPE.RESEARCH_ASSIGNMENT && isPublicationPurpose(purpose)) files.push('article');
  if (type === LETTER_TYPE.RESEARCH_ASSIGNMENT && isPublicationPurpose(purpose) && ['submitted', 'accepted', 'published'].includes(form.publicationStatus)) files.push('publication_submission_evidence');
  if (type === LETTER_TYPE.RESEARCH_ASSIGNMENT && purpose === 'scientific_seminar') files.push('invitation');
  if (type === LETTER_TYPE.RESEARCH_ASSIGNMENT && purpose === 'artwork') files.push('supporting_document');
  if (type === LETTER_TYPE.SUPPORT) files.push('supporting_document');
  if (type === LETTER_TYPE.ETHICS) files.push('ethics_form');
  if (type === LETTER_TYPE.ETHICS && purpose === 'extension') files.push('previous_clearance');
  if (type === LETTER_TYPE.TRAVEL) files.push('invitation', 'travel_schedule');

  return [...new Set(files)];
};

const attachmentFor = (letter, type) => (letter.attachments || []).find(item => item.fileType === type || item.category === type);

export const validateLetterStructure = letter => {
  const errors = [];
  const form = letter.form || {};
  requiredFieldsForLetter(letter).forEach(([field, message]) => {
    if (field === 'purpose') {
      if (!hasValue(letter.purpose)) errors.push(fieldError(field, message));
      return;
    }
    if (!hasValue(form[field])) errors.push(fieldError(field, message));
  });

  requiredAttachmentTypes(letter).forEach(type => {
    if (!attachmentFor(letter, type)) errors.push(fieldError(`file:${type}`, `${fileTypeLabel(type)} wajib diupload.`));
  });

  return errors;
};

export const validateLetterConsistency = (letter, data) => {
  const errors = [];
  const form = letter.form || {};
  if (letter.type === LETTER_TYPE.TRAVEL && form.departureDate && form.returnDate && new Date(form.returnDate) < new Date(form.departureDate)) {
    errors.push(fieldError('returnDate', 'Tanggal kembali tidak boleh lebih awal dari tanggal berangkat.'));
  }
  if (letter.type === LETTER_TYPE.ETHICS && letter.purpose === 'extension') {
    const clearances = data.previousEthicsClearances || [];
    if (form.previousClearanceId && !clearances.some(item => item.id === form.previousClearanceId && item.userId === letter.userId)) {
      errors.push(fieldError('previousClearanceId', 'Klirens etik sebelumnya tidak ditemukan atau bukan milik pengguna aktif.'));
    }
  }
  return errors;
};

export const validateLetterFiles = letter => {
  const errors = [];
  (letter.attachments || []).forEach(file => {
    const name = file.name || file.fileName || '';
    const extension = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
    if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) errors.push(fieldError(`file:${file.fileType}`, `${name} harus berformat PDF, DOC, DOCX, JPG, JPEG, atau PNG.`));
    if (Number(file.size || file.fileSize || 0) > MAX_FILE_SIZE) errors.push(fieldError(`file:${file.fileType}`, `${name} melebihi batas 10 MB.`));
  });
  return errors;
};

export const runLetterPrecheck = (letter, data) => {
  const errors = [
    ...validateLetterStructure(letter),
    ...validateLetterConsistency(letter, data),
    ...validateLetterFiles(letter),
  ];
  return {
    passed: errors.length === 0,
    errors,
    checkedAt: new Date().toISOString(),
  };
};

export const fileTypeLabel = type => {
  const found = FILE_TYPES.find(item => item.value === type);
  return found ? found.label : type;
};

export const getRequiredAttachmentSummary = letter => requiredAttachmentTypes(letter).map(fileTypeLabel).join(', ') || '-';

export const getActiveLettersForUser = (data, user) => (data.letterRequests || []).filter(letter => {
  if (isAdmin(user)) return true;
  return letter.userId === user.id || letter.createdBy === user.id;
});

export const getAdminLetterQueue = data => (data.letterRequests || []).filter(letter => [LETTER_STATUS.PRECHECKED, LETTER_STATUS.APPROVED].includes(letterStatus(letter)));

export const getRelatedResearchOptions = (data, user) => (data.drafts || [])
  .filter(draft => draft.status === 'approved' && (!user || draft.userId === user.id))
  .map(draft => ({ value: draft.research && draft.research.researchId ? draft.research.researchId : draft.id, label: draft.project ? draft.project.title : draft.id }));

export const generateLetterNumber = (letter, sequence) => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const typeCode = {
    [LETTER_TYPE.RESEARCH_ASSIGNMENT]: 'ST-RIS',
    [LETTER_TYPE.SUPPORT]: 'SP-RIS',
    [LETTER_TYPE.ETHICS]: 'KE-RIS',
    [LETTER_TYPE.TRAVEL]: 'SPD-RIS',
  }[letter.type] || 'RIS';
  return `${String(sequence || 1).padStart(4, '0')}/${typeCode}/LPPM/${month}/${year}`;
};

export const renderLetterPlainText = letter => {
  const type = getLetterTypeMeta(letter.type).label;
  const purpose = getLetterPurposeMeta(letter.type, letter.purpose).label;
  const applicant = letter.applicant || {};
  const form = letter.form || {};
  return [
    'RESEARCH INNOVATION AND SUSTAINABILITY',
    'UNIVERSITAS MULTIMEDIA NUSANTARA',
    '',
    `Nomor: ${letter.generated && letter.generated.letterNumber ? letter.generated.letterNumber : '(belum diterbitkan)'}`,
    `Jenis Surat: ${type}`,
    `Kepentingan: ${purpose}`,
    '',
    'Identitas Pemohon',
    `Nama: ${applicant.name || '-'}`,
    `NIK/NIDN/NIM: ${applicant.identifier || '-'}`,
    `Status: ${applicant.applicantRole || '-'}`,
    `Program Studi: ${applicant.program || '-'}`,
    `Fakultas: ${applicant.faculty || '-'}`,
    '',
    'Isi Surat',
    `Judul/Kegiatan: ${getLetterTitle(letter)}`,
    `Tujuan: ${form.activityPurpose || form.researchPurpose || form.researchRole || '-'}`,
    `Mitra/Penerima: ${form.partnerName || form.recipientName || form.eventOrganizer || '-'}`,
    '',
    'Catatan',
    'Dokumen ini adalah preview/demo hasil generate RIS. Pada integrasi backend, konten ini akan dirender melalui template PDF resmi dan disimpan sebagai arsip surat.',
  ].join('\n');
};

const applicantToDb = (letter, applicant) => ({
  id: applicant.id || `${letter.id}-applicant-${applicant.userId}`,
  letter_id: letter.id,
  user_id: applicant.userId,
  applicant_name: applicant.name,
  applicant_role: applicant.applicantRole,
  is_primary: applicant.isPrimary !== false,
  // UI snapshot fields below are not in the current physical table yet.
  applicant_identifier: applicant.identifier,
  faculty: applicant.faculty,
  study_program: applicant.program,
  applicant_status: applicant.status,
});

export const toDbLetterSnapshot = letter => {
  const form = letter.form || {};
  const applicants = letter.applicants && letter.applicants.length ? letter.applicants : [letter.applicant].filter(Boolean);
  const detail = {};

  if (letter.type === LETTER_TYPE.RESEARCH_ASSIGNMENT && isResearchPurpose(letter.purpose)) {
    detail.letter_research_assignment = {
      id: `${letter.id}-research-assignment`,
      letter_id: letter.id,
      research_title: form.researchTitle,
      research_year: Number(form.researchYear) || null,
      research_duration: form.researchDuration,
      research_location: form.researchLocation,
      research_role: form.researchRole,
      research_team: form.researchTeam,
    };
    if (isCollaborationPurpose(letter.purpose)) {
      detail.letter_research_collaboration = {
        id: `${letter.id}-collaboration`,
        letter_id: letter.id,
        partner_name: form.partnerName,
        partner_institution: form.partnerInstitution,
        partner_country: form.partnerCountry || 'Indonesia',
      };
    }
    if (isGrantPurpose(letter.purpose)) {
      detail.letter_research_grant = {
        id: `${letter.id}-grant`,
        letter_id: letter.id,
        program_name: form.programName,
        program_url: form.programUrl || null,
        research_scheme: form.researchScheme,
      };
    }
    if (letter.purpose === 'industry_research') {
      detail.letter_research_industry = {
        id: `${letter.id}-industry`,
        letter_id: letter.id,
        partner_name: form.partnerName,
        partner_origin: form.partnerOrigin,
        partner_scale: form.partnerScale,
      };
    }
  }

  if (letter.type === LETTER_TYPE.RESEARCH_ASSIGNMENT && isPublicationPurpose(letter.purpose)) {
    detail.letter_publication_requests = {
      id: `${letter.id}-publication`,
      letter_id: letter.id,
      publication_type: letter.purpose,
      title: form.title,
      publication_name: form.publicationName,
      category: form.category,
      indexing: form.indexing || null,
      url: form.url || null,
      publication_role: form.publicationRole,
      author_position: form.authorPosition || null,
      publication_status: form.publicationStatus,
    };
  }

  if (letter.type === LETTER_TYPE.RESEARCH_ASSIGNMENT && letter.purpose === 'scientific_seminar') {
    detail.letter_events = {
      id: `${letter.id}-event`,
      letter_id: letter.id,
      event_name: form.eventName,
      event_category: form.eventCategory,
      event_location: form.eventLocation,
      event_organizer: form.eventOrganizer,
      role: form.role,
    };
  }

  if (letter.type === LETTER_TYPE.RESEARCH_ASSIGNMENT && letter.purpose === 'artwork') {
    detail.letter_product_outputs = {
      id: `${letter.id}-artwork`,
      letter_id: letter.id,
      output_type: form.outputType,
      title: form.title,
      location: form.location,
      organizer: form.organizer,
    };
  }

  if (letter.type === LETTER_TYPE.SUPPORT) {
    detail.letter_support = {
      id: `${letter.id}-support`,
      letter_id: letter.id,
      recipient_name: form.recipientName,
      recipient_position: form.recipientPosition,
      event_datetime: form.eventDatetime || null,
      activity_name: form.activityName,
      activity_purpose: form.activityPurpose,
      related_research_id: letter.researchId || form.relatedResearchId || null,
    };
  }

  if (letter.type === LETTER_TYPE.ETHICS) {
    detail.letter_ethics = {
      id: `${letter.id}-ethics`,
      letter_id: letter.id,
      submission_type: letter.purpose,
    };
    if (letter.purpose === 'new') {
      detail.letter_ethics_new = {
        id: `${letter.id}-ethics-new`,
        ethics_id: `${letter.id}-ethics`,
        research_title: form.researchTitle,
        research_start_date: form.researchStartDate || null,
      };
    }
    if (letter.purpose === 'extension') {
      detail.letter_ethics_extension = {
        id: `${letter.id}-ethics-extension`,
        ethics_id: `${letter.id}-ethics`,
        previous_clearance_id: form.previousClearanceId,
        previous_clearance_number: form.previousClearanceNumber,
        expiry_date: form.expiryDate || null,
      };
    }
  }

  if (letter.type === LETTER_TYPE.TRAVEL) {
    detail.travel_letters = {
      id: `${letter.id}-travel`,
      letter_id: letter.id,
      related_research_id: letter.researchId || form.relatedResearchId || null,
      activity_name: form.activityName,
      travel_destination: form.travelDestination,
      departure_date: form.departureDate || null,
      return_date: form.returnDate || null,
      transport_mode: form.transportMode,
      activity_purpose: form.activityPurpose,
      funding_source: form.fundingSource || null,
    };
  }

  return {
    letter_requests: {
      letter_id: letter.id,
      user_id: letter.userId,
      research_id: letter.researchId || (form.relatedResearchId || null),
      created_by: letter.createdBy || letter.userId,
      letter_type: letter.type,
      letter_purpose: letter.purpose,
      letter_status: letter.status,
      submitted_at: letter.submittedAt || null,
      letter_number: letter.generated && letter.generated.letterNumber ? letter.generated.letterNumber : null,
    },
    letter_applicants: applicants.map(applicant => applicantToDb(letter, applicant)),
    ...detail,
    letter_files: (letter.attachments || []).map(file => ({
      id: file.id,
      letter_id: letter.id,
      file_type: file.fileType || file.category,
      file_url: file.fileUrl || file.url || file.name,
      uploaded_at: file.uploadedAt || null,
      file_name: file.name,
      file_size: file.size,
      file_format: file.type,
    })),
    letter_prechecks: (letter.prechecks || []).map(item => ({
      id: item.id,
      letter_id: letter.id,
      checked_by: item.checkedBy || null,
      status: item.status,
      notes: item.errors ? item.errors.map(error => error.message).join('\n') : '',
    })),
    letter_reviews: (letter.reviews || []).map(item => ({
      id: item.id,
      letter_id: letter.id,
      reviewer_id: item.reviewerId,
      decision: item.decision,
      notes: item.notes,
    })),
    compatibility_notes: {
      attachments: 'UI memakai model attachments tunggal. Untuk schema PostgreSQL saat ini dimapping ke letter_files; jika tabel attachments unified dibuat, rows letter_files bisa dipindah ke attachments.',
      travel_letters: 'travel_letters dipakai sebagai target detail table sesuai spesifikasi, tetapi pada DDL yang ditempel belum terlihat tabel fisiknya.',
    },
  };
};
