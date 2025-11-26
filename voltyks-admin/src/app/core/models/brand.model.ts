// Brand & Model Related DTOs

// Brand DTOs
export interface AdminBrandDto {
  id: number;
  name: string;
  logoUrl: string | null;
  totalModels: number;
}

export interface CreateBrandDto {
  name: string;
}

export interface UpdateBrandDto {
  name: string;
}

// Model DTOs
export interface AdminModelDto {
  id: number;
  name: string;
  brandId: number;
  brandName: string;
  capacity: number;
}

export interface CreateModelDto {
  name: string;
  brandId: number;
  capacity: number;
}

export interface UpdateModelDto {
  name: string;
  brandId: number;
  capacity: number;
}
