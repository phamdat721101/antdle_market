
/**
 * Type helpers to avoid TypeScript's "excessively deep and possibly infinite" error
 */

export interface TransactionStatusResult {
  status: string;
  details: Record<string, any>; // Using any here to avoid excessive type inference
}

export interface TransactionDetails {
  hash?: string;
  [key: string]: any; // Using any to avoid deep recursive types
}
