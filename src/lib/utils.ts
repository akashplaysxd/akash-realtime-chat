import { clsx, type ClassValue } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
