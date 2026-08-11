export function buildWhatsAppUrl(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  else if (!digits.startsWith('62')) digits = `62${digits}`;
  return `https://wa.me/${digits}`;
}

export function buildMailtoUrl(email: string): string {
  return `mailto:${email}`;
}
