/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  ADMIN_SCOPE_OPTIONS, ROLE, ROLE_LABELS, hasFullAccess
} from '../workflow';
import { useRis } from '../RisContext';
import { Button, EmptyRow, Field, Modal } from '../components/Ui';
import { uid } from '../data';
import {
  DEFAULT_PROFILE_FORM,
  PROFILE_STATUS,
  VERIFICATION_STATUS,
  buildProfileFromUser,
  calculateProfileCompleteness,
  canEditProfile,
  canOpenProfileModule,
  createActivityLog,
  createNotification,
  exportProfilesCsv,
  filterProfiles,
  getCompletenessLabel,
  getCompletenessTone,
  getExpertiseForProfile,
  getProfileByUser,
  getProfileDocuments,
  getProfileMetrics,
  getProfileStatusMeta,
  getVerificationMeta,
  isProfileAdmin,
  validateProfileForm,
} from '../researcherProfileWorkflow';
import ResearcherProfileDetailPage from './ResearcherProfileDetailPage';

const downloadText = (fileName, content) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

const defaultFilters = {
  search: '', faculty: '', studyProgram: '', unit: '', position: '', verificationStatus: '', profileStatus: '', expertise: '', activeStatus: ''
};

const emptyAccountForm = {
  fullName: '', institutionEmail: '', nidn: '', faculty: '', studyProgram: '', position: 'Dosen Fulltime', role: ROLE.LECTURER, adminScopes: []
};

