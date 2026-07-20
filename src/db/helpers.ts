/**
 * Database Helper Functions for Cloudflare D1
 * Using sql.js compatible syntax for D1
 */

import type { D1Database } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  ASSETS: R2Bucket;
}

// Generate unique IDs
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return prefix ? `${prefix}_${timestamp}${randomPart}` : `${timestamp}${randomPart}`;
}

// Generate invoice number
export function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `HD${year}${month}${day}${random}`;
}

// Format date for SQL
export function formatDate(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

// Helper to parse JSON results from D1
export function parseJsonResult<T>(result: any): T[] {
  if (!result || !result.results) return [];
  return result.results as T[];
}

// Helper to get first result
export function parseJsonFirst<T>(result: any): T | null {
  const results = parseJsonResult<T>(result);
  return results.length > 0 ? results[0] : null;
}

// Format currency for display
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0
  }).format(amount || 0);
}

// Validate required fields
export function validateRequired(obj: Record<string, any>, fields: string[]): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const field of fields) {
    if (!obj[field] && obj[field] !== 0) {
      missing.push(field);
    }
  }
  return { valid: missing.length === 0, missing };
}

// Calculate totals from items
export function calculateInvoiceTotals(items: any[]) {
  let subtotal = 0;
  let totalTax = 0;

  for (const item of items) {
    const itemTotal = (item.quantity || 0) * (item.unit_price || 0) - (item.discount_amount || 0);
    const itemTax = itemTotal * ((item.tax_rate || 10) / 100);
    subtotal += itemTotal;
    totalTax += itemTax;
  }

  return { subtotal, totalTax };
}

// API Response helpers
export function successResponse<T>(data: T, message?: string) {
  return Response.json({
    success: true,
    data,
    message
  });
}

export function errorResponse(message: string, status: number = 500, details?: any) {
  return Response.json({
    success: false,
    error: message,
    details
  }, { status });
}

export function paginatedResponse<T>(data: T[], total: number, page: number, pageSize: number) {
  return Response.json({
    success: true,
    data,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  });
}
