-- RIS LPPM PostgreSQL bootstrap
-- Target: PostgreSQL 13+
--
-- Create and select the target database before running this file:
--   createdb ris_lppm
--   psql -v ON_ERROR_STOP=1 -d ris_lppm -f database.sql
--
-- WARNING: this bootstrap resets the public schema and deletes existing data.
-- Use a migration tool for incremental changes after the first deployment.

BEGIN;

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
SET search_path TO public;
SET TIME ZONE 'Asia/Jakarta';

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- ---------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------

CREATE TYPE role_type AS ENUM (
  'super_admin',
  'manager',
  'admin',
  'lecturer'
);

CREATE TYPE admin_scope_type AS ENUM (
  'research_management',
  'letter_management',
  'researcher_profile_management'
);

CREATE TYPE profile_status_type AS ENUM (
  'draft',
  'active',
  'inactive',
  'suspended'
);

CREATE TYPE verification_status_type AS ENUM (
  'unverified',
  'pending',
  'verified',
  'rejected'
);

CREATE TYPE scheme_status_type AS ENUM (
  'draft',
  'published',
  'open',
  'closed',
  'active',
  'completed',
  'archived'
);

CREATE TYPE proposal_status_type AS ENUM (
  'draft',
  'submitted',
  'under_review',
  'reviewed',
  'revision',
  'funded',
  'rejected',
  'cancelled'
);

CREATE TYPE member_type AS ENUM (
  'internal_lecturer',
  'external_lecturer',
  'student',
  'staff',
  'other'
);

CREATE TYPE member_role_type AS ENUM (
  'ketua',
  'member',
  'anggota'
);

CREATE TYPE output_kind_type AS ENUM (
  'wajib',
  'tambahan'
);

CREATE TYPE reviewer_assignment_status_type AS ENUM (
  'assigned',
  'in_progress',
  'submitted',
  'completed',
  'revoked'
);

CREATE TYPE review_recommendation_type AS ENUM (
  'approve',
  'revision',
  'reject'
);

CREATE TYPE final_decision_type AS ENUM (
  'funded',
  'revision',
  'rejected'
);

CREATE TYPE contract_status_type AS ENUM (
  'unsigned',
  'signed',
  'revision_required',
  'accepted'
);

CREATE TYPE report_type AS ENUM (
  'interim',
  'final',
  'output'
);

CREATE TYPE report_status_type AS ENUM (
  'not_open',
  'open',
  'draft',
  'submitted',
  'under_review',
  'revision_required',
  'accepted',
  'rejected',
  'overdue'
);

CREATE TYPE funded_review_target_type AS ENUM (
  'monev',
  'report'
);

CREATE TYPE letter_status_type AS ENUM (
  'draft',
  'submitted',
  'form_design',
  'data_required',
  'data_submitted',
  'draft_revision',
  'prechecked',
  'revision_required',
  'approved',
  'rejected',
  'generated'
);

CREATE TYPE external_research_status_type AS ENUM (
  'draft',
  'submitted',
  'under_review',
  'revision_requested',
  'validated',
  'archived'
);

CREATE TYPE notification_priority_type AS ENUM (
  'low',
  'normal',
  'high',
  'critical'
);

CREATE TYPE file_status_type AS ENUM (
  'pending',
  'ready',
  'quarantined',
  'deleted'
);

CREATE TYPE outbox_status_type AS ENUM (
  'queued',
  'processing',
  'sent',
  'failed',
  'cancelled'
);

-- ---------------------------------------------------------------------
-- Shared functions and lookup data
-- ---------------------------------------------------------------------

CREATE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE roles (
  code role_type PRIMARY KEY,
  name varchar(100) NOT NULL UNIQUE,
  description text
);

CREATE TABLE admin_scopes (
  code admin_scope_type PRIMARY KEY,
  name varchar(120) NOT NULL UNIQUE,
  description text
);

CREATE TABLE sdg_goals (
  id smallint PRIMARY KEY CHECK (id BETWEEN 1 AND 17),
  name varchar(160) NOT NULL UNIQUE
);

CREATE TABLE budget_categories (
  code varchar(40) PRIMARY KEY,
  name varchar(120) NOT NULL UNIQUE,
  position smallint NOT NULL CHECK (position > 0)
);

CREATE TABLE review_criteria (
  code varchar(80) PRIMARY KEY,
  name varchar(180) NOT NULL,
  category varchar(120) NOT NULL,
  weight numeric(5,2) NOT NULL CHECK (weight > 0 AND weight <= 100),
  minimum_score smallint NOT NULL DEFAULT 1 CHECK (minimum_score >= 0),
  maximum_score smallint NOT NULL DEFAULT 100 CHECK (maximum_score > minimum_score),
  position smallint NOT NULL CHECK (position > 0),
  is_active boolean NOT NULL DEFAULT true
);

-- ---------------------------------------------------------------------
-- Accounts, authentication, files, and researcher profiles
-- ---------------------------------------------------------------------

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(320) NOT NULL,
  password_hash text NOT NULL,
  name varchar(180) NOT NULL,
  role role_type NOT NULL REFERENCES roles(code),
  is_active boolean NOT NULL DEFAULT true,
  applicant_enabled boolean NOT NULL DEFAULT false,
  default_mode varchar(20),
  identifier varchar(80),
  activation_token_hash text,
  activation_expires_at timestamptz,
  last_login_at timestamptz,
  password_changed_at timestamptz,
  deactivation_reason text,
  deactivated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  deactivated_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_default_mode_check
    CHECK (default_mode IS NULL OR default_mode IN ('management', 'lecturer')),
  CONSTRAINT users_manager_mode_check
    CHECK (default_mode IS DISTINCT FROM 'lecturer' OR role IN ('manager', 'lecturer'))
);

CREATE UNIQUE INDEX users_email_unique_idx ON users (lower(email));
CREATE INDEX users_role_active_idx ON users (role, is_active);

CREATE TABLE user_admin_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope admin_scope_type NOT NULL REFERENCES admin_scopes(code),
  assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, scope)
);

CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  ip_address inet,
  user_agent text,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

CREATE INDEX user_sessions_user_expiry_idx ON user_sessions (user_id, expires_at DESC);

CREATE TABLE account_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose varchar(40) NOT NULL CHECK (purpose IN ('activation', 'password_reset', 'email_change')),
  token_hash text NOT NULL UNIQUE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

CREATE TABLE stored_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  storage_provider varchar(40) NOT NULL DEFAULT 'local',
  storage_key text NOT NULL UNIQUE,
  file_url text,
  original_name varchar(255) NOT NULL,
  mime_type varchar(160) NOT NULL,
  extension varchar(20),
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  checksum_sha256 varchar(64),
  status file_status_type NOT NULL DEFAULT 'ready',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX stored_files_owner_idx ON stored_files (owner_user_id, uploaded_at DESC);
CREATE INDEX stored_files_status_idx ON stored_files (status);

CREATE TABLE researcher_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name varchar(180) NOT NULL,
  front_title varchar(80),
  back_title varchar(80),
  nidn varchar(80),
  nik varchar(80),
  nip varchar(80),
  birth_place varchar(120),
  birth_date date,
  gender varchar(40),
  nationality varchar(80) NOT NULL DEFAULT 'Indonesia',
  institution_email varchar(320),
  alternate_email varchar(320),
  phone_number varchar(40),
  domicile_address text,
  correspondence_address text,
  faculty varchar(180),
  study_program varchar(180),
  unit varchar(180),
  position varchar(180),
  functional_position varchar(180),
  education_level varchar(40),
  employment_status varchar(80),
  orcid varchar(40),
  google_scholar text,
  sinta_id varchar(80),
  sinta_score integer NOT NULL DEFAULT 0 CHECK (sinta_score >= 0),
  research_count integer NOT NULL DEFAULT 0 CHECK (research_count >= 0),
  last_research_year smallint,
  bank_name varchar(120),
  bank_account_number varchar(100),
  bank_account_name varchar(180),
  emergency_contact_name varchar(180),
  emergency_contact_relation varchar(80),
  emergency_contact_phone varchar(40),
  profile_photo_file_id uuid REFERENCES stored_files(id) ON DELETE SET NULL,
  profile_status profile_status_type NOT NULL DEFAULT 'draft',
  verification_status verification_status_type NOT NULL DEFAULT 'unverified',
  completeness smallint NOT NULL DEFAULT 0 CHECK (completeness BETWEEN 0 AND 100),
  last_updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX researcher_profiles_nidn_unique_idx
  ON researcher_profiles (nidn) WHERE nidn IS NOT NULL AND nidn <> '';
CREATE INDEX researcher_profiles_status_idx
  ON researcher_profiles (profile_status, verification_status);
CREATE INDEX researcher_profiles_faculty_idx ON researcher_profiles (faculty);

CREATE TABLE researcher_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES researcher_profiles(id) ON DELETE CASCADE,
  document_type varchar(80) NOT NULL,
  file_id uuid NOT NULL REFERENCES stored_files(id) ON DELETE RESTRICT,
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX researcher_documents_profile_idx
  ON researcher_documents (profile_id, document_type, is_active);

CREATE TABLE researcher_expertise (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(160) NOT NULL UNIQUE
);

CREATE TABLE researcher_expertise_map (
  profile_id uuid NOT NULL REFERENCES researcher_profiles(id) ON DELETE CASCADE,
  expertise_id uuid NOT NULL REFERENCES researcher_expertise(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  PRIMARY KEY (profile_id, expertise_id)
);

CREATE TABLE researcher_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES researcher_profiles(id) ON DELETE CASCADE,
  status verification_status_type NOT NULL,
  notes text,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_by uuid REFERENCES users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX researcher_verifications_profile_idx
  ON researcher_verifications (profile_id, created_at DESC);

CREATE TABLE researcher_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES researcher_profiles(id) ON DELETE CASCADE,
  old_status profile_status_type,
  new_status profile_status_type NOT NULL,
  reason text,
  changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admin_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES researcher_profiles(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  UNIQUE (profile_id, admin_id)
);

CREATE TABLE applicant_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name varchar(180) NOT NULL,
  identifier varchar(80),
  applicant_role varchar(120),
  applicant_kind varchar(80) NOT NULL,
  status varchar(80),
  faculty varchar(180),
  study_program varchar(180),
  email varchar(320),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE previous_ethics_clearances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  applicant_name varchar(180),
  clearance_number varchar(160) NOT NULL UNIQUE,
  research_title text NOT NULL,
  issued_at date NOT NULL,
  expiry_date date NOT NULL,
  file_id uuid REFERENCES stored_files(id) ON DELETE SET NULL,
  CHECK (expiry_date >= issued_at)
);

-- ---------------------------------------------------------------------
-- Research schemes
-- ---------------------------------------------------------------------

CREATE TABLE schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(220) NOT NULL,
  description text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  registration_start_at timestamptz NOT NULL,
  registration_end_at timestamptz NOT NULL,
  year smallint NOT NULL CHECK (year BETWEEN 2000 AND 2200),
  maximum_budget numeric(16,2) NOT NULL CHECK (maximum_budget > 0),
  status scheme_status_type NOT NULL DEFAULT 'draft',
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date),
  CHECK (registration_end_at >= registration_start_at)
);

CREATE INDEX schemes_status_registration_idx
  ON schemes (status, registration_start_at, registration_end_at);
CREATE INDEX schemes_year_idx ON schemes (year DESC);

CREATE TABLE scheme_filter_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id uuid NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
  field_name varchar(100) NOT NULL,
  operator varchar(30) NOT NULL,
  value jsonb NOT NULL,
  position smallint NOT NULL DEFAULT 1 CHECK (position > 0),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE scheme_eligible_users (
  scheme_id uuid NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  eligibility_source varchar(30) NOT NULL DEFAULT 'manual',
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scheme_id, user_id)
);

CREATE INDEX scheme_eligible_users_user_idx ON scheme_eligible_users (user_id, scheme_id);

CREATE TABLE scheme_output_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id uuid NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
  name varchar(220) NOT NULL,
  category varchar(80) NOT NULL,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  position smallint NOT NULL CHECK (position > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scheme_id, position)
);

CREATE TABLE scheme_attachment_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id uuid NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
  category varchar(100) NOT NULL,
  name varchar(220) NOT NULL,
  accepted_extensions varchar(255) NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  is_custom boolean NOT NULL DEFAULT false,
  template_file_id uuid REFERENCES stored_files(id) ON DELETE SET NULL,
  position smallint NOT NULL CHECK (position > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scheme_id, category)
);

CREATE TABLE scheme_reporting_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id uuid NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
  report_type report_type NOT NULL,
  label varchar(180) NOT NULL,
  open_at timestamptz NOT NULL,
  due_at timestamptz NOT NULL,
  position smallint NOT NULL CHECK (position > 0),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (due_at >= open_at),
  UNIQUE (scheme_id, position)
);

CREATE UNIQUE INDEX scheme_one_final_period_idx
  ON scheme_reporting_periods (scheme_id)
  WHERE report_type = 'final';
CREATE INDEX scheme_reporting_period_window_idx
  ON scheme_reporting_periods (scheme_id, open_at, due_at);

CREATE TABLE scheme_registration_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id uuid NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
  previous_deadline timestamptz NOT NULL,
  new_deadline timestamptz NOT NULL,
  reason text,
  opened_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (new_deadline > previous_deadline)
);

CREATE TABLE scheme_reporting_period_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES scheme_reporting_periods(id) ON DELETE CASCADE,
  previous_deadline timestamptz NOT NULL,
  new_deadline timestamptz NOT NULL,
  reason text,
  opened_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (new_deadline > previous_deadline)
);

-- ---------------------------------------------------------------------
-- Proposal drafts, reviewer workflow, and final decision
-- ---------------------------------------------------------------------

CREATE TABLE research_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  scheme_id uuid NOT NULL REFERENCES schemes(id) ON DELETE RESTRICT,
  status proposal_status_type NOT NULL DEFAULT 'draft',
  current_step smallint NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 6),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  archive_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  last_saved_at timestamptz,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  decided_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX research_drafts_one_open_draft_idx
  ON research_drafts (user_id, scheme_id)
  WHERE status = 'draft';
CREATE INDEX research_drafts_owner_status_idx
  ON research_drafts (user_id, status, updated_at DESC);
CREATE INDEX research_drafts_scheme_status_idx
  ON research_drafts (scheme_id, status, submitted_at DESC);

CREATE TABLE draft_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL UNIQUE REFERENCES research_drafts(id) ON DELETE CASCADE,
  title text NOT NULL,
  abstract text,
  background text,
  objectives text,
  methodology text,
  target_tkt smallint CHECK (target_tkt IS NULL OR target_tkt BETWEEN 1 AND 9),
  rip_relation varchar(180),
  research_center_relation varchar(180),
  research_center_other varchar(180),
  integrated_to_teaching boolean,
  course_name varchar(180),
  academic_year varchar(20),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE draft_project_sdgs (
  project_id uuid NOT NULL REFERENCES draft_projects(id) ON DELETE CASCADE,
  sdg_id smallint NOT NULL REFERENCES sdg_goals(id),
  PRIMARY KEY (project_id, sdg_id)
);

