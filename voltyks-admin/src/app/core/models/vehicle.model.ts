// Vehicle Management DTOs

export interface AdminVehicleDto {
  id: number;
  color: string;
  plate: string;
  creationDate: string;
  year: number;
  isDeleted: boolean;
  brandId: number;
  brandName: string;
  modelId: number;
  modelName: string;
  modelCapacity: number;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
}

export interface AdminCreateVehicleDto {
  color: string;
  plate: string;
  year: number;
  brandId: number;
  modelId: number;
  userId: string;
}

export interface AdminUpdateVehicleDto {
  color?: string;
  plate?: string;
  year?: number;
  brandId?: number;
  modelId?: number;
  userId?: string;
}

export interface AdminVehiclesListDto {
  vehicles: AdminVehicleDto[];
  total: number;
  page: number;
  limit: number;
}
