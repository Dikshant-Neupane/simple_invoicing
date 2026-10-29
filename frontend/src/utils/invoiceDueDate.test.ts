import { describe, expect, test } from 'vitest';
import { addDaysToIsoDate, createDueDateFormState, isOverdueInvoice, overdueLabel, resolveDueDate } from './invoiceDueDate.ts';

describe('addDaysToIsoDate — calendar arithmetic on ISO dates', () => {
  test('same-day addition is a no-op', () => {
    expect(addDaysToIsoDate('2024-03-15', 0)).toBe('2024-03-15');
  });

  test('month rollover', () => {
    expect(addDaysToIsoDate('2024-01-31', 1)).toBe('2024-02-01');
  });

  test('year rollover', () => {
    expect(addDaysToIsoDate('2024-12-31', 1)).toBe('2025-01-01');
  });

  test('leap day: 2024-02-28 + 1 lands on Feb 29', () => {
    expect(addDaysToIsoDate('2024-02-28', 1)).toBe('2024-02-29');
  });

  test('negative days walk backwards across a month boundary', () => {
    expect(addDaysToIsoDate('2024-03-01', -1)).toBe('2024-02-29');
  });

  test('invalid input returns an empty string', () => {
    expect(addDaysToIsoDate('', 5)).toBe('');
    expect(addDaysToIsoDate('not-a-date', 5)).toBe('');
    expect(addDaysToIsoDate('2024-02', 5)).toBe('');
  });
});

describe('resolveDueDate — one rule per mode', () => {
  test('none mode always yields undefined', () => {
    expect(
      resolveDueDate({ mode: 'none', invoiceDate: '2024-01-25', exactDate: '2024-02-01', daysFromInvoice: '7' }),
    ).toBe(undefined);
  });

  test('exact mode returns the exact date, or undefined when it is blank', () => {
    expect(
      resolveDueDate({ mode: 'exact', invoiceDate: '2024-01-25', exactDate: '2024-02-01', daysFromInvoice: '' }),
    ).toBe('2024-02-01');
    expect(
      resolveDueDate({ mode: 'exact', invoiceDate: '2024-01-25', exactDate: '', daysFromInvoice: '' }),
    ).toBe(undefined);
  });

  test('days mode adds to the invoice date', () => {
    expect(
      resolveDueDate({ mode: 'days', invoiceDate: '2024-01-25', exactDate: '', daysFromInvoice: '7' }),
    ).toBe('2024-02-01');
  });

  test('days mode rejects negative days', () => {
    expect(
      resolveDueDate({ mode: 'days', invoiceDate: '2024-01-25', exactDate: '', daysFromInvoice: '-5' }),
    ).toBe(undefined);
  });

  test('days mode rejects non-numeric days', () => {
    expect(
      resolveDueDate({ mode: 'days', invoiceDate: '2024-01-25', exactDate: '', daysFromInvoice: 'abc' }),
    ).toBe(undefined);
  });

  test('days mode yields undefined when the invoice date is empty', () => {
    expect(
      resolveDueDate({ mode: 'days', invoiceDate: '', exactDate: '', daysFromInvoice: '7' }),
    ).toBe(undefined);
  });
});

describe('createDueDateFormState — from a stored due date back to the form', () => {
  test('no due date means none mode with blank fields', () => {
    expect(createDueDateFormState()).toEqual({ mode: 'none', exactDate: '', daysFromInvoice: '' });
    expect(createDueDateFormState(null)).toEqual({ mode: 'none', exactDate: '', daysFromInvoice: '' });
    expect(createDueDateFormState('')).toEqual({ mode: 'none', exactDate: '', daysFromInvoice: '' });
  });

  test('a due date means exact mode with that date', () => {
    expect(createDueDateFormState('2024-03-15')).toEqual({
      mode: 'exact',
      exactDate: '2024-03-15',
      daysFromInvoice: '',
    });
  });

  test('a full timestamp is trimmed to the date part', () => {
    expect(createDueDateFormState('2024-03-15T10:30:00')).toEqual({
      mode: 'exact',
      exactDate: '2024-03-15',
      daysFromInvoice: '',
    });
  });
});

describe('overdueLabel — singular, plural, and not overdue', () => {
  test('one day overdue is singular', () => {
    expect(overdueLabel(-1)).toBe('1 day overdue');
  });

  test('several days overdue is plural', () => {
    expect(overdueLabel(-5)).toBe('5 days overdue');
  });

  test('due today is not overdue', () => {
    expect(overdueLabel(0)).toBe(null);
  });

  test('not yet due and no due date are not overdue', () => {
    expect(overdueLabel(3)).toBe(null);
    expect(overdueLabel(null)).toBe(null);
    expect(overdueLabel(undefined)).toBe(null);
  });
});

describe('isOverdueInvoice — dashboard definition of overdue', () => {
  const base = {
    status: 'active',
    voucher_type: 'sales',
    outstanding_amount: 100,
    due_date: '2024-01-10',
    due_in_days: -3,
  };

  test('active sales invoice with an outstanding amount past its due date', () => {
    expect(isOverdueInvoice(base)).toBe(true);
  });

  test('partial payments still count while an amount is outstanding', () => {
    expect(isOverdueInvoice({ ...base, outstanding_amount: 1 })).toBe(true);
  });

  test('paid invoices show no badge', () => {
    expect(isOverdueInvoice({ ...base, outstanding_amount: 0 })).toBe(false);
  });

  test('cancelled invoices show no badge even when due_in_days is negative', () => {
    expect(isOverdueInvoice({ ...base, status: 'cancelled' })).toBe(false);
  });

  test('purchase invoices show no badge, matching the dashboard', () => {
    expect(isOverdueInvoice({ ...base, voucher_type: 'purchase' })).toBe(false);
  });

  test('due today and no due date show no badge', () => {
    expect(isOverdueInvoice({ ...base, due_in_days: 0 })).toBe(false);
    expect(isOverdueInvoice({ ...base, due_date: null, due_in_days: null })).toBe(false);
  });
});
