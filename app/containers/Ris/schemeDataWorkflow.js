/* eslint-disable object-curly-newline, object-property-newline */
import {
  STATUS,
  canManageResearch,
  draftOwnerId,
  draftStatus,
  isResearcher,
} from './workflow';
import { REPORT_TYPE, sortReportingSchedule } from './reportingWorkflow';

export const SCHEME_DATA_TAB = {
  CONTRACT: 'contract',
  MONEV: 'monev',
  FINAL_REPORT: 'final-report',
  OUTPUT_REPORT: 'output-report',
  LOGBOOK: 'logbook',
};

export const SCHEME_DATA_TABS = [
  { value: SCHEME_DATA_TAB.CONTRACT, label: 'Pengumpulan Kontrak' },
  { value: SCHEME_DATA_TAB.MONEV, label: 'Monev' },
  { value: SCHEME_DATA_TAB.FINAL_REPORT, label: 'Laporan Akhir' },
  { value: SCHEME_DATA_TAB.OUTPUT_REPORT, label: 'Laporan Luaran' },
  { value: SCHEME_DATA_TAB.LOGBOOK, label: 'Catatan Kegiatan Penelitian' },
];

export const getFundedResearches = (data, user) => (data.drafts || []).filter(draft => {
  if (draftStatus(draft) !== STATUS.FUNDED) return false;
  if (canManageResearch(user)) return true;
  return isResearcher(user) && draftOwnerId(draft) === (user && user.id);
});

export const hasFundedResearch = (data, user) => getFundedResearches(data, user).length > 0;

export const canAccessSchemeData = (draft, user) => Boolean(
  draft
  && draftStatus(draft) === STATUS.FUNDED
  && (canManageResearch(user) || (isResearcher(user) && draftOwnerId(draft) === (user && user.id)))
);

export const getProgressReportPeriods = scheme => sortReportingSchedule(scheme && scheme.reportingSchedule)
  .filter(period => [REPORT_TYPE.INTERIM, REPORT_TYPE.FINAL].includes(period.type));

export const getOutputReportPeriods = scheme => sortReportingSchedule(scheme && scheme.reportingSchedule)
  .filter(period => period.type === REPORT_TYPE.OUTPUT);

export const getMonevPeriods = scheme => sortReportingSchedule(scheme && scheme.reportingSchedule)
  .filter(period => period.type === REPORT_TYPE.INTERIM);

export const internalReportFor = (reports, researchId, periodId, outputId = '') => (reports || []).find(report => (
  report.researchId === researchId
  && report.periodId === periodId
  && String(report.outputId || '') === String(outputId || '')
));

export const monevForPeriod = (records, researchId, periodId) => (records || []).find(record => record.researchId === researchId && record.periodId === periodId);

export const getSchemeDataProgress = (data, draft, scheme) => {
  const monevPeriods = getMonevPeriods(scheme);
  const progressPeriods = getProgressReportPeriods(scheme);
  const outputPeriods = getOutputReportPeriods(scheme);
  const outputs = draft.outputs || [];
  const contractComplete = Boolean(draft.contract && (draft.contract.status === 'signed' || draft.contract.contractStatus === 'signed'));
  const monevComplete = monevPeriods.filter(period => {
    const record = monevForPeriod(data.monevRecords, draft.id, period.id);
    return record && record.status === 'submitted';
  }).length;
  const progressReportsComplete = progressPeriods.filter(period => {
    const report = internalReportFor(data.internalReports, draft.id, period.id);
    return report && report.status === 'submitted';
  }).length;
  const outputReportsRequired = outputPeriods.length * outputs.length;
  const outputReportsComplete = outputPeriods.reduce((total, period) => total + outputs.filter(output => {
    const report = internalReportFor(data.internalReports, draft.id, period.id, output.id);
    return report && report.status === 'submitted';
  }).length, 0);
  const required = 1 + monevPeriods.length + progressPeriods.length + outputReportsRequired;
  const completed = Number(contractComplete) + monevComplete + progressReportsComplete + outputReportsComplete;
  const percentage = required ? Math.round((completed / required) * 100) : 0;
  const status = completed === 0 ? 'not_started' : completed >= required ? 'complete' : 'in_progress';
  return {
    completed,
    required,
    percentage,
    status,
    contractComplete,
    monev: { completed: monevComplete, required: monevPeriods.length },
    reports: { completed: progressReportsComplete, required: progressPeriods.length },
    outputs: { completed: outputReportsComplete, required: outputReportsRequired },
    logbooks: (data.logbooks || []).filter(item => item.researchId === draft.id).length,
  };
};
