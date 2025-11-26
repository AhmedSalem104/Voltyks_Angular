// Auth Related DTOs

export interface LoginDTO {
  emailOrPhone: string;
  password: string;
}

export interface UserLoginResultDto {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  city: string;
  token: string;
}

export interface RegisterDTO {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string;
  city: string;
}

export interface UserRegisterationResultDto {
  email: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface PhoneNumberDto {
  phoneNumber: string;
}

export interface EmailDto {
  email: string;
}

export interface TokenDto {
  token: string;
}

export interface ForgetPasswordDto {
  emailOrPhone: string;
}

export interface VerifyForgetPasswordOtpDto {
  phoneNumber: string;
  otpCode: string;
}

export interface ResetPasswordDto {
  phoneNumber: string;
  newPassword: string;
}

export interface UserDetailsDto {
  id: string;
  userName: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  isAvailable: boolean;
  isBanned: boolean;
  vehicles?: VehicleDto[];
  chargers?: ChargerDto[];
}

export interface VehicleDto {
  id: number;
  color: string;
  plate: string;
  year: number;
  brandName: string;
  modelName: string;
}

export interface ChargerDto {
  id: number;
  name: string;
  location: string;
  isAvailable: boolean;
}

export interface SendOtpDto {
  phoneNumber: string;
}

export interface VerifyOtpDto {
  phoneNumber: string;
  otpCode: string;
}
