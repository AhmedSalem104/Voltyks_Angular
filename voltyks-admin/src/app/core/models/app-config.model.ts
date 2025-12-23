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
