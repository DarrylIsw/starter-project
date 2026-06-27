/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useHistory, useParams } from 'react-router-dom';
import { useRis } from '../RisContext';
import {
  BUDGET_TABS, OUTPUT_EMPTY, SDGS, fileMeta, formatCurrency, uid
} from '../data';
import {
  STATUS,
  canEditDraft,
  getSchemeTitle,
  hasActiveDraftForScheme,
  isEligibleForScheme,
  isOpenScheme,
  toDbDraftSnapshot,
  validateDraftForSubmit,
  validateOutputDetails,
} from '../workflow';
import {
  Button, Field, FileDrop, Modal, PageBack
} from '../components/Ui';

const emptyProject = {
  title: '', mandatoryOutputPlan: '', additionalOutputPlan: '', additionalOutputPlans: [], targetTkt: '', ripRelation: '', researchCenterRelation: '', researchCenterOther: '', sdgs: [], integrated: null, courseName: '', academicYear: ''
};
const emptyMember = () => ({
  id: uid('member'), role: 'member', type: 'external_lecturer', profileId: '', name: '', nidn: '', nim: '', program: '', faculty: '', orcid: ''
});
const emptyBudget = tab => ({
  id: uid('budget'), tab, component: '', name: '', volume: 1, unit: '', unitPrice: '', notes: ''
});

const option = (value, label, defaults = {}, description = '') => ({
  value, label, defaults, description
});

const MANDATORY_OUTPUT_OPTIONS = [
  ...Array.from({ length: 6 }, (_, index) => option(`sinta_${index + 1}`, `SINTA ${index + 1}`, { category: 'jurnal', journalTargetLevel: 'sinta', journalIndexTarget: `SINTA ${index + 1}`, publicationType: 'nasional' })),
  option('scopus_q1', 'Artikel Jurnal Scopus Q1', { category: 'jurnal', journalTargetLevel: 'scopus', journalIndexTarget: 'Scopus Q1', publicationType: 'internasional', targetQuartile: 'Q1' }),
  option('scopus_q2', 'Artikel Jurnal Scopus Q2', { category: 'jurnal', journalTargetLevel: 'scopus', journalIndexTarget: 'Scopus Q2', publicationType: 'internasional', targetQuartile: 'Q2' }),
  option('scopus_q3', 'Artikel Jurnal Scopus Q3', { category: 'jurnal', journalTargetLevel: 'scopus', journalIndexTarget: 'Scopus Q3', publicationType: 'internasional', targetQuartile: 'Q3' }),
  option('scopus_q4', 'Artikel Jurnal Scopus Q4', { category: 'jurnal', journalTargetLevel: 'scopus', journalIndexTarget: 'Scopus Q4', publicationType: 'internasional', targetQuartile: 'Q4' }),
  option('paten_sederhana_registered', 'Paten Sederhana (terdaftar)', { category: 'hki', hkiType: 'paten_sederhana' }),
  option('paten_registered', 'Paten (terdaftar)', { category: 'hki', hkiType: 'paten' }),
];

const ADDITIONAL_OUTPUT_OPTIONS = [
  option('additional_scopus', 'Artikel ilmiah dimuat di jurnal Internasional - Scopus', { category: 'jurnal', journalTargetLevel: 'scopus', journalIndexTarget: 'Scopus', publicationType: 'internasional', targetQuartile: 'Q2' }),
  option('additional_sinta', 'Artikel ilmiah dimuat di jurnal Nasional - SINTA', { category: 'jurnal', journalTargetLevel: 'sinta', journalIndexTarget: 'SINTA', publicationType: 'nasional' }),
  option('prosiding_scopus', 'Prosiding terindeks Scopus', { category: 'prosiding', proceedingType: 'internasional', indexTarget: 'Scopus' }),
  option('hki_paten', 'HKI - Paten', { category: 'hki', hkiType: 'paten' }),
  option('hki_paten_sederhana', 'HKI - Paten Sederhana', { category: 'hki', hkiType: 'paten_sederhana' }),
  option('hki_hak_cipta', 'HKI - Hak Cipta', { category: 'hki', hkiType: 'hak_cipta' }),
  option('hki_merek_dagang', 'HKI - Merek Dagang', { category: 'hki', hkiType: 'merek_dagang' }),
  option('hki_rahasia_dagang', 'HKI - Rahasia Dagang', { category: 'hki', hkiType: 'rahasia_dagang' }),
  option('hki_desain_produk_industri', 'HKI - Desain Produk Industri', { category: 'hki', hkiType: 'desain_produk_industri' }),
  option('hki_indikasi_geografis', 'HKI - Indikasi Geografis', { category: 'hki', hkiType: 'indikasi_geografis' }),
  option('hki_perlindungan_varietas_tanaman', 'HKI - Perlindungan Varietas Tanaman', { category: 'hki', hkiType: 'perlindungan_varietas_tanaman' }),
  option('hki_topografi_sirkuit', 'HKI - Perlindungan Topografi Sirkuit Terpadu', { category: 'hki', hkiType: 'topografi_sirkuit_terpadu' }),
  option('teknologi_tepat_guna', 'Teknologi Tepat Guna', { category: 'produk_prototipe', productType: 'Teknologi Tepat Guna', expectedOutputForm: 'model' }),
  option('model_purwarupa_desain', 'Model / Purwarupa / Desain / Karya Seni / Rekayasa Sosial', { category: 'produk_prototipe', productType: 'Model / Purwarupa / Desain / Karya Seni / Rekayasa Sosial', expectedOutputForm: 'model' }),
  option('buku_ajar', 'Buku Ajar', { category: 'buku', bookType: 'full_book' }),
  option('prototype', 'Prototype', { category: 'produk_prototipe', productType: 'Prototype', expectedOutputForm: 'prototype' }),
  option('naskah_kebijakan', 'Naskah Kebijakan', { category: 'other' }),
  option('karya_monumental', 'Karya Monumental', { category: 'other' }),
];

