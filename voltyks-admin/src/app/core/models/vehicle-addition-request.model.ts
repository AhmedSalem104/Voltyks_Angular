export type VehicleAdditionRequestStatus = 'pending' | 'accepted' | 'declined';

export interface VehicleAdditionRequestDto {
  id: number;
  userId: string;
  userFullName: string;
  userEmail: string;
  userPhone: string;
  brandName: string;
  modelName: string;
  capacity: string;
  status: VehicleAdditionRequestStatus;
  createdAt: string;
  updatedAt: string | null;
  processedBy: string | null;
}

export interface PagedVehicleAdditionRequests {
  items: VehicleAdditionRequestDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface PagedVehicleAdditionRequestsResponse {
  status: boolean;
  message: string;
  data: PagedVehicleAdditionRequests;
  errors: any;
}

export interface VehicleAdditionRequestResponse {
  status: boolean;
  message: string;
  data: VehicleAdditionRequestDto;
  errors: any;
}

export interface AcceptVehicleAdditionRequestResult {
  requestId: number;
  brandId: number;
  modelId: number;
}

export interface AcceptVehicleAdditionRequestResponse {
  status: boolean;
  message: string;
  data: AcceptVehicleAdditionRequestResult | null;
  errors: any;
}

export interface DeclineVehicleAdditionRequestResult {
  requestId: number;
}

export interface DeclineVehicleAdditionRequestResponse {
  status: boolean;
  message: string;
  data: DeclineVehicleAdditionRequestResult | null;
  errors: any;
}