CREATE TABLE draft_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES research_drafts(id) ON DELETE CASCADE,
  role member_role_type NOT NULL,
  member_type member_type NOT NULL,
  profile_id uuid REFERENCES researcher_profiles(id) ON DELETE SET NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  name varchar(180) NOT NULL,
  identifier varchar(80),
  nidn varchar(80),
  nim varchar(80),
  study_program varchar(180),
  faculty varchar(180),
  orcid varchar(40),
  email varchar(320),
  position smallint NOT NULL CHECK (position > 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (draft_id, position)
);

CREATE UNIQUE INDEX draft_one_lead_researcher_idx
  ON draft_members (draft_id)
  WHERE role = 'ketua';
CREATE INDEX draft_members_profile_idx ON draft_members (profile_id);

CREATE TABLE draft_budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES research_drafts(id) ON DELETE CASCADE,
  category_code varchar(40) NOT NULL REFERENCES budget_categories(code),
  component varchar(180) NOT NULL,
  item_name varchar(220) NOT NULL,
  volume numeric(12,2) NOT NULL CHECK (volume > 0),
  unit varchar(80) NOT NULL,
  unit_price numeric(16,2) NOT NULL CHECK (unit_price >= 0),
  total_amount numeric(16,2)
    GENERATED ALWAYS AS (round(volume * unit_price, 2)) STORED,
  notes text,
  position smallint NOT NULL CHECK (position > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (draft_id, category_code, position)
);

CREATE INDEX draft_budget_items_draft_idx ON draft_budget_items (draft_id, category_code);

CREATE TABLE draft_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES research_drafts(id) ON DELETE CASCADE,
  scheme_output_option_id uuid REFERENCES scheme_output_options(id) ON DELETE SET NULL,
  output_kind output_kind_type NOT NULL,
  name varchar(220) NOT NULL,
  category varchar(80) NOT NULL,
  description text NOT NULL,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  position smallint NOT NULL CHECK (position > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (draft_id, position)
);

CREATE INDEX draft_outputs_draft_kind_idx ON draft_outputs (draft_id, output_kind);

CREATE TABLE draft_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES research_drafts(id) ON DELETE CASCADE,
  requirement_id uuid REFERENCES scheme_attachment_requirements(id) ON DELETE SET NULL,
  category varchar(100) NOT NULL,
  file_id uuid NOT NULL REFERENCES stored_files(id) ON DELETE RESTRICT,
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (draft_id, category)
);

CREATE TABLE proposal_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES research_drafts(id) ON DELETE CASCADE,
  revision_number integer NOT NULL DEFAULT 1 CHECK (revision_number > 0),
  snapshot jsonb NOT NULL,
  submitted_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (draft_id, revision_number)
);

CREATE TABLE proposal_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES research_drafts(id) ON DELETE CASCADE,
  status verification_status_type NOT NULL,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  verified_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  verified_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX proposal_verifications_draft_idx
  ON proposal_verifications (draft_id, verified_at DESC);

CREATE TABLE reviewer_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES research_drafts(id) ON DELETE CASCADE,
  submission_id uuid REFERENCES proposal_submissions(id) ON DELETE SET NULL,
  reviewer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  review_round integer NOT NULL DEFAULT 1 CHECK (review_round > 0),
  status reviewer_assignment_status_type NOT NULL DEFAULT 'assigned',
  assigned_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES users(id) ON DELETE SET NULL,
  revocation_reason text,
  UNIQUE (draft_id, reviewer_id, review_round)
);

CREATE INDEX reviewer_assignments_reviewer_status_idx
  ON reviewer_assignments (reviewer_id, status, due_at);

CREATE TABLE reviewer_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES reviewer_assignments(id) ON DELETE CASCADE,
  sent_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  channel varchar(20) NOT NULL DEFAULT 'both'
    CHECK (channel IN ('in_app', 'email', 'both')),
  message text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reviewer_reminders_assignment_sent_idx
  ON reviewer_reminders (assignment_id, sent_at DESC);

CREATE VIEW temporary_role_assignments AS
SELECT
  id,
  reviewer_id AS user_id,
  'reviewer'::text AS role,
  'research_proposal'::text AS entity_type,
  draft_id AS entity_id,
  status::text,
  assigned_at,
  assigned_by,
  revoked_at
FROM reviewer_assignments
WHERE status IN ('assigned', 'in_progress', 'submitted');

CREATE TABLE submission_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL UNIQUE REFERENCES reviewer_assignments(id) ON DELETE CASCADE,
  recommendation review_recommendation_type NOT NULL,
  total_score numeric(6,2) NOT NULL CHECK (total_score BETWEEN 0 AND 100),
  strengths text,
  weaknesses text,
  budget_notes text,
  output_notes text,
  revision_notes text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE review_score_details (
  review_id uuid NOT NULL REFERENCES submission_reviews(id) ON DELETE CASCADE,
  criteria_code varchar(80) NOT NULL REFERENCES review_criteria(code),
  score numeric(6,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  weighted_score numeric(8,4) NOT NULL CHECK (weighted_score BETWEEN 0 AND 100),
  notes text,
  PRIMARY KEY (review_id, criteria_code)
);

CREATE TABLE proposal_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES research_drafts(id) ON DELETE CASCADE,
  decision_round integer NOT NULL DEFAULT 1 CHECK (decision_round > 0),
  decision final_decision_type NOT NULL,
  is_final boolean GENERATED ALWAYS AS (decision IN ('funded', 'rejected')) STORED,
  notes text,
  decided_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  signer_name varchar(180) NOT NULL,
  signer_role varchar(120) NOT NULL,
  decided_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (draft_id, decision_round)
);

CREATE UNIQUE INDEX proposal_decisions_one_final_idx
  ON proposal_decisions (draft_id)
  WHERE is_final;

CREATE FUNCTION sync_proposal_decision_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM submission_reviews review
    JOIN reviewer_assignments assignment ON assignment.id = review.assignment_id
    WHERE assignment.draft_id = NEW.draft_id
  ) THEN
    RAISE EXCEPTION 'Proposal % cannot receive a decision before a reviewer submits a review.', NEW.draft_id;
  END IF;

  UPDATE research_drafts
  SET
    status = NEW.decision::text::proposal_status_type,
    decided_at = CASE WHEN NEW.is_final THEN NEW.decided_at ELSE NULL END,
    updated_at = now()
  WHERE id = NEW.draft_id;

  IF NEW.is_final THEN
    UPDATE reviewer_assignments
    SET
      status = 'revoked',
      revoked_at = COALESCE(revoked_at, NEW.decided_at),
      revoked_by = COALESCE(revoked_by, NEW.decided_by),
      revocation_reason = COALESCE(revocation_reason, 'Final proposal decision recorded')
    WHERE draft_id = NEW.draft_id
      AND status <> 'revoked';
  ELSE
    UPDATE reviewer_assignments
    SET status = 'completed'
    WHERE draft_id = NEW.draft_id
      AND status IN ('assigned', 'in_progress', 'submitted');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER proposal_decisions_sync_state
AFTER INSERT ON proposal_decisions
FOR EACH ROW EXECUTE FUNCTION sync_proposal_decision_state();

CREATE TABLE funding_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL UNIQUE REFERENCES research_drafts(id) ON DELETE CASCADE,
  letter_number varchar(180) NOT NULL UNIQUE,
  file_id uuid REFERENCES stored_files(id) ON DELETE SET NULL,
  file_name varchar(255),
  signed_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  signer_name varchar(180) NOT NULL,
  signer_role varchar(120) NOT NULL,
  issued_at timestamptz NOT NULL,
  signed_at timestamptz NOT NULL
);

-- ---------------------------------------------------------------------
-- Funded research, contracts, Monev, reports, outputs, and logbooks
-- The funded research id intentionally equals its proposal id. This keeps
-- /research/:researchId compatible with the current frontend aggregate.
-- ---------------------------------------------------------------------

CREATE TABLE funded_research (
  id uuid PRIMARY KEY REFERENCES research_drafts(id) ON DELETE RESTRICT,
  scheme_id uuid NOT NULL REFERENCES schemes(id) ON DELETE RESTRICT,
  lead_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title text NOT NULL,
  status varchar(40) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'suspended', 'archived')),
  funded_amount numeric(16,2) NOT NULL CHECK (funded_amount >= 0),
  started_at date,
  ended_at date,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at)
);

CREATE INDEX funded_research_lead_status_idx
  ON funded_research (lead_user_id, status, updated_at DESC);

CREATE TABLE research_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id uuid NOT NULL UNIQUE REFERENCES funded_research(id) ON DELETE CASCADE,
  status contract_status_type NOT NULL DEFAULT 'unsigned',
  template_file_id uuid REFERENCES stored_files(id) ON DELETE SET NULL,
  signed_file_id uuid REFERENCES stored_files(id) ON DELETE SET NULL,
  template_name varchar(255),
  signed_by_user_at timestamptz,
  accepted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  revision_notes text,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE research_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id uuid NOT NULL REFERENCES funded_research(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES scheme_reporting_periods(id) ON DELETE RESTRICT,
  output_id uuid REFERENCES draft_outputs(id) ON DELETE SET NULL,
  report_type report_type NOT NULL,
  report_period varchar(180) NOT NULL,
  status report_status_type NOT NULL DEFAULT 'draft',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  submitted_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (research_id, period_id, output_id)
);

CREATE UNIQUE INDEX research_reports_without_output_unique_idx
  ON research_reports (research_id, period_id)
  WHERE output_id IS NULL;
CREATE INDEX research_reports_status_idx
  ON research_reports (status, submitted_at DESC);

CREATE TABLE research_report_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES research_reports(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES stored_files(id) ON DELETE RESTRICT,
  category varchar(100) NOT NULL DEFAULT 'report',
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id, file_id)
);

CREATE TABLE report_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES research_reports(id) ON DELETE CASCADE,
  decision report_status_type NOT NULL
    CHECK (decision IN ('revision_required', 'accepted', 'rejected')),
  notes text,
  reviewer_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE research_monev (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id uuid NOT NULL REFERENCES funded_research(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES scheme_reporting_periods(id) ON DELETE RESTRICT,
  period_label varchar(180) NOT NULL,
  status report_status_type NOT NULL DEFAULT 'draft',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  evaluated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  published_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (research_id, period_id)
);

CREATE TABLE research_monev_files (
  monev_id uuid NOT NULL REFERENCES research_monev(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES stored_files(id) ON DELETE RESTRICT,
  category varchar(100) NOT NULL DEFAULT 'evidence',
  PRIMARY KEY (monev_id, file_id)
);

-- A funded research review is deliberately separate from report_reviews.
-- Reviewer scoring is advisory; report_reviews remains the management decision.
CREATE TABLE funded_review_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id uuid NOT NULL REFERENCES funded_research(id) ON DELETE CASCADE,
  target_type funded_review_target_type NOT NULL,
  monev_id uuid REFERENCES research_monev(id) ON DELETE CASCADE,
  report_id uuid REFERENCES research_reports(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  review_round integer NOT NULL DEFAULT 1 CHECK (review_round > 0),
  status reviewer_assignment_status_type NOT NULL DEFAULT 'assigned',
  assigned_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES users(id) ON DELETE SET NULL,
  revocation_reason text,
  CHECK (
    (target_type = 'monev' AND monev_id IS NOT NULL AND report_id IS NULL)
    OR
    (target_type = 'report' AND report_id IS NOT NULL AND monev_id IS NULL)
  )
);

CREATE UNIQUE INDEX funded_review_assignments_monev_reviewer_round_idx
  ON funded_review_assignments (monev_id, reviewer_id, review_round)
  WHERE monev_id IS NOT NULL;
CREATE UNIQUE INDEX funded_review_assignments_report_reviewer_round_idx
  ON funded_review_assignments (report_id, reviewer_id, review_round)
  WHERE report_id IS NOT NULL;
CREATE INDEX funded_review_assignments_reviewer_status_idx
  ON funded_review_assignments (reviewer_id, status, due_at);
CREATE INDEX funded_review_assignments_research_target_idx
  ON funded_review_assignments (research_id, target_type, assigned_at DESC);

CREATE TABLE funded_reviewer_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES funded_review_assignments(id) ON DELETE CASCADE,
  sent_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  channel varchar(20) NOT NULL DEFAULT 'both'
    CHECK (channel IN ('in_app', 'email', 'both')),
  message text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX funded_reviewer_reminders_assignment_sent_idx
  ON funded_reviewer_reminders (assignment_id, sent_at DESC);

CREATE TABLE funded_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL UNIQUE REFERENCES funded_review_assignments(id) ON DELETE CASCADE,
  recommendation review_recommendation_type NOT NULL,
  total_score numeric(6,2) NOT NULL CHECK (total_score BETWEEN 0 AND 100),
  substance_notes text NOT NULL,
  technical_notes text NOT NULL,
  follow_up_notes text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE funded_review_score_details (
  review_id uuid NOT NULL REFERENCES funded_reviews(id) ON DELETE CASCADE,
  criteria_code varchar(80) NOT NULL,
  criteria_label varchar(255) NOT NULL,
  criteria_group varchar(180) NOT NULL,
  weight numeric(6,2) NOT NULL CHECK (weight > 0 AND weight <= 100),
  score numeric(6,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  weighted_score numeric(8,4) NOT NULL CHECK (weighted_score BETWEEN 0 AND 100),
  notes text,
  PRIMARY KEY (review_id, criteria_code)
);

CREATE OR REPLACE VIEW temporary_role_assignments AS
SELECT
  id,
  reviewer_id AS user_id,
  'reviewer'::text AS role,
  'research_proposal'::text AS entity_type,
  draft_id AS entity_id,
  status::text,
  assigned_at,
  assigned_by,
  revoked_at
FROM reviewer_assignments
WHERE status IN ('assigned', 'in_progress', 'submitted')
UNION ALL
SELECT
  id,
  reviewer_id AS user_id,
  'reviewer'::text AS role,
  ('funded_' || target_type::text) AS entity_type,
  COALESCE(monev_id, report_id) AS entity_id,
  status::text,
  assigned_at,
  assigned_by,
  revoked_at
FROM funded_review_assignments
WHERE status IN ('assigned', 'in_progress', 'submitted');

CREATE TABLE research_logbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id uuid NOT NULL REFERENCES funded_research(id) ON DELETE CASCADE,
  activity_date date NOT NULL,
  start_time time,
  end_time time,
  description text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time IS NULL OR start_time IS NULL OR end_time >= start_time)
);

CREATE INDEX research_logbooks_research_date_idx
  ON research_logbooks (research_id, activity_date DESC);

CREATE TABLE logbook_files (
  logbook_id uuid NOT NULL REFERENCES research_logbooks(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES stored_files(id) ON DELETE RESTRICT,
  PRIMARY KEY (logbook_id, file_id)
);

-- ---------------------------------------------------------------------
-- Letter requests
-- ---------------------------------------------------------------------

CREATE TABLE letter_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  research_id uuid REFERENCES funded_research(id) ON DELETE SET NULL,
  letter_type varchar(80) NOT NULL,
  purpose varchar(120),
  custom_name varchar(240),
  status letter_status_type NOT NULL DEFAULT 'draft',
  auto_fill_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  letter_number varchar(180),
  generated_file_id uuid REFERENCES stored_files(id) ON DELETE SET NULL,
  generated_file_url text,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  submitted_at timestamptz,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  configured_at timestamptz,
  configured_by uuid REFERENCES users(id) ON DELETE SET NULL,
  data_submitted_at timestamptz,
  generated_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX letter_requests_number_unique_idx
  ON letter_requests (letter_number)
  WHERE letter_number IS NOT NULL;
CREATE INDEX letter_requests_owner_status_idx
  ON letter_requests (user_id, status, updated_at DESC);
CREATE INDEX letter_requests_status_idx
  ON letter_requests (status, submitted_at DESC);
CREATE INDEX letter_requests_research_idx
  ON letter_requests (research_id, created_at DESC);

ALTER TABLE letter_requests ADD CONSTRAINT letter_request_kind_check CHECK (
  (letter_type = 'custom' AND nullif(btrim(custom_name), '') IS NOT NULL AND purpose IS NULL)
  OR
  (letter_type <> 'custom' AND nullif(btrim(purpose), '') IS NOT NULL)
);

CREATE TABLE letter_applicants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id uuid NOT NULL REFERENCES letter_requests(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  name varchar(180) NOT NULL,
  identifier varchar(80),
  applicant_role varchar(120),
  applicant_kind varchar(80),
  status varchar(80),
  faculty varchar(180),
  study_program varchar(180),
  email varchar(320),
  is_primary boolean NOT NULL DEFAULT false,
  position smallint NOT NULL CHECK (position > 0),
  UNIQUE (letter_id, position)
);

CREATE UNIQUE INDEX letter_one_primary_applicant_idx
  ON letter_applicants (letter_id)
  WHERE is_primary;

CREATE TABLE letter_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id uuid NOT NULL REFERENCES letter_requests(id) ON DELETE CASCADE,
  file_type varchar(100) NOT NULL,
  category varchar(100) NOT NULL,
  file_id uuid NOT NULL REFERENCES stored_files(id) ON DELETE RESTRICT,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE letter_request_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id uuid NOT NULL UNIQUE REFERENCES letter_requests(id) ON DELETE CASCADE,
  template_name varchar(240) NOT NULL,
  content_template text NOT NULL,
  template_format varchar(20) NOT NULL DEFAULT 'txt'
    CHECK (template_format IN ('txt', 'html', 'docx', 'latex')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  configured_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  configured_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, letter_id)
);

CREATE TABLE letter_request_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES letter_request_templates(id) ON DELETE CASCADE,
  field_key varchar(120) NOT NULL,
  field_label varchar(240) NOT NULL,
  field_type varchar(30) NOT NULL
    CHECK (field_type IN ('text', 'textarea', 'number', 'date', 'datetime-local', 'email', 'select')),
  is_required boolean NOT NULL DEFAULT false,
  placeholder varchar(300),
  help_text text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(options) = 'array'),
  position smallint NOT NULL CHECK (position > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, template_id),
  UNIQUE (template_id, field_key),
  UNIQUE (template_id, position)
);

