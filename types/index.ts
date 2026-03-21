export type Language =
  | "hindi"
  | "english"
  | "bengali"
  | "gujarati"
  | "kannada"
  | "malayalam"
  | "marathi"
  | "odia"
  | "punjabi"
  | "tamil"
  | "telugu";

export type Plan = "free" | "paid" | "subscription";

export interface UserProfile {
  id: string;
  phone?: string;
  name?: string;
  avatar_url?: string;
  plan: Plan;
  explanation_count: number;
  subscription_end?: string;
  created_at: string;
}

export interface Explanation {
  id: string;
  user_id: string;
  medicine_name: string;
  language: string;
  explanation_text: string;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  amount: number;
  payment_type: "one_time" | "subscription";
  status: "pending" | "completed" | "failed";
  created_at: string;
}

export interface ExplainRequest {
  medicine_name: string;
  language: Language;
  image_base64?: string;
  image_media_type?: string;
}

export interface ExplainResponse {
  explanation: string;
  medicine_name: string;
  usage_count: number;
  plan: Plan;
}

export interface PaymentOrder {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  payment_type: "one_time" | "subscription";
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  hindi: "हिंदी",
  english: "English",
  bengali: "বাংলা",
  gujarati: "ગુજરાતી",
  kannada: "ಕನ್ನಡ",
  malayalam: "മലയാളം",
  marathi: "मराठी",
  odia: "ଓଡ଼ିଆ",
  punjabi: "ਪੰਜਾਬੀ",
  tamil: "தமிழ்",
  telugu: "తెలుగు",
};

export const FREE_TIER_LIMIT = 3;
export const ONE_TIME_PRICE = 2000; // ₹20 in paise
export const SUBSCRIPTION_PRICE = 9900; // ₹99 in paise
