export interface BackupResultDto {
  fileName: string;
  fileSizeKb: number;
  tablesCount: number;
  totalRows: number;
  durationMs: number;
}

export interface BackupFileDto {
  fileName: string;
  fileSizeKb: number;
  createdAt: string;
}
