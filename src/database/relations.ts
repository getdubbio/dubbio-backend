import { defineRelations } from "drizzle-orm";
import {
  assetsTable,
  charactersTable,
  exportsTable,
  projectsTable,
  segmentsTable,
  segmentVersionsTable,
  stageRunsTable,
  studioMembersTable,
  studiosTable,
  uploadsTable,
  voicesTable,
} from "./schema/index.schema.js";

export const relations = defineRelations(
  {
    assetsTable,
    charactersTable,
    exportsTable,
    projectsTable,
    segmentsTable,
    segmentVersionsTable,
    stageRunsTable,
    studioMembersTable,
    studiosTable,
    uploadsTable,
    voicesTable,
  },
  (r) => ({
    studiosTable: {
      members: r.many.studioMembersTable({
        from: r.studiosTable.id,
        to: r.studioMembersTable.studioId,
      }),
      projects: r.many.projectsTable({
        from: r.studiosTable.id,
        to: r.projectsTable.studioId,
      }),
      voices: r.many.voicesTable({
        from: r.studiosTable.id,
        to: r.voicesTable.studioId,
      }),
      uploads: r.many.uploadsTable({
        from: r.studiosTable.id,
        to: r.uploadsTable.studioId,
      }),
    },
    studioMembersTable: {
      studio: r.one.studiosTable({
        from: r.studioMembersTable.studioId,
        to: r.studiosTable.id,
        optional: false,
      }),
      // TODO(auth): add user and creator relations once the better-auth
      // users table is part of this schema.
    },
    projectsTable: {
      studio: r.one.studiosTable({
        from: r.projectsTable.studioId,
        to: r.studiosTable.id,
        optional: false,
      }),
      stageRuns: r.many.stageRunsTable({
        from: r.projectsTable.id,
        to: r.stageRunsTable.projectId,
      }),
      assets: r.many.assetsTable({
        from: r.projectsTable.id,
        to: r.assetsTable.projectId,
      }),
      uploads: r.many.uploadsTable({
        from: r.projectsTable.id,
        to: r.uploadsTable.projectId,
      }),
      characters: r.many.charactersTable({
        from: r.projectsTable.id,
        to: r.charactersTable.projectId,
      }),
      segments: r.many.segmentsTable({
        from: r.projectsTable.id,
        to: r.segmentsTable.projectId,
      }),
      exports: r.many.exportsTable({
        from: r.projectsTable.id,
        to: r.exportsTable.projectId,
      }),
    },
    voicesTable: {
      studio: r.one.studiosTable({
        from: r.voicesTable.studioId,
        to: r.studiosTable.id,
        optional: false,
      }),
      uploads: r.many.uploadsTable({
        from: r.voicesTable.id,
        to: r.uploadsTable.voiceId,
      }),
      characters: r.many.charactersTable({
        from: r.voicesTable.id,
        to: r.charactersTable.voiceId,
      }),
      segmentVersions: r.many.segmentVersionsTable({
        from: r.voicesTable.id,
        to: r.segmentVersionsTable.voiceId,
      }),
    },
    uploadsTable: {
      studio: r.one.studiosTable({
        from: r.uploadsTable.studioId,
        to: r.studiosTable.id,
        optional: false,
      }),
      project: r.one.projectsTable({
        from: r.uploadsTable.projectId,
        to: r.projectsTable.id,
      }),
      voice: r.one.voicesTable({
        from: r.uploadsTable.voiceId,
        to: r.voicesTable.id,
      }),
    },
    assetsTable: {
      project: r.one.projectsTable({
        from: r.assetsTable.projectId,
        to: r.projectsTable.id,
        optional: false,
      }),
      segmentVersions: r.many.segmentVersionsTable({
        from: r.assetsTable.id,
        to: r.segmentVersionsTable.audioAssetId,
      }),
      exports: r.many.exportsTable({
        from: r.assetsTable.id,
        to: r.exportsTable.videoAssetId,
      }),
    },
    charactersTable: {
      project: r.one.projectsTable({
        from: r.charactersTable.projectId,
        to: r.projectsTable.id,
        optional: false,
      }),
      voice: r.one.voicesTable({
        from: r.charactersTable.voiceId,
        to: r.voicesTable.id,
      }),
      segments: r.many.segmentsTable({
        from: r.charactersTable.id,
        to: r.segmentsTable.characterId,
      }),
    },
    segmentsTable: {
      project: r.one.projectsTable({
        from: r.segmentsTable.projectId,
        to: r.projectsTable.id,
        optional: false,
      }),
      character: r.one.charactersTable({
        from: r.segmentsTable.characterId,
        to: r.charactersTable.id,
        optional: false,
      }),
      versions: r.many.segmentVersionsTable({
        from: r.segmentsTable.id,
        to: r.segmentVersionsTable.segmentId,
      }),
      currentVersion: r.one.segmentVersionsTable({
        from: r.segmentsTable.currentVersionId,
        to: r.segmentVersionsTable.id,
      }),
    },
    segmentVersionsTable: {
      segment: r.one.segmentsTable({
        from: r.segmentVersionsTable.segmentId,
        to: r.segmentsTable.id,
        optional: false,
      }),
      voice: r.one.voicesTable({
        from: r.segmentVersionsTable.voiceId,
        to: r.voicesTable.id,
      }),
      audioAsset: r.one.assetsTable({
        from: r.segmentVersionsTable.audioAssetId,
        to: r.assetsTable.id,
      }),
    },
    stageRunsTable: {
      project: r.one.projectsTable({
        from: r.stageRunsTable.projectId,
        to: r.projectsTable.id,
        optional: false,
      }),
    },
    exportsTable: {
      project: r.one.projectsTable({
        from: r.exportsTable.projectId,
        to: r.projectsTable.id,
        optional: false,
      }),
      videoAsset: r.one.assetsTable({
        from: r.exportsTable.videoAssetId,
        to: r.assetsTable.id,
      }),
    },
  }),
);
