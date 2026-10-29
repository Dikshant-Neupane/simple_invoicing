import { formatDate } from './formatting';

export type DueDateMode = 'none' | 'exact' | 'days';

export type DueDateFormState = {
  mode: DueDateMode;
  exactDate: string;
  daysFromInvoice: string;
};

function parseIsoDateParts(value: string): [number, number, number] | null {
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  return [parts[0], parts[1], parts[2]];
}

export function addDaysToIsoDate(value: string, days: number): string {
  const parsed = parseIsoDateParts(value);
  if (!parsed) {
    return '';
  }

  const [year, month, day] = parsed;
  const nextDate = new Date(Date.UTC(year, month - 1, day));
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate.toISOString().slice(0, 10);
}

export function resolveDueDate(input: {
  mode: DueDateMode;
  invoiceDate: string;
  exactDate: string;
  daysFromInvoice: string;
}): string | undefined {
  if (input.mode === 'none') {
    return undefined;
  }

  if (input.mode === 'exact') {
    return input.exactDate || undefined;
  }

  const parsedDays = Number.parseInt(input.daysFromInvoice, 10);
  if (Number.isNaN(parsedDays) || parsedDays < 0 || !input.invoiceDate) {
    return undefined;
  }

  return addDaysToIsoDate(input.invoiceDate, parsedDays);
}

export function createDueDateFormState(dueDate?: string | null): DueDateFormState {
  if (!dueDate) {
    return {
      mode: 'none',
      exactDate: '',
      daysFromInvoice: '',
    };
  }

  return {
    mode: 'exact',
    exactDate: dueDate.slice(0, 10),
    daysFromInvoice: '',
  };
}

export function formatInvoiceDateLabel(value: string | null | undefined): string {
  return formatDate(value);
}

/**
 * Label for an invoice that is past its due date, or null when it is not
 * overdue. due_in_days is negative when overdue and null when there is no
 * due date; due today (0) is not overdue.
 */
export function overdueLabel(dueInDays: number | null | undefined): string | null {
  if (dueInDays === null || dueInDays === undefined || dueInDays >= 0) {
    return null;
  }
  const days = Math.abs(dueInDays);
  return days === 1 ? '1 day overdue' : `${days} days overdue`;
}

export type OverdueInvoiceInput = {
  status: string;
  voucher_type?: string | null;
  outstanding_amount: number;
  due_date: string | null;
  due_in_days: number | null;
};

/**
 * Matches the dashboard definition of overdue: an active sales invoice with
 * an amount still outstanding, a due date set, and due_in_days below zero.
 * Paid, cancelled, purchase, due today, and no due date invoices are not
 * overdue. The backend still returns due_in_days for cancelled invoices, so
 * status is checked explicitly.
 */
export function isOverdueInvoice(invoice: OverdueInvoiceInput): boolean {
  return (
    invoice.status === 'active' &&
    invoice.voucher_type === 'sales' &&
    invoice.outstanding_amount > 0 &&
    invoice.due_date !== null &&
    invoice.due_date !== '' &&
    invoice.due_in_days !== null &&
    invoice.due_in_days < 0
  );
}
