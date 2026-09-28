/**
 * Shared number / currency formatting helpers.
 *
 * Use these instead of hand-rolling `toLocaleString` so grouping and nullish
 * handling stay consistent across the app.
 */

/** Group a number with vi-VN separators (e.g. 1234567 → "1.234.567"). Nullish / invalid → "0". */
export function formatNumber(value: number | string | null | undefined): string {
    if (value === null || value === undefined) {
        return '0';
    }
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n.toLocaleString('vi-VN') : '0';
}

/** Format a VND amount as "₫ 1.234.567". Nullish / invalid → "₫ 0". */
export function formatVnd(amount: number | string | null | undefined): string {
    return `₫ ${formatNumber(amount)}`;
}
