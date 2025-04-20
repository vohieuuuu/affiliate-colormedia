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
  
  // Sử dụng token từ session storage nếu có, nếu không sử dụng API_TOKEN mặc định
  const authToken = typeof window !== 'undefined' 
    ? sessionStorage.getItem("auth_token") || API_TOKEN
    : API_TOKEN;
  
  headers["Authorization"] = `Bearer ${authToken}`;
  headers["Accept"] = "application/json";
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Tạo URL đầy đủ khi cần (cho môi trường production)
  const fullUrl = API_URL ? `${API_URL}${url}` : url;
  
  console.log(`API Request: ${method} ${url} with token: ${authToken ? "Present" : "Missing"}`);
  
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
    // Sử dụng token từ session storage nếu có, nếu không sử dụng API_TOKEN mặc định
    const authToken = typeof window !== 'undefined' 
      ? sessionStorage.getItem("auth_token") || API_TOKEN
      : API_TOKEN;
    
    // Cần chuyển đổi URL cho môi trường production
    const url = queryKey[0] as string;
    const fullUrl = API_URL ? `${API_URL}${url}` : url;
    
    const res = await fetch(fullUrl, {
      credentials: "include",
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
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
