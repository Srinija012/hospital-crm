import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function getWhatsAppApiUrl(): string {
  let url = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
  url = url.trim().replace(/\/+$/, '');
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url;
}

export const WHATSAPP_API_URL = getWhatsAppApiUrl();
