export type Role = "CLIENT" | "ADMIN";

export interface User {
  id: string;
  fullName: string | null;
  username: string | null;
  email: string | null;
  telegramId: string | null;
  role: Role;
  language: "UZ" | "RU" | "EN";
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
