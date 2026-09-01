/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useHistory } from 'react-router-dom';
import { useRis } from '../RisContext';
import { Button, Field, FileDrop, PageBack } from '../components/Ui';
import { uid } from '../data';
import {
  DEFAULT_PROFILE_FORM,
  DOCUMENT_TYPES,
  buildProfileFromUser,
  canEditProfile,
  createActivityLog,
  createNotification,
  createProfileDocumentMeta,
  getExpertiseForProfile,
  getProfileById,
  getProfileByUser,
  getProfileDocuments,
  isProfileAdmin,
  normalizeProfileForSave,
  syncProfileToDomainData,
  validateProfileDocument,
  validateProfileForm,
} from '../researcherProfileWorkflow';

const sectionTabs = [
  { key: 'basic', label: 'Informasi Dasar' },
  { key: 'contact', label: 'Kontak' },
  { key: 'institution', label: 'Institusi' },
  { key: 'identity', label: 'Identitas Penelitian' },
  { key: 'finance', label: 'Keuangan' },
  { key: 'emergency', label: 'Darurat' },
  { key: 'documents', label: 'Dokumen & Keahlian' },
];

const profileToForm = profile => ({ ...DEFAULT_PROFILE_FORM, ...(profile || {}) });
const profilePhotoMeta = (file, profileId) => (file ? {
  name: file.name,
  size: file.size,
  type: file.type,
  fileUrl: `mock://researcher-profile-photos/${profileId}/${file.name}`,
  uploadedAt: new Date().toISOString(),
} : null);
const initials = name => String(name || '?')
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map(part => part[0])
  .join('')
  .toUpperCase();

