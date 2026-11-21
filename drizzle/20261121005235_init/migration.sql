CREATE TYPE "member_role" AS ENUM('owner', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "project_status" AS ENUM('uploading', 'queued', 'processing', 'awaiting_cast', 'synthesizing', 'in_review', 'rendering', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "upload_kind" AS ENUM('voice_sample', 'project_video');--> statement-breakpoint
CREATE TYPE "upload_status" AS ENUM('pending', 'completed', 'aborted', 'expired');--> statement-breakpoint
CREATE TYPE "voice_status" AS ENUM('draft', 'cloning', 'verification_required', 'ready', 'failed', 'deleting');--> statement-breakpoint
CREATE TYPE "asset_kind" AS ENUM('source_video', 'dialogue_track', 'background_track', 'transcript', 'analysis', 'dubbed_track', 'segment_audio', 'export_video');--> statement-breakpoint
CREATE TYPE "gender" AS ENUM('male', 'female', 'unknown');--> statement-breakpoint
CREATE TYPE "review_status" AS ENUM('pending', 'approved', 'flagged');--> statement-breakpoint
CREATE TYPE "version_status" AS ENUM('pending', 'generating', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "pipeline_stage" AS ENUM('validate', 'extract_audio', 'analyze_video', 'transcribe', 'separate_stems', 'segmentize', 'translate', 'synthesize', 'mix', 'mux', 'export');--> statement-breakpoint
CREATE TYPE "run_status" AS ENUM('queued', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "export_status" AS ENUM('rendering', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "studios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "studio_members" (
	"studio_id" uuid,
	"user_id" uuid,
	"role" "member_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "studio_members_pkey" PRIMARY KEY("studio_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"studio_id" uuid NOT NULL,
	"title" varchar NOT NULL,
	"status" "project_status" DEFAULT 'uploading'::"project_status" NOT NULL,
	"source_lang" varchar DEFAULT 'en' NOT NULL,
	"target_lang" varchar DEFAULT 'ar' NOT NULL,
	"created_by" uuid NOT NULL,
	"duration_ms" integer,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"studio_id" uuid NOT NULL,
	"kind" "upload_kind" NOT NULL,
	"content_type" varchar NOT NULL,
	"voice_id" uuid,
	"project_id" uuid,
	"expected_size_bytes" bigint NOT NULL,
	"r2_key" varchar NOT NULL UNIQUE,
	"multipart_upload_id" varchar,
	"part_size_bytes" integer,
	"status" "upload_status" DEFAULT 'pending'::"upload_status" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kind_check" CHECK ((((("kind" = 'project_video') and (("voice_id" is null)))) or ((("kind" = 'voice_sample') and (("project_id" is null))))))
);
--> statement-breakpoint
CREATE TABLE "voices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"studio_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"name" varchar(30) NOT NULL,
	"sample_duration_ms" integer NOT NULL,
	"provider_voice_id" varchar UNIQUE,
	"status" "voice_status" DEFAULT 'draft'::"voice_status" NOT NULL,
	"r2_sample_key" varchar NOT NULL UNIQUE,
	"consent_speaker_name" varchar(30),
	"consent_confirmed_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"project_id" uuid NOT NULL,
	"kind" "asset_kind" NOT NULL,
	"content_type" varchar NOT NULL,
	"size_bytes" bigint NOT NULL,
	"r2_key" varchar NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"gender" "gender" DEFAULT 'unknown'::"gender" NOT NULL,
	"project_id" uuid NOT NULL,
	"voice_id" uuid,
	"provider_speaker_id" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"project_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"start_ms" integer NOT NULL,
	"end_ms" integer NOT NULL,
	"source_text" varchar NOT NULL,
	"emotion" varchar NOT NULL,
	"review_status" "review_status" DEFAULT 'pending'::"review_status" NOT NULL,
	"current_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "segment_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"segment_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"voice_id" uuid,
	"duration_ms" integer,
	"translated_text" varchar NOT NULL,
	"seed" bigint,
	"emotion" varchar NOT NULL,
	"status" "version_status" DEFAULT 'pending'::"version_status" NOT NULL,
	"audio_asset_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "segment_versions_segment_id_version_unique" UNIQUE("segment_id","version")
);
--> statement-breakpoint
CREATE TABLE "stage_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"project_id" uuid NOT NULL,
	"input_hash" varchar NOT NULL,
	"vendor_request_id" varchar,
	"stage" "pipeline_stage" NOT NULL,
	"status" "run_status" NOT NULL,
	"error" varchar,
	"attempts_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stage_runs_project_id_stage_input_hash_unique" UNIQUE("project_id","stage","input_hash")
);
--> statement-breakpoint
CREATE TABLE "exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"project_id" uuid NOT NULL,
	"video_asset_id" uuid,
	"status" "export_status" DEFAULT 'rendering'::"export_status" NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "studio_members_user_id_index" ON "studio_members" ("user_id");--> statement-breakpoint
CREATE INDEX "projects_studio_id_created_at_index" ON "projects" ("studio_id","created_at");--> statement-breakpoint
CREATE INDEX "uploads_status_expires_at_index" ON "uploads" ("status","expires_at");--> statement-breakpoint
CREATE INDEX "uploads_studio_id_created_at_index" ON "uploads" ("studio_id","created_at");--> statement-breakpoint
CREATE INDEX "uploads_project_id_index" ON "uploads" ("project_id");--> statement-breakpoint
CREATE INDEX "uploads_voice_id_index" ON "uploads" ("voice_id");--> statement-breakpoint
CREATE INDEX "voices_studio_id_status_index" ON "voices" ("studio_id","status");--> statement-breakpoint
CREATE INDEX "assets_project_id_kind_index" ON "assets" ("project_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "characters_project_id_provider_speaker_id_index" ON "characters" ("project_id","provider_speaker_id");--> statement-breakpoint
CREATE INDEX "characters_voice_id_index" ON "characters" ("voice_id");--> statement-breakpoint
CREATE INDEX "segments_project_id_start_ms_index" ON "segments" ("project_id","start_ms");--> statement-breakpoint
CREATE INDEX "segments_character_id_index" ON "segments" ("character_id");--> statement-breakpoint
CREATE INDEX "segments_current_version_id_index" ON "segments" ("current_version_id");--> statement-breakpoint
CREATE INDEX "segment_versions_segment_id_created_at_index" ON "segment_versions" ("segment_id","created_at");--> statement-breakpoint
CREATE INDEX "segment_versions_audio_asset_id_index" ON "segment_versions" ("audio_asset_id");--> statement-breakpoint
CREATE INDEX "segment_versions_voice_id_index" ON "segment_versions" ("voice_id");--> statement-breakpoint
CREATE INDEX "stage_runs_project_id_stage_created_at_index" ON "stage_runs" ("project_id","stage","created_at");--> statement-breakpoint
CREATE INDEX "exports_project_id_created_at_index" ON "exports" ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "exports_video_asset_id_index" ON "exports" ("video_asset_id");--> statement-breakpoint
ALTER TABLE "studio_members" ADD CONSTRAINT "studio_members_studio_id_studios_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_studio_id_studios_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id");--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_studio_id_studios_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id");--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_voice_id_voices_id_fkey" FOREIGN KEY ("voice_id") REFERENCES "voices"("id");--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_project_id_projects_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "voices" ADD CONSTRAINT "voices_studio_id_studios_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_project_id_projects_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_project_id_projects_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_voice_id_voices_id_fkey" FOREIGN KEY ("voice_id") REFERENCES "voices"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "segments" ADD CONSTRAINT "segments_project_id_projects_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "segments" ADD CONSTRAINT "segments_character_id_characters_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id");--> statement-breakpoint
ALTER TABLE "segments" ADD CONSTRAINT "segments_current_version_id_segment_versions_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "segment_versions"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "segment_versions" ADD CONSTRAINT "segment_versions_segment_id_segments_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "segments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "segment_versions" ADD CONSTRAINT "segment_versions_voice_id_voices_id_fkey" FOREIGN KEY ("voice_id") REFERENCES "voices"("id");--> statement-breakpoint
ALTER TABLE "segment_versions" ADD CONSTRAINT "segment_versions_audio_asset_id_assets_id_fkey" FOREIGN KEY ("audio_asset_id") REFERENCES "assets"("id");--> statement-breakpoint
ALTER TABLE "stage_runs" ADD CONSTRAINT "stage_runs_project_id_projects_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_project_id_projects_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_video_asset_id_assets_id_fkey" FOREIGN KEY ("video_asset_id") REFERENCES "assets"("id");