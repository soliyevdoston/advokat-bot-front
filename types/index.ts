export type Role = "CLIENT" | "ADMIN";

export interface User {
  id: string;
  fullName: string | null;
  username: string | null;
  email: string | null;
  telegramId: string | null;
  role: Role;
  language: "UZ" | "RU" | "EN";
  phone?: string | null;
  region?: string | null;
  isActive?: boolean;
  createdAt?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: Role;
    fullName: string | null;
  };
}

export interface Tariff {
  id: string;
  code: string;
  titleI18n: Record<string, string>;
  descriptionI18n?: Record<string, string> | null;
  priceMinor: number;
  currency: string;
  durationMinutes: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentReceipt {
  id: string;
  fileUrl: string;
  telegramFileId: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  tariffId: string;
  amountMinor: number;
  currency: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  moderationNote: string | null;
  createdAt: string;
  user: User;
  tariff: Tariff;
  booking?: { id: string } | null;
  receipts: PaymentReceipt[];
}

export interface Slot {
  id: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  status: "AVAILABLE" | "BOOKED" | "BLOCKED";
  note: string | null;
  createdByAdminId: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  createdAt: string;
}

export interface Paginated<T> {
  total: number;
  page: number;
  limit: number;
  items: T[];
}

export interface AdminDashboard {
  totalUsers: number;
  totalPaidRequests: number;
  pendingPaymentApprovals: number;
  unresolvedConversations: number;
  unsatisfiedCount: number;
  todayQuestions: number;
  approvedPayments: number;
  rejectedPayments: number;
  redirectedToAdvocate: number;
  knowledgeEntries: number;
  tariffs: number;
  recentActivity: Array<{
    id: string;
    action: string;
    resource: string;
    resourceId: string | null;
    createdAt: string;
  }>;
}

export interface AdminAnalytics {
  rangeDays: number;
  questions: {
    today: number;
    week: number;
    month: number;
  };
  payments: {
    today: { pending: number; approved: number; rejected: number };
    week: { pending: number; approved: number; rejected: number };
    month: { pending: number; approved: number; rejected: number };
  };
  satisfaction: {
    total: number;
    unsatisfied: number;
    unsatisfiedRate: number;
  };
  escalations: {
    total: number;
  };
  topQuestions: Array<{
    text: string;
    count: number;
  }>;
  topTariffs: Array<{
    tariffId: string;
    code: string;
    titleI18n: Record<string, string>;
    count: number;
  }>;
  dayStats: Array<{
    date: string;
    questions: number;
    approvedPayments: number;
  }>;
}

export interface AdminUnansweredQuestion {
  question: string;
  normalized: string;
  count: number;
  lastAskedAt: string;
  conversationId: string;
  reasonModels: string[];
  user: {
    id: string;
    fullName: string | null;
    username: string | null;
    telegramId: string | null;
    language: "UZ" | "RU" | "EN";
  };
}

export interface KnowledgeCategory {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeEntry {
  id: string;
  categoryId: string | null;
  title: string;
  question: string;
  answer: string;
  notes: string | null;
  keywords: string[];
  tags: string[];
  exampleAnswer: string | null;
  routingHint: string | null;
  accessLevel: "FREE" | "PAID" | "BOTH";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  category?: KnowledgeCategory | null;
}

export interface AIConversationMessage {
  id: string;
  sender: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  model: string | null;
  createdAt: string;
}

export interface AIConversationListItem {
  id: string;
  userId: string;
  language: "UZ" | "RU" | "EN";
  category: "FAMILY" | "LABOR" | "CIVIL" | "DEBT" | "PROPERTY" | "OTHER" | null;
  status: "OPEN" | "ESCALATED" | "CLOSED";
  needsLawyer: boolean;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
  startedAt: string;
  lastMessageAt: string | null;
  user: {
    id: string;
    fullName: string | null;
    username: string | null;
    telegramId: string | null;
    language: "UZ" | "RU" | "EN";
    phone: string | null;
  };
  messages: AIConversationMessage[];
  satisfaction: Array<{
    id: string;
    isSatisfied: boolean;
    note: string | null;
    createdAt: string;
  }>;
}

export interface EscalationItem {
  id: string;
  userId: string;
  conversationId: string | null;
  reason: string | null;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    fullName: string | null;
    username: string | null;
    telegramId: string | null;
    phone: string | null;
    language: "UZ" | "RU" | "EN";
  };
  conversation: {
    id: string;
    messages: AIConversationMessage[];
  } | null;
  assignedAdmin: {
    id: string;
    fullName: string | null;
    email: string | null;
  } | null;
}

export interface AdminRevenuePeriod {
  count: number;
  byCurrency: Record<string, number>;
}

export interface AdminRevenue {
  today: AdminRevenuePeriod;
  week: AdminRevenuePeriod;
  month: AdminRevenuePeriod;
  year: AdminRevenuePeriod;
  custom?: AdminRevenuePeriod & { from?: string; to?: string };
  dayStats: Array<{ date: string; amount: number; count: number; currency: string }>;
}

export interface PaymentHistoryItem {
  id: string;
  userId: string;
  tariffId: string;
  amountMinor: number;
  currency: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  moderationNote: string | null;
  createdAt: string;
  user: {
    id: string;
    fullName: string | null;
    username: string | null;
    telegramId: string | null;
    language: string;
  };
  tariff: {
    id: string;
    code: string;
    titleI18n: Record<string, string>;
  };
}

export interface SettingItem {
  id: string;
  key: string;
  valueJson: unknown;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}
