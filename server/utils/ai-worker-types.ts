export interface AIWorker {
  id: string;
  platform: string;
  baseUrl: string;
  token: string;
  leaseHours: number;
  priority: number;
}
