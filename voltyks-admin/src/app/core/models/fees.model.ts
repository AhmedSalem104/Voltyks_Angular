// Fees Related DTOs

export interface AdminFeesDto {
  id: number;
  minimumFee: number;
  percentage: number;
  updatedAt: string;
  updatedBy: string | null;
}

export interface UpdateFeesDto {
  minimumFee: number;
  percentage: number;
}

export interface TransferFeesRequestDto {
  recipientUserId: string;
  amount: number;
  notes: string | null;
}
