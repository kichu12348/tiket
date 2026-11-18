import { z } from "zod";

export const bankAccountSchema = z
  .object({
    accountHolderName: z
      .string()
      .trim()
      .min(2, "Account holder name is required")
      .max(120),
    phone: z
      .string()
      .trim()
      .regex(
        /^[6-9]\d{9}$/,
        "Enter a valid 10-digit Indian mobile number (required for Razorpay KYC)",
      ),
    bankName: z
      .string()
      .trim()
      .min(2, "Bank name is required")
      .max(100),
    accountType: z.enum(["current", "saving"]).default("current"),
    accountNumber: z
      .string()
      .trim()
      .regex(/^\d{9,18}$/, "Account number must be 9 to 18 digits"),
    confirmAccountNumber: z.string().trim(),
    ifscCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(
        /^[A-Z]{4}0[A-Z0-9]{6}$/,
        "Enter a valid 11-character IFSC code (e.g. HDFC0001234)",
      ),
  })
  .refine((data) => data.accountNumber === data.confirmAccountNumber, {
    message: "Account numbers do not match",
    path: ["confirmAccountNumber"],
  });

export type BankAccountFormValues = z.infer<typeof bankAccountSchema>;
