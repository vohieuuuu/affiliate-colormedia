import { useEffect, useState } from 'react';

/**
 * Hook để kiểm tra media queries
 * @param query Media query cần kiểm tra (ví dụ: '(max-width: 768px)')
 * @returns boolean - true nếu media query khớp, false nếu không khớp
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);
  
  useEffect(() => {
    // Tạo một media query list từ query string
    const mediaQuery = window.matchMedia(query);
    
    // Set giá trị ban đầu
    setMatches(mediaQuery.matches);
    
    // Handler để cập nhật state khi media query thay đổi
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };
    
    // Đăng ký sự kiện thay đổi
    mediaQuery.addEventListener('change', handler);
    
    // Cleanup sự kiện khi component unmount
    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }, [query]); // Chỉ chạy lại effect nếu query thay đổi
  
  return matches;
}

/**
 * Hook để kiểm tra thiết bị di động
 * @returns boolean - true nếu thiết bị là mobile, false nếu không phải
 */
export function useMobileDevice(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

/**
 * Hook để kiểm tra thiết bị tablet
 * @returns boolean - true nếu thiết bị là tablet, false nếu không phải
 */
export function useTabletDevice(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

/**
 * Hook để kiểm tra thiết bị desktop
 * @returns boolean - true nếu thiết bị là desktop, false nếu không phải
 */
export function useDesktopDevice(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

export default useMediaQuery;