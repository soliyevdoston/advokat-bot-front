export const formatMoney = (minor: number, currency: string) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(minor / 100);
};

export const formatDateTime = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
};

export const toDateKey = (value: string) => {
  return new Date(value).toISOString().slice(0, 10);
};
