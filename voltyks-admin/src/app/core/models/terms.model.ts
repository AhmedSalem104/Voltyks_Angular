// Terms Related DTOs

export interface AdminTermsDto {
  version: number;
  lang: string;
  publishedAt: string;
  content: string;
}

export interface UpdateTermsDto {
  lang: string;
  content: any;  // Can be object or string - backend expects JSON object
}
