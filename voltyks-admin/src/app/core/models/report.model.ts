// Report Related DTOs

export interface AdminReportDto {
  id: number;
  processId: number;
  userId: string;
  userFullName: string;
  reportDate: string;
  reportContent: string;
  isResolved: boolean;
}

export interface AdminReportDetailsDto {
  id: number;
  processId: number;
  userId: string;
  userFullName: string;
  userEmail: string;
  userPhone: string;
  reportDate: string;
  reportContent: string;
  isResolved: boolean;
}

export interface ReportFilterParams {
  userId?: string;
  startDate?: string;
  endDate?: string;
  isResolved?: boolean;
}
