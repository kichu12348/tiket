import { HttpError } from "./errors";

export function toPaise(amount: string): number {
  if (!/^\d+(?:\.\d{1,2})?$/.test(amount))
    throw new HttpError(400, "Invalid ticket price.");
  const [whole = "0", fraction = ""] = amount.split(".");
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(value))
    throw new HttpError(400, "Ticket price is out of range.");
  return value;
}

export function fromPaise(amount: number): string {
  if (!Number.isSafeInteger(amount) || amount < 0)
    throw new HttpError(400, "Invalid order amount.");
  return `${Math.floor(amount / 100)}.${String(amount % 100).padStart(2, "0")}`;
}
