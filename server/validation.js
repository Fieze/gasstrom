const READING_FIELDS = new Set(['id', 'date', 'value', 'type']);

export const ALLOWED_SETTING_KEYS = new Set([
    'gemini_model', 'location_lat', 'location_lon', 'location_name',
    'billing_date_electricity', 'billing_date_gas',
    'price_kwh_electricity', 'base_price_electricity', 'payment_electricity',
    'price_kwh_gas', 'base_price_gas', 'payment_gas',
    'billing_months', 'gas_conversion_factor'
]);

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isIsoDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isBillingDate(value) {
    if (typeof value !== 'string' || !/^\d{1,2}\.\d{1,2}\.$/.test(value)) return false;
    const [day, month] = value.split('.').map(Number);
    const date = new Date(Date.UTC(2000, month - 1, day));
    return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isNumberString(value, { min = 0, max = Number.MAX_SAFE_INTEGER, integer = false } = {}) {
    if (typeof value !== 'string' || value.trim() === '') return false;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= min && parsed <= max && (!integer || Number.isInteger(parsed));
}

export function validateReading(value) {
    const errors = [];
    if (!isPlainObject(value)) return { valid: false, errors: ['reading must be an object'] };
    const unknownFields = Object.keys(value).filter(key => !READING_FIELDS.has(key));
    if (unknownFields.length) errors.push(`unknown fields: ${unknownFields.join(', ')}`);
    if (typeof value.id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(value.id)) errors.push('id is invalid');
    if (!isIsoDate(value.date)) errors.push('date must be a valid YYYY-MM-DD date');
    if (typeof value.value !== 'number' || !Number.isFinite(value.value) || value.value < 0) errors.push('value must be a finite non-negative number');
    if (value.type !== 'electricity' && value.type !== 'gas') errors.push('type must be electricity or gas');
    return { valid: errors.length === 0, errors };
}

export function validateSettings(value) {
    const errors = [];
    if (!isPlainObject(value)) return { valid: false, errors: ['settings must be an object'] };
    if (Object.keys(value).length === 0) return { valid: false, errors: ['at least one setting is required'] };
    for (const [key, rawValue] of Object.entries(value)) {
        if (!ALLOWED_SETTING_KEYS.has(key)) {
            errors.push(`${key} is not an allowed setting`);
            continue;
        }
        if (typeof rawValue !== 'string') {
            errors.push(`${key} must be a string`);
            continue;
        }
        if (key === 'gemini_model' && !/^[A-Za-z0-9._-]{1,100}$/.test(rawValue)) errors.push('gemini_model is invalid');
        if (key === 'location_name' && rawValue.length > 200) errors.push('location_name is too long');
        if (key === 'location_lat' && !isNumberString(rawValue, { min: -90, max: 90 })) errors.push('location_lat is invalid');
        if (key === 'location_lon' && !isNumberString(rawValue, { min: -180, max: 180 })) errors.push('location_lon is invalid');
        if ((key === 'billing_date_electricity' || key === 'billing_date_gas') && rawValue !== '' && !isBillingDate(rawValue)) errors.push(`${key} must use DD.MM.`);
        if (key === 'billing_months' && !isNumberString(rawValue, { min: 1, max: 12, integer: true })) errors.push('billing_months must be an integer from 1 to 12');
        if (key === 'gas_conversion_factor' && !isNumberString(rawValue, { min: 0.1, max: 100 })) errors.push('gas_conversion_factor is invalid');
        if (/^(price_kwh|base_price|payment)/.test(key) && rawValue !== '' && !isNumberString(rawValue, { max: 1_000_000 })) errors.push(`${key} must be a non-negative number`);
    }
    return { valid: errors.length === 0, errors };
}

export function validateImage(value) {
    const errors = [];
    if (!isPlainObject(value)) return { valid: false, errors: ['image must be an object'] };
    if (!new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']).has(value.mimeType)) errors.push('unsupported image type');
    if (typeof value.data !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(value.data)) errors.push('image data must be base64 encoded');
    if (typeof value.data === 'string' && value.data.length > 8_000_000) errors.push('image exceeds the 6 MB limit');
    return { valid: errors.length === 0, errors };
}

export function isSafeBackupFilename(value) {
    return typeof value === 'string' && /^backup-[0-9T-]+Z\.sqlite$/.test(value);
}
