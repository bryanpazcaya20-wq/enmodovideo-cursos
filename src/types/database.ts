// Tipos de la base de datos (reflejan supabase/migrations).
// Se pueden regenerar con: npx supabase gen types typescript --project-id <id> > src/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "member" | "admin";
export type AuthProvider = "email" | "google";
export type CourseStatus = "draft" | "published";
export type CourseLevel = "basico" | "intermedio" | "avanzado";
export type OrderStatus = "pending" | "paid" | "refunded" | "failed" | "cancelled";
export type EnrollmentSource = "purchase" | "admin" | "migration" | "free_coupon";
export type DiscountType = "percent" | "fixed";

type Rel = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<Row, Required extends keyof Row, R extends Rel[] = []> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: R;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  provider: AuthProvider;
  blocked_at: string | null;
  blocked_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type Course = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description_html: string | null;
  device_label: string | null;
  level: CourseLevel;
  cover_url: string | null;
  promo_video_id: string | null;
  learn_points: string[];
  requirements: string[];
  price_usd: number;
  sale_price_usd: number | null;
  sale_ends_at: string | null;
  status: CourseStatus;
  sort_order: number;
  wp_id: number | null;
  created_at: string;
  updated_at: string;
};

export type CourseModule = {
  id: string;
  course_id: string;
  title: string;
  sort_order: number;
  wp_id: number | null;
  created_at: string;
};

export type Lesson = {
  id: string;
  course_id: string;
  module_id: string;
  title: string;
  sort_order: number;
  is_preview: boolean;
  duration_seconds: number | null;
  wp_id: number | null;
  created_at: string;
  updated_at: string;
};

export type LessonContent = {
  lesson_id: string;
  bunny_video_id: string | null;
  body_html: string | null;
  updated_at: string;
};

export type Coupon = {
  id: string;
  code: string;
  discount_type: DiscountType;
  amount: number;
  course_id: string | null;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  active: boolean;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  user_id: string | null;
  course_id: string | null;
  coupon_id: string | null;
  coupon_code: string | null;
  list_price: number;
  discount: number;
  amount: number;
  currency: string;
  status: OrderStatus;
  provider: string;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  payer_email: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  raw: Json | null;
  created_at: string;
  updated_at: string;
};

export type Enrollment = {
  user_id: string;
  course_id: string;
  source: EnrollmentSource;
  order_id: string | null;
  granted_by: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type AccessGrant = {
  id: string;
  email: string;
  course_id: string;
  source: EnrollmentSource;
  granted_by: string | null;
  note: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  created_at: string;
};

export type LessonProgress = { user_id: string; lesson_id: string; course_id: string; completed_at: string };
export type PendingProgress = { email: string; lesson_id: string; completed_at: string };
export type ActiveSession = { user_id: string; session_id: string; user_agent: string | null; updated_at: string };

export type AuditLog = {
  id: number;
  actor_id: string | null;
  action: string;
  target_user_id: string | null;
  target_course_id: string | null;
  reason: string | null;
  metadata: Json | null;
  created_at: string;
};

export type WebhookEvent = {
  id: number;
  provider: string;
  event_id: string;
  event_type: string;
  payload: Json;
  processed_at: string | null;
  error: string | null;
  received_at: string;
};

export type EmailLog = {
  id: number;
  user_id: string | null;
  to_email: string;
  template: string;
  dedupe_key: string | null;
  sent_at: string;
  error: string | null;
};

export type RateLimit = { key: string; hits: number; window_start: string };

type FK<C extends string, T extends string> = {
  foreignKeyName: `${string}_${C}_fkey`;
  columns: [C];
  isOneToOne?: boolean;
  referencedRelation: T;
  referencedColumns: ["id"];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, "id" | "email">;
      courses: Table<Course, "slug" | "title" | "price_usd">;
      course_modules: Table<CourseModule, "course_id" | "title", [FK<"course_id", "courses">]>;
      lessons: Table<Lesson, "course_id" | "module_id" | "title", [FK<"course_id", "courses">, FK<"module_id", "course_modules">]>;
      lesson_content: Table<LessonContent, "lesson_id", [FK<"lesson_id", "lessons"> & { isOneToOne: true }]>;
      coupons: Table<Coupon, "code" | "amount", [FK<"course_id", "courses">]>;
      orders: Table<Order, "list_price" | "amount", [FK<"user_id", "profiles">, FK<"course_id", "courses">, FK<"coupon_id", "coupons">]>;
      enrollments: Table<
        Enrollment,
        "user_id" | "course_id" | "source",
        [FK<"user_id", "profiles">, FK<"course_id", "courses">, FK<"order_id", "orders">]
      >;
      access_grants: Table<AccessGrant, "email" | "course_id", [FK<"course_id", "courses">]>;
      lesson_progress: Table<LessonProgress, "user_id" | "lesson_id" | "course_id", [FK<"lesson_id", "lessons">, FK<"course_id", "courses">]>;
      pending_progress: Table<PendingProgress, "email" | "lesson_id">;
      active_sessions: Table<ActiveSession, "user_id" | "session_id">;
      audit_log: Table<AuditLog, "action", [FK<"actor_id", "profiles">]>;
      webhook_events: Table<WebhookEvent, "provider" | "event_id" | "event_type" | "payload">;
      email_log: Table<EmailLog, "to_email" | "template">;
      rate_limits: Table<RateLimit, "key">;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: { uid?: string }; Returns: boolean };
      has_course_access: { Args: { p_course: string; uid?: string }; Returns: boolean };
      claim_access_grants: { Args: { p_user: string }; Returns: number };
      fulfill_order: { Args: { p_order: string; p_capture_id: string | null; p_payer_email: string | null; p_raw: Json | null }; Returns: boolean };
      check_rate_limit: { Args: { p_key: string; p_max: number; p_window_seconds: number }; Returns: boolean };
      sales_by_day: { Args: { p_days?: number }; Returns: { day: string; orders: number; revenue: number }[] };
    };
    Enums: {
      user_role: UserRole;
      auth_provider: AuthProvider;
      course_status: CourseStatus;
      course_level: CourseLevel;
      order_status: OrderStatus;
      enrollment_source: EnrollmentSource;
      discount_type: DiscountType;
    };
    CompositeTypes: Record<string, never>;
  };
};