CREATE TABLE letter_request_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id uuid NOT NULL REFERENCES letter_requests(id) ON DELETE CASCADE,
  template_id uuid NOT NULL,
  field_id uuid NOT NULL,
  field_value jsonb NOT NULL DEFAULT 'null'::jsonb,
  submitted_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (template_id, letter_id) REFERENCES letter_request_templates(id, letter_id) ON DELETE CASCADE,
  FOREIGN KEY (field_id, template_id) REFERENCES letter_request_fields(id, template_id) ON DELETE CASCADE,
  UNIQUE (letter_id, field_id)
);

CREATE INDEX letter_request_values_letter_idx
  ON letter_request_values (letter_id, submitted_at DESC);

CREATE TABLE letter_prechecks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id uuid NOT NULL REFERENCES letter_requests(id) ON DELETE CASCADE,
  status varchar(30) NOT NULL CHECK (status IN ('passed', 'failed')),
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  checked_by uuid REFERENCES users(id) ON DELETE SET NULL,
  checked_by_system boolean NOT NULL DEFAULT false,
  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE letter_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id uuid NOT NULL REFERENCES letter_requests(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  decision varchar(40) NOT NULL
    CHECK (decision IN ('accepted', 'revision_required', 'approved', 'rejected', 'generated')),
  notes text,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE generated_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id uuid NOT NULL UNIQUE REFERENCES letter_requests(id) ON DELETE CASCADE,
  letter_number varchar(180) NOT NULL UNIQUE,
  file_id uuid REFERENCES stored_files(id) ON DELETE SET NULL,
  file_name varchar(255) NOT NULL,
  file_url text,
  content_snapshot text,
  generated_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE letter_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id uuid NOT NULL REFERENCES letter_requests(id) ON DELETE CASCADE,
  old_status letter_status_type,
  new_status letter_status_type NOT NULL,
  note text,
  changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- External research reports
-- ---------------------------------------------------------------------

CREATE TABLE external_research (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  activity_name varchar(240) NOT NULL,
  research_title text NOT NULL,
  activity_year smallint NOT NULL CHECK (activity_year BETWEEN 2000 AND 2200),
  activity_status varchar(40) NOT NULL
    CHECK (activity_status IN ('planned', 'ongoing', 'completed')),
  activity_type varchar(40) NOT NULL,
  role_in_research varchar(40) NOT NULL,
  organizer_origin varchar(220),
  funding_source varchar(220),
  funding_amount numeric(16,2) NOT NULL DEFAULT 0 CHECK (funding_amount >= 0),
  currency char(3) NOT NULL DEFAULT 'IDR',
  submission_status external_research_status_type NOT NULL DEFAULT 'draft',
  category varchar(80) NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  archive_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  type_detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  review_notes text,
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  submitted_at timestamptz,
  validated_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX external_research_owner_status_idx
  ON external_research (user_id, submission_status, updated_at DESC);
CREATE INDEX external_research_status_idx
  ON external_research (submission_status, submitted_at DESC);

CREATE TABLE external_research_sdgs (
  external_research_id uuid NOT NULL REFERENCES external_research(id) ON DELETE CASCADE,
  sdg_id smallint NOT NULL REFERENCES sdg_goals(id),
  PRIMARY KEY (external_research_id, sdg_id)
);

CREATE TABLE external_research_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_research_id uuid NOT NULL REFERENCES external_research(id) ON DELETE CASCADE,
  output_type varchar(80) NOT NULL,
  title varchar(240) NOT NULL,
  year smallint CHECK (year BETWEEN 2000 AND 2200),
  description text,
  link text,
  file_id uuid REFERENCES stored_files(id) ON DELETE SET NULL,
  position smallint NOT NULL CHECK (position > 0),
  UNIQUE (external_research_id, position)
);

CREATE TABLE external_research_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_research_id uuid NOT NULL REFERENCES external_research(id) ON DELETE CASCADE,
  file_type varchar(100) NOT NULL,
  file_id uuid NOT NULL REFERENCES stored_files(id) ON DELETE RESTRICT,
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE external_research_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_research_id uuid NOT NULL REFERENCES external_research(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  decision external_research_status_type NOT NULL
    CHECK (decision IN ('revision_requested', 'validated')),
  notes text,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE external_research_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_research_id uuid NOT NULL REFERENCES external_research(id) ON DELETE CASCADE,
  old_status external_research_status_type,
  new_status external_research_status_type NOT NULL,
  note text,
  changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Notifications, email queue, idempotency, and audit trail
-- ---------------------------------------------------------------------

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  notification_type varchar(100) NOT NULL,
  priority notification_priority_type NOT NULL DEFAULT 'normal',
  title varchar(220) NOT NULL,
  message text NOT NULL,
  entity_type varchar(100),
  entity_id uuid,
  research_id uuid REFERENCES funded_research(id) ON DELETE CASCADE,
  action_path text,
  action_label varchar(100),
  manager_mode varchar(20),
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_manager_mode_check
    CHECK (manager_mode IS NULL OR manager_mode IN ('management', 'lecturer')),
  CONSTRAINT notifications_read_state_check
    CHECK ((is_read = false AND read_at IS NULL) OR is_read = true)
);

CREATE INDEX notifications_user_unread_idx
  ON notifications (user_id, is_read, created_at DESC);
CREATE INDEX notifications_entity_idx
  ON notifications (entity_type, entity_id);

CREATE TABLE email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  recipient_email varchar(320) NOT NULL,
  subject varchar(240) NOT NULL,
  body_text text,
  body_html text,
  template_key varchar(100),
  notification_type varchar(100) NOT NULL,
  entity_type varchar(100),
  entity_id uuid,
  action_path text,
  priority notification_priority_type NOT NULL DEFAULT 'normal',
  delivery_mode varchar(20) NOT NULL DEFAULT 'immediate',
  deduplication_key varchar(500) NOT NULL UNIQUE,
  source_event_id varchar(255),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status outbox_status_type NOT NULL DEFAULT 'queued',
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  sent_at timestamptz,
  error_message text,
  provider varchar(40),
  provider_message_id varchar(500),
  last_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_outbox_delivery_mode_check
    CHECK (delivery_mode IN ('immediate', 'digest'))
);

CREATE INDEX email_outbox_delivery_idx
  ON email_outbox (status, available_at, created_at)
  WHERE status IN ('queued', 'failed');
CREATE INDEX email_outbox_recipient_idx
  ON email_outbox (recipient_user_id, created_at DESC);
CREATE INDEX email_outbox_digest_idx
  ON email_outbox (delivery_mode, available_at)
  WHERE status = 'queued';

CREATE TABLE idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  operation varchar(100) NOT NULL,
  idempotency_key varchar(180) NOT NULL,
  request_hash varchar(64) NOT NULL,
  response_status smallint,
  response_body jsonb,
  locked_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, operation, idempotency_key)
);

CREATE TABLE system_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id varchar(180),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action varchar(120) NOT NULL,
  entity_type varchar(100) NOT NULL,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX system_activity_logs_entity_idx
  ON system_activity_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX system_activity_logs_user_idx
  ON system_activity_logs (user_id, created_at DESC);
CREATE INDEX system_activity_logs_request_idx
  ON system_activity_logs (request_id)
  WHERE request_id IS NOT NULL;

-- Views used by the archive UI.
CREATE VIEW research_archive_view AS
SELECT
  'internal'::text AS source,
  d.id,
  p.title,
  d.status::text AS status,
  d.user_id AS owner_user_id,
  s.year,
  s.name AS context,
  p.metadata,
  d.archive_metadata,
  d.archived_at,
  GREATEST(
    d.updated_at,
    (SELECT max(m.updated_at) FROM research_monev m WHERE m.research_id = d.id),
    (SELECT max(r.updated_at) FROM research_reports r WHERE r.research_id = d.id),
    (SELECT max(l.updated_at) FROM research_logbooks l WHERE l.research_id = d.id),
    (SELECT max(a.assigned_at) FROM funded_review_assignments a WHERE a.research_id = d.id),
    (SELECT max(v.submitted_at) FROM funded_reviews v JOIN funded_review_assignments a ON a.id = v.assignment_id WHERE a.research_id = d.id)
  ) AS updated_at,
  (SELECT count(*) FROM draft_members m WHERE m.draft_id = d.id) AS members_count,
  (SELECT count(*) FROM draft_outputs o WHERE o.draft_id = d.id) AS outputs_count,
  (SELECT count(*) FROM draft_files f WHERE f.draft_id = d.id) AS attachments_count,
  (SELECT count(*) FROM reviewer_assignments a WHERE a.draft_id = d.id) AS reviewer_assignment_count,
  (SELECT count(*) FROM submission_reviews v JOIN reviewer_assignments a ON a.id = v.assignment_id WHERE a.draft_id = d.id) AS review_count,
  COALESCE((SELECT c.status::text FROM research_contracts c WHERE c.research_id = d.id), 'unavailable') AS contract_status,
  (SELECT count(*) FROM research_monev m WHERE m.research_id = d.id) AS monev_count,
  (SELECT count(*) FROM research_reports r WHERE r.research_id = d.id) AS report_count,
  (SELECT count(*) FROM funded_review_assignments a WHERE a.research_id = d.id) AS funded_reviewer_assignment_count,
  (SELECT count(*) FROM funded_reviews v JOIN funded_review_assignments a ON a.id = v.assignment_id WHERE a.research_id = d.id) AS funded_review_count,
  (SELECT count(*) FROM research_logbooks l WHERE l.research_id = d.id) AS logbook_count
FROM research_drafts d
JOIN draft_projects p ON p.draft_id = d.id
JOIN schemes s ON s.id = d.scheme_id
UNION ALL
SELECT
  'external'::text AS source,
  er.id,
  er.research_title AS title,
  er.submission_status::text AS status,
  er.user_id AS owner_user_id,
  er.activity_year AS year,
  COALESCE(er.category, er.activity_type) AS context,
  er.metadata,
  er.archive_metadata,
  er.archived_at,
  GREATEST(er.updated_at, (SELECT max(h.changed_at) FROM external_research_history h WHERE h.external_research_id = er.id)) AS updated_at,
  0::bigint AS members_count,
  (SELECT count(*) FROM external_research_outputs o WHERE o.external_research_id = er.id) AS outputs_count,
  (SELECT count(*) FROM external_research_files f WHERE f.external_research_id = er.id) AS attachments_count,
  0::bigint AS reviewer_assignment_count,
  (SELECT count(*) FROM external_research_reviews v WHERE v.external_research_id = er.id) AS review_count,
  'unavailable'::text AS contract_status,
  0::bigint AS monev_count,
  0::bigint AS report_count,
  0::bigint AS funded_reviewer_assignment_count,
  0::bigint AS funded_review_count,
  0::bigint AS logbook_count
FROM external_research er;

CREATE VIEW user_archive_view AS
SELECT
  u.id,
  u.email,
  u.name,
  u.role,
  u.is_active,
  u.deactivation_reason,
  u.deactivated_at,
  rp.id AS profile_id,
  rp.nidn,
  rp.faculty,
  rp.study_program,
  rp.profile_status,
  rp.verification_status,
  rp.completeness,
  COALESCE((SELECT array_agg(s.scope::text ORDER BY s.scope::text) FROM user_admin_scopes s WHERE s.user_id = u.id), ARRAY[]::text[]) AS admin_scopes,
  (SELECT count(*) FROM researcher_documents d WHERE d.profile_id = rp.id AND d.is_active = true) AS profile_document_count,
  (SELECT count(*) FROM researcher_expertise_map e WHERE e.profile_id = rp.id) AS expertise_count,
  (SELECT count(*) FROM researcher_verifications v WHERE v.profile_id = rp.id) AS verification_history_count,
  (SELECT count(*) FROM researcher_status_history h WHERE h.profile_id = rp.id) AS status_history_count,
  (SELECT a.admin_id FROM admin_assignments a WHERE a.profile_id = rp.id ORDER BY a.assigned_at DESC LIMIT 1) AS assigned_admin_id,
  (SELECT count(*) FROM research_drafts d WHERE d.user_id = u.id) AS internal_research_count,
  (SELECT count(DISTINCT m.draft_id) FROM draft_members m JOIN research_drafts d ON d.id = m.draft_id WHERE d.user_id <> u.id AND (m.user_id = u.id OR m.profile_id = rp.id)) AS member_research_count,
  (SELECT count(*) FROM external_research e WHERE e.user_id = u.id) AS external_research_count,
  (SELECT count(*) FROM letter_requests l WHERE l.user_id = u.id OR l.created_by = u.id) AS letter_request_count,
  (SELECT count(*) FROM reviewer_assignments a WHERE a.reviewer_id = u.id) AS proposal_reviewer_assignment_count,
  (SELECT count(*) FROM funded_review_assignments a WHERE a.reviewer_id = u.id) AS funded_reviewer_assignment_count,
  (SELECT count(*) FROM temporary_role_assignments t WHERE t.user_id = u.id) AS active_temporary_role_count,
  GREATEST(u.updated_at, rp.updated_at) AS updated_at
