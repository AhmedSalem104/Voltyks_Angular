// Admin Process DTOs - based on actual API response

export interface AdminProcessDto {
  // Process Info
  id: number;
  status: string;  // 'Pending' | 'Accepted' | 'InProgress' | 'Completed' | 'Aborted' | 'Rejected'
  requestStatus: string;
  requestedAt: string;
  confirmedAt: string | null;
  respondedAt: string | null;
  dateCreated: string;
  dateCompleted: string | null;

  // Request Details
  kwNeeded: number;
  currentBatteryPercentage: number;
  requestLatitude: number;
  requestLongitude: number;

  // Pricing
  estimatedPrice: number;
  requestEstimatedPrice: number;
  baseAmount: number;
  voltyksFees: number;
  amountCharged: number;
  amountPaid: number;

  // Vehicle Owner Info
  vehicleOwnerId: string;
  vehicleOwnerName: string;
  vehicleOwnerEmail: string;
  vehicleOwnerPhone: string;
  vehicleOwnerRating: number | null;
  vehicleOwnerUserRating: number | null;
  vehicleOwnerWallet: number;
  vehicleOwnerIsBanned: boolean;

  // Vehicle Info
  vehicleBrand: string;
  vehicleModel: string;
  vehicleColor: string;
  vehiclePlate: string;
  vehicleCapacity: number;
  vehicleYear: number;

  // Charger Owner Info
  chargerOwnerId: string;
  chargerOwnerName: string;
  chargerOwnerEmail: string;
  chargerOwnerPhone: string;
  chargerOwnerRating: number | null;
  chargerOwnerUserRating: number | null;
  chargerOwnerWallet: number;
  chargerOwnerIsBanned: boolean;

  // Charger Info
  chargerId: number;
  chargerRequestId: number;
  chargerProtocol: string;
  chargerCapacityKw: number;
  chargerPrice: number;
  chargerHasAdaptor: boolean;
  chargerIsActive: boolean;
  chargerRating: number;
  chargerArea: string;
  chargerStreet: string;
  chargerBuildingNumber: string;
  chargerLatitude: number;
  chargerLongitude: number;
}

// Filter params for client-side filtering
export interface ProcessFilterParams {
  startDate?: string;
  endDate?: string;
  status?: string;
  search?: string;
}

// Status options for filter dropdown
export const PROCESS_STATUS_OPTIONS = [
  { value: '', label: 'الكل' },
  { value: 'Pending', label: 'قيد الانتظار' },
  { value: 'Accepted', label: 'مقبول' },
  { value: 'InProgress', label: 'جاري التنفيذ' },
  { value: 'Completed', label: 'مكتمل' },
  { value: 'Aborted', label: 'ملغي' },
  { value: 'Rejected', label: 'مرفوض' }
];
