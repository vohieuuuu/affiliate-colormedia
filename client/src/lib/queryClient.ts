import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { API_URL, DEFAULT_API_TOKEN } from "./config";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Get API token, sử dụng token từ config
const API_TOKEN = DEFAULT_API_TOKEN;

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  
  // Sử dụng token từ session storage hoặc localStorage nếu có, nếu không sử dụng API_TOKEN mặc định
  let authToken = API_TOKEN;
  if (typeof window !== 'undefined') {
    const sessionToken = sessionStorage.getItem("auth_token");
    const localToken = localStorage.getItem("auth_token");
    
    // Log thông tin token để debug - giới hạn thông tin để tránh log quá nhiều
    if (url.includes("/auth")) {
      console.log("Token status in apiRequest:", { 
        hasSessionToken: !!sessionToken, 
        hasLocalToken: !!localToken,
        method,
        url
      });
    }
    
    // Ưu tiên sử dụng token từ sessionStorage trước
    authToken = sessionToken || localToken || API_TOKEN;
  }
  
  headers["Authorization"] = `Bearer ${authToken}`;
  headers["Accept"] = "application/json";
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Tạo URL đầy đủ khi cần (cho môi trường production)
  const fullUrl = API_URL ? `${API_URL}${url}` : url;
  
  console.log(`API Request: ${method} ${url} with token: ${authToken ? "Present" : "Missing"}`);
  // Thêm log chi tiết về token để debug
  if (authToken) {
    console.log(`Token (first 10 chars): ${authToken.substring(0, 10)}...`);
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
    // Sử dụng token từ session storage hoặc localStorage nếu có, nếu không sử dụng API_TOKEN mặc định
    let authToken = API_TOKEN;
    if (typeof window !== 'undefined') {
      const sessionToken = sessionStorage.getItem("auth_token");
      const localToken = localStorage.getItem("auth_token");
      
      // Log thông tin token để debug
      console.log("Token status in getQueryFn:", { 
        hasSessionToken: !!sessionToken, 
        hasLocalToken: !!localToken,
        url: queryKey[0]
      });
      
      // Ưu tiên sử dụng token từ sessionStorage trước
      authToken = sessionToken || localToken || API_TOKEN;
    }
    
    // Cần chuyển đổi URL cho môi trường production
    const url = queryKey[0] as string;
    const fullUrl = API_URL ? `${API_URL}${url}` : url;
    
    // Thêm log chi tiết về token được sử dụng trong query
    console.log(`Query - ${url}: Using token (first 10 chars): ${authToken.substring(0, 10)}...`);
    
    const res = await fetch(fullUrl, {
      credentials: "include",
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });

    if (res.status === 401) {
      console.log("401 Unauthorized response in query", { url, unauthorizedBehavior });
      
      // Xóa token không hợp lệ từ cả localStorage và sessionStorage
      if (typeof window !== 'undefined') {
        console.log("Clearing invalid tokens due to 401 error");
        localStorage.removeItem("auth_token");
        sessionStorage.removeItem("auth_token");
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
