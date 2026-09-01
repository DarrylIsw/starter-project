/* eslint-disable object-curly-newline */
const assert = require('assert');
const { createInitialData } = require('../../app/containers/Ris/data');
const { applyArchiveAccountUpdate, buildResearchArchiveRecords, buildUserArchiveRecords } = require('../../app/containers/Ris/archiveWorkflow');

describe('RIS archive synchronization', () => {
  it('includes proposal and funded execution data in one internal research record', () => {
    const data = createInitialData();
    const record = buildResearchArchiveRecords(data).find(item => item.id === 'draft-approved');
    assert.ok(record);
    assert.strictEqual(record.hasExecutionData, true);
    assert.strictEqual(record.coverage.monev, 1);
    assert.strictEqual(record.coverage.progressReports, 1);
    assert.strictEqual(record.coverage.logbooks, 2);
    assert.strictEqual(record.coverage.fundedAssignments, 2);
    assert.strictEqual(record.coverage.fundedReviews, 1);
    assert.strictEqual(record.coverage.verification, 1);
    assert.strictEqual(record.coverage.decision, 1);
    assert.strictEqual(record.coverage.fundingLetter, 1);
    assert.ok(record.coverage.reportingPeriods > 0);
  });

  it('uses funded workflow timestamps as the archive updated timestamp', () => {
    const data = createInitialData();
    data.fundedReviews.push({ id: 'new-review', researchId: 'draft-approved', submittedAt: '2026-08-09T12:00:00.000Z' });
    const record = buildResearchArchiveRecords(data).find(item => item.id === 'draft-approved');
    assert.strictEqual(record.updatedAt, '2026-08-09T12:00:00.000Z');
  });

  it('links lecturer profile, documents, research, letters, and temporary review work', () => {
    const data = createInitialData();
    const record = buildUserArchiveRecords(data).find(item => item.account.id === 'user-lecturer-2');
    assert.ok(record.profile);
    assert.ok(record.documents.length > 0);
    assert.ok(record.proposalAssignments.length > 0);
    assert.ok(record.fundedAssignments.length > 0);
    assert.strictEqual(record.activeReviewerAssignments.length > 0, true);
    assert.ok(Array.isArray(record.verifications));
    assert.ok(Array.isArray(record.statusHistory));
  });

  it('includes external documents, outputs, reviews, and history', () => {
    const data = createInitialData();
    const record = buildResearchArchiveRecords(data).find(item => item.id === 'external-report-2');
    assert.strictEqual(record.coverage.documents, 4);
    assert.strictEqual(record.coverage.outputs, 1);
    assert.strictEqual(record.coverage.reviews, 1);
    assert.strictEqual(record.coverage.history, 3);
  });

  it('synchronizes account status and admin scopes with the researcher profile', () => {
    const data = createInitialData();
    const actor = data.systemUsers.find(item => item.id === 'user-super-admin');
    const updated = applyArchiveAccountUpdate(data, 'user-admin', {
      name: 'Admin Penelitian',
      email: 'admin.penelitian@umn.ac.id',
      role: 'admin',
      adminScopes: ['research_management', 'letter_management'],
      isActive: false,
      deactivationReason: 'Rotasi tugas',
    }, actor, prefix => `${prefix}-test`, new Date('2026-08-09T12:30:00.000Z'));
    const account = updated.systemUsers.find(item => item.id === 'user-admin');
    const profile = updated.researcherProfiles.find(item => item.userId === 'user-admin');
    assert.deepStrictEqual(account.adminScopes, ['research_management', 'letter_management']);
    assert.strictEqual(account.isActive, false);
    assert.strictEqual(profile.profileStatus, 'inactive');
    assert.strictEqual(updated.researcherStatusHistory.some(item => item.profileId === profile.profileId && item.newStatus === 'inactive'), true);
    assert.strictEqual(updated.systemActivityLogs.some(item => item.action === 'archive_update_user' && item.entityId === 'user-admin'), true);

    const lecturerUpdated = applyArchiveAccountUpdate(data, 'user-lecturer', {
      name: 'Dr. Budi Santoso',
      email: 'lecturer@umn.ac.id',
      role: 'lecturer',
      adminScopes: [],
      isActive: false,
      deactivationReason: 'Cuti panjang',
    }, actor, prefix => `${prefix}-lecturer-test`, new Date('2026-08-09T12:30:00.000Z'));
    assert.strictEqual(lecturerUpdated.applicantProfiles.find(item => item.userId === 'user-lecturer').status, 'inactive');
  });
});
