export interface Credentials {
  clientId: string;
  clientSecret: string;
}

export interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

export type Bbox = [number, number, number, number];

export interface TimelapseRequest {
  bbox: Bbox;
  startDate: string;
  endDate: string;
  intervalDays: number;
  width: number;
  height: number;
}

export interface FrameResult {
  blob: Blob;
  from: string;
  to: string;
  index: number;
}
