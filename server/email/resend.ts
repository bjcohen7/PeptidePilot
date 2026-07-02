import { Resend } from "resend";

let _resend: Resend | null = null;

export function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export function getEmailFrom(): string {
  return process.env.EMAIL_FROM_ADDRESS || "PeptidePilot <results@mail.peptidepilot.me>";
}

export function getUnsubscribeSecret(): string {
  return process.env.UNSUBSCRIBE_SECRET || "peptidepilot-unsub-dev";
}

export function getResendWebhookSecret(): string {
  return process.env.RESEND_WEBHOOK_SECRET || "";
}

export function getDailyCap(): number {
  return parseInt(process.env.EMAIL_DAILY_CAP || "50", 10);
}

export function getPhysicalAddress(): string {
  return process.env.EMAIL_PHYSICAL_ADDRESS || "1234 Health Way, Suite 100, Austin, TX 78701";
}
