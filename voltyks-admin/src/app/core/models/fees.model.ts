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

export interface WalletTransactionDto {
  id: number;
  userId: string;
  userName: string;
  amount: number;
  transactionType: 'Add' | 'Deduct';
  notes: string | null;
  previousBalance: number;
  newBalance: number;
  createdByAdminId: string;
  createdAt: string;
}
