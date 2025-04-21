import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { API_URL } from "./config";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  
  // Không cần đọc token từ localStorage/sessionStorage nữa
  // Vì token được lưu trong HttpOnly cookie và được tự động gửi đi
  
  // Log thông tin request để debug - giới hạn thông tin để tránh log quá nhiều
  if (process.env.NODE_ENV === 'development' && url.includes("/auth")) {
    console.log("API Request:", { 
      method,
      url
    });
  }
  
  // Không cần thêm token vào headers Authorization nữa
  // Vì sẽ được xử lý tự động bởi cookies
  headers["Accept"] = "application/json";
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Tạo URL đầy đủ khi cần (cho môi trường production)
  const fullUrl = API_URL ? `${API_URL}${url}` : url;
  
  // Chỉ log request API không nhạy cảm trong môi trường phát triển
  if (process.env.NODE_ENV === 'development' && !url.includes("/api/auth")) {
    console.log(`API Request: ${method} ${url}`);
  }
  
  try {
    const res = await fetch(fullUrl, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    // Log cho mục đích debug
    if (!res.ok) {
      console.error(`API Error (${res.status}): ${fullUrl}`);
    }

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API Request Failed: ${method} ${url}`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Không cần sử dụng token từ session storage hoặc localStorage nữa
    // Token được lưu trong HttpOnly cookie và được tự động gửi đi
    
    // Cần chuyển đổi URL cho môi trường production
    const url = queryKey[0] as string;
    const fullUrl = API_URL ? `${API_URL}${url}` : url;
    
    // Chỉ log thông tin không nhạy cảm trong môi trường phát triển
    if (process.env.NODE_ENV === 'development' && !url.includes('/api/auth')) {
      console.log(`Query - ${url}: Processing request`);
    }
    
    const res = await fetch(fullUrl, {
      credentials: "include", // Quan trọng: để gửi cookies trong các request
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });

    if (res.status === 401) {
      console.log("401 Unauthorized response in query", { url, unauthorizedBehavior });
      
      // Xóa dữ liệu người dùng trên client
      if (typeof window !== 'undefined') {
        console.log("Clearing client data due to 401 error");
        localStorage.removeItem("selected_mode");
      }
      
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false, // Tắt auto polling toàn cục và điều chỉnh riêng cho từng query
      refetchOnWindowFocus: true,
      staleTime: 10000, // Cache trong 10 giây để giảm số lượng request
      retry: false,
      gcTime: 60000, // Giữ dữ liệu cũ trong 1 phút nếu user không hoạt động
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});
