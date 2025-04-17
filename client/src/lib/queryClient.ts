import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Default API token cho tất cả các yêu cầu API
const API_TOKEN = "vzzvc36lTcb7Pcean8QwndSX";

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
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
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
    
    const res = await fetch(queryKey[0] as string, {
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
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
