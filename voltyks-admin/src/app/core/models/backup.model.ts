export interface BackupResultDto {
  fileName: string;
  filePath: string;
  sizeMb: number;
  tablesExported: number;
  totalRows: number;
  durationSeconds: number;
  tableRowCounts: Record<string, number>;
}

export interface BackupFileDto {
  fileName: string;
  sizeMb: number;
  createdAt: string;
}

export interface BackupListDto {
  backupDirectory: string;
  count: number;
  files: BackupFileDto[];
}