const TKT_OPTIONS = [
  option('none', 'None'),
  option('1', 'TKT 1', {}, 'Prinsip dasar telah diobservasi dan dilaporkan.'),
  option('2', 'TKT 2', {}, 'Konsep teknologi dan/atau aplikasi telah dirumuskan.'),
  option('3', 'TKT 3', {}, 'Bukti eksperimental untuk fungsi dan/atau karakteristik konsep telah diperoleh di laboratorium.'),
  option('4', 'TKT 4', {}, 'Validasi komponen dan/atau sistem di laboratorium.'),
  option('5', 'TKT 5', {}, 'Validasi komponen dan/atau sistem dalam lingkungan relevan (simulasi).'),
  option('6', 'TKT 6', {}, 'Prototipe sistem/model diuji di lingkungan yang relevan.'),
  option('7', 'TKT 7', {}, 'Prototipe sistem/model diuji di lingkungan sebenarnya.'),
  option('8', 'TKT 8', {}, 'Sistem teknologi lengkap dan telah terbukti bekerja dalam kondisi sebenarnya.'),
  option('9', 'TKT 9', {}, 'Sistem telah terbukti di lingkungan sebenarnya dan siap untuk diterapkan/komersialisasi.'),
];

const RIP_OPTIONS = [
  option('none', 'None'),
  option('ict_based', 'ICT Based'),
  option('business_digital_behavior_technopreneurship', 'Business, Digital Behavior & Technopreneurship'),
  option('digital_content_digital_media_management', 'Digital Content & Digital Media Management'),
  option('design_art_multimedia_for_industry', 'Design, Art & Multimedia for Industry'),
];

const RESEARCH_CENTER_OPTIONS = [
  option('none', 'None'),
  option('ai_sustainability', 'AI & Sustainability'),
  option('ai_healthcare', 'AI for Healthcare'),
  option('ai_business_social_studies', 'AI for Business & Social Studies'),
  option('renewable_energy', 'Renewable Energy'),
  option('community_empowerment', 'Community Empowerment'),
  option('ecotourism_cultural_sustainability', 'Ecotourism & Cultural Sustainability'),
  option('sustainable_product_design', 'Sustainable Product & Design'),
  option('smart_farming', 'Smart Farming'),
  option('other', 'Other'),
];

const PLAN_ALIASES = {
  jurnal: 'scopus_q2',
  prosiding: 'prosiding_scopus',
  buku: 'buku_ajar',
  hki: 'paten_registered',
  'produk/prototipe': 'prototype',
  produk_prototipe: 'prototype',
};
const RIP_ALIASES = {
  sesuai_rip: 'ict_based',
  tidak_sesuai: 'none',
  business_digital_behavoir_technopreneurship: 'business_digital_behavior_technopreneurship',
  business_digital_behavior_technopreneurship: 'business_digital_behavior_technopreneurship',
};

const allPlanOptions = [...MANDATORY_OUTPUT_OPTIONS, ...ADDITIONAL_OUTPUT_OPTIONS];
const planOptionFor = value => allPlanOptions.find(item => item.value === value) || allPlanOptions.find(item => item.value === PLAN_ALIASES[value]);
const normalizePlanValue = value => PLAN_ALIASES[value] || value || '';
const normalizeProjectState = source => {
  const value = source || {};
  const additionalOutputPlans = Array.isArray(value.additionalOutputPlans)
    ? value.additionalOutputPlans
    : (value.additionalOutputPlan ? [value.additionalOutputPlan] : []);
  return {
    ...emptyProject,
    ...value,
    mandatoryOutputPlan: normalizePlanValue(value.mandatoryOutputPlan),
    additionalOutputPlans: additionalOutputPlans.map(normalizePlanValue).filter(Boolean),
    additionalOutputPlan: additionalOutputPlans.map(normalizePlanValue).filter(Boolean)[0] || '',
    targetTkt: value.targetTkt ? String(value.targetTkt) : '',
    ripRelation: RIP_ALIASES[value.ripRelation] || value.ripRelation || '',
    researchCenterRelation: RIP_ALIASES[value.researchCenterRelation] || value.researchCenterRelation || '',
    researchCenterOther: value.researchCenterOther || '',
  };
};

const normalizeProjectForSave = project => ({
  ...project,
  additionalOutputPlans: project.additionalOutputPlans || [],
  additionalOutputPlan: (project.additionalOutputPlans || [])[0] || '',
});

const makeOutputFromPlan = (planValue, type, current = null) => {
  const plan = planOptionFor(planValue);
  const defaults = plan ? plan.defaults : {};
  const title = plan ? plan.label : (current && current.title) || '';
  return {
    ...OUTPUT_EMPTY,
    ...defaults,
    ...(current || {}),
    id: current && current.id ? current.id : uid('output'),
    type,
    planValue,
    planLabel: title,
    title: current && current.title ? current.title : title,
    description: current && current.description ? current.description : title,
    category: (current && current.category) || defaults.category || '',
  };
};

