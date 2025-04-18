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
 * Format a number with thousand separators (for input fields)
 */
export function formatNumberWithCommas(value: string | number): string {
  // Chuyển đổi sang chuỗi và loại bỏ các ký tự không phải số
  const numericValue = String(value).replace(/[^\d]/g, '');
  
  // Nếu chuỗi rỗng, trả về chuỗi rỗng
  if (!numericValue) return '';
  
  // Thêm dấu phân cách hàng nghìn
  return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Parse a formatted number string back to a number
 */
export function parseFormattedNumber(formattedValue: string): number {
  // Loại bỏ tất cả các ký tự không phải số
  const numericString = formattedValue.replace(/[^\d]/g, '');
  
  // Chuyển đổi sang số
  return numericString ? parseInt(numericString, 10) : 0;
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
