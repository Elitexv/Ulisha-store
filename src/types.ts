export interface Product {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  discount_price?: number;
  discount_active?: boolean;
  discount_percentage?: number;
  category: string;
  image: string;
  description: string;
  created_at?: string;
  store_id?: string;
  seller_id?: string;
  seller_phone?: string;
  rating?: number;
  shipping_location: string;
  selectedColor?: string;
  selectedSize?: string;
  variantId?: string;
}

export interface Store {
  id: string;
  name: string;
  description: string;
  logo: string;
  banner: string;
  phone: string;
  address: string;
  user_id: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Order {
  id: string;
  userId: string;
  products: Array<{
    productId: string;
    quantity: number;
    variantId?: string;
    selectedColor?: string;
    selectedSize?: string;
  }>;
  total: number;
  status: 'pending' | 'completed';
  createdAt: string;
  payment_ref?: string;
  payment_method?: string;
}

export interface FlutterwaveConfig {
  public_key: string;
  tx_ref: string;
  amount: number;
  currency: string;
  payment_options: string;
  customer: {
    email: string;
    phone_number: string;
    name: string;
  };
  customizations: {
    title: string;
    description: string;
    logo: string;
  };
  redirect_url?: string;
  meta: {
    order_id: string;
    customer_id: string;
    source: string;
  }
}

export interface FlutterwaveResponse {
  status: string;
  message: string;
  transaction_id?: string;
  tx_ref?: string;
  flw_ref?: string;
  data?: {
    id: string;
    tx_ref: string;
    flw_ref: string;
    device_fingerprint: string;
    amount: number;
    currency: string;
    charged_amount: number;
    app_fee: number;
    merchant_fee: number;
    processor_response: string;
    auth_model: string;
    ip: string;
    narration: string;
    status: string;
    payment_type: string;
    created_at: string;
    account_id: number;
    customer: {
      id: number;
      name: string;
      phone_number: string;
      email: string;
      created_at: string;
    };
  };
}

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product: Product;
  variant_id?: string;
  selected_color?: string;
  selected_size?: string;
}