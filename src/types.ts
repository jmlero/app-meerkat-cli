export interface StoredConfig {
  server_url: string;
  supabase_url: string;
  supabase_anon_key: string;
  currency?: string;
}

export interface StoredCredentials {
  email: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface AuthConfigResponse {
  supabase_url: string;
  supabase_anon_key: string;
}

export interface SupabaseTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: {
    email: string;
  };
}

export interface UploadedItem {
  id: string;
  file_name: string;
  status: string;
}

export interface UploadResponse {
  items: UploadedItem[];
}

export interface InboxItem {
  id: string;
  file_name: string;
  status: string;
  created_at: string;
  merchant_name?: string;
  total_amount?: number;
  currency?: string;
}

export interface ReceiptProduct {
  id: number;
  name: string;
  price: number;
  quantity: number;
  unit_price: number;
}

export interface Receipt {
  id: number;
  supermarket_id: number;
  date: string;
  total: number;
  products?: ReceiptProduct[];
}

export interface ReceiptsResponse {
  total: number;
  offset: number;
  limit: number;
  items: Receipt[];
}

export interface Supermarket {
  id: number;
  name: string;
  country_code: string;
  receipt_count: number;
}

export interface SupermarketsResponse {
  total: number;
  items: Supermarket[];
}

export interface ApiErrorResponse {
  detail: string;
}

export interface GlobalOptions {
  json?: boolean;
  server?: string;
  verbose?: boolean;
}

export const EXIT_SUCCESS = 0;
export const EXIT_ERROR = 1;
export const EXIT_AUTH_REQUIRED = 2;
