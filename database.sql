-- PostgreSQL Script used in this project to create the database and tables

CREATE DATABASE ris_lppm;

BEGIN;
-- RIS LPPM PostgreSQL schema reset script
-- Run this inside the target database, for example: ris_lppm is the database name used in this project
-- WARNING: this resets the public schema and deletes existing data in this database.

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
SET search_path TO public;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

CREATE TYPE role_type AS ENUM (
  'super_admin',
  'lppm_admin',
  'reviewer',
  'researcher',
  'finance',
  'guest'
);

CREATE TYPE profile_status_enum AS ENUM (
  'draft',
  'active',
  'inactive',
  'suspended'
);

CREATE TYPE verification_status_enum AS ENUM (
  'unverified',
  'pending',
  'verified',
  'rejected'
);

CREATE TYPE scheme_status_enum AS ENUM (
  'draft',
  'published',
  'open',
  'closed',
  'archived'
);

CREATE TYPE draft_status_enum AS ENUM (
  'draft',
  'submitted',
  'under_review',
  'revision',
  'approved',
  'rejected'
);

CREATE TYPE draft_step_enum AS ENUM (
  'project',
  'members',
  'budget',
  'outputs',
  'attachments',
  'review',
  'completed'
);

CREATE TYPE member_type_enum AS ENUM (
  'internal',
  'external',
  'student'
);

CREATE TYPE member_role_enum AS ENUM (
  'leader',
  'member',
  'assistant'
);

CREATE TYPE output_type_enum AS ENUM (
  'journal',
  'proceeding',
  'book',
  'hki',
  'product',
  'prototype',
  'policy_brief',
  'dataset'
);

CREATE TYPE submission_status_enum AS ENUM (
  'submitted',
  'under_review',
  'revision',
  'approved',
  'rejected'
);

CREATE TYPE review_assignment_status_enum AS ENUM (
  'assigned',
  'in_review',
  'submitted'
);

CREATE TYPE review_recommendation_enum AS ENUM (
  'approve',
  'revise',
  'reject'
);

CREATE TYPE final_decision_enum AS ENUM (
  'approved',
  'revision',
  'rejected'
);

CREATE TYPE research_status_enum AS ENUM (
  'draft',
  'ongoing',
  'monitoring',
  'completed',
  'terminated'
);

CREATE TYPE output_status_enum AS ENUM (
  'planned',
  'submitted',
  'published',
  'rejected',
  'completed'
);

CREATE TABLE "users" (
  "user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" varchar UNIQUE,
  "password_hash" text,
  "is_active" boolean,
  "created_at" timestamp,
  "updated_at" timestamp
);

CREATE TABLE "roles" (
  "role_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "role_name" role_type
);

CREATE TABLE "user_roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "role_id" uuid
);

CREATE TABLE "researcher_profiles" (
  "profile_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid UNIQUE,
  "full_name" varchar,
  "front_title" varchar,
  "back_title" varchar,
  "nidn" varchar,
  "nik" varchar,
  "birth_place" varchar,
  "birth_date" date,
  "gender" varchar,
  "nationality" varchar,
  "institution_email" varchar,
  "alternate_email" varchar,
  "phone_number" varchar,
  "domicile_address" text,
  "correspondence_address" text,
  "faculty" varchar,
  "study_program" varchar,
  "unit" varchar,
  "position" varchar,
  "functional_position" varchar,
  "nip" varchar,
  "orcid" varchar,
  "google_scholar" varchar,
  "sinta_id" varchar,
  "bank_name" varchar,
  "bank_account_number" varchar,
  "bank_account_name" varchar,
  "emergency_contact_name" varchar,
  "emergency_contact_relation" varchar,
  "emergency_contact_phone" varchar,
  "profile_status" profile_status_enum,
  "profile_completeness" int,
  "verification_status" verification_status_enum,
  "last_updated_at" timestamp,
  "last_updated_by" uuid,
  "created_at" timestamp,
  "updated_at" timestamp
);

CREATE TABLE "researcher_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "profile_id" uuid,
  "document_type" varchar,
  "file_url" text,
  "file_size" int,
  "file_format" varchar,
  "uploaded_at" timestamp,
  "uploaded_by" uuid,
  "is_active" boolean
);

CREATE TABLE "researcher_verifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "profile_id" uuid,
  "admin_id" uuid,
  "verification_status" varchar,
  "verification_notes" text,
  "verified_by" uuid,
  "verified_at" timestamp
);

CREATE TABLE "researcher_status_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "profile_id" uuid,
  "old_status" varchar,
  "new_status" varchar,
  "changed_by" uuid,
  "changed_at" timestamp
);

CREATE TABLE "researcher_expertise" (
  "expertise_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar
);

CREATE TABLE "researcher_expertise_map" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "profile_id" uuid,
  "expertise_id" uuid
);

CREATE TABLE "admin_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "profile_id" uuid,
  "admin_id" uuid,
  "assigned_at" timestamp,
  "assigned_by" uuid
);

CREATE TABLE "schemes" (
  "scheme_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "scheme_name" varchar,
  "scheme_description" text,
  "scheme_year" int,
  "scheme_start_date" date,
  "scheme_end_date" date,
  "registration_start_date" timestamp,
  "registration_end_date" timestamp,
  "scheme_status" scheme_status_enum,
  "issued_at" timestamp,
  "created_by" uuid,
  "created_at" timestamp,
  "updated_at" timestamp
);

CREATE TABLE "scheme_filter_rules" (
  "rule_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "scheme_id" uuid,
  "rule_config" jsonb,
  "created_by" uuid,
  "created_at" timestamp
);

CREATE TABLE "scheme_eligibility_snapshot" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "scheme_id" uuid,
  "user_id" uuid
);

CREATE TABLE "research_drafts" (
  "draft_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "scheme_id" uuid,
  "created_by" uuid,
  "draft_status" draft_status_enum,
  "current_step" draft_step_enum,
  "completion_project" boolean,
  "completion_member" boolean,
  "completion_budget" boolean,
  "completion_attachment" boolean,
  "attachment_required_count" int,
  "attachment_uploaded_count" int,
  "attachment_completed_at" timestamp,
  "attachment_checklist_generated" boolean,
  "submitted_at" timestamp,
  "approved_at" timestamp,
  "created_at" timestamp,
  "updated_at" timestamp,
  "last_saved_at" timestamp
);

CREATE TABLE "draft_projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "draft_id" uuid,
  "project_title" text,
  "research_scheme" varchar,
  "mandatory_output_plan" varchar,
  "additional_output_plan" varchar,
  "multitarget_tkt" int,
  "rip_relation" varchar,
  "research_center_relation" varchar,
  "is_course_integrated" boolean,
  "course_name" varchar,
  "academic_year" varchar,
  "created_at" timestamp,
  "last_saved_at" timestamp
);

CREATE TABLE "draft_project_sdg" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid,
  "sdg_code" varchar
);

CREATE TABLE "draft_members" (
  "member_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "draft_id" uuid,
  "member_type" member_type_enum,
  "member_name" varchar,
  "member_identifier" varchar,
  "member_role" member_role_enum,
  "member_orcid" varchar,
  "member_program" varchar,
  "member_faculty" varchar
);

