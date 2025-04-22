import { useState, useEffect } from "react";

/**
 * Hook kiểm tra media query cho responsive design
 * @param query Media query string, ví dụ: "(max-width: 768px)"
 * @returns Boolean cho biết có match với media query hay không
 */
export function useMediaQuery(query: string): boolean {
  // Giá trị mặc định là false khi không có window
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    // Chỉ thực hiện trên phía client
    if (typeof window !== "undefined") {
      const media = window.matchMedia(query);
      
      // Cập nhật giá trị ban đầu
      setMatches(media.matches);
      
      // Callback để cập nhật state khi media query thay đổi
      const listener = (event: MediaQueryListEvent) => {
        setMatches(event.matches);
      };
      
      // Đăng ký listener cho media query
      media.addEventListener("change", listener);
      
      // Hủy đăng ký listener khi component unmount
      return () => {
        media.removeEventListener("change", listener);
      };
    }
    
    // Fallback cho SSR
    return undefined;
  }, [query]);
  
  return matches;
}