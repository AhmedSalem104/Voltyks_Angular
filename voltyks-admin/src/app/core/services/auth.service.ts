import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  LoginDTO,
  UserLoginResultDto,
  RegisterDTO,
  UserRegisterationResultDto,
  RefreshTokenDto,
  ForgetPasswordDto,
  VerifyForgetPasswordOtpDto,
  ResetPasswordDto,
  UserDetailsDto
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<UserLoginResultDto | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private getApiUrl(path: string): string {
    // In production, use CORS proxy for HTTP backend
    if (environment.production && environment.corsProxy && environment.backendUrl) {
      return `${environment.corsProxy}${encodeURIComponent(environment.backendUrl + path)}`;
    }
    // In development, use direct URL
    return `${environment.apiBaseUrl}${path}`;
  }

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Load user from localStorage on init
    const token = this.getToken();
    const savedUser = this.getSavedUser();

    if (token && savedUser) {
      // Both token and user data exist, restore session
      this.currentUserSubject.next(savedUser);
      console.log('User session restored from localStorage');
    } else if (token) {
      // Token exists but no user data, try to load from API
      this.loadUserDetails();
    }
  }

  /**
   * Login
   * POST /api/Auth/Login
   */
  login(dto: LoginDTO): Observable<ApiResponse<UserLoginResultDto>> {
    const url = this.getApiUrl('/api/Auth/Login');
    console.log('Login URL:', url);
    return this.http.post<ApiResponse<UserLoginResultDto>>(url, dto).pipe(
      tap(response => {
        console.log('AuthService - Login response:', response);

        // Check if login was successful
        const isSuccess = response.status === true ||
                         response.message === 'LoginSuccessful' ||
                         (response.data && response.data.token);

        if (isSuccess && response.data) {
          // Save token in localStorage if provided
          if (response.data.token) {
            this.setToken(response.data.token);
            console.log('Token saved to localStorage:', response.data.token.substring(0, 20) + '...');
          }

          // Save user data to memory and localStorage
          this.currentUserSubject.next(response.data);
          this.saveUser(response.data);
          console.log('User data saved:', response.data);

          // Check cookies
          const cookieToken = this.getCookie('token') || this.getCookie('admin_token') || this.getCookie('auth_token');
          if (cookieToken) {
            console.log('Token found in cookies:', cookieToken.substring(0, 20) + '...');
          }
        } else {
          console.log('Login failed or no data in response');
        }
      })
    );
  }

  /**
   * Register
   * POST /api/Auth/register
   */
  register(dto: RegisterDTO): Observable<ApiResponse<UserRegisterationResultDto>> {
    return this.http.post<ApiResponse<UserRegisterationResultDto>>(this.getApiUrl('/api/Auth/register'), dto);
  }

  /**
   * Refresh Token
   * POST /api/Auth/RefreshToken
   */
  refreshToken(dto: RefreshTokenDto): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(this.getApiUrl('/api/Auth/RefreshToken'), dto).pipe(
      tap(response => {
        if (response.status && response.data?.accessToken) {
          this.setToken(response.data.accessToken);
        }
      })
    );
  }

  /**
   * Logout
   * POST /api/Auth/Logout
   */
  logout(): Observable<ApiResponse<any>> {
    const token = this.getToken();
    return this.http.post<ApiResponse<any>>(this.getApiUrl('/api/Auth/Logout'), { token }).pipe(
      tap(() => {
        this.clearAuth();
      })
    );
  }

  /**
   * Forget Password
   * POST /api/Auth/forget-password
   */
  forgetPassword(dto: ForgetPasswordDto): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(this.getApiUrl('/api/Auth/forget-password'), dto);
  }

  /**
   * Verify Forget Password OTP
   * POST /api/Auth/verify-forget-password-otp
   */
  verifyForgetPasswordOtp(dto: VerifyForgetPasswordOtpDto): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(this.getApiUrl('/api/Auth/verify-forget-password-otp'), dto);
  }

  /**
   * Reset Password
   * POST /api/Auth/reset-password
   */
  resetPassword(dto: ResetPasswordDto): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(this.getApiUrl('/api/Auth/reset-password'), dto);
  }

  /**
   * Get Profile Details
   * GET /api/Auth/GetProfileDetails
   */
  getProfileDetails(): Observable<ApiResponse<UserDetailsDto>> {
    return this.http.get<ApiResponse<UserDetailsDto>>(this.getApiUrl('/api/Auth/GetProfileDetails'));
  }

  /**
   * Load user details and update current user
   */
  private loadUserDetails(): void {
    this.getProfileDetails().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          const userData: UserLoginResultDto = {
            firstName: response.data.firstName,
            lastName: response.data.lastName,
            email: response.data.email,
            phoneNumber: response.data.phoneNumber,
            city: '', // Not provided in UserDetailsDto
            token: this.getToken() || ''
          };
          this.currentUserSubject.next(userData);
          this.saveUser(userData);
        }
      },
      error: (err) => {
        // Don't clear auth on error - keep user logged in with token
        // Only log the error for debugging
        console.error('Failed to load user details, but keeping session:', err);
      }
    });
  }

  /**
   * Token Management
   */
  setToken(token: string): void {
    localStorage.setItem('admin_token', token);
  }

  getToken(): string | null {
    // Try localStorage first
    let token = localStorage.getItem('admin_token');

    // If not in localStorage, try to get from cookies
    if (!token) {
      token = this.getCookie('admin_token') || this.getCookie('token') || this.getCookie('auth_token');
    }

    return token;
  }

  /**
   * User Data Management
   */
  saveUser(user: UserLoginResultDto): void {
    localStorage.setItem('admin_user', JSON.stringify(user));
  }

  getSavedUser(): UserLoginResultDto | null {
    try {
      const userStr = localStorage.getItem('admin_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error parsing saved user data:', error);
      return null;
    }
  }

  /**
   * Get cookie value by name
   */
  private getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    const hasUser = !!this.currentUserSubject.value;

    // User is authenticated if either token exists OR currentUser exists
    return !!(token || hasUser);
  }

  clearAuth(): void {
    // Clear token and user data from localStorage
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');

    // Clear cookies if they exist
    document.cookie = 'admin_token=; Max-Age=0; path=/;';
    document.cookie = 'token=; Max-Age=0; path=/;';
    document.cookie = 'auth_token=; Max-Age=0; path=/;';

    // Clear current user
    this.currentUserSubject.next(null);

    // Navigate to login
    this.router.navigate(['/login']);
  }

  /**
   * Get current user value
   */
  get currentUserValue(): UserLoginResultDto | null {
    return this.currentUserSubject.value;
  }
}