FROM users u
LEFT JOIN researcher_profiles rp ON rp.user_id = u.id;

-- Automatically maintain updated_at on mutable tables.
DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'users',
    'researcher_profiles',
    'applicant_profiles',
    'schemes',
    'scheme_output_options',
    'scheme_attachment_requirements',
    'scheme_reporting_periods',
    'research_drafts',
    'draft_projects',
    'draft_budget_items',
    'draft_outputs',
    'submission_reviews',
    'funded_research',
    'research_contracts',
    'research_reports',
    'research_monev',
    'funded_reviews',
    'research_logbooks',
    'letter_requests',
    'letter_request_templates',
    'letter_request_fields',
    'letter_request_values',
    'external_research',
    'email_outbox'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I_set_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      target_table,
      target_table
    );
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------
-- Static lookup seed. This is used by both demo and deployment seeds.
-- ---------------------------------------------------------------------

INSERT INTO roles (code, name, description) VALUES
  ('super_admin', 'Super Admin', 'Akses penuh ke seluruh fungsi sistem.'),
  ('manager', 'Manager LPPM', 'Akses manajemen penuh dan kemampuan sebagai lecturer.'),
  ('admin', 'Admin', 'Akses dibatasi oleh cakupan tugas yang diberikan.'),
  ('lecturer', 'Lecturer', 'Pengaju dan pelaksana penelitian.');

INSERT INTO admin_scopes (code, name, description) VALUES
  ('research_management', 'Manajemen Penelitian', 'Skema, proposal, reviewer, keputusan, kontrak, dan laporan.'),
  ('letter_management', 'Pengajuan Surat', 'Verifikasi, persetujuan, dan penerbitan surat.'),
  ('researcher_profile_management', 'Informasi Peneliti', 'Akun, profil, verifikasi, dan status pengguna.');

INSERT INTO sdg_goals (id, name) VALUES
  (1, 'No Poverty'),
  (2, 'Zero Hunger'),
  (3, 'Good Health and Well-being'),
  (4, 'Quality Education'),
  (5, 'Gender Equality'),
  (6, 'Clean Water and Sanitation'),
  (7, 'Affordable and Clean Energy'),
  (8, 'Decent Work and Economic Growth'),
  (9, 'Industry, Innovation and Infrastructure'),
  (10, 'Reduced Inequalities'),
  (11, 'Sustainable Cities and Communities'),
  (12, 'Responsible Consumption and Production'),
  (13, 'Climate Action'),
  (14, 'Life Below Water'),
  (15, 'Life on Land'),
  (16, 'Peace, Justice and Strong Institutions'),
  (17, 'Partnerships for the Goals');

INSERT INTO budget_categories (code, name, position) VALUES
  ('materials', 'Bahan dan Peralatan', 1),
  ('field', 'Pengumpulan Data', 2),
  ('analysis', 'Analisis Data', 3),
  ('reporting', 'Pelaporan Hasil Penelitian dan Luaran Wajib', 4);

INSERT INTO review_criteria (code, name, category, weight, position) VALUES
  ('kejelasan_masalah', 'Kejelasan masalah', 'Kualitas Proposal (30%)', 10, 1),
  ('kebaruan_penelitian', 'Kebaruan penelitian', 'Kualitas Proposal (30%)', 10, 2),
  ('metodologi', 'Metodologi', 'Kualitas Proposal (30%)', 10, 3),
  ('kompetensi_ketua', 'Kompetensi ketua', 'Kelayakan Tim (15%)', 8, 4),
  ('komposisi_tim', 'Komposisi tim', 'Kelayakan Tim (15%)', 7, 5),
  ('kesesuaian_luaran', 'Kesesuaian Luaran Wajib', 'Luaran Penelitian (20%)', 10, 6),
  ('realisme_target', 'Realisme Target', 'Luaran Penelitian (20%)', 10, 7),
  ('kewajaran_biaya', 'Kewajaran Biaya', 'Anggaran (20%)', 10, 8),
  ('kesesuaian_kegiatan', 'Kesesuaian dengan Kegiatan', 'Anggaran (20%)', 10, 9),
  ('rip', 'RIP', 'Kesesuaian Strategis (15%)', 5, 10),
  ('sdg', 'SDG', 'Kesesuaian Strategis (15%)', 5, 11),
  ('research_center', 'Research Center', 'Kesesuaian Strategis (15%)', 5, 12);

INSERT INTO researcher_expertise (id, name) VALUES
  ('11000000-0000-4000-8000-000000000001', 'Artificial Intelligence'),
  ('11000000-0000-4000-8000-000000000002', 'Machine Learning'),
  ('11000000-0000-4000-8000-000000000003', 'Computer Vision'),
  ('11000000-0000-4000-8000-000000000004', 'Sistem Informasi'),
  ('11000000-0000-4000-8000-000000000005', 'Data Science'),
  ('11000000-0000-4000-8000-000000000006', 'Digital Business');

-- =====================================================================
-- SEED A: DEMO DATA (ACTIVE)
-- Password for every demo account is: password
-- This seed mirrors the scenarios available in the current frontend.
-- =====================================================================

INSERT INTO users (
  id, email, password_hash, name, role, is_active, applicant_enabled,
  default_mode, identifier, created_by, created_at, updated_at
) VALUES
  ('00000000-0000-4000-8000-000000000001', 'superadmin@umn.ac.id', crypt('password', gen_salt('bf', 12)), 'Super Admin RIS', 'super_admin', true, false, 'management', 'SADM-RIS-001', NULL, '2026-06-01', '2026-06-01'),
  ('00000000-0000-4000-8000-000000000002', 'manager@umn.ac.id', crypt('password', gen_salt('bf', 12)), 'Manager LPPM', 'manager', true, true, 'management', 'MGR-LPPM-001', '00000000-0000-4000-8000-000000000001', '2026-06-01', '2026-06-01'),
  ('00000000-0000-4000-8000-000000000003', 'admin.penelitian@umn.ac.id', crypt('password', gen_salt('bf', 12)), 'Admin Penelitian', 'admin', true, false, NULL, 'ADM-RIS-001', '00000000-0000-4000-8000-000000000001', '2026-06-01', '2026-06-01'),
  ('00000000-0000-4000-8000-000000000004', 'admin.surat@umn.ac.id', crypt('password', gen_salt('bf', 12)), 'Admin Pengajuan Surat', 'admin', true, false, NULL, 'ADM-SRT-001', '00000000-0000-4000-8000-000000000001', '2026-06-01', '2026-06-01'),
  ('00000000-0000-4000-8000-000000000005', 'admin.profil@umn.ac.id', crypt('password', gen_salt('bf', 12)), 'Admin Informasi Peneliti', 'admin', true, false, NULL, 'ADM-PRF-001', '00000000-0000-4000-8000-000000000001', '2026-06-01', '2026-06-01'),
  ('00000000-0000-4000-8000-000000000006', 'lecturer@umn.ac.id', crypt('password', gen_salt('bf', 12)), 'Dr. Budi Santoso', 'lecturer', true, true, 'lecturer', '0312048501', '00000000-0000-4000-8000-000000000003', '2026-01-10', '2026-06-05'),
  ('00000000-0000-4000-8000-000000000007', 'reviewer@umn.ac.id', crypt('password', gen_salt('bf', 12)), 'Dr. Andini Prameswari', 'lecturer', true, true, 'lecturer', '0308078602', '00000000-0000-4000-8000-000000000003', '2026-01-11', '2026-06-12'),
  ('00000000-0000-4000-8000-000000000008', 'rizky@umn.ac.id', crypt('password', gen_salt('bf', 12)), 'Rizky Kurniawan, M.T.', 'lecturer', true, true, 'lecturer', '0321019003', '00000000-0000-4000-8000-000000000003', '2026-02-01', '2026-06-15'),
  ('00000000-0000-4000-8000-000000000009', 'nadia@umn.ac.id', crypt('password', gen_salt('bf', 12)), 'Dr. Nadia Kusuma', 'lecturer', true, true, 'lecturer', '0317098804', '00000000-0000-4000-8000-000000000003', '2026-01-20', '2026-05-10');

INSERT INTO user_admin_scopes (user_id, scope, assigned_by) VALUES
  ('00000000-0000-4000-8000-000000000003', 'research_management', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000004', 'letter_management', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000005', 'researcher_profile_management', '00000000-0000-4000-8000-000000000001');

INSERT INTO researcher_profiles (
  id, user_id, full_name, front_title, back_title, nidn, nik, nip,
  birth_place, birth_date, gender, institution_email, alternate_email,
  phone_number, domicile_address, correspondence_address, faculty,
  study_program, unit, position, functional_position, education_level,
  employment_status, orcid, google_scholar, sinta_id, sinta_score,
  research_count, last_research_year, bank_name, bank_account_number,
  bank_account_name, emergency_contact_name, emergency_contact_relation,
  emergency_contact_phone, profile_status, verification_status, completeness,
  last_updated_by, created_at, updated_at
) VALUES
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Super Admin RIS', NULL, NULL, 'SADM-RIS-001', NULL, 'SADM001', 'Tangerang', NULL, NULL, 'superadmin@umn.ac.id', NULL, NULL, NULL, 'Universitas Multimedia Nusantara', 'LPPM', 'Manajemen Sistem Riset', 'LPPM', 'Super Admin', 'Super Administrator', NULL, 'fulltime', NULL, NULL, NULL, 0, 0, 2026, NULL, NULL, NULL, NULL, NULL, NULL, 'active', 'verified', 85, '00000000-0000-4000-8000-000000000001', '2026-06-01', '2026-06-01'),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'Kepala LPPM', NULL, NULL, 'MGR-LPPM-001', '3671010101880006', 'MGR001', 'Tangerang', '1988-01-01', 'Laki-laki', 'manager@umn.ac.id', NULL, '081200000002', 'Tangerang', 'Universitas Multimedia Nusantara', 'LPPM', 'Manajemen Riset', 'LPPM', 'Kepala LPPM', 'Manager', 'S3', 'fulltime', NULL, NULL, NULL, 0, 0, 2026, NULL, NULL, NULL, NULL, NULL, NULL, 'active', 'verified', 90, '00000000-0000-4000-8000-000000000002', '2026-06-01', '2026-06-01'),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003', 'Admin Penelitian', NULL, NULL, 'ADM-RIS-001', '3671010101900005', 'ADM001', 'Tangerang', '1990-01-01', 'Laki-laki', 'admin.penelitian@umn.ac.id', NULL, '081200000001', 'Tangerang', 'Universitas Multimedia Nusantara', 'LPPM', 'Administrasi Riset', 'LPPM', 'Admin Penelitian', 'Administrator', NULL, 'fulltime', NULL, NULL, NULL, 0, 0, 2026, NULL, NULL, NULL, NULL, NULL, NULL, 'active', 'verified', 90, '00000000-0000-4000-8000-000000000002', '2026-06-01', '2026-06-01'),
  ('10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000004', 'Admin Pengajuan Surat', NULL, NULL, 'ADM-SRT-001', NULL, 'ADMSRT001', NULL, NULL, NULL, 'admin.surat@umn.ac.id', NULL, NULL, NULL, 'Universitas Multimedia Nusantara', 'LPPM', 'Administrasi Riset', 'LPPM', 'Admin Pengajuan Surat', 'Administrator', NULL, 'fulltime', NULL, NULL, NULL, 0, 0, 2026, NULL, NULL, NULL, NULL, NULL, NULL, 'active', 'verified', 75, '00000000-0000-4000-8000-000000000002', '2026-06-01', '2026-06-01'),
  ('10000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000005', 'Admin Informasi Peneliti', NULL, NULL, 'ADM-PRF-001', NULL, 'ADMPRF001', NULL, NULL, NULL, 'admin.profil@umn.ac.id', NULL, NULL, NULL, 'Universitas Multimedia Nusantara', 'LPPM', 'Administrasi Riset', 'LPPM', 'Admin Informasi Peneliti', 'Administrator', NULL, 'fulltime', NULL, NULL, NULL, 0, 0, 2026, NULL, NULL, NULL, NULL, NULL, NULL, 'active', 'verified', 75, '00000000-0000-4000-8000-000000000002', '2026-06-01', '2026-06-01'),
  ('10000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000006', 'Budi Santoso', 'Dr.', NULL, '0312048501', '3671010101850001', '201203001', 'Jakarta', '1985-12-04', 'Laki-laki', 'lecturer@umn.ac.id', 'budi.santoso@example.com', '081234567890', 'Tangerang', 'Tangerang', 'Teknik dan Informatika', 'Sistem Informasi', 'LPPM', 'Dosen Fulltime', 'Lektor', 'S3', 'fulltime', '0000000218250097', 'https://scholar.google.com/citations?user=budi', '612001', 612, 14, 2026, 'BCA', '1234567890', 'Budi Santoso', 'Dewi Santoso', 'Istri', '081299988877', 'active', 'verified', 100, '00000000-0000-4000-8000-000000000003', '2026-01-10', '2026-06-05'),
  ('10000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000007', 'Andini Prameswari', 'Dr.', NULL, '0308078602', '3671010807860002', '201108002', 'Bandung', '1986-07-08', 'Perempuan', 'reviewer@umn.ac.id', NULL, '081233344455', 'Tangerang Selatan', 'Tangerang Selatan', 'Teknik dan Informatika', 'Informatika', 'Fakultas Teknik dan Informatika', 'Dosen Homebase', 'Lektor Kepala', 'S3', 'homebase', '0000000319261188', 'https://scholar.google.com/citations?user=andini', '780002', 780, 20, 2026, 'Mandiri', '9876543210', 'Andini Prameswari', 'Raka Prameswara', 'Suami', '081277766655', 'active', 'pending', 95, '00000000-0000-4000-8000-000000000007', '2026-01-11', '2026-06-12'),
  ('10000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000008', 'Rizky Kurniawan', NULL, 'M.T.', '0321019003', NULL, NULL, NULL, NULL, 'Laki-laki', 'rizky@umn.ac.id', NULL, '081211122233', NULL, NULL, 'Teknik dan Informatika', 'Teknik Komputer', NULL, 'Dosen Fulltime', 'Asisten Ahli', 'S2', 'fulltime', NULL, NULL, NULL, 388, 7, 2025, NULL, NULL, NULL, NULL, NULL, NULL, 'draft', 'pending', 45, '00000000-0000-4000-8000-000000000008', '2026-02-01', '2026-06-15'),
  ('10000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000009', 'Nadia Kusuma', 'Dr.', NULL, '0317098804', '3671011709880004', '201407004', 'Surabaya', '1988-09-17', 'Perempuan', 'nadia@umn.ac.id', NULL, '081266655544', 'Jakarta Barat', 'Jakarta Barat', 'Bisnis', 'Manajemen', 'Fakultas Bisnis', 'Dosen Homebase', 'Lektor', 'S3', 'homebase', NULL, 'https://scholar.google.com/citations?user=nadia', '540004', 540, 11, 2026, 'BNI', '7654321000', 'Nadia Kusuma', 'Ari Kusuma', 'Saudara', '081255544433', 'active', 'unverified', 90, '00000000-0000-4000-8000-000000000009', '2026-01-20', '2026-05-10');