const syncOutputsWithProject = (nextProject, currentOutputs) => {
  const current = currentOutputs || [];
  const mandatoryPlan = nextProject.mandatoryOutputPlan;
  const additionalPlans = nextProject.additionalOutputPlans || [];
  const mandatoryOutput = mandatoryPlan ? [makeOutputFromPlan(mandatoryPlan, 'wajib', current.find(item => item.type === 'wajib' && item.planValue === mandatoryPlan) || current.find(item => item.type === 'wajib' && !item.planValue))] : [];
  const additionalOutputs = additionalPlans.map((planValue, index) => makeOutputFromPlan(planValue, 'tambahan', current.find(item => item.type === 'tambahan' && item.planValue === planValue) || current.find(item => item.type === 'tambahan' && !item.planValue && index === 0)));
  return [...mandatoryOutput, ...additionalOutputs].map(output => (output.category === 'produk_prototipe' && !output.targetTkt ? { ...output, targetTkt: nextProject.targetTkt || '' } : output));
};

const selectedLabel = (options, value) => (options.find(item => item.value === value) || {}).label || 'Pilih opsi';

const validateOutput = output => validateOutputDetails(output);

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const getFileExtension = file => String((file && file.name) || '').split('.').pop().toLowerCase();
const validateAttachmentFile = (file, allowedExtensions) => {
  if (!file) return 'File wajib dipilih.';
  const extension = getFileExtension(file);
  if (allowedExtensions.length && !allowedExtensions.includes(extension)) return `Format file .${extension || '-'} tidak sesuai. Format yang diizinkan: ${allowedExtensions.join(', ')}.`;
  if (Number(file.size || 0) > MAX_ATTACHMENT_SIZE) return 'Ukuran file maksimal 10 MB.';
  return '';
};

function CollapsibleChoice({
  label, value, options, onChange, required, documentUrl, otherValue, onOtherChange
}) {
  return (
    <Field label={label} required={required} alignStart>
      <details className="ris-choice-list" open>
        <summary>{selectedLabel(options, value)}</summary>
        <div className="ris-choice-grid">
          {options.map(item => (
            <label key={item.value} className={value === item.value ? 'active' : ''}>
              <input type="radio" checked={value === item.value} onChange={() => onChange(item.value)} />
              <span><strong>{item.label}</strong>{item.description && <small>{item.description}</small>}</span>
            </label>
          ))}
        </div>
        {value === 'other' && onOtherChange && <input className="ris-choice-other" value={otherValue || ''} onChange={event => onOtherChange(event.target.value)} placeholder="Isi manual" />}
        {documentUrl && <a className="ris-reference-link" href={documentUrl} target="_blank" rel="noreferrer">Lihat dokumen referensi</a>}
      </details>
    </Field>
  );
}

CollapsibleChoice.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
  options: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  required: PropTypes.bool,
  documentUrl: PropTypes.string,
  otherValue: PropTypes.string,
  onOtherChange: PropTypes.func,
};
CollapsibleChoice.defaultProps = {
  value: '', required: false, documentUrl: '', otherValue: '', onOtherChange: null
};

function MultiChoiceList({
  label, values, options, onChange, required
}) {
  const selected = values || [];
  const toggle = item => {
    onChange(selected.includes(item.value) ? selected.filter(value => value !== item.value) : [...selected, item.value]);
  };
  return (
    <Field label={label} required={required} alignStart>
      <details className="ris-choice-list" open>
        <summary>{selected.length ? `${selected.length} luaran dipilih` : 'Tidak ada luaran tambahan'}</summary>
        <div className="ris-choice-grid">
          {options.map(item => (
            <label key={item.value} className={selected.includes(item.value) ? 'active' : ''}>
              <input type="checkbox" checked={selected.includes(item.value)} onChange={() => toggle(item)} />
              <span><strong>{item.label}</strong></span>
            </label>
          ))}
        </div>
      </details>
    </Field>
  );
}

MultiChoiceList.propTypes = {
  label: PropTypes.string.isRequired,
  values: PropTypes.array,
  options: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  required: PropTypes.bool,
};
MultiChoiceList.defaultProps = { values: [], required: false };

