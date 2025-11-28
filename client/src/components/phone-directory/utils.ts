export function formatPhone(value: string) {
    const digits = (value || "").replace(/\D/g, "");
    if (!digits) return value || "";
    if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return value;
}

export function sanitizeDigits(value: string) {
    return (value || "").replace(/\D/g, "");
}

export function isValidEmail(value: string) {
    const v = String(value || "").trim();
    if (!v) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function isMobilePhoneBR(value: string) {
    const d = sanitizeDigits(value || "");
    if (d.startsWith("55") && d.length >= 13) {
        const local = d.slice(2);
        return local.length >= 11 && local[2] === "9";
    }
    return d.length === 11 && d[2] === "9";
}
