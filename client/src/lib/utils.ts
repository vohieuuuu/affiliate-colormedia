import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0
  }).format(amount);
}

/**
 * Định dạng số với dấu phân cách hàng nghìn
 * @param input Chuỗi số cần định dạng
 * @returns Chuỗi số đã định dạng với dấu phân cách hàng nghìn
 */
export function formatNumberWithCommas(input: string): string {
  // Xóa hết dấu phẩy hiện có
  const value = input.replace(/,/g, '');
  
  // Nếu rỗng hoặc không phải số, trả về chuỗi rỗng
  if (!value || isNaN(Number(value))) return '';
  
  // Định dạng số với dấu phân cách hàng nghìn
  return Number(value).toLocaleString('vi-VN');
}

/**
 * Định dạng ngày tháng theo định dạng Việt Nam
 * @param dateString Chuỗi ngày tháng cần định dạng
 * @param includeTime Có hiển thị giờ phút hay không
 * @returns Chuỗi đã định dạng
 */
export function formatDate(dateString: string, includeTime: boolean = true): string {
  const date = new Date(dateString);
  
  if (includeTime) {
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } else {
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit", 
      year: "numeric"
    });
  }
}