INSERT INTO researcher_expertise_map (profile_id, expertise_id, is_primary) VALUES
  ('10000000-0000-4000-8000-000000000006', '11000000-0000-4000-8000-000000000004', true),
  ('10000000-0000-4000-8000-000000000006', '11000000-0000-4000-8000-000000000001', false),
  ('10000000-0000-4000-8000-000000000007', '11000000-0000-4000-8000-000000000002', true),
  ('10000000-0000-4000-8000-000000000008', '11000000-0000-4000-8000-000000000003', true),
  ('10000000-0000-4000-8000-000000000009', '11000000-0000-4000-8000-000000000006', true);

INSERT INTO researcher_verifications (
  profile_id, status, notes, verified_by, verified_at, created_at
) VALUES
  ('10000000-0000-4000-8000-000000000006', 'verified', 'Profil lengkap dan terverifikasi.', '00000000-0000-4000-8000-000000000003', '2026-06-05 10:00+07', '2026-06-05 10:00+07'),
  ('10000000-0000-4000-8000-000000000007', 'pending', 'Menunggu pemeriksaan admin profil.', NULL, NULL, '2026-06-12 10:00+07'),
  ('10000000-0000-4000-8000-000000000008', 'pending', 'Profil belum lengkap.', NULL, NULL, '2026-06-15 10:00+07');

INSERT INTO applicant_profiles (
  id, user_id, name, identifier, applicant_role, applicant_kind, status,
  faculty, study_program, email
)
SELECT
  rp.id,
  rp.user_id,
  u.name,
  rp.nidn,
  CASE WHEN rp.employment_status = 'homebase' THEN 'Dosen Homebase' ELSE 'Dosen Fulltime' END,
  'lecturer',
  rp.employment_status,
  rp.faculty,
  rp.study_program,
  u.email
FROM researcher_profiles rp
JOIN users u ON u.id = rp.user_id
WHERE u.role IN ('lecturer', 'manager');

-- Student is retained only as an applicant/member data type, not as an account role.
INSERT INTO applicant_profiles (
  id, user_id, name, identifier, applicant_role, applicant_kind, status,
  faculty, study_program, email
) VALUES
  ('13000000-0000-4000-8000-000000000001', NULL, 'Ayu Larasati', '00000078910', 'Mahasiswa S1', 'student_s1', 'active', 'Teknik dan Informatika', 'Informatika', 'student@umn.ac.id'),
  ('13000000-0000-4000-8000-000000000002', NULL, 'Michael Tan', '00000081234', 'Mahasiswa S2', 'student_s2', 'active', 'Teknik dan Informatika', 'Magister Teknologi Informasi', 'michael.tan@student.umn.ac.id');

INSERT INTO previous_ethics_clearances (
  id, user_id, applicant_name, clearance_number, research_title, issued_at, expiry_date
) VALUES (
  '12000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000006',
  'Dr. Budi Santoso',
  '001/KE-RIS/LPPM/01/2026',
  'Studi Interaksi Pengguna pada Sistem Pembelajaran Digital',
  '2026-01-20',
  '2026-07-20'
);

