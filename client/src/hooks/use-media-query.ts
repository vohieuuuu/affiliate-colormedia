import { useState, useEffect } from 'react';

/**
 * Hook để kiểm tra media query và theo dõi thay đổi kích thước màn hình
 * 
 * @param query Media query cần kiểm tra, ví dụ: '(max-width: 768px)'
 * @returns boolean - true nếu media query khớp, false nếu không
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    // Chỉ chạy trên client-side
    if (typeof window !== 'undefined') {
      const media = window.matchMedia(query);
      
      // Cập nhật trạng thái ban đầu
      setMatches(media.matches);
      
      // Hàm callback khi media matching thay đổi
      const listener = (event: MediaQueryListEvent) => {
        setMatches(event.matches);
      };
      
      // Đăng ký listener
      media.addEventListener('change', listener);
      
      // Cleanup: hủy đăng ký listener khi component unmount
      return () => {
        media.removeEventListener('change', listener);
      };
    }
    
    // Mặc định là false cho SSR
    return () => {};
  }, [query]);
  
  return matches;
}

/**
 * Pre-defined hooks for common device sizes
 */

// Trả về true nếu thiết bị là điện thoại di động
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 640px)');
}

// Trả về true nếu thiết bị là tablet
export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 641px) and (max-width: 1024px)');
}

// Trả về true nếu thiết bị là desktop
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1025px)');
}

// Trả về true cho các thiết bị có kích thước nhỏ (bao gồm cả điện thoại nhỏ như iPhone SE)
export function useIsSmallDevice(): boolean {
  return useMediaQuery('(max-width: 375px)');
}

export default useMediaQuery;