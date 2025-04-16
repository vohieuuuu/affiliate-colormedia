/**
 * Format a number as currency in VND
 */
export function formatCurrency(amount: number | null | undefined): string {
  // Kiểm tra giá trị là số hợp lệ
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0 ₫';
  }
  
  // Định dạng số tiền VND
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format a date string to a readable format
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch (error) {
    return dateString;
  }
}