CREATE TABLE "draft_budgets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "draft_id" uuid,
  "budget_status" varchar,
  "total_budget" numeric,
  "total_items" int,
  "mandatory_component_check" boolean,
  "budget_completed_at" timestamp,
  "created_at" timestamp,
  "updated_at" timestamp,
  "last_saved_at" timestamp
);

CREATE TABLE "draft_budget_items" (
  "item_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "draft_id" uuid,
  "category_id" uuid,
  "item_name" text,
  "volume" numeric,
  "unit" varchar,
  "budget_component" varchar,
  "unit_price" numeric,
  "total_price" numeric,
  "notes" text
);

CREATE TABLE "budget_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar
);

CREATE TABLE "draft_outputs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "draft_id" uuid,
  "output_type" output_type_enum,
  "output_category" varchar,
  "output_title" varchar,
  "target_year" int,
  "description" text,
  "created_at" timestamp,
  "updated_at" timestamp,
  "last_saved_at" timestamp
);

CREATE TABLE "draft_journal_outputs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "output_id" uuid,
  "title" text,
  "target_journal" varchar,
  "indexing_target" varchar
);

CREATE TABLE "draft_proceeding_outputs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "output_id" uuid,
  "title" text,
  "target_conference" varchar
);

CREATE TABLE "draft_book_outputs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "output_id" uuid,
  "title" text,
  "publisher_plan" varchar
);

CREATE TABLE "draft_hki_outputs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "output_id" uuid,
  "title" text,
  "hki_type" varchar
);

CREATE TABLE "draft_product_outputs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "output_id" uuid,
  "product_name" varchar,
  "technology_field" varchar
);

CREATE TABLE "draft_files" (
  "file_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "draft_id" uuid,
  "file_category" varchar,
  "file_context" varchar,
  "file_name" varchar,
  "file_path" text,
  "file_size" int,
  "file_type" varchar,
  "file_version" int,
  "uploaded_by" uuid,
  "uploaded_at" timestamp,
  "is_active" boolean
);

CREATE TABLE "research_submissions" (
  "submission_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "draft_id" uuid,
  "submitted_by" uuid,
  "submission_status" submission_status_enum,
  "submitted_at" timestamp
);

CREATE TABLE "submission_review_assignments" (
  "assignment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "submission_id" uuid,
  "reviewer_id" uuid,
  "assigned_by" uuid,
  "assigned_at" timestamp,
  "status" review_assignment_status_enum,
  "started_at" timestamp,
  "submitted_at" timestamp
);

CREATE TABLE "submission_reviews" (
  "review_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "assignment_id" uuid,
  "total_score" numeric,
  "recommendation" review_recommendation_enum,
  "review_notes" text,
  "submitted_at" timestamp
);

CREATE TABLE "review_score_details" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "review_id" uuid,
  "criteria_code" varchar,
  "criteria_score" int,
  "criteria_weight" numeric,
  "criteria_note" text
);

CREATE TABLE "review_criteria" (
  "criteria_code" varchar PRIMARY KEY,
  "criteria_name" varchar,
  "weight" numeric,
  "category" varchar
);

CREATE TABLE "submission_approval_decisions" (
  "decision_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "submission_id" uuid,
  "manager_id" uuid,
  "final_decision" final_decision_enum,
  "decision_notes" text,
  "decided_at" timestamp
);

CREATE TABLE "submission_review_summary" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "submission_id" uuid,
  "avg_score" numeric,
  "recommendation_summary" varchar,
  "final_decision" varchar,
  "decided_by" uuid,
  "decided_at" timestamp
);

CREATE TABLE "external_research" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "created_by" uuid,
  "activity_name" varchar,
  "research_title" varchar,
  "activity_year" int,
  "activity_status" varchar,
  "activity_type" varchar,
  "role_in_research" varchar,
  "organizer_origin" varchar,
  "funding_source" varchar,
  "funding_amount" numeric,
  "currency" varchar,
  "submission_status" varchar,
  "created_at" timestamp,
  "submitted_at" timestamp
);

CREATE TABLE "external_research_sdg" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "external_id" uuid,
  "sdg_code" varchar
);

CREATE TABLE "external_research_teaching" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "external_id" uuid,
  "course_name" varchar,
  "academic_year" varchar,
  "proof_file" text
);

CREATE TABLE "external_research_grants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "external_id" uuid,
  "grant_type" varchar,
  "grant_name" varchar,
  "grant_link" text,
  "research_status" varchar,
  "funding_amount" numeric,
  "created_at" timestamp
);

CREATE TABLE "external_research_partners" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "external_id" uuid,
  "partner_name" varchar,
  "partner_representative" varchar,
  "partner_origin" varchar,
  "created_at" timestamp
);

CREATE TABLE "external_research_universities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "external_id" uuid,
  "university_name" varchar,
  "origin" varchar,
  "mou_status" varchar,
  "created_at" timestamp
);

CREATE TABLE "external_research_independent" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "external_id" uuid,
  "independent_type" varchar,
  "created_at" timestamp
);

CREATE TABLE "external_research_outputs" (
  "output_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "external_id" uuid,
  "output_type" varchar,
  "title" text
);

CREATE TABLE "external_research_files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "external_id" uuid,
  "file_type" varchar,
  "file_url" text,
  "uploaded_by" uuid,
  "uploaded_at" timestamp
);

CREATE TABLE "research_master" (
  "research_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "source_draft_id" uuid,
  "title" varchar,
  "year" int,
  "created_by" uuid,
  "created_at" timestamp,
  "status" varchar
);

CREATE TABLE "research_details" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "research_id" uuid,
  "research_field" varchar,
  "research_type" varchar,
  "research_focus" text,
  "research_method" varchar,
  "research_scope" text
);

CREATE TABLE "research_partners" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "research_id" uuid,
  "partner_name" varchar,
  "partner_origin" varchar,
  "partner_role" varchar
);

CREATE TABLE "research_programs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "research_id" uuid,
  "program_name" varchar,
  "program_type" varchar
);

CREATE TABLE "research_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "research_id" uuid,
  "user_id" uuid,
  "role" varchar
);

CREATE TABLE "research_contracts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "research_id" uuid,
  "contract_number" varchar,
  "contract_file" text,
  "signed_contract_file" text,
  "contract_status" varchar,
  "uploaded_by" uuid,
  "signed_at" timestamp
);

CREATE TABLE "research_budget_items" (
  "item_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "research_id" uuid,
  "source_draft_item_id" uuid,
  "budget_category" varchar,
  "budget_component" varchar,
  "item_name" text,
  "volume" numeric,
  "unit" varchar,
  "unit_price" numeric,
  "total_price" numeric,
  "notes" text,
  "is_locked" boolean,
  "created_at" timestamp,
  "updated_at" timestamp
);

CREATE TABLE "research_additional_info" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "research_id" uuid,
  "funding_source" varchar,
  "funding_amount" numeric,
  "organizer_origin" varchar
);

CREATE TABLE "output_realizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "research_id" uuid,
  "planned_output_id" uuid,
  "title" varchar,
  "year" int,
  "status" varchar,
  "link" text,
  "created_at" timestamp
);

