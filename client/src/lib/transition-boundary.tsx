import { ReactNode, Suspense, startTransition, useCallback } from "react";
import { Loader2 } from "lucide-react";

/**
 * TransitionBoundary là một component bọc các route transitions để tránh lỗi React suspense
 * "A component suspended while responding to synchronous input"
 * 
 * Component này kết hợp Suspense và startTransition để đảm bảo các chuyển đổi route mượt mà
 */
export function TransitionBoundary({ children }: { children: ReactNode }) {
  // Wrap children inside a Suspense boundary to handle async loading
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col gap-2 items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Đang tải nội dung...</p>
      </div>
    }>
      {children}
    </Suspense>
  );
}

/**
 * Hook tùy chỉnh để tạo hàm setLocation bọc trong startTransition
 * Sẽ thay thế cho useLocation hook từ wouter
 */
export function useTransitionLocation() {
  const [location, setLocationRaw] = useLocation();
  
  // Wrap setLocation trong startTransition để tránh lỗi suspense
  const setLocation = useCallback((to: string) => {
    startTransition(() => {
      setLocationRaw(to);
    });
  }, [setLocationRaw]);
  
  return [location, setLocation] as const;
}

/**
 * Hook useLocation là để ngăn lỗi TypeScript
 * Cần import useLocation từ wouter trong cấu hình thực tế
 */
function useLocation(): [string, (to: string) => void] {
  // Đây chỉ là placeholder, sẽ được thay thế bởi import thực tế từ wouter
  return ["", () => {}];
}