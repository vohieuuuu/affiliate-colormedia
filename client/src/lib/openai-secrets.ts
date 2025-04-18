import { ask_secrets, check_secrets } from "./secrets";

// Hàm kiểm tra và yêu cầu OpenAI API key nếu cần
export async function askOpenAISecrets(): Promise<boolean> {
  try {
    // Kiểm tra xem đã có OpenAI API key chưa
    const secretsCheck = await check_secrets(["OPENAI_API_KEY"]);
    
    // Nếu đã có, trả về true
    if (secretsCheck.exists.includes("OPENAI_API_KEY")) {
      return true;
    }
    
    // Nếu chưa có, yêu cầu người dùng nhập
    await ask_secrets(
      ["OPENAI_API_KEY"],
      "Chức năng quét card visit yêu cầu OpenAI API key để sử dụng AI nhận dạng thông tin. " +
      "Vui lòng cung cấp API key từ tài khoản OpenAI của bạn để kích hoạt tính năng này.\n\n" +
      "Nếu bạn chưa có API key, bạn có thể lấy nó từ: https://platform.openai.com/api-keys"
    );
    
    // Kiểm tra lại sau khi người dùng nhập
    const recheckSecrets = await check_secrets(["OPENAI_API_KEY"]);
    return recheckSecrets.exists.includes("OPENAI_API_KEY");
  } catch (error) {
    console.error("Error checking or requesting OpenAI API key:", error);
    return false;
  }
}