CREATE TABLE "output_realization_files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "realization_id" uuid,
  "file_type" varchar,
  "file_url" text
);

CREATE TABLE "research_outputs" (
  "output_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "research_id" uuid,
  "output_type" varchar,
  "title" text,
  "year" int,
  "status" varchar,
  "created_by" uuid
);

CREATE TABLE "journal_outputs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "output_id" uuid,
  "title" text,
  "journal_name" varchar,
  "indexing" varchar,
  "status" varchar
);

CREATE TABLE "proceeding_outputs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "output_id" uuid,
  "title" text,
  "proceeding_name" varchar
);

CREATE TABLE "book_outputs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "output_id" uuid,
  "title" text,
  "publisher" varchar,
  "isbn" varchar
);

CREATE TABLE "hki_outputs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "output_id" uuid,
  "title" text,
  "registration_number" varchar,
  "status" varchar
);

CREATE TABLE "product_outputs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "output_id" uuid,
  "product_name" varchar,
  "technology_field" varchar
);

CREATE TABLE "research_reports" (
  "report_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "research_id" uuid,
  "report_type" varchar,
  "report_period" varchar,
  "progress_summary" text,
  "report_status" varchar,
  "review_notes" text,
  "reviewed_at" timestamp,
  "submitted_at" timestamp
);

CREATE TABLE "research_report_files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "report_id" uuid,
  "file_type" varchar,
  "file_url" text
);

CREATE TABLE "report_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "report_id" uuid,
  "reviewer_id" uuid,
  "decision" varchar,
  "notes" text,
  "reviewed_at" timestamp
);

CREATE TABLE "research_final_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "research_id" uuid,
  "document_type" varchar,
  "file_url" text,
  "uploaded_at" timestamp,
  "uploaded_by" uuid
);

CREATE TABLE "research_logbooks" (
  "logbook_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "research_id" uuid,
  "activity_date" date,
  "activity_title" varchar,
  "activity_description" text,
  "activity_type" varchar,
  "progress_percentage" int,
  "progress_note" text,
  "milestone_name" varchar,
  "location_type" varchar,
  "location_detail" text,
  "created_by" uuid,
  "created_at" timestamp,
  "updated_at" timestamp,
  "is_locked" boolean
);

CREATE TABLE "logbook_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "logbook_id" uuid,
  "member_id" uuid
);

CREATE TABLE "logbook_files" (
  "file_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "logbook_id" uuid,
  "file_type" varchar,
  "file_url" text,
  "uploaded_at" timestamp
);

CREATE TABLE "logbook_budget_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "logbook_id" uuid,
  "budget_item_id" uuid,
  "amount" numeric
);

CREATE TABLE "logbook_verifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "logbook_id" uuid,
  "is_verified" boolean,
  "verified_by" uuid,
  "verification_note" text,
  "verified_at" timestamp
);

CREATE TABLE "letter_requests" (
  "letter_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "research_id" uuid,
  "created_by" uuid,
  "letter_type" varchar,
  "letter_purpose" text,
  "letter_status" varchar,
  "submitted_at" timestamp
);

CREATE TABLE "letter_applicants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "letter_id" uuid,
  "user_id" uuid,
  "applicant_name" varchar,
  "applicant_role" varchar,
  "is_primary" boolean
);

CREATE TABLE "letter_research_assignment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "letter_id" uuid,
  "research_title" varchar,
  "research_year" int,
  "research_duration" varchar,
  "research_location" varchar,
  "research_role" varchar,
  "research_team" text
);

CREATE TABLE "letter_research_collaboration" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "letter_id" uuid,
  "partner_name" varchar,
  "partner_institution" varchar,
  "partner_country" varchar
);

CREATE TABLE "letter_research_grant" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "letter_id" uuid,
  "program_name" varchar,
  "program_url" varchar,
  "research_scheme" varchar
);

CREATE TABLE "letter_research_industry" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "letter_id" uuid,
  "partner_name" varchar,
  "partner_origin" varchar,
  "partner_scale" varchar
);

CREATE TABLE "letter_publication_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "letter_id" uuid,
  "publication_type" varchar,
  "title" text,
  "publication_name" varchar,
  "category" varchar,
  "indexing" varchar,
  "url" text,
  "publication_role" varchar,
  "author_position" varchar,
  "publication_status" varchar
);

CREATE TABLE "letter_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "letter_id" uuid,
  "event_name" varchar,
  "event_category" varchar,
  "event_location" varchar,
  "event_organizer" varchar,
  "role" varchar
);

CREATE TABLE "letter_product_outputs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "letter_id" uuid,
  "output_type" varchar,
  "title" varchar,
  "location" varchar,
  "organizer" varchar
);

CREATE TABLE "letter_support" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "letter_id" uuid,
  "recipient_name" varchar,
  "recipient_position" varchar,
  "event_datetime" timestamp,
  "activity_name" varchar,
  "activity_purpose" text
);

CREATE TABLE "letter_ethics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "letter_id" uuid,
  "submission_type" varchar
);

CREATE TABLE "letter_ethics_new" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "ethics_id" uuid,
  "research_title" varchar,
  "research_start_date" date
);

CREATE TABLE "letter_ethics_extension" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "ethics_id" uuid,
  "previous_clearance_id" uuid,
  "previous_clearance_number" varchar,
  "expiry_date" date
);

CREATE TABLE "letter_files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "letter_id" uuid,
  "file_type" varchar,
  "file_url" text,
  "uploaded_at" timestamp
);

CREATE TABLE "letter_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "letter_id" uuid,
  "reviewer_id" uuid,
  "decision" varchar,
  "notes" text
);

CREATE TABLE "letter_prechecks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "letter_id" uuid,
  "checked_by" uuid,
  "status" varchar
);

CREATE TABLE "system_activity_logs" (
  "log_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "action" varchar,
  "entity_type" varchar,
  "entity_id" uuid,
  "old_data" jsonb,
  "new_data" jsonb,
  "created_at" timestamp
);

CREATE TABLE "notifications" (
  "notification_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "research_id" uuid,
  "sender_id" uuid,
  "entity_type" varchar,
  "entity_id" uuid,
  "notification_type" varchar,
  "message" text,
  "is_read" boolean,
  "created_at" timestamp
);

CREATE TABLE "research_timelines" (
  "timeline_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "research_id" uuid,
  "report_type" varchar,
  "deadline_date" date,
  "is_open" boolean,
  "submission_status" varchar
);

CREATE TABLE "research_milestones" (
  "milestone_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "research_id" uuid,
  "milestone_name" varchar,
  "description" text,
  "target_date" date,
  "actual_date" date,
  "status" varchar,
  "created_at" timestamp
);

CREATE TABLE "research_monev" (
  "monev_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "research_id" uuid,
  "reviewer_id" uuid,
  "evaluation_type" varchar,
  "total_score" numeric,
  "recommendation_type" varchar,
  "recommendation_notes" text,
  "evaluated_at" timestamp
);

CREATE TABLE "monev_scores" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "monev_id" uuid,
  "criteria_name" varchar,
  "score" int,
  "weight" numeric,
  "notes" text
);

CREATE UNIQUE INDEX ON "user_roles" ("user_id", "role_id");

