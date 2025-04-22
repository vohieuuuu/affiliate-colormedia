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
            content: `Phân tích văn bản OCR từ danh thiếp sau và trả về thông tin có cấu trúc bao gồm: tên người, số điện thoại, email, chức vụ, và tên công ty. Chỉ trả về JSON theo định dạng {"name": "", "phone": "", "email": "", "position": "", "company": ""} không kèm giải thích:\n\n${ocrText}`
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