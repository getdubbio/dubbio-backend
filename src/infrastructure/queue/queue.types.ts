export type BaseJobPayload = {
  studioId: string;
};

// TEMP
export type TestPingPayload = BaseJobPayload & {
  message: string;
};