export default function ResearcherProfileDashboardPage() {
  const { data, setData, user } = useRis();
  const history = useHistory();
  const [filters, setFilters] = useState(defaultFilters);
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState('');
  const [autoCreatingProfile, setAutoCreatingProfile] = useState(false);
  const [form, setForm] = useState(emptyAccountForm);

  const admin = isProfileAdmin(user);
  const canCreateAdminAccount = hasFullAccess(user);
  const ownProfile = getProfileByUser(data, user);
  const metrics = getProfileMetrics(data);
  const filteredProfiles = useMemo(() => filterProfiles(data.researcherProfiles || [], data, filters), [data, filters]);
  const faculties = [...new Set((data.researcherProfiles || []).map(item => item.faculty).filter(Boolean))];
  const programs = [...new Set((data.researcherProfiles || []).map(item => item.studyProgram).filter(Boolean))];

  const createOwnProfile = destination => {
    const profile = buildProfileFromUser(user, uid);
    const completeness = calculateProfileCompleteness(profile, []);
    const saved = { ...profile, profileCompleteness: completeness };
    setData(current => ({
      ...current,
      researcherProfiles: [...(current.researcherProfiles || []), saved],
      systemActivityLogs: [...(current.systemActivityLogs || []), createActivityLog(user, 'create_profile', 'researcher_profile', saved.profileId, null, saved, uid)],
      notifications: [...(current.notifications || []), createNotification(user.id, null, 'profile_incomplete', 'Lengkapi profil peneliti agar dapat diverifikasi LPPM.', uid)],
    }));
    if (destination) history.replace(`/ris/profil-peneliti/${saved.profileId}/${destination}`);
    return saved;
  };

  const ensureOwnProfile = () => {
    if (ownProfile) {
      history.push(`/ris/profil-peneliti/${ownProfile.profileId}/edit`);
      return;
    }
    if (autoCreatingProfile) return;
    createOwnProfile('edit');
  };

  const openOwnProfile = () => {
    if (ownProfile) {
      history.push(`/ris/profil-peneliti/${ownProfile.profileId}/detail`);
      return;
    }
    if (autoCreatingProfile) return;
    createOwnProfile('detail');
  };

  useEffect(() => {
    if (!canOpenProfileModule(user) || ownProfile || autoCreatingProfile) return;
    setAutoCreatingProfile(true);
    createOwnProfile(admin ? null : 'detail');
  }, [admin, autoCreatingProfile, ownProfile, user && user.id]);

  if (!canOpenProfileModule(user)) {
    return <div className="ris-page"><h1>Profil Peneliti</h1><p className="ris-muted">Peran akun ini tidak memiliki akses ke area profil peneliti.</p></div>;
  }

  if (!admin && ownProfile) {
    return <ResearcherProfileDetailPage match={{ params: { profileId: ownProfile.profileId } }} />;
  }

  if (!admin && !ownProfile) {
    return <div className="ris-page"><h1>Profil Peneliti</h1><p className="ris-muted">Menyiapkan profil peneliti akun ini...</p></div>;
  }

  const createUser = () => {
    const requestedRole = canCreateAdminAccount && form.role === ROLE.ADMIN ? ROLE.ADMIN : ROLE.LECTURER;
    const creatingAdmin = requestedRole === ROLE.ADMIN;
    const cleanedEmail = String(form.institutionEmail || '').trim().toLowerCase();
    const requiredFields = ['fullName', 'institutionEmail', 'nidn', 'faculty', 'studyProgram', 'position'];
    const missing = requiredFields.find(field => !String(form[field] || '').trim());
    if (missing) {
      setCreateError('Lengkapi seluruh field wajib sebelum membuat akun.');
      return;
    }
    if (creatingAdmin && !(form.adminScopes || []).length) {
      setCreateError('Pilih minimal satu tugas untuk akun admin.');
      return;
    }
    const profileValidation = validateProfileForm({ ...DEFAULT_PROFILE_FORM, ...form, institutionEmail: cleanedEmail, phoneNumber: '081200000000' });
    if (profileValidation.length) {
      setCreateError(profileValidation[0]);
      return;
    }
    const emailExists = (data.systemUsers || []).some(item => String(item.email || '').trim().toLowerCase() === cleanedEmail);
    if (emailExists) {
      setCreateError('Email institusi sudah digunakan akun lain.');
      return;
    }
    const nidnExists = (data.researcherProfiles || []).some(item => String(item.nidn || '').trim() === String(form.nidn || '').trim());
    if (nidnExists) {
      setCreateError('NIDN sudah digunakan profil lain.');
      return;
    }
    const now = new Date().toISOString();
    const profileNumber = Number(data.profileSequence || 0) + 1;
    const newUserId = `user-${creatingAdmin ? 'admin' : 'researcher'}-${profileNumber}`;
    const newProfileId = `${creatingAdmin ? 'admin' : 'lecturer'}-${profileNumber + 10}`;
    const account = {
      id: newUserId,
      name: form.fullName.trim(),
      email: cleanedEmail,
      password: 'password123',
      role: requestedRole,
      adminScopes: creatingAdmin ? form.adminScopes : [],
      profileId: newProfileId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    const profile = {
      ...DEFAULT_PROFILE_FORM,
      profileId: newProfileId,
      id: newProfileId,
      userId: newUserId,
      fullName: form.fullName.trim(),
      institutionEmail: cleanedEmail,
      nidn: form.nidn.trim(),
      faculty: form.faculty.trim(),
      studyProgram: form.studyProgram.trim(),
      position: form.position.trim(),
      profileStatus: creatingAdmin ? PROFILE_STATUS.ACTIVE : PROFILE_STATUS.DRAFT,
      verificationStatus: creatingAdmin ? VERIFICATION_STATUS.VERIFIED : VERIFICATION_STATUS.PENDING,
      profileCompleteness: 0,
      lastUpdatedAt: now,
      lastUpdatedBy: user.id,
      createdAt: now,
      updatedAt: now,
    };
    const completeness = calculateProfileCompleteness(profile, []);
    const saved = { ...profile, profileCompleteness: completeness };
    setData(current => ({
      ...current,
      profileSequence: profileNumber,
      systemUsers: [...(current.systemUsers || []), account],
      researcherProfiles: [...(current.researcherProfiles || []), saved],
      applicantProfiles: creatingAdmin ? (current.applicantProfiles || []) : [...(current.applicantProfiles || []), {
        id: saved.profileId,
        userId: saved.userId,
        name: saved.fullName,
        identifier: saved.nidn,
        applicantRole: saved.position,
        applicantKind: 'lecturer',
        status: saved.profileStatus,
        faculty: saved.faculty,
        program: saved.studyProgram,
        email: saved.institutionEmail,
      }],
      lecturers: creatingAdmin ? (current.lecturers || []) : [...(current.lecturers || []), {
        id: saved.profileId,
        userId: saved.userId,
        name: saved.fullName,
        nidn: saved.nidn,
        faculty: saved.faculty,
        program: saved.studyProgram,
        educationLevel: '',
        functionalPosition: '',
        employmentStatus: 'fulltime',
        sintaScore: 0,
        researchCount: 0,
        lastResearchYear: new Date().getFullYear(),
        orcid: '',
      }],
      systemActivityLogs: [...(current.systemActivityLogs || []), createActivityLog(user, 'create_user', 'researcher_profile', saved.profileId, null, { account: { ...account, password: '[redacted]' }, profile: saved }, uid)],
      notifications: [...(current.notifications || []), createNotification(saved.userId, user.id, 'new_profile_created', `Akun ${creatingAdmin ? 'admin' : 'lecturer'} dibuat oleh ${user.name}. Silakan masuk menggunakan kredensial yang diberikan melalui kanal resmi.`, uid)],
    }));
    setCreateError('');
    setForm(emptyAccountForm);
    setShowCreate(false);
    history.push(`/ris/profil-peneliti/${saved.profileId}/detail`);
  };

  const exportCsv = () => {
    downloadText('ris-profil-peneliti.csv', exportProfilesCsv(filteredProfiles, data));
  };

  const ownDocs = ownProfile ? getProfileDocuments(data, ownProfile.profileId) : [];

  return (
    <div className="ris-page ris-workspace-page ris-profile-page">
      <div className="ris-page-head split">
        <div>
          <h1>Manajemen Informasi Peneliti</h1>
          <p className="ris-muted">Sumber data utama untuk identitas, dokumen, bidang minat, dan verifikasi peneliti RIS.</p>
        </div>
        {admin ? (
          <div className="ris-button-row">
            <Button tone="blue" onClick={openOwnProfile}>{ownProfile ? 'Profil Saya' : 'Buat Profil Saya'}</Button>
            <Button tone="gray" onClick={ensureOwnProfile}>{ownProfile ? 'Edit Profil Saya' : 'Lengkapi Profil Saya'}</Button>
            <Button tone="green" onClick={() => setShowCreate(true)}>{canCreateAdminAccount ? 'Buat Akun' : 'Buat Akun Dosen'}</Button>
          </div>
        ) : <Button tone="blue" onClick={ensureOwnProfile}>{ownProfile ? 'Ubah Profil Saya' : 'Siapkan Profil Awal'}</Button>}
      </div>

      {admin && (
        <section className="ris-card ris-profile-overview">
          {ownProfile ? (
            <>
              <div>
                <h2>Profil Saya</h2>
                <p className="ris-muted">{ownProfile.fullName || user.name} • {ownProfile.position || 'Peran administratif'} • {ownProfile.institutionEmail}</p>
                <div className="ris-badge-row">
                  <span className={`ris-badge ${getProfileStatusMeta(ownProfile.profileStatus).tone}`}>{getProfileStatusMeta(ownProfile.profileStatus).label}</span>
                  <span className={`ris-badge ${getVerificationMeta(ownProfile.verificationStatus).tone}`}>{getVerificationMeta(ownProfile.verificationStatus).label}</span>
                  <span className={`ris-badge ${getCompletenessTone(ownProfile.profileCompleteness)}`}>{getCompletenessLabel(ownProfile.profileCompleteness, ownProfile.verificationStatus)} • {ownProfile.profileCompleteness}%</span>
                </div>
              </div>
              <div className="ris-progress-card">
                <div className="ris-progress-line"><span style={{ width: `${ownProfile.profileCompleteness || 0}%` }} /></div>
                <small>{ownDocs.length} dokumen aktif • akses manajemen profil tetap tersedia di bawah</small>
                <div className="ris-button-row"><Button tone="blue" onClick={openOwnProfile}>Detail</Button><Button tone="green" onClick={ensureOwnProfile}>Ubah</Button></div>
              </div>
            </>
          ) : (
            <div>
              <h2>Profil Saya</h2>
              <p className="ris-muted">Profil pribadi sedang disiapkan agar akun admin/manager tetap punya data profil sendiri.</p>
            </div>
          )}
        </section>
      )}

      <section className="ris-module-grid compact">
        <div className="ris-metric-card"><span>Total Profil</span><strong>{metrics.totalProfiles}</strong><small>Seluruh peneliti</small></div>
        <div className="ris-metric-card"><span>Menunggu Verifikasi</span><strong>{metrics.pendingProfiles}</strong><small>Queue admin</small></div>
        <div className="ris-metric-card"><span>Terverifikasi</span><strong>{metrics.verifiedProfiles}</strong><small>Siap dipakai modul lain</small></div>
        <div className="ris-metric-card"><span>Belum Lengkap</span><strong>{metrics.incompleteProfiles}</strong><small>Perlu dilengkapi</small></div>
      </section>

      {!admin && (
        <section className="ris-card ris-profile-overview">
          {ownProfile ? (
            <>
              <div>
                <h2>{ownProfile.frontTitle ? `${ownProfile.frontTitle} ` : ''}{ownProfile.fullName}{ownProfile.backTitle ? `, ${ownProfile.backTitle}` : ''}</h2>
                <p className="ris-muted">{ownProfile.institutionEmail} • {ownProfile.faculty} / {ownProfile.studyProgram}</p>
                <div className="ris-badge-row">
                  <span className={`ris-badge ${getProfileStatusMeta(ownProfile.profileStatus).tone}`}>{getProfileStatusMeta(ownProfile.profileStatus).label}</span>
                  <span className={`ris-badge ${getVerificationMeta(ownProfile.verificationStatus).tone}`}>{getVerificationMeta(ownProfile.verificationStatus).label}</span>
                  <span className={`ris-badge ${getCompletenessTone(ownProfile.profileCompleteness)}`}>{getCompletenessLabel(ownProfile.profileCompleteness, ownProfile.verificationStatus)} • {ownProfile.profileCompleteness}%</span>
                </div>
              </div>
              <div className="ris-progress-card">
                <div className="ris-progress-line"><span style={{ width: `${ownProfile.profileCompleteness || 0}%` }} /></div>
                <small>{ownDocs.length} dokumen aktif • {getExpertiseForProfile(data, ownProfile.profileId).length} bidang minat</small>
                <div className="ris-button-row"><Button tone="blue" onClick={() => history.push(`/ris/profil-peneliti/${ownProfile.profileId}/detail`)}>Detail</Button><Button tone="green" onClick={() => history.push(`/ris/profil-peneliti/${ownProfile.profileId}/edit`)}>Ubah</Button></div>
              </div>
            </>
          ) : (
            <div>
              <h2>Profil belum tersedia</h2>
              <p className="ris-muted">Sistem akan membuat draft profil pertama kali. Lengkapi data wajib agar dapat diverifikasi LPPM.</p>
              <Button tone="green" onClick={ensureOwnProfile}>Mulai Penyiapan Profil Awal</Button>
            </div>
          )}
        </section>
      )}

      {admin && (
        <section className="ris-section-spaced">
          <div className="ris-section-title-row"><h2>Daftar Profil Peneliti</h2><Button tone="gray" onClick={exportCsv}>Ekspor CSV</Button></div>
          <div className="ris-filter-grid">
            <Field label="Pencarian"><input value={filters.search} onChange={event => setFilters({ ...filters, search: event.target.value })} placeholder="Nama, email, NIDN" /></Field>
            <Field label="Fakultas"><select value={filters.faculty} onChange={event => setFilters({ ...filters, faculty: event.target.value })}><option value="">Semua</option>{faculties.map(item => <option key={item} value={item}>{item}</option>)}</select></Field>
            <Field label="Program Studi"><select value={filters.studyProgram} onChange={event => setFilters({ ...filters, studyProgram: event.target.value })}><option value="">Semua</option>{programs.map(item => <option key={item} value={item}>{item}</option>)}</select></Field>
            <Field label="Verifikasi"><select value={filters.verificationStatus} onChange={event => setFilters({ ...filters, verificationStatus: event.target.value })}><option value="">Semua</option>{Object.values(VERIFICATION_STATUS).map(item => <option key={item} value={item}>{getVerificationMeta(item).label}</option>)}</select></Field>
            <Field label="Status Profil"><select value={filters.profileStatus} onChange={event => setFilters({ ...filters, profileStatus: event.target.value })}><option value="">Semua</option>{Object.values(PROFILE_STATUS).map(item => <option key={item} value={item}>{getProfileStatusMeta(item).label}</option>)}</select></Field>
            <Field label="Keahlian"><select value={filters.expertise} onChange={event => setFilters({ ...filters, expertise: event.target.value })}><option value="">Semua</option>{(data.researcherExpertise || []).map(item => <option key={item.expertiseId} value={item.name}>{item.name}</option>)}</select></Field>
          </div>
          <div className="ris-table-wrap">
            <table className="ris-table ris-action-table ris-profile-table">
              <thead><tr><th>No.</th><th>Nama</th><th>Email</th><th>Peran / Tugas</th><th>NIDN / ID Pegawai</th><th>Fakultas / Prodi</th><th>Kelengkapan</th><th>Verifikasi</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>
                {filteredProfiles.map((profile, index) => {
                  const statusMeta = getProfileStatusMeta(profile.profileStatus);
                  const verificationMeta = getVerificationMeta(profile.verificationStatus);
                  const account = (data.systemUsers || []).find(item => item.id === profile.userId) || {};
                  const scopeLabels = ADMIN_SCOPE_OPTIONS.filter(option => (account.adminScopes || []).includes(option.value)).map(option => option.label);
                  return (
                    <tr key={profile.profileId}>
                      <td>{index + 1}.</td>
                      <td className="ris-title-cell">{profile.frontTitle ? `${profile.frontTitle} ` : ''}{profile.fullName}{profile.backTitle ? `, ${profile.backTitle}` : ''}</td>
                      <td>{profile.institutionEmail}</td>
                      <td><strong>{ROLE_LABELS[account.role] || 'Dosen'}</strong>{scopeLabels.length > 0 && <small className="ris-table-secondary">{scopeLabels.join(', ')}</small>}</td>
                      <td>{profile.nidn || '-'}</td>
                      <td>{profile.faculty}<br /><small>{profile.studyProgram}</small></td>
                      <td><span className={`ris-badge ${getCompletenessTone(profile.profileCompleteness)}`}>{profile.profileCompleteness || 0}%</span></td>
                      <td><span className={`ris-badge ${verificationMeta.tone}`}>{verificationMeta.label}</span></td>
                      <td><span className={`ris-badge ${statusMeta.tone}`}>{statusMeta.label}</span></td>
                      <td><button type="button" className="ris-action blue" onClick={() => history.push(`/ris/profil-peneliti/${profile.profileId}/detail`)}>Detail</button>{canEditProfile(profile, user, account) && <button type="button" className="ris-action green" onClick={() => history.push(`/ris/profil-peneliti/${profile.profileId}/edit`)}>Ubah</button>}</td>
                    </tr>
                  );
                })}
                {filteredProfiles.length === 0 && <EmptyRow colSpan={10}>Tidak ada profil sesuai filter.</EmptyRow>}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showCreate && (
        <Modal title="Buat Akun RIS" onClose={() => { setCreateError(''); setShowCreate(false); }} width={820}>
          <div className="ris-modal-body">
            {createError && <div className="ris-alert ris-alert-error">{createError}</div>}
            <div className="ris-form-grid two">
              {canCreateAdminAccount && <Field label="Peran Akun" required><select value={form.role} onChange={event => {
                const role = event.target.value;
                setForm({
                  ...form,
                  role,
                  adminScopes: role === ROLE.ADMIN ? form.adminScopes : [],
                  faculty: role === ROLE.ADMIN && !form.faculty ? 'LPPM' : form.faculty,
                  studyProgram: role === ROLE.ADMIN && !form.studyProgram ? 'Administrasi Riset' : form.studyProgram,
                  position: role === ROLE.ADMIN ? 'Admin LPPM' : (form.position === 'Admin LPPM' ? 'Dosen Fulltime' : form.position),
                });
              }}><option value={ROLE.LECTURER}>Dosen</option><option value={ROLE.ADMIN}>Administrator</option></select></Field>}
              <Field label="Nama Lengkap" required><input value={form.fullName} onChange={event => setForm({ ...form, fullName: event.target.value })} /></Field>
              <Field label="Email Institusi" required><input value={form.institutionEmail} onChange={event => setForm({ ...form, institutionEmail: event.target.value })} /></Field>
              <Field label={form.role === ROLE.ADMIN ? 'ID Pegawai' : 'NIDN'} required><input value={form.nidn} onChange={event => setForm({ ...form, nidn: event.target.value })} /></Field>
              <Field label="Fakultas" required><input value={form.faculty} onChange={event => setForm({ ...form, faculty: event.target.value })} /></Field>
              <Field label="Program Studi" required><input value={form.studyProgram} onChange={event => setForm({ ...form, studyProgram: event.target.value })} /></Field>
              <Field label="Posisi" required><input value={form.position} onChange={event => setForm({ ...form, position: event.target.value })} /></Field>
            </div>
            {canCreateAdminAccount && form.role === ROLE.ADMIN && <div className="ris-admin-scope-field"><Field label="Tugas dan Akses Admin" required alignStart>
              <div className="ris-choice-grid ris-admin-scope-grid">
                {ADMIN_SCOPE_OPTIONS.map(option => {
                  const selected = (form.adminScopes || []).includes(option.value);
                  return <label key={option.value} className={selected ? 'active' : ''}><input type="checkbox" checked={selected} onChange={() => setForm({ ...form, adminScopes: selected ? form.adminScopes.filter(scope => scope !== option.value) : [...form.adminScopes, option.value] })} /><span><strong>{option.label}</strong><small>{option.description}</small></span></label>;
                })}
              </div>
            </Field></div>}
            <p className="ris-muted">Kata sandi demo otomatis: <strong>password123</strong>. Pada backend produksi, bagian ini diganti dengan token aktivasi melalui email.</p>
            <div className="ris-modal-actions"><Button tone="gray" onClick={() => { setCreateError(''); setShowCreate(false); }}>Batal</Button><Button tone="green" onClick={createUser}>Buat Akun</Button></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
