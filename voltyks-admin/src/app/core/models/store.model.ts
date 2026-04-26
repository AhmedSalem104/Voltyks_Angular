// Store Module DTOs

// ============= Enums =============

export type CategoryStatus = 'active' | 'coming_soon' | 'hidden';
export type ProductStatus = 'active' | 'hidden';
export type ReservationStatus = 'pending' | 'contacted' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid';
export type DeliveryStatus = 'pending' | 'delivered';

// ============= Pagination =============

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

// ============= Categories =============

export interface AdminStoreCategoryDto {
  id: number;
  name: string;
  slug: string;
  status: CategoryStatus;
  sortOrder: number;
  icon: string | null;
  placeholderMessage: string | null;
  productCount: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
}

export interface CreateStoreCategoryDto {
  name: string;
  slug?: string;
  status: CategoryStatus;
  sortOrder: number;
  icon?: string;
  placeholderMessage?: string;
}

export interface UpdateStoreCategoryDto {
  name?: string;
  slug?: string;
  status?: CategoryStatus;
  sortOrder?: number;
  icon?: string;
  placeholderMessage?: string;
}

export interface CategoryFilterParams {
  withTrashed?: boolean;
  onlyTrashed?: boolean;
  status?: CategoryStatus;
}

// ============= Products =============

export interface AdminStoreProductDto {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  thumbnailUrl: string | null;
  images: string[];
  specifications: Record<string, string> | null;
  status: ProductStatus;
  sortOrder: number;
  isReservable: boolean;
  reservationCount: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
}

export interface CreateStoreProductDto {
  categoryId: number;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  currency?: string;
  thumbnailUrl?: string;
  images?: string[];
  specifications?: Record<string, string>;
  status: ProductStatus;
  sortOrder?: number;
  isReservable: boolean;
}

export interface UpdateStoreProductDto {
  categoryId?: number;
  name?: string;
  slug?: string;
  description?: string;
  price?: number;
  currency?: string;
  thumbnailUrl?: string;
  images?: string[];
  specifications?: Record<string, string>;
  status?: ProductStatus;
  sortOrder?: number;
  isReservable?: boolean;
}

export interface ProductFilterParams {
  categoryId?: number;
  status?: ProductStatus;
  withTrashed?: boolean;
  onlyTrashed?: boolean;
}

// ============= Reservations =============

export interface AdminReservationDto {
  id: number;
  userId: string;
  userName: string;
  userEmail: string | null;
  userPhone: string | null;
  productId: number;
  productName: string;
  productThumbnail: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  paymentReference: string | null;
  paidAmount: number | null;
  paidAt: string | null;
  deliveryStatus: DeliveryStatus;
  deliveredAt: string | null;
  deliveryNotes: string | null;
  adminNotes: string | null;
  contactedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationFilterParams {
  status?: ReservationStatus;
  paymentStatus?: PaymentStatus;
  deliveryStatus?: DeliveryStatus;
  fromDate?: string;
  toDate?: string;
  search?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface RecordContactDto {
  notes?: string;
}

export interface RecordPaymentDto {
  paymentMethod: string;
  paymentReference?: string;
  paidAmount?: number;
  notes?: string;
}

export interface RecordDeliveryDto {
  notes?: string;
}

// ============= Product Images =============

export interface ProductImageUploadResult {
  productId: number;
  uploadedUrls: string[];
  allImages: string[];
  totalCount: number;
}

export interface DeleteProductImageDto {
  imagePath: string;
}

// ============= Payment Methods =============

// Labels are translation keys; use TranslateService.instant() or | translate pipe at the consumer.
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'store.paymentMethods.cash' },
  { value: 'bank_transfer', label: 'store.paymentMethods.bankTransfer' },
  { value: 'instapay', label: 'store.paymentMethods.instapay' },
  { value: 'vodafone_cash', label: 'store.paymentMethods.vodafoneCash' },
  { value: 'fawry', label: 'store.paymentMethods.fawry' },
  { value: 'other', label: 'store.paymentMethods.other' }
] as const;

// ============= Status Labels =============

export const CATEGORY_STATUS_LABELS: Record<CategoryStatus, string> = {
  active: 'store.categoryStatus.active',
  coming_soon: 'store.categoryStatus.comingSoon',
  hidden: 'store.categoryStatus.hidden'
};

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  active: 'store.productStatus.active',
  hidden: 'store.productStatus.hidden'
};

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: 'store.reservationStatus.pending',
  contacted: 'store.reservationStatus.contacted',
  completed: 'store.reservationStatus.completed',
  cancelled: 'store.reservationStatus.cancelled'
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'store.paymentStatus.unpaid',
  paid: 'store.paymentStatus.paid'
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'store.deliveryStatus.pending',
  delivered: 'store.deliveryStatus.delivered'
};
