import { ExpiryStatus, Product, ProductCategory } from "@/types";

export function getExpiryStatus(expiryDate: string): ExpiryStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 3) return 'critical';
  if (diffDays <= 7) return 'warning';
  return 'fresh';
}

export function getDaysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function formatExpiryText(expiryDate: string): string {
  const days = getDaysUntilExpiry(expiryDate);
  
  if (days < 0) return `Просрочено ${Math.abs(days)} дн.`;
  if (days === 0) return 'Истекает сегодня';
  if (days === 1) return 'Истекает завтра';
  if (days <= 7) return `${days} дн. осталось`;
  return `${days} дней`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} ч`;
  return `${hours} ч ${mins} мин`;
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0,
  }).format(amount) + ' сом';
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export function sortProductsByExpiry(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    const daysA = getDaysUntilExpiry(a.expiryDate);
    const daysB = getDaysUntilExpiry(b.expiryDate);
    return daysA - daysB;
  });
}

export function groupProductsByCategory(products: Product[]): Record<ProductCategory, Product[]> {
  return products.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<ProductCategory, Product[]>);
}

export function getExpiringProducts(products: Product[], days: number = 3): Product[] {
  return products.filter((product) => {
    const daysUntil = getDaysUntilExpiry(product.expiryDate);
    return daysUntil <= days && daysUntil >= 0;
  });
}

export function calculateEstimatedSavings(products: Product[]): number {
  const expiring = getExpiringProducts(products);
  return expiring.length * 150;
}

export function getDefaultExpiryDays(category: ProductCategory): number {
  const defaults: Record<ProductCategory, number> = {
    dairy: 7,
    meat: 5,
    vegetables: 7,
    fruits: 7,
    grains: 180,
    beverages: 30,
    condiments: 90,
    frozen: 90,
    bakery: 5,
    other: 14,
  };
  return defaults[category];
}

export function addDaysToDate(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