function OutputFields({ output, onChange }) {
  const update = (key, value) => onChange({ ...output, [key]: value });
  return (
    <div>
      <Field label="Judul" required><input value={output.title} onChange={event => update('title', event.target.value)} placeholder="Pengembangan..." /></Field>
      <Field label="Target tahun" required><input type="number" min="2000" max="2100" value={output.targetYear} onChange={event => update('targetYear', event.target.value)} placeholder="2026" /></Field>
      <Field label="Deskripsi" required alignStart><textarea rows="3" value={output.description} onChange={event => update('description', event.target.value)} placeholder="Lorem ipsum dolor sit amet..." /></Field>
      <Field label="Kategori" required><select value={output.category} onChange={event => update('category', event.target.value)}><option value="">-- Pilih --</option><option value="jurnal">Jurnal</option><option value="prosiding">Prosiding</option><option value="buku">Buku</option><option value="hki">HKI</option><option value="produk_prototipe">Produk/Prototipe</option><option value="other">Lainnya</option></select></Field>
      {output.category === 'jurnal' && <React.Fragment>
        <Field label="Target Level Jurnal" required><select value={output.journalTargetLevel} onChange={event => update('journalTargetLevel', event.target.value)}><option value="">-- Pilih --</option><option value="sinta">SINTA</option><option value="scopus">Scopus</option><option value="wos">Web of Science</option></select></Field>
        <Field label="Target Indeks Jurnal" required><input value={output.journalIndexTarget} onChange={event => update('journalIndexTarget', event.target.value)} placeholder="Contoh: SINTA 2, Scopus Q1..." /></Field>
        <Field label="Jenis Publikasi" required><select value={output.publicationType} onChange={event => update('publicationType', event.target.value)}><option value="">-- Pilih --</option><option value="nasional">Nasional</option><option value="internasional">Internasional</option></select></Field>
        {output.publicationType === 'internasional' && <Field label="Kuartil" required><select value={output.targetQuartile} onChange={event => update('targetQuartile', event.target.value)}><option value="">-- Pilih --</option>{['Q1', 'Q2', 'Q3', 'Q4'].map(item => <option key={item}>{item}</option>)}</select></Field>}
      </React.Fragment>}
      {output.category === 'prosiding' && <React.Fragment><Field label="Jenis Prosiding" required><select value={output.proceedingType} onChange={event => update('proceedingType', event.target.value)}><option value="">-- Pilih --</option><option value="nasional">Nasional</option><option value="internasional">Internasional</option></select></Field><Field label="Target Indeks" required><input value={output.indexTarget} onChange={event => update('indexTarget', event.target.value)} placeholder="Contoh: Scopus, IEEE Xplore..." /></Field></React.Fragment>}
      {output.category === 'buku' && <React.Fragment><Field label="Jenis Buku" required><select value={output.bookType} onChange={event => update('bookType', event.target.value)}><option value="">-- Pilih --</option><option value="full_book">Full Book</option><option value="book_chapter">Book Chapter</option></select></Field><Field label="Target Penerbit" required><input value={output.publisherTarget} onChange={event => update('publisherTarget', event.target.value)} placeholder="Contoh: Gramedia, Springer..." /></Field><Field label="Rencana ISBN"><input value={output.isbnPlan} onChange={event => update('isbnPlan', event.target.value)} placeholder="Opsional" /></Field></React.Fragment>}
      {output.category === 'hki' && <React.Fragment><Field label="Jenis HKI" required><select value={output.hkiType} onChange={event => update('hkiType', event.target.value)}><option value="">-- Pilih --</option><option value="paten">Paten</option><option value="paten_sederhana">Paten Sederhana</option><option value="hak_cipta">Hak Cipta</option><option value="merek_dagang">Merek Dagang</option><option value="rahasia_dagang">Rahasia Dagang</option><option value="desain_produk_industri">Desain Produk Industri</option><option value="indikasi_geografis">Indikasi Geografis</option><option value="perlindungan_varietas_tanaman">Perlindungan Varietas Tanaman</option><option value="topografi_sirkuit_terpadu">Perlindungan Topografi Sirkuit Terpadu</option></select></Field><Field label="Target Tahun Pendaftaran" required><input type="number" value={output.targetRegistrationYear} onChange={event => update('targetRegistrationYear', event.target.value)} placeholder="2026" /></Field></React.Fragment>}
      {output.category === 'produk_prototipe' && <React.Fragment><Field label="Jenis Produk" required><input value={output.productType} onChange={event => update('productType', event.target.value)} placeholder="Contoh: Alat kesehatan, Aplikasi..." /></Field><Field label="Target TKT" required><select value={output.targetTkt} onChange={event => update('targetTkt', event.target.value)}><option value="">-- Pilih --</option><option value="none">None</option>{Array.from({ length: 9 }, (_, index) => index + 1).map(item => <option key={item} value={item}>TKT {item}</option>)}</select></Field><Field label="Bentuk Output" required><select value={output.expectedOutputForm} onChange={event => update('expectedOutputForm', event.target.value)}><option value="">-- Pilih --</option><option value="prototype">Prototype</option><option value="model">Model</option><option value="software">Software</option></select></Field></React.Fragment>}
    </div>
  );
}

OutputFields.propTypes = { output: PropTypes.object.isRequired, onChange: PropTypes.func.isRequired };

