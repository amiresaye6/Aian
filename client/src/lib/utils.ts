import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:1234/api/v1";
  const BACKEND_URL = API_URL.replace("/api/v1", "");
  return `${BACKEND_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
