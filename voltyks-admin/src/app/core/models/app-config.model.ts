// Legacy interfaces (backwards compatible)
export interface MobileAppConfigDto {
  mobile_app_enabled: boolean;
}

export interface UpdateMobileAppConfigDto {
  mobile_app_enabled: boolean;
}

export interface MobileAppConfigResponse {
  status: boolean;
  message: string;
  data: MobileAppConfigDto;
  errors: any;
}

// New Admin interfaces for platform-specific configuration
export interface AdminMobileConfigDto {
  android_enabled: boolean;
  ios_enabled: boolean;
  android_min_version: string | null;
  ios_min_version: string | null;
}

export interface UpdateAdminMobileConfigDto {
  android_enabled?: boolean;
  ios_enabled?: boolean;
  android_min_version?: string | null;
  ios_min_version?: string | null;
}

export interface AdminMobileConfigResponse {
  status: boolean;
  message: string;
  data: AdminMobileConfigDto;
  errors: any;
}

// ============ Charging Mode Configuration ============

// Public status response (GET /api/v1/app-config/charging-mode-status)
export interface ChargingModeConfigDto {
  charging_mode_enabled: boolean;
}

export interface ChargingModeConfigResponse {
  status: boolean;
  message: string;
  data: ChargingModeConfigDto;
  errors: any;
}

// Admin settings (GET/PATCH /api/admin/settings/charging-mode)
export interface AdminChargingModeDto {
  enabled: boolean;
}

export interface UpdateAdminChargingModeDto {
  enabled: boolean;
}

export interface AdminChargingModeResponse {
  status: boolean;
  message: string;
  data: AdminChargingModeDto;
  errors: any;
}
