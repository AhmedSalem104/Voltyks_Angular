// Public status (GET /api/v1/app-config/registration-status)
export interface AdminsModeStatusDto {
  adminsModeActivated: boolean;
  registrationEnabled: boolean;
  message: string;
}

export interface AdminsModeStatusResponse {
  status: boolean;
  message: string;
  data: AdminsModeStatusDto;
  errors: any;
}

// Admin settings (GET/PATCH /api/admin/settings/admins-mode)
export interface AdminAdminsModeDto {
  adminsModeActivated: boolean;
  registrationEnabled: boolean;
  message: string;
}

export interface UpdateAdminsModeDto {
  activated: boolean;
}

export interface AdminAdminsModeResponse {
  status: boolean;
  message: string;
  data: AdminAdminsModeDto;
  errors: any;
}