CREATE UNIQUE INDEX ON "researcher_expertise_map" ("profile_id", "expertise_id");

CREATE INDEX ON "research_drafts" ("user_id");

CREATE INDEX ON "research_drafts" ("scheme_id");

CREATE INDEX ON "draft_members" ("draft_id");

CREATE INDEX ON "draft_budget_items" ("draft_id");

CREATE INDEX ON "draft_outputs" ("draft_id", "output_type");

CREATE INDEX ON "draft_files" ("draft_id");

CREATE INDEX ON "research_submissions" ("draft_id");

CREATE INDEX ON "submission_review_assignments" ("submission_id");

CREATE INDEX ON "submission_review_assignments" ("reviewer_id");

CREATE INDEX ON "review_score_details" ("review_id");

CREATE INDEX ON "submission_approval_decisions" ("submission_id");

CREATE INDEX ON "external_research" ("user_id");

CREATE INDEX ON "external_research_sdg" ("external_id");

CREATE INDEX ON "external_research_teaching" ("external_id");

CREATE INDEX ON "external_research_grants" ("external_id");

CREATE INDEX ON "external_research_partners" ("external_id");

CREATE INDEX ON "external_research_universities" ("external_id");

CREATE INDEX ON "external_research_independent" ("external_id");

CREATE INDEX ON "external_research_files" ("external_id");

CREATE INDEX ON "research_master" ("created_by");

CREATE INDEX ON "research_budget_items" ("research_id");

CREATE INDEX ON "output_realizations" ("research_id");

CREATE INDEX ON "output_realizations" ("planned_output_id");

CREATE INDEX ON "research_reports" ("research_id");

CREATE INDEX ON "research_final_documents" ("research_id");

CREATE INDEX ON "research_logbooks" ("research_id");

CREATE INDEX ON "logbook_members" ("logbook_id");

CREATE INDEX ON "logbook_files" ("logbook_id");

CREATE INDEX ON "logbook_budget_links" ("logbook_id");

CREATE INDEX ON "logbook_verifications" ("logbook_id");

CREATE INDEX ON "letter_applicants" ("letter_id");

CREATE INDEX ON "research_milestones" ("research_id");

CREATE INDEX ON "research_monev" ("research_id");

CREATE INDEX ON "monev_scores" ("monev_id");