export default function ResearcherProfileEditorPage({ match }) {
  const { data, setData, user } = useRis();
  const history = useHistory();
  const profileId = match.params.profileId;
  const existing = profileId === 'me' ? getProfileByUser(data, user) : getProfileById(data, profileId);
  const initialProfile = existing || buildProfileFromUser(user, uid);
  const [activeTab, setActiveTab] = useState('basic');
  const [form, setForm] = useState(profileToForm(initialProfile));
  const [documentType, setDocumentType] = useState('KTP');
  const [documentFile, setDocumentFile] = useState(null);
  const [newExpertise, setNewExpertise] = useState('');
  const [selectedExpertiseIds, setSelectedExpertiseIds] = useState(() => getExpertiseForProfile(data, initialProfile.profileId).map(item => item.expertiseId));
  const [error, setError] = useState('');

  const documents = useMemo(() => getProfileDocuments(data, initialProfile.profileId), [data, initialProfile.profileId]);
  const organizationOptions = useMemo(() => {
    const records = [...(data.researcherProfiles || []), ...(data.lecturers || [])];
    const unique = key => [...new Set(records.map(item => item[key]).filter(Boolean))].sort();
    return {
      faculties: [...new Set([...unique('faculty'), 'LPPM'])].sort(),
      programs: [...new Set([...unique('studyProgram'), ...unique('program')])].sort(),
      units: [...new Set([...unique('unit'), 'LPPM'])].sort(),
    };
  }, [data.lecturers, data.researcherProfiles]);
  const admin = isProfileAdmin(user);
  const targetAccount = (data.systemUsers || []).find(item => item.id === initialProfile.userId);

  if (!canEditProfile(existing || initialProfile, user, targetAccount)) {
    return <div className="ris-page"><h1>Ubah Profil</h1><p className="ris-muted">Akses untuk mengubah profil ini tidak diizinkan.</p></div>;
  }

  const update = field => event => setForm({ ...form, [field]: event.target.value });

  const saveProfile = () => {
    const errors = validateProfileForm(form);
    if (errors.length) {
      setError(errors[0]);
      return;
    }
    const normalized = normalizeProfileForSave({ ...form, profileId: initialProfile.profileId, id: initialProfile.id || initialProfile.profileId, userId: initialProfile.userId }, documents, user);
    setData(current => {
      const oldProfile = (current.researcherProfiles || []).find(item => item.profileId === normalized.profileId) || null;

      let next = {
        ...current,
        researcherProfiles: oldProfile
          ? (current.researcherProfiles || []).map(item => (item.profileId === normalized.profileId ? normalized : item))
          : [...(current.researcherProfiles || []), normalized],
        researcherExpertiseMap: [
          ...(current.researcherExpertiseMap || []).filter(item => item.profileId !== normalized.profileId),
          ...selectedExpertiseIds.map(expertiseId => ({
            id: uid('expertise-map'),
            profileId: normalized.profileId,
            expertiseId,
          })),
        ],
        systemActivityLogs: [...(current.systemActivityLogs || []), createActivityLog(user, oldProfile ? 'update_profile' : 'create_profile', 'researcher_profile', normalized.profileId, oldProfile, normalized, uid)],
        notifications: [...(current.notifications || []), createNotification(normalized.userId, user.id, 'profile_updated', 'Profil peneliti berhasil diperbarui.', uid)],
      };

      next = syncProfileToDomainData(next, normalized);
      return next;
    });
    history.push(`/ris/profil-peneliti/${normalized.profileId}/detail`);
  };

  const uploadDocument = () => {
    const validation = validateProfileDocument(documentFile);
    if (validation) {
      setError(validation);
      return;
    }
    const meta = createProfileDocumentMeta(documentFile, documentType, initialProfile.profileId, user, uid);
    setData(current => {
      const currentProfile = (current.researcherProfiles || []).find(item => item.profileId === initialProfile.profileId) || { ...form, profileId: initialProfile.profileId, userId: initialProfile.userId };
      const nextDocuments = [
        ...(current.researcherDocuments || []).map(doc => (doc.profileId === initialProfile.profileId && doc.documentType === documentType ? { ...doc, isActive: false } : doc)),
        meta,
      ];
      const normalized = normalizeProfileForSave(currentProfile, nextDocuments.filter(doc => doc.profileId === initialProfile.profileId && doc.isActive !== false), user);
      let next = {
        ...current,
        researcherDocuments: nextDocuments,
        researcherProfiles: (current.researcherProfiles || []).some(item => item.profileId === normalized.profileId)
          ? (current.researcherProfiles || []).map(item => (item.profileId === normalized.profileId ? normalized : item))
          : [...(current.researcherProfiles || []), normalized],
        systemActivityLogs: [...(current.systemActivityLogs || []), createActivityLog(user, 'upload_document', 'researcher_profile', normalized.profileId, null, meta, uid)],
        notifications: [...(current.notifications || []), createNotification(normalized.userId, user.id, 'document_uploaded', `Dokumen ${documentType} berhasil diunggah.`, uid)],
      };
      next = syncProfileToDomainData(next, normalized);
      return next;
    });
    setDocumentFile(null);
    setError('');
  };

  const toggleExpertise = expertiseId => {
    setSelectedExpertiseIds(current => (current.includes(expertiseId) ? current.filter(item => item !== expertiseId) : [...current, expertiseId]));
  };

  const addExpertise = () => {
    const name = newExpertise.trim();
    if (!name) return;
    const existingExpertise = (data.researcherExpertise || []).find(item => item.name.toLowerCase() === name.toLowerCase());
    const expertiseId = existingExpertise ? existingExpertise.expertiseId : uid('expertise');
    setData(current => ({
      ...current,
      researcherExpertise: existingExpertise ? current.researcherExpertise : [...(current.researcherExpertise || []), { expertiseId, name }],
    }));
    setSelectedExpertiseIds(current => (current.includes(expertiseId) ? current : [...current, expertiseId]));
    setNewExpertise('');
  };

  const deleteDocument = documentId => {
    setData(current => {
      const oldDoc = (current.researcherDocuments || []).find(doc => doc.id === documentId);
      const nextDocuments = (current.researcherDocuments || []).map(doc => (doc.id === documentId ? { ...doc, isActive: false } : doc));
      const currentProfile = (current.researcherProfiles || []).find(item => item.profileId === initialProfile.profileId) || form;
      const normalized = normalizeProfileForSave(currentProfile, nextDocuments.filter(doc => doc.profileId === initialProfile.profileId && doc.isActive !== false), user);
      let next = {
        ...current,
        researcherDocuments: nextDocuments,
        researcherProfiles: (current.researcherProfiles || []).map(item => (item.profileId === normalized.profileId ? normalized : item)),
        systemActivityLogs: [...(current.systemActivityLogs || []), createActivityLog(user, 'delete_document', 'researcher_profile', normalized.profileId, oldDoc, null, uid)],
      };
      next = syncProfileToDomainData(next, normalized);
      return next;
    });
  };

  return (
    <div className="ris-page ris-workspace-page ris-profile-page">
      <div className="ris-page-head"><PageBack onClick={() => history.goBack()} /><div><h1>{admin ? 'Ubah Profil Peneliti' : 'Profil Saya'}</h1><p className="ris-muted">Data ini menjadi sumber data utama untuk penelitian internal, surat, penelitian eksternal, dan dasbor LPPM.</p></div></div>
      {error && <div className="ris-alert ris-alert-error">{error}</div>}
      <div className="ris-wizard-tabs profile-tabs">{sectionTabs.map(tab => <button key={tab.key} type="button" className={activeTab === tab.key ? 'active' : ''} onClick={() => setActiveTab(tab.key)}>{tab.label}</button>)}</div>
      <datalist id="ris-faculty-options">{organizationOptions.faculties.map(item => <option value={item} key={item} />)}</datalist>
      <datalist id="ris-program-options">{organizationOptions.programs.map(item => <option value={item} key={item} />)}</datalist>
      <datalist id="ris-unit-options">{organizationOptions.units.map(item => <option value={item} key={item} />)}</datalist>

      <section className="ris-card">
        {activeTab === 'basic' && <div className="ris-form-grid two">
          <Field label="Foto Profil" alignStart>
            <div className="ris-profile-photo-field">
              <div className="ris-profile-avatar ris-profile-avatar-sm">{initials(form.fullName)}</div>
              <div>
                <FileDrop file={form.profilePhoto || null} accept=".png,.jpg,.jpeg" onFile={file => setForm({ ...form, profilePhoto: profilePhotoMeta(file, initialProfile.profileId) })} label="Unggah foto profil JPG/PNG" />
                {form.profilePhoto && <button type="button" className="ris-text-danger" onClick={() => setForm({ ...form, profilePhoto: null })}>Hapus foto profil</button>}
              </div>
            </div>
          </Field>
          <Field label="Gelar Depan"><input value={form.frontTitle || ''} onChange={update('frontTitle')} /></Field>
          <Field label="Nama Lengkap" required><input value={form.fullName || ''} onChange={update('fullName')} /></Field>
          <Field label="Gelar Belakang"><input value={form.backTitle || ''} onChange={update('backTitle')} /></Field>
          <Field label="NIDN" required><input value={form.nidn || ''} onChange={update('nidn')} inputMode="numeric" autoComplete="off" /></Field>
          <Field label="NIK"><input value={form.nik || ''} onChange={update('nik')} inputMode="numeric" autoComplete="off" /></Field>
          <Field label="Tempat Lahir"><input value={form.birthPlace || ''} onChange={update('birthPlace')} /></Field>
          <Field label="Tanggal Lahir"><input type="date" value={form.birthDate || ''} onChange={update('birthDate')} /></Field>
          <Field label="Jenis Kelamin"><select value={form.gender || ''} onChange={update('gender')}><option value="">Pilih</option><option>Laki-laki</option><option>Perempuan</option></select></Field>
          <Field label="Kewarganegaraan"><select value={form.nationality || ''} onChange={update('nationality')}><option value="">Pilih</option><option value="Indonesia">Indonesia</option><option value="Warga Negara Asing">Warga Negara Asing</option></select></Field>
        </div>}

        {activeTab === 'contact' && <div className="ris-form-grid two">
          <Field label="Email Institusi" required><input type="email" autoComplete="email" value={form.institutionEmail || ''} onChange={update('institutionEmail')} /></Field>
          <Field label="Email Alternatif"><input type="email" autoComplete="email" value={form.alternateEmail || ''} onChange={update('alternateEmail')} /></Field>
          <Field label="No. HP" required><input type="tel" inputMode="tel" autoComplete="tel" value={form.phoneNumber || ''} onChange={update('phoneNumber')} /></Field>
          <Field label="Alamat Domisili"><textarea value={form.domicileAddress || ''} onChange={update('domicileAddress')} /></Field>
          <Field label="Alamat Korespondensi"><textarea value={form.correspondenceAddress || ''} onChange={update('correspondenceAddress')} /></Field>
        </div>}

        {activeTab === 'institution' && <div className="ris-form-grid two">
          <Field label="Fakultas" required><input list="ris-faculty-options" value={form.faculty || ''} onChange={update('faculty')} placeholder="Pilih atau ketik fakultas" /></Field>
          <Field label="Program Studi" required><input list="ris-program-options" value={form.studyProgram || ''} onChange={update('studyProgram')} placeholder="Pilih atau ketik program studi" /></Field>
          <Field label="Unit"><input list="ris-unit-options" value={form.unit || ''} onChange={update('unit')} placeholder="Pilih atau ketik unit" /></Field>
          <Field label="Posisi" required><select value={form.position || ''} onChange={update('position')}><option value="">Pilih posisi</option>{[['Dosen Fulltime', 'Dosen Penuh Waktu'], ['Dosen Homebase', 'Dosen Tetap Program Studi'], ['Admin LPPM', 'Administrator LPPM'], ['Manager LPPM', 'Manajer LPPM'], ['Super Admin', 'Administrator Utama'], ['Staf LPPM', 'Staf LPPM']].map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></Field>
          <Field label="Jabatan Fungsional"><select value={form.functionalPosition || ''} onChange={update('functionalPosition')}><option value="">Pilih jabatan</option>{[['Tenaga Pengajar', 'Tenaga Pengajar'], ['Asisten Ahli', 'Asisten Ahli'], ['Lektor', 'Lektor'], ['Lektor Kepala', 'Lektor Kepala'], ['Profesor', 'Profesor'], ['Administrator', 'Administrator'], ['Manager', 'Manajer']].map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></Field>
          <Field label="NIP"><input value={form.nip || ''} onChange={update('nip')} /></Field>
        </div>}

        {activeTab === 'identity' && <div className="ris-form-grid two">
          <Field label="ORCID"><input inputMode="numeric" value={form.orcid || ''} onChange={update('orcid')} placeholder="0000-0000-0000-0000" /></Field>
          <Field label="Google Scholar"><input type="url" value={form.googleScholar || ''} onChange={update('googleScholar')} placeholder="https://scholar.google.com/..." /></Field>
          <Field label="SINTA ID"><input value={form.sintaId || ''} onChange={update('sintaId')} /></Field>
        </div>}

        {activeTab === 'finance' && <div className="ris-form-grid two">
          <Field label="Nama Bank"><select value={form.bankName || ''} onChange={update('bankName')}><option value="">Pilih bank</option>{['BCA', 'Mandiri', 'BNI', 'BRI', 'CIMB Niaga', 'BTN', 'BSI', 'Permata', 'Lainnya'].map(item => <option value={item} key={item}>{item}</option>)}</select></Field>
          <Field label="Nomor Rekening"><input inputMode="numeric" autoComplete="off" value={form.bankAccountNumber || ''} onChange={update('bankAccountNumber')} /></Field>
          <Field label="Nama Pemilik Rekening"><input value={form.bankAccountName || ''} onChange={update('bankAccountName')} /></Field>
        </div>}

        {activeTab === 'emergency' && <div className="ris-form-grid two">
          <Field label="Nama Kontak Darurat"><input value={form.emergencyContactName || ''} onChange={update('emergencyContactName')} /></Field>
          <Field label="Relasi"><select value={form.emergencyContactRelation || ''} onChange={update('emergencyContactRelation')}><option value="">Pilih relasi</option>{['Istri', 'Suami', 'Orang Tua', 'Anak', 'Saudara', 'Teman', 'Lainnya'].map(item => <option value={item} key={item}>{item}</option>)}</select></Field>
          <Field label="No. HP Kontak Darurat"><input type="tel" inputMode="tel" value={form.emergencyContactPhone || ''} onChange={update('emergencyContactPhone')} /></Field>
        </div>}

        {activeTab === 'documents' && <div className="ris-two-column">
          <div>
            <h3>Dokumen Peneliti</h3>
            <div className="ris-form-grid two">
              <Field label="Jenis Dokumen"><select value={documentType} onChange={event => setDocumentType(event.target.value)}>{DOCUMENT_TYPES.map(item => <option key={item.value} value={item.value}>{item.label}{item.required ? ' *' : ''}</option>)}</select></Field>
              <Field label="Unggah Berkas" alignStart><FileDrop file={documentFile} accept=".pdf,.png,.jpg,.jpeg" onFile={setDocumentFile} label="PDF/PNG/JPG/JPEG maksimal 5 MB" /></Field>
            </div>
            <Button tone="green" onClick={uploadDocument}>Unggah Dokumen</Button>
            <div className="ris-table-wrap mini"><table className="ris-table"><thead><tr><th>Jenis</th><th>Berkas</th><th>Ukuran</th><th>Aksi</th></tr></thead><tbody>{documents.map(doc => { const type = DOCUMENT_TYPES.find(item => item.value === doc.documentType); return <tr key={doc.id}><td>{type ? type.label : doc.documentType}</td><td>{doc.fileName}</td><td>{((doc.fileSize || 0) / 1048576).toFixed(1)} MB</td><td><button type="button" className="ris-action red" onClick={() => deleteDocument(doc.id)}>Hapus</button></td></tr>; })}</tbody></table></div>
          </div>
          <div>
            <h3>Bidang Minat</h3>
            <div className="ris-chip-list selectable">{(data.researcherExpertise || []).map(item => <button key={item.expertiseId} type="button" className={selectedExpertiseIds.includes(item.expertiseId) ? 'active' : ''} onClick={() => toggleExpertise(item.expertiseId)}>{item.name}</button>)}</div>
            <div className="ris-inline-form"><input value={newExpertise} onChange={event => setNewExpertise(event.target.value)} placeholder="Tambah bidang minat" /><Button tone="blue" onClick={addExpertise}>Tambah</Button></div>
          </div>
        </div>}
      </section>

      <div className="ris-sticky-actions"><Button tone="gray" onClick={() => history.goBack()}>Batal</Button><Button tone="green" onClick={saveProfile}>Simpan Profil</Button></div>
    </div>
  );
}

ResearcherProfileEditorPage.propTypes = { match: PropTypes.object.isRequired };
