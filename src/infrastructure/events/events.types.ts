export type DubbioEvent = {
  type: string;
  projectId?: string;
  data?: unknown;
};

export const eventsChannel = (studioId: string): string => `events:${studioId}`;