INSERT INTO stored_files (
  id, owner_user_id, storage_provider, storage_key, file_url, original_name,
  mime_type, extension, size_bytes, status, uploaded_at
) VALUES
  ('90000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'demo', 'demo/funding/surat-penetapan.pdf', 'mock://funding/surat-penetapan.pdf', 'surat-penetapan-pendanaan-draft-approved.pdf', 'application/pdf', 'pdf', 524288, 'ready', '2026-05-12 11:00+07'),
  ('90000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'demo', 'demo/contracts/template-kontrak.pdf', 'mock://contracts/template-kontrak.pdf', 'template-kontrak.pdf', 'application/pdf', 'pdf', 786432, 'ready', '2026-05-12 11:00+07'),
  ('90000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000006', 'demo', 'demo/reports/laporan-sementara-periode-1.pdf', 'mock://reports/laporan-sementara-periode-1.pdf', 'laporan-sementara-periode-1.pdf', 'application/pdf', 'pdf', 1258291, 'ready', '2026-07-20 15:00+07'),
  ('90000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000006', 'demo', 'demo/monev/bukti-monev-periode-1.pdf', 'mock://monev/bukti-monev-periode-1.pdf', 'bukti-monev-periode-1.pdf', 'application/pdf', 'pdf', 786432, 'ready', '2026-07-18 15:00+07'),
  ('90000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000006', 'demo', 'demo/letters/surat-permohonan-wawancara.pdf', 'mock://letters/surat-permohonan-wawancara.pdf', 'surat-permohonan-wawancara.pdf', 'application/pdf', 'pdf', 524288, 'ready', '2026-06-20 09:10+07'),
  ('90000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000006', 'demo', 'demo/letters/artikel-ris.pdf', 'mock://letters/artikel-ris.pdf', 'artikel-ris.pdf', 'application/pdf', 'pdf', 1048576, 'ready', '2026-06-12 09:10+07'),
  ('90000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000006', 'demo', 'demo/letters/loa.pdf', 'mock://letters/loa.pdf', 'loa.pdf', 'application/pdf', 'pdf', 262144, 'ready', '2026-06-12 09:10+07'),
  ('90000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000006', 'demo', 'demo/external/proposal-hibah.pdf', 'mock://external/proposal-hibah.pdf', 'proposal-hibah.pdf', 'application/pdf', 'pdf', 1200000, 'ready', '2026-06-03 09:00+07'),
  ('90000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000006', 'demo', 'demo/external/rab-hibah.xlsx', 'mock://external/rab-hibah.xlsx', 'rab-hibah.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx', 350000, 'ready', '2026-06-03 09:00+07'),
  ('90000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000006', 'demo', 'demo/external/kontrak-hibah.pdf', 'mock://external/kontrak-hibah.pdf', 'kontrak-hibah.pdf', 'application/pdf', 'pdf', 500000, 'ready', '2026-06-03 09:00+07'),
  ('90000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000006', 'demo', 'demo/external/laporan-akhir-prostep.pdf', 'mock://external/laporan-akhir-prostep.pdf', 'laporan-akhir-prostep.pdf', 'application/pdf', 'pdf', 1800000, 'ready', '2025-12-12 09:00+07'),
  ('90000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000003', 'demo', 'demo/schemes/digital-learning/template-proposal.doc', 'mock://schemes/digital-learning/template-proposal.doc', 'template-proposal-penelitian.doc', 'application/msword', 'doc', 24576, 'ready', '2026-07-01 08:00+07'),
  ('90000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000003', 'demo', 'demo/schemes/digital-learning/template-rab.xls', 'mock://schemes/digital-learning/template-rab.xls', 'template-rab-penelitian.xls', 'application/vnd.ms-excel', 'xls', 18432, 'ready', '2026-07-01 08:00+07'),
  ('90000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000003', 'demo', 'demo/schemes/digital-learning/template-surat-pernyataan-ketua.doc', 'mock://schemes/digital-learning/template-surat-pernyataan-ketua.doc', 'template-surat-pernyataan-ketua.doc', 'application/msword', 'doc', 24576, 'ready', '2026-07-01 08:00+07'),
  ('90000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000003', 'demo', 'demo/schemes/digital-learning/template-surat-kesediaan-mitra.doc', 'mock://schemes/digital-learning/template-surat-kesediaan-mitra.doc', 'template-surat-kesediaan-mitra.doc', 'application/msword', 'doc', 24576, 'ready', '2026-07-01 08:00+07'),
  ('90000000-0000-4000-8000-000000000016', '00000000-0000-4000-8000-000000000003', 'demo', 'demo/schemes/digital-learning/template-pakta-integritas.doc', 'mock://schemes/digital-learning/template-pakta-integritas.doc', 'template-pakta-integritas.doc', 'application/msword', 'doc', 24576, 'ready', '2026-07-01 08:00+07'),
  ('90000000-0000-4000-8000-000000000017', '00000000-0000-4000-8000-000000000003', 'demo', 'demo/schemes/digital-learning/template-biodata-tim.doc', 'mock://schemes/digital-learning/template-biodata-tim.doc', 'template-biodata-tim-peneliti.doc', 'application/msword', 'doc', 24576, 'ready', '2026-07-01 08:00+07');

INSERT INTO schemes (
  id, name, description, start_date, end_date, registration_start_at,
  registration_end_at, year, maximum_budget, status, filters, created_by,
  published_at, created_at, updated_at
) VALUES
  ('20000000-0000-4000-8000-000000000001', 'Penelitian Dosen Pemula 2026', 'Pendanaan penelitian internal bagi dosen yang sedang membangun rekam jejak penelitian.', '2026-07-01', '2027-06-30', '2026-01-01 08:00+07', '2026-12-31 23:59+07', 2026, 25000000, 'open', '{}', '00000000-0000-4000-8000-000000000003', '2026-01-01 08:00+07', '2026-01-01', '2026-07-01'),
  ('20000000-0000-4000-8000-000000000002', 'Hibah Penelitian Kompetitif Internal', 'Skema penelitian kompetitif untuk menghasilkan publikasi dan inovasi unggulan.', '2026-08-01', '2027-07-31', '2026-02-01 08:00+07', '2026-11-30 23:59+07', 2026, 75000000, 'open', '{}', '00000000-0000-4000-8000-000000000003', '2026-02-01 08:00+07', '2026-02-01', '2026-07-01'),
  ('20000000-0000-4000-8000-000000000003', 'Penelitian Kerjasama Industri', 'Penelitian kolaboratif bersama mitra industri strategis.', '2026-09-01', '2027-08-31', '2026-03-01 08:00+07', '2026-10-31 23:59+07', 2026, 150000000, 'open', '{}', '00000000-0000-4000-8000-000000000003', '2026-03-01 08:00+07', '2026-03-01', '2026-07-01'),
  ('20000000-0000-4000-8000-000000000004', 'Skema Demo Luaran Fleksibel 2026', 'Skema terbuka untuk mencoba pemilihan beberapa luaran wajib dan luaran tambahan pada proposal.', '2026-09-01', '2027-08-31', '2026-07-01 08:00+07', '2026-12-31 23:59+07', 2026, 50000000, 'open', '{}', '00000000-0000-4000-8000-000000000003', '2026-07-01 08:00+07', '2026-07-01', '2026-07-01'),
  ('20000000-0000-4000-8000-000000000005', 'Hibah Transformasi Pembelajaran Digital 2026', 'Pendanaan riset terapan untuk meningkatkan kualitas pembelajaran melalui teknologi digital yang terukur.', '2026-10-01', '2027-09-30', '2026-07-01 08:00+07', '2026-12-31 23:59+07', 2026, 65000000, 'open', '{}', '00000000-0000-4000-8000-000000000003', '2026-07-01 08:00+07', '2026-07-01', '2026-07-01'),
  ('20000000-0000-4000-8000-000000000006', 'Hibah Strategis Bisnis Berkelanjutan 2026', 'Skema kolaboratif untuk menghasilkan model keberlanjutan dan rekomendasi industri.', '2026-11-01', '2027-10-31', '2026-07-01 08:00+07', '2026-12-31 23:59+07', 2026, 90000000, 'open', '{}', '00000000-0000-4000-8000-000000000003', '2026-07-01 08:00+07', '2026-07-01', '2026-07-01'),
  ('20000000-0000-4000-8000-000000000007', 'Hibah Inovasi Pembelajaran Berkelanjutan 2026', 'Pendanaan penelitian kolaboratif untuk menghasilkan inovasi pembelajaran yang terukur, inklusif, dan dapat diterapkan secara berkelanjutan.', '2026-11-01', '2027-10-31', '2026-08-01 08:00+07', '2026-12-31 23:59+07', 2026, 80000000, 'open', '{}', '00000000-0000-4000-8000-000000000003', '2026-08-01 08:00+07', '2026-08-01', '2026-08-01');

INSERT INTO scheme_eligible_users (scheme_id, user_id)
SELECT s.id, u.id
FROM schemes s
CROSS JOIN users u
WHERE s.id IN (
    '20000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000007'
  )
  AND (u.role = 'lecturer' OR u.role = 'manager');

INSERT INTO scheme_eligible_users (scheme_id, user_id) VALUES
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000006'),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000007'),
  ('20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000006'),
  ('20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000009'),
  ('20000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000006'),
  ('20000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000008'),
  ('20000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000007'),
  ('20000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000009');

INSERT INTO scheme_output_options (
  scheme_id, name, category, configuration, position
)
SELECT
  s.id,
  option.name,
  option.category,
  option.configuration,
  option.position
FROM schemes s
CROSS JOIN (
  VALUES
    ('Artikel Jurnal Scopus Q2', 'jurnal', '{"journalTargetLevel":"scopus","journalIndexTarget":"Scopus Q2","publicationType":"internasional","targetQuartile":"Q2"}'::jsonb, 1),
    ('Prosiding Internasional Terindeks Scopus', 'prosiding', '{"proceedingType":"internasional","indexTarget":"Scopus"}'::jsonb, 2),
    ('Paten Sederhana (terdaftar)', 'hki', '{"hkiType":"paten_sederhana","targetRegistrationYear":"2027"}'::jsonb, 3)
) AS option(name, category, configuration, position);

INSERT INTO scheme_attachment_requirements (
  scheme_id, category, name, accepted_extensions, is_required, is_custom, position
)
SELECT s.id, requirement.category, requirement.name, requirement.accepted_extensions, true, false, requirement.position
FROM schemes s
CROSS JOIN (
  VALUES
    ('proposal', 'Proposal Penelitian', '.pdf', 1),
    ('rab', 'Rencana Anggaran Biaya (RAB)', '.xls,.xlsx', 2)
) AS requirement(category, name, accepted_extensions, position);

UPDATE scheme_attachment_requirements
SET template_file_id = CASE category
  WHEN 'proposal' THEN '90000000-0000-4000-8000-000000000012'::uuid
  WHEN 'rab' THEN '90000000-0000-4000-8000-000000000013'::uuid
END
WHERE scheme_id IN (
    '20000000-0000-4000-8000-000000000005',
    '20000000-0000-4000-8000-000000000007'
  )
  AND category IN ('proposal', 'rab');

INSERT INTO scheme_attachment_requirements (
  scheme_id, category, name, accepted_extensions, is_required, is_custom,
  template_file_id, position
) VALUES
  ('20000000-0000-4000-8000-000000000005', 'scheme_attachment_lead_statement', 'Surat Pernyataan Ketua Peneliti', '.pdf', true, true, '90000000-0000-4000-8000-000000000014', 3),
  ('20000000-0000-4000-8000-000000000005', 'scheme_attachment_partner_statement', 'Surat Kesediaan Mitra', '.pdf', true, true, '90000000-0000-4000-8000-000000000015', 4),
  ('20000000-0000-4000-8000-000000000005', 'scheme_attachment_integrity_pact', 'Pakta Integritas Tim Peneliti', '.pdf', true, true, '90000000-0000-4000-8000-000000000016', 5),
  ('20000000-0000-4000-8000-000000000005', 'scheme_attachment_team_cv', 'Biodata Tim Peneliti', '.pdf', true, true, '90000000-0000-4000-8000-000000000017', 6),
  ('20000000-0000-4000-8000-000000000007', 'scheme_attachment_lead_statement', 'Surat Pernyataan Ketua Peneliti', '.pdf', true, true, '90000000-0000-4000-8000-000000000014', 3),
  ('20000000-0000-4000-8000-000000000007', 'scheme_attachment_partner_statement', 'Surat Kesediaan Mitra', '.pdf', true, true, '90000000-0000-4000-8000-000000000015', 4),
  ('20000000-0000-4000-8000-000000000007', 'scheme_attachment_integrity_pact', 'Pakta Integritas Tim Peneliti', '.pdf', true, true, '90000000-0000-4000-8000-000000000016', 5),
  ('20000000-0000-4000-8000-000000000007', 'scheme_attachment_team_cv', 'Biodata Tim Peneliti', '.pdf', true, true, '90000000-0000-4000-8000-000000000017', 6);

INSERT INTO scheme_reporting_periods (
  scheme_id, report_type, label, open_at, due_at, position, created_by
)
SELECT
  s.id,
  period.report_type::report_type,
  period.label,
  CASE period.position
    WHEN 1 THEN (s.start_date + time '08:00')::timestamptz
    WHEN 2 THEN (s.start_date + 91 + time '08:00')::timestamptz
    ELSE (s.end_date - 30 + time '08:00')::timestamptz
  END,
  CASE period.position
    WHEN 1 THEN (s.start_date + 90 + time '23:59')::timestamptz
    WHEN 2 THEN (s.start_date + 180 + time '23:59')::timestamptz
    WHEN 3 THEN (s.end_date + time '23:59')::timestamptz
    ELSE (s.end_date + 90 + time '23:59')::timestamptz
  END,
  period.position,
  s.created_by
FROM schemes s
CROSS JOIN (
  VALUES
    ('interim', 'Laporan Sementara Periode 1', 1),
    ('interim', 'Laporan Sementara Periode 2', 2),
    ('final', 'Laporan Final', 3),
    ('output', 'Laporan Luaran', 4)
) AS period(report_type, label, position);

INSERT INTO research_drafts (
  id, user_id, scheme_id, status, current_step, payload, created_by,
  last_saved_at, submitted_at, reviewed_at, decided_at, created_at, updated_at
) VALUES
  ('30000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001', 'submitted', 6, '{}', '00000000-0000-4000-8000-000000000006', '2026-05-06 10:15+07', '2026-05-06 10:15+07', NULL, NULL, '2026-05-04 15:30+07', '2026-05-06 10:15+07'),
  ('30000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000002', 'under_review', 6, '{}', '00000000-0000-4000-8000-000000000006', '2026-05-06 10:15+07', '2026-05-06 10:15+07', NULL, NULL, '2026-05-04 15:30+07', '2026-05-08 14:00+07'),
  ('30000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000003', 'reviewed', 6, '{}', '00000000-0000-4000-8000-000000000006', '2026-05-06 10:15+07', '2026-05-06 10:15+07', '2026-05-10 11:00+07', NULL, '2026-05-04 15:30+07', '2026-05-10 11:00+07'),
  ('30000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001', 'funded', 6, '{}', '00000000-0000-4000-8000-000000000006', '2026-05-06 10:15+07', '2026-05-06 10:15+07', '2026-05-10 11:00+07', '2026-05-12 11:00+07', '2026-05-04 15:30+07', '2026-05-12 11:00+07'),
  ('30000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000005', 'draft', 3, '{}', '00000000-0000-4000-8000-000000000006', '2026-07-22 16:30+07', NULL, NULL, NULL, '2026-07-22 15:00+07', '2026-07-22 16:30+07');

INSERT INTO draft_projects (
  id, draft_id, title, target_tkt, rip_relation, research_center_relation,
  integrated_to_teaching, course_name, academic_year, metadata
) VALUES
  ('31000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Pengembangan Sistem Analitik Penelitian Berbasis Kecerdasan Buatan', 5, 'ict_based', 'ict_based', true, 'machine_learning', '2025/2026', '{}'),
  ('31000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'Model Prediksi Keberhasilan Studi Mahasiswa Menggunakan Machine Learning', 5, 'ict_based', 'ict_based', true, 'data_mining', '2025/2026', '{}'),
  ('31000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'Platform Kolaborasi Riset Universitas dan Industri Kreatif', 6, 'design_art_multimedia', 'business_social_studies', false, NULL, NULL, '{}'),
  ('31000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', 'Pengembangan Repositori Riset Terintegrasi', 6, 'ict_based', 'ict_based', true, 'sistem_informasi', '2025/2026', '{}'),
  ('31000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000005', 'Adaptive Learning untuk Peningkatan Retensi Mahasiswa', 5, 'ict_based', 'ai_for_business_social_studies', true, 'machine_learning', '2026/2027', '{}');

INSERT INTO draft_project_sdgs (project_id, sdg_id)
SELECT p.id, sdg_id
FROM draft_projects p
CROSS JOIN (VALUES (4), (9)) AS goal(sdg_id);

INSERT INTO draft_members (
  draft_id, role, member_type, profile_id, user_id, name, identifier,
  nidn, study_program, faculty, orcid, position
)
SELECT
  d.id, 'ketua', 'internal_lecturer',
  '10000000-0000-4000-8000-000000000006',
  '00000000-0000-4000-8000-000000000006',
  'Dr. Budi Santoso', '0312048501', '0312048501',
  'Sistem Informasi', 'Teknik dan Informatika', '0000000218250097', 1
FROM research_drafts d;

INSERT INTO draft_members (
  draft_id, role, member_type, profile_id, user_id, name, identifier,
  nidn, study_program, faculty, orcid, position
)
SELECT
  d.id, 'member', 'internal_lecturer',
  '10000000-0000-4000-8000-000000000007',
  '00000000-0000-4000-8000-000000000007',
  'Dr. Andini Prameswari', '0308078602', '0308078602',
  'Informatika', 'Teknik dan Informatika', '0000000319261188', 2
FROM research_drafts d;

INSERT INTO draft_budget_items (
  draft_id, category_code, component, item_name, volume, unit,
  unit_price, notes, position
)
SELECT d.id, 'materials', 'Bahan habis pakai', 'Perangkat sensor', 4, 'unit', 1250000, 'Perangkat prototipe', 1
FROM research_drafts d
UNION ALL
SELECT d.id, 'analysis', 'Pengolahan data', 'Cloud computing', 6, 'bulan', 750000, NULL, 1
FROM research_drafts d;

INSERT INTO draft_outputs (
  id, draft_id, scheme_output_option_id, output_kind, name, category,
  description, configuration, position
)
SELECT
  ('34000000-0000-4000-8000-' || lpad(row_number() OVER (ORDER BY d.id)::text, 12, '0'))::uuid,
  d.id,
  (
    SELECT soo.id
    FROM scheme_output_options soo
    WHERE soo.scheme_id = d.scheme_id AND soo.position = 1
  ),
  'wajib',
  'Artikel Jurnal Scopus Q2',
  'jurnal',
  'Artikel pada jurnal internasional bereputasi.',
  '{"journalTargetLevel":"scopus","journalIndexTarget":"Scopus Q2","publicationType":"internasional","targetQuartile":"Q2"}',
  1
FROM research_drafts d;

INSERT INTO draft_outputs (
  id, draft_id, output_kind, name, category, description, configuration, position
) VALUES (
  '34000000-0000-4000-8000-000000000010',
  '30000000-0000-4000-8000-000000000004',
  'tambahan',
  'Prototype Dashboard Analitik Penelitian',
  'produk_prototipe',
  'Prototype dashboard sebagai luaran tambahan penelitian.',
  '{"productType":"prototype","targetTkt":"TKT 6","expectedOutputForm":"prototype"}',
  2
);

INSERT INTO stored_files (
  owner_user_id, storage_provider, storage_key, file_url, original_name,
  mime_type, extension, size_bytes, status, uploaded_at
)
SELECT
  d.user_id,
  'demo',
  'demo/proposals/' || d.id || '/' || attachment.file_name,
  'mock://proposals/' || d.id || '/' || attachment.file_name,
  attachment.file_name,
  attachment.mime_type,
  attachment.extension,
  attachment.size_bytes,
  'ready',
  COALESCE(d.last_saved_at, d.created_at)
FROM research_drafts d
CROSS JOIN (
  VALUES
    ('proposal-penelitian.pdf', 'application/pdf', 'pdf', 1843200::bigint),
    ('rab-penelitian.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx', 245760::bigint)
) AS attachment(file_name, mime_type, extension, size_bytes);

INSERT INTO draft_files (
  draft_id, requirement_id, category, file_id, uploaded_by, uploaded_at
)
SELECT
  d.id,
  requirement.id,
  requirement.category,
  file.id,
  d.user_id,
  file.uploaded_at
FROM research_drafts d
JOIN scheme_attachment_requirements requirement
  ON requirement.scheme_id = d.scheme_id
JOIN stored_files file
  ON file.storage_key = 'demo/proposals/' || d.id || '/'
    || CASE requirement.category
      WHEN 'proposal' THEN 'proposal-penelitian.pdf'
      WHEN 'rab' THEN 'rab-penelitian.xlsx'
    END
WHERE requirement.category IN ('proposal', 'rab');

INSERT INTO proposal_submissions (
  id, draft_id, revision_number, snapshot, submitted_by, submitted_at
)
SELECT
  ('35000000-0000-4000-8000-' || lpad(row_number() OVER (ORDER BY d.id)::text, 12, '0'))::uuid,
  d.id,
  1,
  jsonb_build_object('status', d.status, 'submittedAt', d.submitted_at),
  d.user_id,
  d.submitted_at
FROM research_drafts d
WHERE d.submitted_at IS NOT NULL;

INSERT INTO proposal_verifications (
  draft_id, status, checklist, notes, verified_by, verified_at
)
SELECT
  d.id,
  'verified',
  '{"project":true,"members":true,"budget":true,"outputs":true,"attachments":true}',
  'Data administrasi lengkap.',
  '00000000-0000-4000-8000-000000000003',
  '2026-05-08 13:00+07'
FROM research_drafts d
WHERE d.status IN ('under_review', 'reviewed', 'funded');

INSERT INTO reviewer_assignments (
  id, draft_id, submission_id, reviewer_id, status, assigned_by,
  assigned_at, due_at, submitted_at
) VALUES
  (
    '36000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000002',
    (SELECT id FROM proposal_submissions WHERE draft_id = '30000000-0000-4000-8000-000000000002'),
    '00000000-0000-4000-8000-000000000007',
    'assigned',
    '00000000-0000-4000-8000-000000000003',
    '2026-05-08 14:00+07',
    '2026-08-04 23:59+07',
    NULL
  ),
  (
    '36000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000003',
    (SELECT id FROM proposal_submissions WHERE draft_id = '30000000-0000-4000-8000-000000000003'),
    '00000000-0000-4000-8000-000000000007',
    'submitted',
    '00000000-0000-4000-8000-000000000003',
    '2026-05-08 14:00+07',
    '2026-05-20 23:59+07',
    '2026-05-10 11:00+07'
  ),
  (
    '36000000-0000-4000-8000-000000000003',
    '30000000-0000-4000-8000-000000000003',
    (SELECT id FROM proposal_submissions WHERE draft_id = '30000000-0000-4000-8000-000000000003'),
    '00000000-0000-4000-8000-000000000008',
    'assigned',
    '00000000-0000-4000-8000-000000000003',
    '2026-05-08 14:00+07',
    '2026-07-31 23:59+07',
    NULL
  ),
  (
    '36000000-0000-4000-8000-000000000004',
    '30000000-0000-4000-8000-000000000004',
    (SELECT id FROM proposal_submissions WHERE draft_id = '30000000-0000-4000-8000-000000000004'),
    '00000000-0000-4000-8000-000000000007',
    'submitted',
    '00000000-0000-4000-8000-000000000003',
    '2026-05-08 14:00+07',
    '2026-05-20 23:59+07',
    '2026-05-10 11:00+07'
  );

INSERT INTO submission_reviews (
  id, assignment_id, recommendation, total_score, strengths, weaknesses,
  budget_notes, output_notes, revision_notes, submitted_at
) VALUES
  (
    '37000000-0000-4000-8000-000000000001',
    '36000000-0000-4000-8000-000000000002',
    'approve',
    82,
    'Topik relevan dan metodologi jelas.',
    'Rencana diseminasi perlu dirinci.',
    'Anggaran wajar.',
    'Target luaran realistis.',
    NULL,
    '2026-05-10 11:00+07'
  ),
  (
    '37000000-0000-4000-8000-000000000002',
    '36000000-0000-4000-8000-000000000004',
    'approve',
    88,
    'Rancangan integrasi dan dampak institusional sangat kuat.',
    'Rencana mitigasi migrasi data perlu diperdalam.',
    'Anggaran proporsional.',
    'Luaran terukur dan relevan.',
    NULL,
    '2026-05-10 11:00+07'
  );

INSERT INTO review_score_details (
  review_id, criteria_code, score, weighted_score
)
SELECT
  review.id,
  criteria.code,
  review.total_score,
  round(review.total_score * criteria.weight / 100, 4)
FROM submission_reviews review
CROSS JOIN review_criteria criteria;

INSERT INTO proposal_decisions (
  id, draft_id, decision, notes, decided_by, signer_name, signer_role, decided_at
) VALUES (
  '38000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000004',
  'funded',
  'Proposal disetujui untuk didanai.',
  '00000000-0000-4000-8000-000000000002',
  'Manager LPPM',
  'Manager',
  '2026-05-12 11:00+07'
);

INSERT INTO funding_letters (
  id, draft_id, letter_number, file_id, file_name, signed_by, signer_name,
  signer_role, issued_at, signed_at
) VALUES (
  '39000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000004',
  '001/SPP-RIS/LPPM/V/2026',
  '90000000-0000-4000-8000-000000000001',
  'surat-penetapan-pendanaan-draft-approved.pdf',
  '00000000-0000-4000-8000-000000000002',
  'Manager LPPM',
  'Manager',
  '2026-05-12 11:00+07',
  '2026-05-12 11:00+07'
);

INSERT INTO funded_research (
  id, scheme_id, lead_user_id, title, status, funded_amount, started_at,
  ended_at, created_by, created_at, updated_at
) VALUES (
  '30000000-0000-4000-8000-000000000004',
  '20000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000006',
  'Pengembangan Repositori Riset Terintegrasi',
  'active',
  9500000,
  '2026-07-01',
  '2027-06-30',
  '00000000-0000-4000-8000-000000000002',
  '2026-05-12 11:00+07',
  '2026-07-20 15:00+07'
);

INSERT INTO research_contracts (
  id, research_id, status, template_file_id, template_name, created_at, updated_at
) VALUES (
  '40000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000004',
  'unsigned',
  '90000000-0000-4000-8000-000000000002',
  'template-kontrak.pdf',
  '2026-05-12 11:00+07',
  '2026-05-12 11:00+07'
);

INSERT INTO research_reports (
  id, research_id, period_id, report_type, report_period, status, payload,
  submitted_by, submitted_at, created_at, updated_at
) VALUES (
  '41000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000004',
  (
    SELECT id FROM scheme_reporting_periods
    WHERE scheme_id = '20000000-0000-4000-8000-000000000001' AND position = 1
  ),
  'interim',
  'Laporan Sementara Periode 1',
  'submitted',
  '{"title":"Laporan Sementara Periode 1","progress":35,"summary":"Tahap analisis kebutuhan dan perancangan arsitektur repositori telah diselesaikan.","obstacles":"Integrasi metadata dari beberapa sumber membutuhkan penyesuaian format.","followUp":"Melanjutkan implementasi prototipe dan validasi metadata bersama pengguna."}',
  '00000000-0000-4000-8000-000000000006',
  '2026-07-20 15:00+07',
  '2026-07-20 15:00+07',
  '2026-07-20 15:00+07'
);

INSERT INTO research_report_files (report_id, file_id, category) VALUES (
  '41000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000003',
  'internal_report'
);

INSERT INTO research_monev (
  id, research_id, period_id, period_label, status, payload, evaluated_by,
  published_at, created_at, updated_at
) VALUES (
  '42000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000004',
  (
    SELECT id FROM scheme_reporting_periods
    WHERE scheme_id = '20000000-0000-4000-8000-000000000001' AND position = 1
  ),
  'Laporan Sementara Periode 1',
  'submitted',
  '{"progress":35,"milestone":"Arsitektur sistem dan rancangan metadata selesai","achievements":"Arsitektur repositori, skema metadata, dan prototipe awal berhasil disusun.","deviations":"Validasi metadata mundur satu minggu.","risks":"Perbedaan kualitas metadata dari sistem lama.","correctiveAction":"Menambahkan normalisasi dan validasi metadata otomatis."}',
  '00000000-0000-4000-8000-000000000003',
  '2026-07-18 15:00+07',
  '2026-07-18 15:00+07',
  '2026-07-18 15:00+07'
);

INSERT INTO research_monev_files (monev_id, file_id, category) VALUES (
  '42000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000004',
  'evidence'
);

INSERT INTO funded_review_assignments (
  id, research_id, target_type, monev_id, report_id, reviewer_id, status,
  assigned_by, assigned_at, due_at, submitted_at
) VALUES
  (
    '44000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000004',
    'monev',
    '42000000-0000-4000-8000-000000000001',
    NULL,
    '00000000-0000-4000-8000-000000000007',
    'assigned',
    '00000000-0000-4000-8000-000000000003',
    '2026-08-01 15:00+07',
    '2026-08-20 23:59+07',
    NULL
  ),
  (
    '44000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000004',
    'report',
    NULL,
    '41000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000008',
    'submitted',
    '00000000-0000-4000-8000-000000000003',
    '2026-07-21 15:00+07',
    '2026-08-05 23:59+07',
    '2026-07-29 15:00+07'
  );

INSERT INTO funded_reviews (
  id, assignment_id, recommendation, total_score, substance_notes,
  technical_notes, follow_up_notes, submitted_at
) VALUES (
  '46000000-0000-4000-8000-000000000001',
  '44000000-0000-4000-8000-000000000002',
  'approve',
  83.55,
  'Kemajuan sesuai sasaran periode dan metodologi diterapkan secara konsisten.',
  'Dokumen pendukung memadai; konsistensi metadata perlu dijaga.',
  'Lanjutkan validasi pengguna dan ukur dampak prototipe pada periode berikutnya.',
  '2026-07-29 15:00+07'
);

INSERT INTO funded_review_score_details (
  review_id, criteria_code, criteria_label, criteria_group, weight, score,
  weighted_score
) VALUES
  ('46000000-0000-4000-8000-000000000001', 'objective', 'Kesesuaian hasil dengan tujuan penelitian', 'Substansi Laporan (45%)', 25, 86, 21.5000),
  ('46000000-0000-4000-8000-000000000001', 'method', 'Ketepatan metode dan analisis', 'Substansi Laporan (45%)', 20, 84, 16.8000),
  ('46000000-0000-4000-8000-000000000001', 'result', 'Kelengkapan dan validitas hasil', 'Capaian Penelitian (35%)', 20, 82, 16.4000),
  ('46000000-0000-4000-8000-000000000001', 'output', 'Ketercapaian luaran yang dijanjikan', 'Capaian Penelitian (35%)', 15, 80, 12.0000),
  ('46000000-0000-4000-8000-000000000001', 'document', 'Kualitas dokumen dan bukti', 'Dokumentasi (20%)', 10, 85, 8.5000),
  ('46000000-0000-4000-8000-000000000001', 'follow_up', 'Kelayakan tindak lanjut', 'Dokumentasi (20%)', 10, 83.5, 8.3500);

INSERT INTO research_logbooks (
  id, research_id, activity_date, start_time, end_time, description,
  payload, created_by, created_at, updated_at
) VALUES
  ('43000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', '2026-02-03', '08:00', '17:00', 'Melaksanakan meeting koordinasi dengan tim peneliti terkait rencana kerja penelitian.', '{"fileCount":1}', '00000000-0000-4000-8000-000000000006', '2026-02-03 17:00+07', '2026-02-03 17:00+07'),
  ('43000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000004', '2026-02-05', '09:00', '18:00', 'Melanjutkan penyusunan instrumen dan rancangan pengumpulan data.', '{"fileCount":1}', '00000000-0000-4000-8000-000000000006', '2026-02-05 18:00+07', '2026-02-05 18:00+07');

INSERT INTO letter_requests (
  id, user_id, created_by, research_id, letter_type, purpose, custom_name,
  status, auto_fill_snapshot, form_data, letter_number, generated_file_url,
  submitted_at, accepted_at, accepted_by, configured_at, configured_by,
  data_submitted_at, generated_at, created_at, updated_at
) VALUES
  (
    '50000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-000000000006',
    '30000000-0000-4000-8000-000000000004',
    'support',
    'interview',
    NULL,
    'submitted',
    '{"applicantName":"Dr. Budi Santoso","applicantIdentifier":"0312048501","applicantEmail":"lecturer@umn.ac.id","studyProgram":"Sistem Informasi","faculty":"Teknik dan Informatika","researchTitle":"Pengembangan Repositori Riset Terintegrasi","researchYear":2026,"researchScheme":"Penelitian Dosen Pemula 2026","researchRole":"Ketua Penelitian"}',
    '{}',
    NULL,
    NULL,
    '2026-07-20 09:05+07',
    NULL, NULL, NULL, NULL, NULL, NULL,
    '2026-07-20 09:00+07',
    '2026-07-20 09:05+07'
  ),
  (
    '50000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-000000000006',
    '30000000-0000-4000-8000-000000000004',
    'travel',
    'research_travel',
    NULL,
    'form_design',
    '{"applicantName":"Dr. Budi Santoso","applicantIdentifier":"0312048501","applicantEmail":"lecturer@umn.ac.id","studyProgram":"Sistem Informasi","faculty":"Teknik dan Informatika","researchTitle":"Pengembangan Repositori Riset Terintegrasi","researchYear":2026,"researchScheme":"Penelitian Dosen Pemula 2026","researchRole":"Ketua Penelitian"}',
    '{}', NULL, NULL,
    '2026-07-21 09:00+07',
    '2026-07-22 10:00+07',
    '00000000-0000-4000-8000-000000000004',
    NULL, NULL, NULL, NULL,
    '2026-07-21 09:00+07',
    '2026-07-22 10:00+07'
  ),
  (
    '50000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-000000000006',
    '30000000-0000-4000-8000-000000000004',
    'ethics', 'new', NULL, 'data_required',
    '{"applicantName":"Dr. Budi Santoso","applicantIdentifier":"0312048501","applicantEmail":"lecturer@umn.ac.id","studyProgram":"Sistem Informasi","faculty":"Teknik dan Informatika","researchTitle":"Pengembangan Repositori Riset Terintegrasi","researchYear":2026,"researchScheme":"Penelitian Dosen Pemula 2026","researchRole":"Ketua Penelitian"}',
    '{}', NULL, NULL,
    '2026-07-23 09:00+07', '2026-07-23 13:00+07', '00000000-0000-4000-8000-000000000004',
    '2026-07-24 11:00+07', '00000000-0000-4000-8000-000000000004', NULL, NULL,
    '2026-07-23 09:00+07', '2026-07-24 11:00+07'
  ),
  (
    '50000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-000000000006',
    '30000000-0000-4000-8000-000000000004',
    'support', 'research_permission', NULL, 'data_submitted',
    '{"applicantName":"Dr. Budi Santoso","applicantIdentifier":"0312048501","applicantEmail":"lecturer@umn.ac.id","studyProgram":"Sistem Informasi","faculty":"Teknik dan Informatika","researchTitle":"Pengembangan Repositori Riset Terintegrasi","researchYear":2026,"researchScheme":"Penelitian Dosen Pemula 2026","researchRole":"Ketua Penelitian"}',
    '{"recipientInstitution":"Dinas Komunikasi dan Informatika Kota Tangerang","activityPurpose":"Permohonan akses data terbatas untuk validasi metadata repositori penelitian.","activityDate":"2026-09-10"}',
    NULL, NULL,
    '2026-07-25 09:00+07', '2026-07-25 13:00+07', '00000000-0000-4000-8000-000000000004',
    '2026-07-26 10:00+07', '00000000-0000-4000-8000-000000000004', '2026-07-27 11:00+07', NULL,
    '2026-07-25 09:00+07', '2026-07-27 11:00+07'
  ),
  (
    '50000000-0000-4000-8000-000000000005',
    '00000000-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-000000000006',
    '30000000-0000-4000-8000-000000000004',
    'custom', NULL, 'Surat Keterangan Pelaksanaan Uji Lapangan', 'revision_required',
    '{"applicantName":"Dr. Budi Santoso","applicantIdentifier":"0312048501","applicantEmail":"lecturer@umn.ac.id","studyProgram":"Sistem Informasi","faculty":"Teknik dan Informatika","researchTitle":"Pengembangan Repositori Riset Terintegrasi","researchYear":2026,"researchScheme":"Penelitian Dosen Pemula 2026","researchRole":"Ketua Penelitian"}',
    '{"recipientInstitution":"PT Data Nusantara","activityPurpose":"","activityDate":"2026-09-18"}',
    NULL, NULL,
    '2026-07-27 09:00+07', '2026-07-27 13:00+07', '00000000-0000-4000-8000-000000000004',
    '2026-07-28 10:00+07', '00000000-0000-4000-8000-000000000004', '2026-07-29 10:00+07', NULL,
    '2026-07-27 09:00+07', '2026-07-29 12:00+07'
  ),
  (
    '50000000-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-000000000006',
    '30000000-0000-4000-8000-000000000004',
    'support', 'other_research_activity', NULL, 'rejected',
    '{"applicantName":"Dr. Budi Santoso","applicantIdentifier":"0312048501","applicantEmail":"lecturer@umn.ac.id","studyProgram":"Sistem Informasi","faculty":"Teknik dan Informatika","researchTitle":"Pengembangan Repositori Riset Terintegrasi","researchYear":2026,"researchScheme":"Penelitian Dosen Pemula 2026","researchRole":"Ketua Penelitian"}',
    '{}', NULL, NULL,
    '2026-07-30 09:00+07', NULL, NULL, NULL, NULL, NULL, NULL,
    '2026-07-30 09:00+07', '2026-07-30 12:00+07'
  ),
  (
    '50000000-0000-4000-8000-000000000007',
    '00000000-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-000000000006',
    '30000000-0000-4000-8000-000000000004',
    'research_assignment', 'internal_grant', NULL, 'generated',
    '{"applicantName":"Dr. Budi Santoso","applicantIdentifier":"0312048501","applicantEmail":"lecturer@umn.ac.id","studyProgram":"Sistem Informasi","faculty":"Teknik dan Informatika","researchTitle":"Pengembangan Repositori Riset Terintegrasi","researchYear":2026,"researchScheme":"Penelitian Dosen Pemula 2026","researchRole":"Ketua Penelitian"}',
    '{"recipientInstitution":"LPPM Universitas Multimedia Nusantara","activityPurpose":"Pelaksanaan penelitian internal tahun 2026.","activityDate":"2026-08-15"}',
    '0001/ST-RIS/LPPM/08/2026', 'archive://letter-generated-1',
    '2026-07-28 09:00+07', '2026-07-28 13:00+07', '00000000-0000-4000-8000-000000000004',
    '2026-07-29 10:00+07', '00000000-0000-4000-8000-000000000004', '2026-07-30 10:00+07', '2026-08-01 11:00+07',
    '2026-07-28 09:00+07', '2026-08-01 11:00+07'
  );

INSERT INTO letter_applicants (
  letter_id, user_id, name, identifier, applicant_role, applicant_kind,
  status, faculty, study_program, email, is_primary, position
)
SELECT
  l.id,
  '00000000-0000-4000-8000-000000000006',
  'Dr. Budi Santoso',
  '0312048501',
  'Dosen Fulltime',
  'lecturer',
  'fulltime',
  'Teknik dan Informatika',
  'Sistem Informasi',
  'lecturer@umn.ac.id',
  true,
  1
FROM letter_requests l;

INSERT INTO letter_request_templates (
  id, letter_id, template_name, content_template, template_format,
  configured_by, configured_at, published_at
) VALUES
  ('52000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', 'Template Surat Tugas Perjalanan Penelitian', 'RESEARCH INNOVATION AND SUSTAINABILITY\nUNIVERSITAS MULTIMEDIA NUSANTARA\n\nNomor: {{letterNumber}}\n\n{{applicantName}} melaksanakan penelitian {{researchTitle}}.\n\n{{customFields}}', 'txt', '00000000-0000-4000-8000-000000000004', '2026-07-22 10:00+07', NULL),
  ('52000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000003', 'Template Permohonan Klirens Etik', 'RESEARCH INNOVATION AND SUSTAINABILITY\nUNIVERSITAS MULTIMEDIA NUSANTARA\n\nNomor: {{letterNumber}}\n\n{{applicantName}} mengajukan klirens etik untuk penelitian {{researchTitle}}.\n\n{{customFields}}', 'txt', '00000000-0000-4000-8000-000000000004', '2026-07-24 11:00+07', '2026-07-24 11:00+07'),
  ('52000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000004', 'Template Surat Pendukung Penelitian', 'RESEARCH INNOVATION AND SUSTAINABILITY\nUNIVERSITAS MULTIMEDIA NUSANTARA\n\nNomor: {{letterNumber}}\n\n{{applicantName}} sedang melaksanakan penelitian {{researchTitle}}.\n\n{{customFields}}', 'txt', '00000000-0000-4000-8000-000000000004', '2026-07-26 10:00+07', '2026-07-26 10:00+07'),
  ('52000000-0000-4000-8000-000000000005', '50000000-0000-4000-8000-000000000005', 'Template Surat Keterangan Uji Lapangan', 'RESEARCH INNOVATION AND SUSTAINABILITY\nUNIVERSITAS MULTIMEDIA NUSANTARA\n\nNomor: {{letterNumber}}\n\n{{applicantName}} melaksanakan uji lapangan penelitian {{researchTitle}}.\n\n{{customFields}}', 'txt', '00000000-0000-4000-8000-000000000004', '2026-07-28 10:00+07', '2026-07-28 10:00+07'),
  ('52000000-0000-4000-8000-000000000007', '50000000-0000-4000-8000-000000000007', 'Template Surat Tugas Penelitian Internal', 'RESEARCH INNOVATION AND SUSTAINABILITY\nUNIVERSITAS MULTIMEDIA NUSANTARA\n\nNomor: {{letterNumber}}\n\n{{applicantName}} ditugaskan melaksanakan penelitian {{researchTitle}}.\n\n{{customFields}}', 'txt', '00000000-0000-4000-8000-000000000004', '2026-07-29 10:00+07', '2026-07-29 10:00+07');

INSERT INTO letter_request_fields (
  template_id, field_key, field_label, field_type, is_required,
  placeholder, help_text, options, position
)
SELECT
  template_id,
  field_key,
  field_label,
  field_type,
  true,
  placeholder,
  NULL,
  '[]'::jsonb,
  position
FROM (
  SELECT t.id AS template_id, f.field_key, f.field_label, f.field_type, f.placeholder, f.position
  FROM letter_request_templates t
  CROSS JOIN (VALUES
    ('recipientInstitution', 'Instansi Tujuan', 'text', 'Nama instansi tujuan', 1),
    ('activityPurpose', 'Tujuan Kegiatan', 'textarea', 'Jelaskan tujuan penggunaan surat', 2),
    ('activityDate', 'Tanggal Kegiatan', 'date', '', 3)
  ) AS f(field_key, field_label, field_type, placeholder, position)
) configured_fields;

INSERT INTO letter_request_values (letter_id, template_id, field_id, field_value, submitted_by, submitted_at)
SELECT
  t.letter_id,
  t.id,
  f.id,
  CASE f.field_key
    WHEN 'recipientInstitution' THEN to_jsonb(v.recipient_institution)
    WHEN 'activityPurpose' THEN to_jsonb(v.activity_purpose)
    WHEN 'activityDate' THEN to_jsonb(v.activity_date)
  END,
  '00000000-0000-4000-8000-000000000006',
  v.submitted_at
FROM (VALUES
  ('52000000-0000-4000-8000-000000000004'::uuid, 'Dinas Komunikasi dan Informatika Kota Tangerang', 'Permohonan akses data terbatas untuk validasi metadata repositori penelitian.', '2026-09-10', '2026-07-27 11:00+07'::timestamptz),
  ('52000000-0000-4000-8000-000000000005'::uuid, 'PT Data Nusantara', '', '2026-09-18', '2026-07-29 10:00+07'::timestamptz),
  ('52000000-0000-4000-8000-000000000007'::uuid, 'LPPM Universitas Multimedia Nusantara', 'Pelaksanaan penelitian internal tahun 2026.', '2026-08-15', '2026-07-30 10:00+07'::timestamptz)
) AS v(template_id, recipient_institution, activity_purpose, activity_date, submitted_at)
JOIN letter_request_templates t ON t.id = v.template_id
JOIN letter_request_fields f ON f.template_id = t.id;

INSERT INTO letter_reviews (
  letter_id, reviewer_id, decision, notes, checklist, reviewed_at
) VALUES
  ('50000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000004', 'accepted', 'Permintaan diterima dan form sedang disusun.', '{}', '2026-07-22 10:00+07'),
  ('50000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000004', 'accepted', 'Permintaan diterima.', '{}', '2026-07-23 13:00+07'),
  ('50000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000004', 'accepted', 'Permintaan diterima.', '{}', '2026-07-25 13:00+07'),
  ('50000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000004', 'accepted', 'Permintaan diterima.', '{}', '2026-07-27 13:00+07'),
  ('50000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000004', 'revision_required', 'Tujuan kegiatan perlu dilengkapi.', '{"fieldsComplete":false}', '2026-07-29 12:00+07'),
  ('50000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000004', 'rejected', 'Kebutuhan surat berada di luar lingkup penelitian yang didanai.', '{}', '2026-07-30 12:00+07'),
  ('50000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000004', 'generated', 'Data diverifikasi dan surat diterbitkan.', '{"fieldsComplete":true}', '2026-08-01 11:00+07');

INSERT INTO generated_letters (
  id, letter_id, letter_number, file_name, file_url, content_snapshot,
  generated_by, generated_at
) VALUES (
  '51000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000007',
  '0001/ST-RIS/LPPM/08/2026',
  '0001-ST-RIS-LPPM-08-2026.txt',
  'archive://letter-generated-1',
  'Dr. Budi Santoso ditugaskan melaksanakan penelitian Pengembangan Repositori Riset Terintegrasi.',
  '00000000-0000-4000-8000-000000000004',
  '2026-08-01 11:00+07'
);

INSERT INTO external_research (
  id, user_id, created_by, activity_name, research_title, activity_year,
  activity_status, activity_type, role_in_research, organizer_origin,
  funding_source, funding_amount, currency, submission_status, category,
  metadata, type_detail, submitted_at, validated_at, created_at, updated_at
) VALUES
  (
    '60000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-000000000006',
    'Hibah Riset Terapan Kemdikbud 2026',
    'Model Analitik Prediksi Keberhasilan Studi Mahasiswa',
    2026,
    'ongoing',
    'external',
    'ketua',
    'Kemdikbudristek',
    'DRTPM',
    150000000,
    'IDR',
    'submitted',
    'grant',
    '{"ripRelation":"ICT-Based","tktTarget":5,"sdgInvolvement":true,"integrationToTeaching":true,"courseName":"Data Mining","academicYear":"2026/2027"}',
    '{"grantType":"nasional","grantName":"Hibah Riset Terapan","grantLink":"https://example.test/hibah","researchStatus":"ongoing","fundingAmount":150000000}',
    '2026-06-03 09:10+07',
    NULL,
    '2026-06-02 09:00+07',
    '2026-06-03 09:10+07'
  ),
  (
    '60000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-000000000006',
    'Penelitian Mandiri PRO-STEP',
    'Pengembangan Prototipe Sistem Informasi Riset Terintegrasi',
    2025,
    'completed',
    'mandiri',
    'ketua',
    'Mandiri',
    'Mandiri',
    25000000,
    'IDR',
    'validated',
    'independent',
    '{"ripRelation":"ICT-Based","tktTarget":6,"sdgInvolvement":true,"integrationToTeaching":false}',
    '{"independentType":"prostep"}',
    '2025-12-12 09:00+07',
    '2025-12-15 09:00+07',
    '2025-11-03 09:00+07',
    '2025-12-15 09:00+07'
  );

INSERT INTO external_research_sdgs (external_research_id, sdg_id) VALUES
  ('60000000-0000-4000-8000-000000000001', 4),
  ('60000000-0000-4000-8000-000000000001', 9),
  ('60000000-0000-4000-8000-000000000002', 4),
  ('60000000-0000-4000-8000-000000000002', 9);

INSERT INTO external_research_outputs (
  id, external_research_id, output_type, title, year, description, link, position
) VALUES
  ('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'journal', 'Predictive Analytics for Student Success', 2026, 'Artikel jurnal terkait model prediksi.', NULL, 1),
  ('61000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000001', 'prototype', 'Dashboard Prediksi Akademik', 2026, 'Prototype dashboard analitik.', NULL, 2),
  ('61000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000002', 'prototype', 'Prototype RIS', 2025, 'Prototype dashboard RIS.', 'https://example.test/prototype', 1);

INSERT INTO external_research_files (
  external_research_id, file_type, file_id, uploaded_by, uploaded_at
) VALUES
  ('60000000-0000-4000-8000-000000000001', 'proposal', '90000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000006', '2026-06-03 09:00+07'),
  ('60000000-0000-4000-8000-000000000001', 'budget_plan', '90000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000006', '2026-06-03 09:00+07'),
  ('60000000-0000-4000-8000-000000000001', 'contract', '90000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000006', '2026-06-03 09:00+07'),
  ('60000000-0000-4000-8000-000000000002', 'final_report', '90000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000006', '2025-12-12 09:00+07');

INSERT INTO external_research_reviews (
  id, external_research_id, reviewer_id, decision, notes, checklist, reviewed_at
) VALUES (
  '62000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
  'validated',
  'Laporan dan dokumen lengkap.',
  '{"fieldComplete":true,"documentsComplete":true,"documentsValid":true,"notDuplicate":true,"statusConsistent":true}',
  '2025-12-15 09:00+07'
);

INSERT INTO external_research_history (
  external_research_id, old_status, new_status, note, changed_by, changed_at
) VALUES
  ('60000000-0000-4000-8000-000000000001', NULL, 'draft', 'Draft laporan dibuat.', '00000000-0000-4000-8000-000000000006', '2026-06-02 09:00+07'),
  ('60000000-0000-4000-8000-000000000001', 'draft', 'submitted', 'Laporan disubmit ke LPPM.', '00000000-0000-4000-8000-000000000006', '2026-06-03 09:10+07'),
  ('60000000-0000-4000-8000-000000000002', NULL, 'draft', 'Draft laporan dibuat.', '00000000-0000-4000-8000-000000000006', '2025-11-03 09:00+07'),
  ('60000000-0000-4000-8000-000000000002', 'draft', 'submitted', 'Laporan disubmit ke LPPM.', '00000000-0000-4000-8000-000000000006', '2025-12-12 09:00+07'),
  ('60000000-0000-4000-8000-000000000002', 'submitted', 'validated', 'Laporan divalidasi LPPM.', '00000000-0000-4000-8000-000000000003', '2025-12-15 09:00+07');

INSERT INTO notifications (
  id, user_id, from_user_id, notification_type, priority, title, message,
  entity_type, entity_id, research_id, action_path, action_label,
  manager_mode, is_read, created_at
) VALUES
  ('70000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000002', 'research_funded', 'high', 'Proposal didanai', 'Proposal Pengembangan Repositori Riset Terintegrasi telah didanai.', 'research_draft', '30000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', '/ris/penelitian-didanai/30000000-0000-4000-8000-000000000004/pendataan', 'Buka Pendataan', 'lecturer', false, '2026-05-12 11:00+07'),
  ('70000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000006', 'proposal_submitted', 'normal', 'Proposal baru masuk', 'Proposal baru menunggu verifikasi administrasi.', 'research_draft', '30000000-0000-4000-8000-000000000001', NULL, '/ris/manajemen-penelitian/pengajuan', 'Lihat Proposal', 'management', false, '2026-05-06 10:15+07'),
  ('70000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000007', 'proposal_reviewed', 'high', 'Penilaian reviewer tersedia', 'Satu penilaian reviewer telah dikirim dan keputusan final dapat diproses.', 'research_draft', '30000000-0000-4000-8000-000000000003', NULL, '/ris/manajemen-penelitian/pengajuan/30000000-0000-4000-8000-000000000003', 'Beri Keputusan', 'management', false, '2026-05-10 11:00+07');

INSERT INTO email_outbox (
  recipient_user_id, recipient_email, subject, body_text, template_key,
  notification_type, entity_type, entity_id, action_path, priority,
  delivery_mode, deduplication_key, source_event_id, payload, status,
  created_at, updated_at
) VALUES (
  '00000000-0000-4000-8000-000000000006',
  'lecturer@umn.ac.id',
  'Proposal penelitian telah didanai',
  'Proposal Pengembangan Repositori Riset Terintegrasi telah disetujui untuk didanai.',
  'proposal-funded',
  'proposal_funded',
  'research_draft',
  '30000000-0000-4000-8000-000000000004',
  '/ris/penelitian-didanai/30000000-0000-4000-8000-000000000004/pendataan',
  'high',
  'immediate',
  '00000000-0000-4000-8000-000000000006|proposal_funded|research_draft|30000000-0000-4000-8000-000000000004|demo-funded',
  '70000000-0000-4000-8000-000000000001',
  '{"draftId":"30000000-0000-4000-8000-000000000004"}',
  'queued',
  '2026-05-12 11:00+07',
  '2026-05-12 11:00+07'
);

INSERT INTO system_activity_logs (
  request_id, user_id, action, entity_type, entity_id, old_data, new_data, created_at
) VALUES
  ('demo_scheme_create', '00000000-0000-4000-8000-000000000003', 'scheme.create', 'scheme', '20000000-0000-4000-8000-000000000001', NULL, '{"status":"open"}', '2026-01-01 08:00+07'),
  ('demo_proposal_fund', '00000000-0000-4000-8000-000000000002', 'proposal.decision', 'research_draft', '30000000-0000-4000-8000-000000000004', '{"status":"reviewed"}', '{"status":"funded"}', '2026-05-12 11:00+07');

COMMIT;

-- =====================================================================
-- SEED B: DEPLOYMENT DATA (INTENTIONALLY COMMENTED OUT)
-- =====================================================================
-- This block is the clean deployment alternative. Uncomment the complete
-- block and run it after this bootstrap. TRUNCATE removes all demo domain
-- data through foreign-key dependencies while retaining static lookup rows.
--
-- IMPORTANT:
-- 1. Replace both CHANGE_BEFORE_DEPLOY values before executing.
-- 2. Store the real passwords in a secret manager, never in source control.
-- 3. Change the account names/identifiers if the institution requires it.
--
-- BEGIN;
--
-- TRUNCATE TABLE users CASCADE;
--
-- INSERT INTO users (
--   id, email, password_hash, name, role, is_active, applicant_enabled,
--   default_mode, identifier, created_at, updated_at
-- ) VALUES
--   (
--     '00000000-0000-4000-8000-000000000001',
--     'superadmin@umn.ac.id',
--     crypt('CHANGE_BEFORE_DEPLOY_SUPERADMIN', gen_salt('bf', 12)),
--     'Super Admin RIS',
--     'super_admin',
--     true,
--     false,
--     'management',
--     'SADM-RIS-001',
--     now(),
--     now()
--   ),
--   (
--     '00000000-0000-4000-8000-000000000002',
--     'manager@umn.ac.id',
--     crypt('CHANGE_BEFORE_DEPLOY_MANAGER', gen_salt('bf', 12)),
--     'Manager LPPM',
--     'manager',
--     true,
--     true,
--     'management',
--     'MGR-LPPM-001',
--     now(),
--     now()
--   );
--
-- UPDATE users
-- SET created_by = '00000000-0000-4000-8000-000000000001'
-- WHERE id = '00000000-0000-4000-8000-000000000002';
--
-- INSERT INTO researcher_profiles (
--   id, user_id, full_name, nidn, nip, institution_email, faculty,
--   study_program, unit, position, functional_position, employment_status,
--   profile_status, verification_status, completeness, last_updated_by,
--   created_at, updated_at
-- ) VALUES
--   (
--     '10000000-0000-4000-8000-000000000001',
--     '00000000-0000-4000-8000-000000000001',
--     'Super Admin RIS',
--     'SADM-RIS-001',
--     'SADM001',
--     'superadmin@umn.ac.id',
--     'LPPM',
--     'Manajemen Sistem Riset',
--     'LPPM',
--     'Super Admin',
--     'Super Administrator',
--     'fulltime',
--     'active',
--     'verified',
--     60,
--     '00000000-0000-4000-8000-000000000001',
--     now(),
--     now()
--   ),
--   (
--     '10000000-0000-4000-8000-000000000002',
--     '00000000-0000-4000-8000-000000000002',
--     'Manager LPPM',
--     'MGR-LPPM-001',
--     'MGR001',
--     'manager@umn.ac.id',
--     'LPPM',
--     'Manajemen Riset',
--     'LPPM',
--     'Kepala LPPM',
--     'Manager',
--     'fulltime',
--     'active',
--     'verified',
--     60,
--     '00000000-0000-4000-8000-000000000001',
--     now(),
--     now()
--   );
--
-- COMMIT;
