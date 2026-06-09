// ============ Anti-OTP Restriction Mode ============
// GET/PATCH /api/admin/settings/anti-otp-restriction-mode

export interface AdminAntiOtpRestrictionDto {
  antiOtpRestrictionMode: boolean;
  updatedBy?: string | null;
  updatedAt?: string | null;
  message?: string;
}

export interface UpdateAntiOtpRestrictionDto {
  enabled: boolean;
}

export interface AdminAntiOtpRestrictionResponse {
  status: boolean;
  message: string;
  data: AdminAntiOtpRestrictionDto;
  errors: any;
}

// ============ Anti-Payment Restriction Mode ============
// GET/PATCH /api/admin/settings/anti-payment-restriction-mode

export interface AdminAntiPaymentRestrictionDto {
  antiPaymentRestrictionMode: boolean;
  updatedBy?: string | null;
  updatedAt?: string | null;
  message?: string;
}

export interface UpdateAntiPaymentRestrictionDto {
  enabled: boolean;
}

export interface AdminAntiPaymentRestrictionResponse {
  status: boolean;
  message: string;
  data: AdminAntiPaymentRestrictionDto;
  errors: any;
}
