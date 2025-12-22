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
