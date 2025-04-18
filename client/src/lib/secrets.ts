// Đây là wrapper cho các hàm ask_secrets và check_secrets được cung cấp bởi Replit
// Cần sử dụng @ts-ignore vì các hàm này không được định nghĩa trong mã nguồn
// mà được cung cấp bởi môi trường Replit

interface CheckSecretsResult {
  exists: string[];
  missing: string[];
}

/**
 * Yêu cầu người dùng nhập secret
 * @param secretKeys Danh sách các secret cần nhập
 * @param userMessage Thông báo hiển thị cho người dùng
 * @returns Promise<void>
 */
export async function ask_secrets(
  secretKeys: string[],
  userMessage: string
): Promise<void> {
  try {
    // @ts-ignore
    await window.ask_secrets({
      secret_keys: secretKeys,
      user_message: userMessage,
    });
    return Promise.resolve();
  } catch (error) {
    console.error("Error requesting secrets:", error);
    return Promise.reject(error);
  }
}

/**
 * Kiểm tra xem đã có các secret cần thiết hay chưa
 * @param secretKeys Danh sách các secret cần kiểm tra
 * @returns Promise<CheckSecretsResult> Kết quả kiểm tra
 */
export async function check_secrets(
  secretKeys: string[]
): Promise<CheckSecretsResult> {
  try {
    // @ts-ignore
    const result = await window.check_secrets({
      secret_keys: secretKeys,
    });
    return Promise.resolve(result);
  } catch (error) {
    console.error("Error checking secrets:", error);
    return Promise.reject(error);
  }
}