// Charging Protocol DTOs (CCS, CHAdeMO, Type 2, etc.)

export interface ChargingProtocolDto {
  id: number;
  name: string;
}

export interface CreateChargingProtocolDto {
  name: string;
}

export interface UpdateChargingProtocolDto {
  name: string;
}
