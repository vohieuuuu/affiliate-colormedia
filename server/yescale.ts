/**
 * Module tương tác với YesScale API để phân tích thông tin danh thiếp
 */
import axios from 'axios';

// Kiểm tra nếu YESCALE_API_KEY không tồn tại
if (!process.env.YESCALE_API_KEY) {
  console.warn('WARNING: YESCALE_API_KEY không được cấu hình. Tính năng phân tích danh thiếp có thể không hoạt động.');
}

interface BusinessCardInfo {
  name: string;
  phone: string;
  email: string;
  position: string;
  company: string;
}

/**
 * Phân tích thông tin từ văn bản OCR của danh thiếp
 * @param ocrText Văn bản đã được OCR từ danh thiếp
 * @returns Thông tin được trích xuất: tên, email, số điện thoại, chức vụ, tên công ty
 */
export async function extractBusinessCardInfo(ocrText: string): Promise<BusinessCardInfo> {
  try {
    const apiKey = process.env.YESCALE_API_KEY;
    
    if (!apiKey) {
      throw new Error('YESCALE_API_KEY chưa được cấu hình');
    }

    const response = await axios.post(
      'https://api.yescale.io/v1/chat/completions',
      {
        model: 'gpt-4o', // Sử dụng model tiên tiến nhất
        messages: [
          {
            role: 'system',
            content: 'Bạn là một AI chuyên phân tích thông tin từ danh thiếp. Trích xuất và cấu trúc thông tin theo format JSON.'
          },
          {
            role: 'user',
            content: `Từ đoạn văn bản sau, hãy trích xuất các thông tin sau đây và trình bày theo cấu trúc JSON:

Tên (đầy đủ, viết hoa, không lẫn ký tự khác).
Chức vụ (nếu có).
Số điện thoại (ưu tiên số di động, định dạng liền hoặc có dấu cách).
Email (đảm bảo đúng cú pháp, có domain rõ ràng).
Tên công ty (loại bỏ ký tự thừa, viết đúng chính tả).

Lưu ý:
- Bỏ qua các ký tự nhiễu, số lộn xộn không liên quan.
- Nếu thông tin không rõ ràng (ví dụ: tên công ty viết tắt), hãy ghi chú thêm hoặc đề xuất phương án hợp lý.
- Ưu tiên sắp xếp thông tin theo thứ tự Tên → Chức vụ → Số điện thoại → Email → Tên công ty.
- Nếu một trường thông tin không xác định được, hãy để trống.

Trả về kết quả theo định dạng JSON: {"name": "", "position": "", "phone": "", "email": "", "company": ""}

Văn bản cần phân tích:
${ocrText}`
          }
        ],
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('YesScale API response:', JSON.stringify(response.data, null, 2));
    
    const result = response.data.choices[0].message.content;
    
    // Parse JSON từ response
    const parsedResult = JSON.parse(result);
    
    // Đảm bảo kết quả trả về đủ trường thông tin
    const businessCardInfo: BusinessCardInfo = {
      name: parsedResult.name || '',
      phone: parsedResult.phone || '',
      email: parsedResult.email || '',
      position: parsedResult.position || '',
      company: parsedResult.company || ''
    };

    return businessCardInfo;
  } catch (error) {
    console.error('Lỗi khi phân tích thông tin danh thiếp:', error);
    
    // Trả về đối tượng trống nếu có lỗi
    return {
      name: '',
      phone: '',
      email: '',
      position: '',
      company: ''
    };
  }
}