// Complaint Category DTOs
export interface AdminComplaintCategoryDto {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string | null;
  isDeleted: boolean;
  complaintsCount: number;
}

export interface CreateComplaintCategoryDto {
  name: string;
  description?: string;
}

export interface UpdateComplaintCategoryDto {
  name: string;
  description?: string;
}

// General Complaint DTOs (User endpoint)
export interface CreateGeneralComplaintDto {
  userId?: string;      // Optional - if empty, uses current user from JWT
  categoryId: number;   // Required
  content: string;      // Required, max 2000
}

export interface GeneralComplaintResponseDto {
  complaintId: number;
  categoryId: number;
  categoryName: string;
  content: string;
  createdAt: string;
}

// Admin Complaint DTOs
export interface AdminComplaintDto {
  id: number;
  userId: string;
  userName: string;
  userEmail: string | null;
  userPhone: string | null;
  categoryId: number;
  categoryName: string;
  content: string;
  createdAt: string;
  isResolved: boolean;
}

export interface ComplaintFilterParams {
  includeResolved?: boolean;
}

export interface UpdateComplaintStatusResponse {
  id: number;
  isResolved: boolean;
}

// Filter params
export interface ComplaintCategoryFilterParams {
  includeDeleted?: boolean;
}
