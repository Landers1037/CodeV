export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'failed'
  | 'completed'
  | 'cancelled';

export interface DownloadTask {
  id: string;
  toolId: string;
  url: string;
  fileName: string;
  targetPath: string;
  status: DownloadStatus;
  totalBytes: number;
  transferredBytes: number;
  createdAt: number;
  updatedAt: number;
  error: string;
}