function MemberFields({ member, lecturers, onChange }) {
  const update = (key, value) => onChange({ ...member, [key]: value });
  const selectProfile = id => {
    const profile = lecturers.find(item => item.id === id);
    if (!profile) {
      update('profileId', '');
      return;
    }
    onChange({
      ...member, profileId: profile.id, name: profile.name, nidn: profile.nidn, program: profile.program, faculty: profile.faculty, orcid: profile.orcid
    });
  };
  const internal = member.type === 'internal_lecturer';
  return <div>
    <Field label="Tipe Anggota" required><select value={member.type} onChange={event => onChange({
      ...emptyMember(), id: member.id, role: member.role, type: event.target.value
    })}><option value="external_lecturer">Dosen Eksternal</option><option value="internal_lecturer">Dosen Internal</option>{member.role !== 'ketua' && <option value="student">Mahasiswa</option>}</select></Field>
    {internal ? <Field label="Nama" required><select value={member.profileId} onChange={event => selectProfile(event.target.value)}><option value="">-- Pilih Dosen --</option>{lecturers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field> : <Field label="Nama" required><input value={member.name} onChange={event => update('name', event.target.value)} placeholder="Dosen XYZ" /></Field>}
    {member.type === 'student' ? <Field label="NIM" required><input inputMode="numeric" maxLength="12" value={member.nim} onChange={event => update('nim', event.target.value.replace(/\D/g, ''))} placeholder="0000000000" /></Field> : <Field label="NIDN" required><input disabled={internal} inputMode="numeric" maxLength="12" value={member.nidn} onChange={event => update('nidn', event.target.value.replace(/\D/g, ''))} placeholder="0000000000" /></Field>}
    <Field label="Program Studi" required><input disabled={internal} value={member.program} onChange={event => update('program', event.target.value)} placeholder="Sistem Informasi" /></Field>
    <Field label="Fakultas" required><input disabled={internal} value={member.faculty} onChange={event => update('faculty', event.target.value)} placeholder="Teknik dan Informatika" /></Field>
    <Field label="ORCID (opsional)"><input disabled={internal} inputMode="numeric" maxLength="16" value={member.orcid} onChange={event => update('orcid', event.target.value.replace(/\D/g, ''))} placeholder="0000000000000000" /></Field>
  </div>;
}

MemberFields.propTypes = { member: PropTypes.object.isRequired, lecturers: PropTypes.array.isRequired, onChange: PropTypes.func.isRequired };

export default function ProposalWizardPage() {
  const { schemeId } = useParams();
  const { data, setData, user } = useRis();
  const history = useHistory();
  const scheme = data.schemes.find(item => item.id === schemeId);
  const existing = (data.drafts || []).find(item => item.schemeId === schemeId && item.userId === user.id);
  const defaultLeaderProfile = data.lecturers.find(item => item.id === user.profileId);
  const defaultLeader = defaultLeaderProfile ? {
    ...emptyMember(), role: 'ketua', type: 'internal_lecturer', profileId: defaultLeaderProfile.id, name: defaultLeaderProfile.name, nidn: defaultLeaderProfile.nidn, program: defaultLeaderProfile.program, faculty: defaultLeaderProfile.faculty, orcid: defaultLeaderProfile.orcid
  } : { ...emptyMember(), role: 'ketua' };
  const initialProject = normalizeProjectState(existing ? existing.project : emptyProject);
  const [step, setStep] = useState(existing ? Math.min(existing.currentStep || 1, 5) : 1);
  const [project, setProject] = useState(initialProject);
  const [members, setMembers] = useState(existing && existing.members.length ? existing.members : [defaultLeader, emptyMember()]);
  const [budgets, setBudgets] = useState(existing && existing.budgets.length ? existing.budgets : [emptyBudget('materials')]);
  const [activeBudgetTab, setActiveBudgetTab] = useState('materials');
  const [outputs, setOutputs] = useState(existing && existing.outputs.length ? syncOutputsWithProject(initialProject, existing.outputs) : syncOutputsWithProject(initialProject, []));
  const [files, setFiles] = useState(existing ? existing.files : []);
  const [additionalFiles, setAdditionalFiles] = useState([]);
  const [error, setError] = useState('');
  const [revisionOpen, setRevisionOpen] = useState(false);
  const autosaveTimer = useRef(null);

  const budgetTotal = useMemo(() => budgets.reduce((sum, item) => sum + (Number(item.volume) || 0) * (Number(item.unitPrice) || 0), 0), [budgets]);
  const leader = members[0];
  const regularMembers = members.slice(1);
  const schemeTitle = getSchemeTitle(scheme);

  const buildDraft = (status, currentExisting = existing) => {
    const now = new Date().toISOString();
    const savedProject = normalizeProjectForSave(project);
    const nextDraft = {
      id: currentExisting ? currentExisting.id : uid('draft'),
      userId: user.id,
      userName: user.name,
      createdBy: currentExisting ? currentExisting.createdBy : user.id,
      schemeId,
      status,
      draftStatus: status,
      currentStep: step,
      project: savedProject,
      members,
      budgets,
      outputs,
      files: [...files, ...additionalFiles].filter(item => item && item.name),
      createdAt: currentExisting ? currentExisting.createdAt : now,
      updatedAt: now,
      lastSavedAt: now,
      submittedAt: status === STATUS.SUBMITTED ? now : (currentExisting && currentExisting.submittedAt),
      decision: currentExisting && currentExisting.decision,
      assignment: currentExisting && currentExisting.assignment,
      review: currentExisting && currentExisting.review,
      contract: currentExisting && currentExisting.contract,
    };
    return { ...nextDraft, db: toDbDraftSnapshot(nextDraft, scheme) };
  };

  const persist = (status, redirect) => {
    setData(current => {
      const currentExisting = (current.drafts || []).find(item => (existing && item.id === existing.id) || (item.schemeId === schemeId && item.userId === user.id && canEditDraft(item, user)));
      const nextDraft = buildDraft(status, currentExisting);
      return {
        ...current,
        drafts: currentExisting ? (current.drafts || []).map(item => (item.id === currentExisting.id ? nextDraft : item)) : [...(current.drafts || []), nextDraft],
      };
    });
    if (redirect) history.push(redirect);
  };

  useEffect(() => {
    if (!scheme || !user) return undefined;
    if (existing && !canEditDraft(existing, user)) return undefined;
    if (!existing && (!isOpenScheme(scheme) || !isEligibleForScheme(scheme, user) || hasActiveDraftForScheme(data, user, schemeId))) return undefined;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      setData(current => {
        const currentExisting = (current.drafts || []).find(item => (existing && item.id === existing.id) || (item.schemeId === schemeId && item.userId === user.id && canEditDraft(item, user)));
        const nextDraft = buildDraft(currentExisting ? currentExisting.status : STATUS.DRAFT, currentExisting);
        return {
          ...current,
          drafts: currentExisting ? (current.drafts || []).map(item => (item.id === currentExisting.id ? nextDraft : item)) : [...(current.drafts || []), nextDraft],
        };
      });
    }, 800);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [step, project, members, budgets, outputs, files, additionalFiles, schemeId, user && user.id]);

  if (!scheme) return <div className="ris-page"><h1>Skema tidak ditemukan</h1></div>;
  if (!isOpenScheme(scheme) && !existing) return <div className="ris-page"><h1>Skema tidak sedang dibuka</h1></div>;
  if (!existing && !isEligibleForScheme(scheme, user)) return <div className="ris-page"><h1>Akun tidak eligible untuk skema ini</h1><p className="ris-muted">Data mengikuti tabel scheme_eligibility_snapshot/eligible user pada skema.</p></div>;
  if (existing && !canEditDraft(existing, user)) return <div className="ris-page"><h1>Proposal tidak dapat diedit</h1><p className="ris-muted">Hanya draft atau proposal revisi milik dosen yang dapat diedit.</p></div>;
  if (!existing && hasActiveDraftForScheme(data, user, schemeId)) return <div className="ris-page"><h1>Pengajuan aktif sudah ada</h1><p className="ris-muted">Satu dosen hanya boleh memiliki satu draft/pengajuan aktif per skema.</p></div>;

  const validateStep = () => {
    if (step === 1 && (!project.title || !project.mandatoryOutputPlan || !project.targetTkt || !project.ripRelation || !project.researchCenterRelation || (project.researchCenterRelation === 'other' && !project.researchCenterOther) || !(project.sdgs || []).length || project.integrated === null || (project.integrated && (!project.courseName || !project.academicYear)))) return 'Lengkapi seluruh data proyek yang wajib diisi.';
    if (step === 2 && (members.length < 2 || members.some(item => !item.name || (!item.nidn && !item.nim) || !item.program || !item.faculty))) return 'Lengkapi data ketua dan minimal satu anggota.';
    if (step === 3 && (!budgets.length || budgets.some(item => !item.component || !item.name || Number(item.volume) <= 0 || !item.unit || Number(item.unitPrice) <= 0))) return 'Lengkapi minimal satu item anggaran.';
    if (step === 4 && (!outputs.length || outputs.some(item => !validateOutput(item)))) return 'Lengkapi data luaran wajib dan tambahan.';
    return '';
  };

  const next = () => {
    const message = validateStep();
    if (message) { setError(message); return; }
    setError('');
    const nextStep = Math.min(5, step + 1);
    setStep(nextStep);
    setTimeout(() => window.scrollTo(0, 0), 0);
  };

  const submit = () => {
    const candidate = buildDraft(STATUS.SUBMITTED);
    const message = validateDraftForSubmit(candidate, scheme);
    if (message) { setError(message); return; }
    persist(STATUS.SUBMITTED, '/ris');
  };

  const setFixedFile = (category, file) => {
    const allowed = category === 'rab' ? ['xls', 'xlsx'] : ['pdf'];
    const validation = validateAttachmentFile(file, allowed);
    if (validation) {
      setError(validation);
      return;
    }
    const meta = { ...fileMeta(file), category, uploadedAt: new Date().toISOString() };
    setFiles(current => [...current.filter(item => item.category !== category), meta]);
    setError('');
  };

  const fileFor = category => files.find(item => item.category === category) || null;
  const projectUpdate = (key, value) => {
    const nextProject = { ...project, [key]: value };
    if (key === 'additionalOutputPlans') nextProject.additionalOutputPlan = (value || [])[0] || '';
    setProject(nextProject);
    if (key === 'mandatoryOutputPlan' || key === 'additionalOutputPlans') {
      setOutputs(current => syncOutputsWithProject(nextProject, current));
    }
    if (key === 'targetTkt') {
      setOutputs(current => current.map(output => (output.category === 'produk_prototipe' && (!output.targetTkt || output.targetTkt === project.targetTkt) ? { ...output, targetTkt: value } : output)));
    }
  };

  return (
    <div className="ris-page">
      <PageBack onClick={() => history.push('/ris/pengajuan-penelitian-internal')} />
      <div className="ris-title-with-action"><h1>Form Pendaftaran Proposal</h1>{existing && existing.status === STATUS.REVISION && existing.decision && <Button type="button" tone="amber" pill onClick={() => setRevisionOpen(true)}>Tampilkan Catatan Revisi</Button>}</div>
      <div className="ris-stepper">{['Data Proyek', 'Data Member', 'Data Anggaran', 'Data Hasil', 'Data Lampiran'].map((label, index) => <div key={label} className={step === index + 1 ? 'active' : step > index + 1 ? 'done' : ''}><span>{index + 1}</span><small>{label}</small></div>)}</div>
      {error && <div className="ris-alert ris-alert-error">{error}</div>}

      {step === 1 && <section className="ris-form-section"><h2>Data Proyek</h2>
        <Field label="Skema Penelitian"><span className="ris-static-value">{schemeTitle}</span></Field>
        <Field label="Judul Penelitian" required><input value={project.title} onChange={event => projectUpdate('title', event.target.value)} placeholder="Pengembangan..." /></Field>
        <CollapsibleChoice label="Rencana Luaran Wajib Penelitian (status minimal accepted)" required value={project.mandatoryOutputPlan} options={MANDATORY_OUTPUT_OPTIONS} onChange={value => projectUpdate('mandatoryOutputPlan', value)} />
        <MultiChoiceList label="Rencana Luaran Tambahan (tidak wajib)" values={project.additionalOutputPlans || []} options={ADDITIONAL_OUTPUT_OPTIONS} onChange={value => projectUpdate('additionalOutputPlans', value)} />
        <CollapsibleChoice label="Target TKT (Tingkat Kesiapterapan Teknologi)" required value={project.targetTkt} options={TKT_OPTIONS} documentUrl="https://bit.ly/pengukuranTKTUMN" onChange={value => projectUpdate('targetTkt', value)} />
        <CollapsibleChoice label="Keterkaitan dengan RIP" required value={project.ripRelation} options={RIP_OPTIONS} documentUrl="https://bit.ly/riprenstrarisetUMN" onChange={value => projectUpdate('ripRelation', value)} />
        <CollapsibleChoice label="Keterkaitan dengan Research Center" required value={project.researchCenterRelation} options={RESEARCH_CENTER_OPTIONS} otherValue={project.researchCenterOther} onOtherChange={value => projectUpdate('researchCenterOther', value)} onChange={value => projectUpdate('researchCenterRelation', value)} />
        <Field label="Keterkaitan dengan SDGs" required alignStart><div className="ris-sdg-grid">{SDGS.map(item => <label key={item.id}><input type="checkbox" checked={project.sdgs.includes(item.id)} onChange={() => projectUpdate('sdgs', project.sdgs.includes(item.id) ? project.sdgs.filter(id => id !== item.id) : [...project.sdgs, item.id])} /><span>{item.code}</span>{item.name}</label>)}</div></Field>
        <Field label="Apakah penelitian terintegrasi dengan mata kuliah?" required><div className="ris-radio-group"><label><input type="radio" checked={project.integrated === true} onChange={() => projectUpdate('integrated', true)} />Ya</label><label><input type="radio" checked={project.integrated === false} onChange={() => projectUpdate('integrated', false)} />Tidak</label></div></Field>
        {project.integrated && <React.Fragment><Field label="Nama Mata Kuliah" required><select value={project.courseName} onChange={event => projectUpdate('courseName', event.target.value)}><option value="">-- Pilih --</option><option value="machine_learning">Machine Learning</option><option value="deep_learning">Deep Learning</option><option value="data_mining">Data Mining</option></select></Field><Field label="Tahun Akademik" required><input value={project.academicYear} onChange={event => projectUpdate('academicYear', event.target.value)} placeholder="2025/2026" /></Field></React.Fragment>}
      </section>}

      {step === 2 && <section className="ris-form-section"><h2>Data Member</h2><div className="ris-form-card"><h3>Ketua</h3><MemberFields member={leader} lecturers={data.lecturers} onChange={value => setMembers([value, ...regularMembers])} /></div>{regularMembers.map((member, index) => <div className="ris-form-card" key={member.id}><div className="ris-card-heading"><h3>{regularMembers.length > 1 ? `Member ${index + 1}` : 'Member'}</h3>{regularMembers.length > 1 && <button type="button" className="ris-text-danger" onClick={() => setMembers([leader, ...regularMembers.filter(item => item.id !== member.id)])}>Hapus Member</button>}</div><MemberFields member={member} lecturers={data.lecturers} onChange={value => setMembers([leader, ...regularMembers.map(item => (item.id === member.id ? value : item))])} /></div>)}<div className="ris-align-right"><Button type="button" tone="gray" pill onClick={() => setMembers(current => [...current, emptyMember()])}>Tambah Member +</Button></div></section>}

      {step === 3 && <section className="ris-form-section"><h2>Data Anggaran</h2><div className="ris-tabs">{BUDGET_TABS.map(tab => <button type="button" key={tab.key} className={activeBudgetTab === tab.key ? 'active' : ''} onClick={() => setActiveBudgetTab(tab.key)}>{tab.label === 'Pelaporan Hasil Penelitian dan Luaran Wajib' ? 'Pelaporan Hasil' : tab.label}</button>)}</div>{budgets.filter(item => item.tab === activeBudgetTab).map((item, index) => { const tab = BUDGET_TABS.find(entry => entry.key === activeBudgetTab); const updateBudget = (key, value) => setBudgets(current => current.map(entry => (entry.id === item.id ? { ...entry, [key]: value } : entry))); return <div className="ris-form-card" key={item.id}><div className="ris-card-heading"><h3>Item {index + 1}</h3><button type="button" className="ris-text-danger" onClick={() => setBudgets(current => current.filter(entry => entry.id !== item.id))}>Hapus Item</button></div><Field label="Komponen" required><select value={item.component} onChange={event => updateBudget('component', event.target.value)}><option value="">-- Pilih Komponen --</option>{tab.components.map(component => <option key={component}>{component}</option>)}</select></Field><Field label="Nama item" required><input value={item.name} onChange={event => updateBudget('name', event.target.value)} /></Field><Field label="Jumlah" required><input type="number" min="0.01" step="0.01" value={item.volume} onChange={event => updateBudget('volume', event.target.value)} /></Field><Field label="Satuan" required><input value={item.unit} onChange={event => updateBudget('unit', event.target.value)} /></Field><Field label="Harga Satuan" required><input type="number" min="1" value={item.unitPrice} onChange={event => updateBudget('unitPrice', event.target.value)} /></Field><Field label="Total"><input disabled value={formatCurrency((Number(item.volume) || 0) * (Number(item.unitPrice) || 0))} /></Field><Field label="Deskripsi (opsional)"><input value={item.notes} onChange={event => updateBudget('notes', event.target.value)} /></Field></div>; })}<div className="ris-budget-footer"><Button type="button" tone="gray" pill onClick={() => setBudgets(current => [...current, emptyBudget(activeBudgetTab)])}>Tambah Item +</Button><strong>Total Anggaran: {formatCurrency(budgetTotal)}</strong></div></section>}

      {step === 4 && <section className="ris-form-section"><h2>Data Hasil</h2>{outputs.length === 0 && <div className="ris-empty-state">Pilih rencana luaran wajib di Data Proyek agar form Data Hasil dibuat otomatis.</div>}{outputs.map(output => <div className="ris-form-card" key={output.id}><div className="ris-card-heading"><h3>{output.type === 'wajib' ? 'Luaran Wajib' : 'Luaran Tambahan'}{output.planLabel ? ` - ${output.planLabel}` : ''}</h3></div><OutputFields output={output} onChange={value => setOutputs(current => current.map(item => (item.id === output.id ? value : item)))} /></div>)}</section>}

      {step === 5 && <section className="ris-form-section"><h2>Data Lampiran</h2><div className="ris-form-card"><h3>Lampiran Wajib 1</h3><Field label="Kategori"><select disabled><option>Proposal</option></select></Field><FileDrop file={fileFor('proposal')} accept=".pdf" label="PDF (.pdf, maksimal 10 MB)" onFile={file => setFixedFile('proposal', file)} /></div><div className="ris-form-card"><h3>Lampiran Wajib 2</h3><Field label="Kategori"><select disabled><option>RAB</option></select></Field><FileDrop file={fileFor('rab')} accept=".xls,.xlsx" label="Excel (.xls/.xlsx, maksimal 10 MB)" onFile={file => setFixedFile('rab', file)} /></div>{schemeTitle.toLowerCase().includes('kerjasama') && <div className="ris-form-card"><h3>Lampiran Kondisional</h3><Field label="Kategori"><select disabled><option>MoA</option></select></Field><FileDrop file={fileFor('moa')} accept=".pdf" label="PDF (.pdf, maksimal 10 MB)" onFile={file => setFixedFile('moa', file)} /></div>}{members.some(item => item.type === 'student') && <div className="ris-form-card"><h3>Lampiran Kondisional</h3><Field label="Kategori"><select disabled><option>Surat Keterangan Mahasiswa</option></select></Field><FileDrop file={fileFor('student_letter')} accept=".pdf" label="PDF (.pdf, maksimal 10 MB)" onFile={file => setFixedFile('student_letter', file)} /></div>}{additionalFiles.map(item => <div className="ris-form-card" key={item.id}><div className="ris-card-heading"><h3>Lampiran Tambahan</h3><button type="button" className="ris-text-danger" onClick={() => setAdditionalFiles(current => current.filter(entry => entry.id !== item.id))}>Hapus</button></div><Field label="Kategori" required><select value={item.category} onChange={event => setAdditionalFiles(current => current.map(entry => (entry.id === item.id ? { ...entry, category: event.target.value } : entry)))}><option value="">-- Pilih --</option><option value="supporting_document">Supporting Document</option><option value="budget_temp_bon_file">Budget Temp Bon File</option><option value="budget_reimburse_file">Budget Reimburse File</option><option value="budget_receipt_file">Budget Receipt File</option><option value="budget_accountability_file">Budget Accountability File</option></select></Field><FileDrop file={item.name ? item : null} label="Pilih file (maksimal 10 MB)" onFile={file => { const validation = validateAttachmentFile(file, ['pdf', 'doc', 'docx', 'xls', 'xlsx']); if (validation) { setError(validation); return; } const meta = { ...fileMeta(file), uploadedAt: new Date().toISOString() }; setAdditionalFiles(current => current.map(entry => (entry.id === item.id ? { ...entry, ...meta, id: item.id } : entry))); setError(''); }} /></div>)}<div className="ris-align-right"><Button type="button" tone="gray" pill onClick={() => setAdditionalFiles(current => [...current, {
        id: uid('attachment'), category: '', name: '', size: 0
      }])}>Tambah Data Lampiran Tambahan +</Button></div></section>}

      <div className="ris-wizard-actions"><div>{step > 1 && <Button type="button" tone="gray" pill onClick={() => { setError(''); setStep(value => value - 1); }}>Back</Button>}</div><div>{step < 5 ? <Button type="button" pill onClick={next}>Next</Button> : <React.Fragment><Button type="button" tone="gray" pill onClick={() => persist(existing ? existing.status : STATUS.DRAFT, '/ris')}>Simpan Draft</Button><Button type="button" pill onClick={submit}>Submit</Button></React.Fragment>}</div></div>
      {revisionOpen && <Modal title="Catatan Revisi" onClose={() => setRevisionOpen(false)}><div className="ris-modal-body"><p className="ris-prewrap">{existing.decision.notes}</p><div className="ris-modal-actions"><Button type="button" tone="gray" pill onClick={() => setRevisionOpen(false)}>Tutup</Button></div></div></Modal>}
    </div>
  );
}
