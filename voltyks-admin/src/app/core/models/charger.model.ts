// Charger Management DTOs

export interface AdminChargerDto {
  id: number;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  protocolId: number;
  protocolName: string;
  capacityId: number;
  capacityKw: number;
  priceOptionId: number;
  priceValue: number;
  addressId: number;
  area: string;
  street: string;
  buildingNumber: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
  isDeleted: boolean;
  adaptor: boolean | null;
  averageRating: number;
  ratingCount: number;
  dateAdded: string;
}

export interface AdminCreateChargerDto {
  userId: string;
  protocolId: number;
  capacityId: number;
  priceOptionId: number;
  area: string;
  street: string;
  buildingNumber: string;
  latitude: number;
  longitude: number;
  isActive?: boolean;
  adaptor?: boolean | null;
}

export interface AdminUpdateChargerDto {
  userId?: string;
  protocolId?: number;
  capacityId?: number;
  priceOptionId?: number;
  area?: string;
  street?: string;
  buildingNumber?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
  adaptor?: boolean | null;
}

export interface AdminChargersListDto {
  chargers: AdminChargerDto[];
  total: number;
  page: number;
  limit: number;
}