ALTER TABLE "user_roles" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_roles" ADD FOREIGN KEY ("role_id") REFERENCES "roles" ("role_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "researcher_profiles" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "researcher_profiles" ADD FOREIGN KEY ("last_updated_by") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "researcher_documents" ADD FOREIGN KEY ("profile_id") REFERENCES "researcher_profiles" ("profile_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "researcher_documents" ADD FOREIGN KEY ("uploaded_by") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "researcher_verifications" ADD FOREIGN KEY ("profile_id") REFERENCES "researcher_profiles" ("profile_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "researcher_verifications" ADD FOREIGN KEY ("admin_id") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "researcher_verifications" ADD FOREIGN KEY ("verified_by") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "researcher_status_history" ADD FOREIGN KEY ("profile_id") REFERENCES "researcher_profiles" ("profile_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "researcher_status_history" ADD FOREIGN KEY ("changed_by") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "researcher_expertise_map" ADD FOREIGN KEY ("profile_id") REFERENCES "researcher_profiles" ("profile_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "researcher_expertise_map" ADD FOREIGN KEY ("expertise_id") REFERENCES "researcher_expertise" ("expertise_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "admin_assignments" ADD FOREIGN KEY ("profile_id") REFERENCES "researcher_profiles" ("profile_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "admin_assignments" ADD FOREIGN KEY ("admin_id") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "admin_assignments" ADD FOREIGN KEY ("assigned_by") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "schemes" ADD FOREIGN KEY ("created_by") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scheme_filter_rules" ADD FOREIGN KEY ("scheme_id") REFERENCES "schemes" ("scheme_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scheme_filter_rules" ADD FOREIGN KEY ("created_by") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scheme_eligibility_snapshot" ADD FOREIGN KEY ("scheme_id") REFERENCES "schemes" ("scheme_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scheme_eligibility_snapshot" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "research_drafts" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "research_drafts" ADD FOREIGN KEY ("scheme_id") REFERENCES "schemes" ("scheme_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "research_drafts" ADD FOREIGN KEY ("created_by") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "research_outputs" ADD FOREIGN KEY ("created_by") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "research_members" ADD FOREIGN KEY ("research_id") REFERENCES "research_master" ("research_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "research_members" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "draft_projects" ADD FOREIGN KEY ("draft_id") REFERENCES "research_drafts" ("draft_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "draft_members" ADD FOREIGN KEY ("draft_id") REFERENCES "research_drafts" ("draft_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "draft_budgets" ADD FOREIGN KEY ("draft_id") REFERENCES "research_drafts" ("draft_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "draft_budget_items" ADD FOREIGN KEY ("draft_id") REFERENCES "research_drafts" ("draft_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "draft_budget_items" ADD FOREIGN KEY ("category_id") REFERENCES "budget_categories" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "draft_outputs" ADD FOREIGN KEY ("draft_id") REFERENCES "research_drafts" ("draft_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "draft_project_sdg" ADD FOREIGN KEY ("project_id") REFERENCES "draft_projects" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "draft_journal_outputs" ADD FOREIGN KEY ("output_id") REFERENCES "draft_outputs" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "draft_proceeding_outputs" ADD FOREIGN KEY ("output_id") REFERENCES "draft_outputs" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "draft_book_outputs" ADD FOREIGN KEY ("output_id") REFERENCES "draft_outputs" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "draft_hki_outputs" ADD FOREIGN KEY ("output_id") REFERENCES "draft_outputs" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "draft_product_outputs" ADD FOREIGN KEY ("output_id") REFERENCES "draft_outputs" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "draft_files" ADD FOREIGN KEY ("draft_id") REFERENCES "research_drafts" ("draft_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "draft_files" ADD FOREIGN KEY ("uploaded_by") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "research_submissions" ADD FOREIGN KEY ("draft_id") REFERENCES "research_drafts" ("draft_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "research_submissions" ADD FOREIGN KEY ("submitted_by") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "submission_review_assignments" ADD FOREIGN KEY ("submission_id") REFERENCES "research_submissions" ("submission_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "submission_review_assignments" ADD FOREIGN KEY ("reviewer_id") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "submission_review_assignments" ADD FOREIGN KEY ("assigned_by") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "submission_reviews" ADD FOREIGN KEY ("assignment_id") REFERENCES "submission_review_assignments" ("assignment_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "review_score_details" ADD FOREIGN KEY ("review_id") REFERENCES "submission_reviews" ("review_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "review_score_details" ADD FOREIGN KEY ("criteria_code") REFERENCES "review_criteria" ("criteria_code") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "submission_approval_decisions" ADD FOREIGN KEY ("submission_id") REFERENCES "research_submissions" ("submission_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "submission_approval_decisions" ADD FOREIGN KEY ("manager_id") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "submission_review_summary" ADD FOREIGN KEY ("submission_id") REFERENCES "research_submissions" ("submission_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "submission_review_summary" ADD FOREIGN KEY ("decided_by") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "external_research" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "external_research" ADD FOREIGN KEY ("created_by") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "external_research_sdg" ADD FOREIGN KEY ("external_id") REFERENCES "external_research" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "external_research_teaching" ADD FOREIGN KEY ("external_id") REFERENCES "external_research" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "external_research_grants" ADD FOREIGN KEY ("external_id") REFERENCES "external_research" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "external_research_partners" ADD FOREIGN KEY ("external_id") REFERENCES "external_research" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "external_research_universities" ADD FOREIGN KEY ("external_id") REFERENCES "external_research" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "external_research_independent" ADD FOREIGN KEY ("external_id") REFERENCES "external_research" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "external_research_files" ADD FOREIGN KEY ("external_id") REFERENCES "external_research" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "external_research_files" ADD FOREIGN KEY ("uploaded_by") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "external_research_outputs" ADD FOREIGN KEY ("external_id") REFERENCES "external_research" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "research_master" ADD FOREIGN KEY ("source_draft_id") REFERENCES "research_drafts" ("draft_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "research_master" ADD FOREIGN KEY ("created_by") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "research_details" ADD FOREIGN KEY ("research_id") REFERENCES "research_master" ("research_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "research_partners" ADD FOREIGN KEY ("research_id") REFERENCES "research_master" ("research_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "research_programs" ADD FOREIGN KEY ("research_id") REFERENCES "research_master" ("research_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "research_contracts" ADD FOREIGN KEY ("research_id") REFERENCES "research_master" ("research_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "research_contracts" ADD FOREIGN KEY ("uploaded_by") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "research_report_files" ADD FOREIGN KEY ("report_id") REFERENCES "research_reports" ("report_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "research_budget_items" ADD FOREIGN KEY ("research_id") REFERENCES "research_master" ("research_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "research_budget_items" ADD FOREIGN KEY ("source_draft_item_id") REFERENCES "draft_budget_items" ("item_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "output_realizations" ADD FOREIGN KEY ("research_id") REFERENCES "research_master" ("research_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "output_realizations" ADD FOREIGN KEY ("planned_output_id") REFERENCES "research_outputs" ("output_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "output_realization_files" ADD FOREIGN KEY ("realization_id") REFERENCES "output_realizations" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "research_outputs" ADD FOREIGN KEY ("research_id") REFERENCES "research_master" ("research_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "journal_outputs" ADD FOREIGN KEY ("output_id") REFERENCES "research_outputs" ("output_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "proceeding_outputs" ADD FOREIGN KEY ("output_id") REFERENCES "research_outputs" ("output_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "book_outputs" ADD FOREIGN KEY ("output_id") REFERENCES "research_outputs" ("output_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "hki_outputs" ADD FOREIGN KEY ("output_id") REFERENCES "research_outputs" ("output_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "product_outputs" ADD FOREIGN KEY ("output_id") REFERENCES "research_outputs" ("output_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "research_reports" ADD FOREIGN KEY ("research_id") REFERENCES "research_master" ("research_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "report_reviews" ADD FOREIGN KEY ("report_id") REFERENCES "research_reports" ("report_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "report_reviews" ADD FOREIGN KEY ("reviewer_id") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "research_additional_info" ADD FOREIGN KEY ("research_id") REFERENCES "research_master" ("research_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "research_final_documents" ADD FOREIGN KEY ("research_id") REFERENCES "research_master" ("research_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "letter_requests" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "letter_requests" ADD FOREIGN KEY ("research_id") REFERENCES "research_master" ("research_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "letter_requests" ADD FOREIGN KEY ("created_by") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "letter_files" ADD FOREIGN KEY ("letter_id") REFERENCES "letter_requests" ("letter_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "letter_research_assignment" ADD FOREIGN KEY ("letter_id") REFERENCES "letter_requests" ("letter_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "letter_research_collaboration" ADD FOREIGN KEY ("letter_id") REFERENCES "letter_requests" ("letter_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "letter_research_grant" ADD FOREIGN KEY ("letter_id") REFERENCES "letter_requests" ("letter_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "letter_research_industry" ADD FOREIGN KEY ("letter_id") REFERENCES "letter_requests" ("letter_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "letter_publication_requests" ADD FOREIGN KEY ("letter_id") REFERENCES "letter_requests" ("letter_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "letter_events" ADD FOREIGN KEY ("letter_id") REFERENCES "letter_requests" ("letter_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "letter_product_outputs" ADD FOREIGN KEY ("letter_id") REFERENCES "letter_requests" ("letter_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "letter_support" ADD FOREIGN KEY ("letter_id") REFERENCES "letter_requests" ("letter_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "letter_ethics" ADD FOREIGN KEY ("letter_id") REFERENCES "letter_requests" ("letter_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "letter_ethics_new" ADD FOREIGN KEY ("ethics_id") REFERENCES "letter_ethics" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "letter_ethics_extension" ADD FOREIGN KEY ("ethics_id") REFERENCES "letter_ethics" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "letter_reviews" ADD FOREIGN KEY ("letter_id") REFERENCES "letter_requests" ("letter_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "letter_reviews" ADD FOREIGN KEY ("reviewer_id") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "letter_applicants" ADD FOREIGN KEY ("letter_id") REFERENCES "letter_requests" ("letter_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "letter_applicants" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "letter_prechecks" ADD FOREIGN KEY ("letter_id") REFERENCES "letter_requests" ("letter_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "letter_prechecks" ADD FOREIGN KEY ("checked_by") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "system_activity_logs" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "research_logbooks" ADD FOREIGN KEY ("research_id") REFERENCES "research_master" ("research_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "logbook_members" ADD FOREIGN KEY ("logbook_id") REFERENCES "research_logbooks" ("logbook_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "logbook_files" ADD FOREIGN KEY ("logbook_id") REFERENCES "research_logbooks" ("logbook_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "logbook_budget_links" ADD FOREIGN KEY ("logbook_id") REFERENCES "research_logbooks" ("logbook_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "logbook_budget_links" ADD FOREIGN KEY ("budget_item_id") REFERENCES "research_budget_items" ("item_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "logbook_verifications" ADD FOREIGN KEY ("logbook_id") REFERENCES "research_logbooks" ("logbook_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "logbook_members" ADD FOREIGN KEY ("member_id") REFERENCES "research_members" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "research_milestones" ADD FOREIGN KEY ("research_id") REFERENCES "research_master" ("research_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "research_monev" ADD FOREIGN KEY ("research_id") REFERENCES "research_master" ("research_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "monev_scores" ADD FOREIGN KEY ("monev_id") REFERENCES "research_monev" ("monev_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notifications" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notifications" ADD FOREIGN KEY ("research_id") REFERENCES "research_master" ("research_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "research_timelines" ADD FOREIGN KEY ("research_id") REFERENCES "research_master" ("research_id") DEFERRABLE INITIALLY IMMEDIATE;


-- Helpful defaults for local development.
ALTER TABLE "users" ALTER COLUMN "is_active" SET DEFAULT true;
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT now();

-- Compatibility columns used by the React mock adapters but absent from the initial draft DDL.
ALTER TABLE "letter_requests" ADD COLUMN IF NOT EXISTS "letter_number" varchar;
ALTER TABLE "letter_requests" ADD COLUMN IF NOT EXISTS "generated_file_url" text;
ALTER TABLE "letter_requests" ADD COLUMN IF NOT EXISTS "generated_at" timestamp;
ALTER TABLE "letter_requests" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();

ALTER TABLE "letter_reviews" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp DEFAULT now();
ALTER TABLE "letter_reviews" ADD COLUMN IF NOT EXISTS "checklist" jsonb;

ALTER TABLE "letter_prechecks" ADD COLUMN IF NOT EXISTS "checked_at" timestamp DEFAULT now();
ALTER TABLE "letter_prechecks" ADD COLUMN IF NOT EXISTS "errors" jsonb;

ALTER TABLE "external_research" ADD COLUMN IF NOT EXISTS "rip_relation" varchar;
ALTER TABLE "external_research" ADD COLUMN IF NOT EXISTS "tkt_target" int;
ALTER TABLE "external_research" ADD COLUMN IF NOT EXISTS "research_category" varchar;
ALTER TABLE "external_research" ADD COLUMN IF NOT EXISTS "review_notes" text;
ALTER TABLE "external_research" ADD COLUMN IF NOT EXISTS "reviewed_by" uuid;
ALTER TABLE "external_research" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp;
ALTER TABLE "external_research" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
ALTER TABLE "external_research" ADD CONSTRAINT "external_research_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "external_research_outputs" ADD COLUMN IF NOT EXISTS "year" int;
ALTER TABLE "external_research_outputs" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "external_research_outputs" ADD COLUMN IF NOT EXISTS "file_url" text;
ALTER TABLE "external_research_outputs" ADD COLUMN IF NOT EXISTS "link" text;

ALTER TABLE "external_research_files" ADD COLUMN IF NOT EXISTS "file_name" varchar;
ALTER TABLE "external_research_files" ADD COLUMN IF NOT EXISTS "file_size" int;
ALTER TABLE "external_research_files" ADD COLUMN IF NOT EXISTS "file_format" varchar;

ALTER TABLE "researcher_documents" ADD COLUMN IF NOT EXISTS "file_name" varchar;

-- Current user convenience privileges.
GRANT ALL ON SCHEMA public TO CURRENT_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO CURRENT_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO CURRENT_USER;

COMMIT;



-- RIS LPPM local demo seed.
-- Run after 01_ris_schema_reset_fixed.sql.
-- Demo password for all seeded accounts: password

SET search_path TO public;

INSERT INTO "roles" ("role_id", "role_name") VALUES
  ('00000000-0000-0000-0000-000000000001', 'super_admin'),
  ('00000000-0000-0000-0000-000000000002', 'lppm_admin'),
  ('00000000-0000-0000-0000-000000000003', 'reviewer'),
  ('00000000-0000-0000-0000-000000000004', 'researcher'),
  ('00000000-0000-0000-0000-000000000005', 'finance'),
  ('00000000-0000-0000-0000-000000000006', 'guest')
ON CONFLICT ("role_id") DO NOTHING;

INSERT INTO "users" ("user_id", "email", "password_hash", "is_active", "created_at", "updated_at") VALUES
  ('10000000-0000-0000-0000-000000000001', 'lecturer@umn.ac.id', crypt('password', gen_salt('bf')), true, now(), now()),
  ('10000000-0000-0000-0000-000000000002', 'admin@umn.ac.id', crypt('password', gen_salt('bf')), true, now(), now()),
  ('10000000-0000-0000-0000-000000000003', 'reviewer@umn.ac.id', crypt('password', gen_salt('bf')), true, now(), now()),
  ('10000000-0000-0000-0000-000000000004', 'manager@umn.ac.id', crypt('password', gen_salt('bf')), true, now(), now()),
  ('10000000-0000-0000-0000-000000000005', 'student@umn.ac.id', crypt('password', gen_salt('bf')), true, now(), now())
ON CONFLICT ("user_id") DO NOTHING;

INSERT INTO "user_roles" ("id", "user_id", "role_id") VALUES
  ('11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004'),
  ('11000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002'),
  ('11000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003'),
  ('11000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001'),
  ('11000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "researcher_profiles" (
  "profile_id", "user_id", "full_name", "front_title", "back_title", "nidn", "nik",
  "gender", "nationality", "institution_email", "phone_number", "faculty", "study_program",
  "unit", "position", "functional_position", "nip", "orcid", "google_scholar", "sinta_id",
  "profile_status", "profile_completeness", "verification_status", "last_updated_at", "last_updated_by",
  "created_at", "updated_at"
) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Budi Santoso', 'Dr.', '', '0312048501', '3671010101850001', 'Laki-laki', 'Indonesia', 'lecturer@umn.ac.id', '081234567890', 'Teknik dan Informatika', 'Sistem Informasi', 'LPPM', 'Dosen Fulltime', 'Lektor', '201203001', '0000-0002-1825-0097', 'https://scholar.google.com/citations?user=budi', '612001', 'active', 100, 'verified', now(), '10000000-0000-0000-0000-000000000002', now(), now()),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'Maya Putri', 'Dr.', '', '0308078602', null, 'Perempuan', 'Indonesia', 'reviewer@umn.ac.id', '081200000002', 'Teknik dan Informatika', 'Informatika', 'LPPM', 'Reviewer', 'Lektor Kepala', '201105002', '', '', '', 'active', 85, 'verified', now(), '10000000-0000-0000-0000-000000000002', now(), now()),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Admin LPPM', '', '', '0000000000', null, null, 'Indonesia', 'admin@umn.ac.id', '081200000003', 'LPPM', 'Administrasi Riset', 'LPPM', 'Admin LPPM', '', '', '', '', '', 'active', 80, 'verified', now(), '10000000-0000-0000-0000-000000000004', now(), now()),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'Kepala LPPM', '', '', '0000000001', null, null, 'Indonesia', 'manager@umn.ac.id', '081200000004', 'LPPM', 'Manajemen Riset', 'LPPM', 'Kepala LPPM', '', '', '', '', '', 'active', 80, 'verified', now(), '10000000-0000-0000-0000-000000000004', now(), now()),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', 'Ayu Larasati', '', '', '00000078910', null, 'Perempuan', 'Indonesia', 'student@umn.ac.id', '081200000005', 'Teknik dan Informatika', 'Sistem Informasi', 'Mahasiswa', 'Mahasiswa S1', '', '', '', '', '', 'draft', 45, 'pending', now(), '10000000-0000-0000-0000-000000000005', now(), now())
ON CONFLICT ("profile_id") DO NOTHING;

INSERT INTO "researcher_expertise" ("expertise_id", "name") VALUES
  ('30000000-0000-0000-0000-000000000001', 'Artificial Intelligence'),
  ('30000000-0000-0000-0000-000000000002', 'Machine Learning'),
  ('30000000-0000-0000-0000-000000000003', 'Computer Vision'),
  ('30000000-0000-0000-0000-000000000004', 'Digital Business'),
  ('30000000-0000-0000-0000-000000000005', 'Human Computer Interaction')
ON CONFLICT ("expertise_id") DO NOTHING;

INSERT INTO "researcher_expertise_map" ("id", "profile_id", "expertise_id") VALUES
  ('31000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002'),
  ('31000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "budget_categories" ("id", "name") VALUES
  ('40000000-0000-0000-0000-000000000001', 'Bahan dan Peralatan'),
  ('40000000-0000-0000-0000-000000000002', 'Pengumpulan Data'),
  ('40000000-0000-0000-0000-000000000003', 'Analisis Data'),
  ('40000000-0000-0000-0000-000000000004', 'Pelaporan dan Luaran')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "review_criteria" ("criteria_code", "criteria_name", "weight", "category") VALUES
  ('kejelasan_masalah', 'Kejelasan masalah', 10, 'Kualitas Proposal'),
  ('kebaruan_penelitian', 'Kebaruan penelitian', 10, 'Kualitas Proposal'),
  ('metodologi', 'Metodologi', 10, 'Kualitas Proposal'),
  ('kompetensi_ketua', 'Kompetensi ketua', 8, 'Kelayakan Tim'),
  ('komposisi_tim', 'Komposisi tim', 7, 'Kelayakan Tim'),
  ('kesesuaian_luaran', 'Kesesuaian Luaran Wajib', 10, 'Luaran Penelitian'),
  ('realisme_target', 'Realisme Target', 10, 'Luaran Penelitian'),
  ('kewajaran_biaya', 'Kewajaran Biaya', 10, 'Anggaran'),
  ('kesesuaian_kegiatan', 'Kesesuaian dengan Kegiatan', 10, 'Anggaran'),
  ('rip', 'RIP', 5, 'Kesesuaian Strategis'),
  ('sdg', 'SDG', 5, 'Kesesuaian Strategis'),
  ('research_center', 'Research Center', 5, 'Kesesuaian Strategis')
ON CONFLICT ("criteria_code") DO NOTHING;

INSERT INTO "schemes" (
  "scheme_id", "scheme_name", "scheme_description", "scheme_year", "scheme_start_date",
  "scheme_end_date", "registration_start_date", "registration_end_date", "scheme_status",
  "issued_at", "created_by", "created_at", "updated_at"
) VALUES
  ('50000000-0000-0000-0000-000000000001', 'Penelitian Dosen Pemula 2026', 'Pendanaan penelitian internal bagi dosen yang sedang membangun rekam jejak penelitian.', 2026, '2026-07-01', '2027-06-30', '2026-01-01 08:00:00', '2026-12-31 23:59:00', 'open', now(), '10000000-0000-0000-0000-000000000002', now(), now()),
  ('50000000-0000-0000-0000-000000000002', 'Hibah Penelitian Kompetitif Internal', 'Skema penelitian kompetitif untuk menghasilkan publikasi dan inovasi unggulan.', 2026, '2026-08-01', '2027-07-31', '2026-02-01 08:00:00', '2026-11-30 23:59:00', 'open', now(), '10000000-0000-0000-0000-000000000002', now(), now())
ON CONFLICT ("scheme_id") DO NOTHING;

INSERT INTO "scheme_eligibility_snapshot" ("id", "scheme_id", "user_id") VALUES
  ('51000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('51000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001')
ON CONFLICT ("id") DO NOTHING;


SELECT * FROM users;
SELECT * FROM roles;
SELECT * FROM researcher_profiles;
SELECT * FROM schemes;









-- 03_migrate_after_web_changes.sql
-- Incremental migration for RIS LPPM after the latest React Modul 1-4 changes.
-- Safe to run after your current schema script. It does NOT reset data.
-- Run in DBeaver connected to the RIS database, e.g. ris_lppm.

BEGIN;
SET search_path TO public;

-- ============================================================
-- 0. Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- ============================================================
-- 1. Users / account management changes
-- React Modul 4 now supports account deactivation and admin-created users.
-- ============================================================
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "full_name" varchar;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "activation_token" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "activation_expired_at" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_by" uuid;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deactivation_reason" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deactivated_by" uuid;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deactivated_at" timestamp;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_created_by_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_created_by_fkey"
      FOREIGN KEY ("created_by") REFERENCES "users" ("user_id")
      DEFERRABLE INITIALLY IMMEDIATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_deactivated_by_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_deactivated_by_fkey"
      FOREIGN KEY ("deactivated_by") REFERENCES "users" ("user_id")
      DEFERRABLE INITIALLY IMMEDIATE;
  END IF;
END $$;

-- ============================================================
-- 2. Modul 1 proposal wizard changes
-- New web code stores multiple additional outputs and richer output plan metadata.
-- ============================================================
ALTER TABLE "draft_projects" ADD COLUMN IF NOT EXISTS "additional_output_plans" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "draft_projects" ADD COLUMN IF NOT EXISTS "research_center_other" varchar;

ALTER TABLE "draft_outputs" ADD COLUMN IF NOT EXISTS "plan_value" varchar;
ALTER TABLE "draft_outputs" ADD COLUMN IF NOT EXISTS "plan_label" varchar;
ALTER TABLE "draft_outputs" ADD COLUMN IF NOT EXISTS "plan_type" varchar;
ALTER TABLE "draft_outputs" ADD COLUMN IF NOT EXISTS "details" jsonb DEFAULT '{}'::jsonb;

ALTER TABLE "draft_journal_outputs" ADD COLUMN IF NOT EXISTS "publication_type" varchar;
ALTER TABLE "draft_journal_outputs" ADD COLUMN IF NOT EXISTS "target_quartile" varchar;

ALTER TABLE "draft_book_outputs" ADD COLUMN IF NOT EXISTS "book_type" varchar;
ALTER TABLE "draft_book_outputs" ADD COLUMN IF NOT EXISTS "isbn_plan" varchar;

ALTER TABLE "draft_hki_outputs" ADD COLUMN IF NOT EXISTS "target_registration_year" int;

ALTER TABLE "draft_product_outputs" ADD COLUMN IF NOT EXISTS "target_tkt" int;
ALTER TABLE "draft_product_outputs" ADD COLUMN IF NOT EXISTS "expected_output_form" text;

-- Helpful uniqueness guard for one draft per user per scheme unless your backend allows resubmission.
CREATE UNIQUE INDEX IF NOT EXISTS "research_drafts_one_active_per_user_scheme"
ON "research_drafts" ("user_id", "scheme_id")
WHERE "draft_status" IN ('draft', 'submitted', 'under_review', 'revision');

-- ============================================================
-- 3. Modul 2 letter changes
-- Current web code has generated letters, precheck/review notes,
-- support letters with related research, and travel letter detail.
-- ============================================================
ALTER TABLE "letter_requests" ADD COLUMN IF NOT EXISTS "letter_number" varchar;
ALTER TABLE "letter_requests" ADD COLUMN IF NOT EXISTS "generated_file_url" text;
ALTER TABLE "letter_requests" ADD COLUMN IF NOT EXISTS "generated_at" timestamp;
ALTER TABLE "letter_requests" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();

ALTER TABLE "letter_files" ADD COLUMN IF NOT EXISTS "file_name" varchar;
ALTER TABLE "letter_files" ADD COLUMN IF NOT EXISTS "file_size" int;
ALTER TABLE "letter_files" ADD COLUMN IF NOT EXISTS "file_format" varchar;

ALTER TABLE "letter_reviews" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp DEFAULT now();
ALTER TABLE "letter_reviews" ADD COLUMN IF NOT EXISTS "checklist" jsonb DEFAULT '{}'::jsonb;

ALTER TABLE "letter_prechecks" ADD COLUMN IF NOT EXISTS "checked_at" timestamp DEFAULT now();
ALTER TABLE "letter_prechecks" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "letter_prechecks" ADD COLUMN IF NOT EXISTS "errors" jsonb DEFAULT '[]'::jsonb;

ALTER TABLE "letter_support" ADD COLUMN IF NOT EXISTS "related_research_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'letter_support_related_research_id_fkey'
  ) THEN
    ALTER TABLE "letter_support"
      ADD CONSTRAINT "letter_support_related_research_id_fkey"
      FOREIGN KEY ("related_research_id") REFERENCES "research_master" ("research_id")
      DEFERRABLE INITIALLY IMMEDIATE;
  END IF;
END $$;

-- The React adapter already has travel_letters as a target detail table,
-- but the previous DDL did not create it.
CREATE TABLE IF NOT EXISTS "travel_letters" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "letter_id" uuid NOT NULL,
  "related_research_id" uuid,
  "activity_name" varchar,
  "travel_destination" varchar,
  "departure_date" date,
  "return_date" date,
  "transport_mode" varchar,
  "activity_purpose" text,
  "funding_source" varchar,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'travel_letters_letter_id_fkey'
  ) THEN
    ALTER TABLE "travel_letters"
      ADD CONSTRAINT "travel_letters_letter_id_fkey"
      FOREIGN KEY ("letter_id") REFERENCES "letter_requests" ("letter_id")
      ON DELETE CASCADE
      DEFERRABLE INITIALLY IMMEDIATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'travel_letters_related_research_id_fkey'
  ) THEN
    ALTER TABLE "travel_letters"
      ADD CONSTRAINT "travel_letters_related_research_id_fkey"
      FOREIGN KEY ("related_research_id") REFERENCES "research_master" ("research_id")
      DEFERRABLE INITIALLY IMMEDIATE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "travel_letters_letter_id_idx" ON "travel_letters" ("letter_id");

-- ============================================================
-- 4. Modul 3 external/independent research reporting changes
-- Previous script already added some columns; this migration completes review/files/output compatibility.
-- ============================================================
ALTER TABLE "external_research" ADD COLUMN IF NOT EXISTS "rip_relation" varchar;
ALTER TABLE "external_research" ADD COLUMN IF NOT EXISTS "tkt_target" int;
ALTER TABLE "external_research" ADD COLUMN IF NOT EXISTS "research_category" varchar;
ALTER TABLE "external_research" ADD COLUMN IF NOT EXISTS "review_notes" text;
ALTER TABLE "external_research" ADD COLUMN IF NOT EXISTS "reviewed_by" uuid;
ALTER TABLE "external_research" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp;
ALTER TABLE "external_research" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'external_research_reviewed_by_fkey'
  ) THEN
    ALTER TABLE "external_research"
      ADD CONSTRAINT "external_research_reviewed_by_fkey"
      FOREIGN KEY ("reviewed_by") REFERENCES "users" ("user_id")
      DEFERRABLE INITIALLY IMMEDIATE;
  END IF;
END $$;

ALTER TABLE "external_research_outputs" ADD COLUMN IF NOT EXISTS "year" int;
ALTER TABLE "external_research_outputs" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "external_research_outputs" ADD COLUMN IF NOT EXISTS "file_url" text;
ALTER TABLE "external_research_outputs" ADD COLUMN IF NOT EXISTS "link" text;

ALTER TABLE "external_research_files" ADD COLUMN IF NOT EXISTS "file_name" varchar;
ALTER TABLE "external_research_files" ADD COLUMN IF NOT EXISTS "file_size" int;
ALTER TABLE "external_research_files" ADD COLUMN IF NOT EXISTS "file_format" varchar;
ALTER TABLE "external_research_files" ADD COLUMN IF NOT EXISTS "mime_type" varchar;

CREATE TABLE IF NOT EXISTS "external_research_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "external_id" uuid NOT NULL,
  "reviewer_id" uuid,
  "decision" varchar,
  "notes" text,
  "checklist" jsonb DEFAULT '{}'::jsonb,
  "reviewed_at" timestamp DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'external_research_reviews_external_id_fkey'
  ) THEN
    ALTER TABLE "external_research_reviews"
      ADD CONSTRAINT "external_research_reviews_external_id_fkey"
      FOREIGN KEY ("external_id") REFERENCES "external_research" ("id")
      ON DELETE CASCADE
      DEFERRABLE INITIALLY IMMEDIATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'external_research_reviews_reviewer_id_fkey'
  ) THEN
    ALTER TABLE "external_research_reviews"
      ADD CONSTRAINT "external_research_reviews_reviewer_id_fkey"
      FOREIGN KEY ("reviewer_id") REFERENCES "users" ("user_id")
      DEFERRABLE INITIALLY IMMEDIATE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "external_research_reviews_external_id_idx"
ON "external_research_reviews" ("external_id");

-- ============================================================
-- 5. Modul 4 researcher profile changes
-- New web code supports profile photo, document file names, profile deactivation, and email outbox.
-- ============================================================
ALTER TABLE "researcher_profiles" ADD COLUMN IF NOT EXISTS "profile_photo_url" text;
ALTER TABLE "researcher_profiles" ADD COLUMN IF NOT EXISTS "profile_photo_name" varchar;

ALTER TABLE "researcher_documents" ADD COLUMN IF NOT EXISTS "file_name" varchar;

-- Optional email queue used by the React demo state. Production backend can replace this with SMTP/service provider.
CREATE TABLE IF NOT EXISTS "email_outbox" (
  "email_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "recipient_user_id" uuid,
  "recipient_email" varchar,
  "subject" varchar,
  "body" text,
  "template_key" varchar,
  "payload" jsonb DEFAULT '{}'::jsonb,
  "status" varchar DEFAULT 'queued',
  "created_at" timestamp DEFAULT now(),
  "sent_at" timestamp,
  "error_message" text
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_outbox_recipient_user_id_fkey'
  ) THEN
    ALTER TABLE "email_outbox"
      ADD CONSTRAINT "email_outbox_recipient_user_id_fkey"
      FOREIGN KEY ("recipient_user_id") REFERENCES "users" ("user_id")
      DEFERRABLE INITIALLY IMMEDIATE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "email_outbox_status_idx" ON "email_outbox" ("status");
CREATE INDEX IF NOT EXISTS "email_outbox_recipient_user_id_idx" ON "email_outbox" ("recipient_user_id");

-- ============================================================
-- 6. General useful indexes for the backend API layer
-- ============================================================
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");
CREATE INDEX IF NOT EXISTS "researcher_profiles_nidn_idx" ON "researcher_profiles" ("nidn");
CREATE INDEX IF NOT EXISTS "researcher_profiles_faculty_idx" ON "researcher_profiles" ("faculty");
CREATE INDEX IF NOT EXISTS "letter_requests_status_idx" ON "letter_requests" ("letter_status");
CREATE INDEX IF NOT EXISTS "external_research_status_idx" ON "external_research" ("submission_status");

COMMIT;
