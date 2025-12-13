// User Related DTOs

export interface AdminUserDto {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  isBanned: boolean;
  isAvailable: boolean;
  rating: number;
  dateCreated: string;
}

export interface AdminUserDetailsDto {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  nationalId: string | null;
  isBanned: boolean;
  isAvailable: boolean;
  rating: number;
  ratingCount: number;
  wallet: number | null;
  dateCreated: string;
  totalChargers: number;
  totalVehicles: number;
  totalChargingRequests: number;
}

export interface AdminWalletDto {
  userId: string;
  fullName: string;
  walletBalance: number | null;
  lastUpdated: string;
}

export interface AdminUserVehicleDto {
  id: number;
  color: string;
  plate: string;
  year: number;
  creationDate: string;
  brandName: string;
  modelName: string;
  isDeleted: boolean;
}

export interface AdminUserReportDto {
  id: number;
  processId: number;
  reportDate: string;
  reportContent: string;
  isResolved: boolean;
}

export interface AddBalanceRequestDto {
  amount: number;
  notes: string | null;
}
