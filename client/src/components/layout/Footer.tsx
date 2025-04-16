import { Link } from "wouter";
import { Facebook, Twitter, Instagram, Mail, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#062a61] text-white mt-12">
      <div className="max-w-7xl mx-auto pt-10 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4 border-b border-blue-400 pb-2 inline-block">
              ColorMedia <span className="text-red-500">Affiliate</span>
            </h3>
            <p className="text-gray-300 mt-4">
              Tham gia chương trình đối tác tiếp thị của ColorMedia và nhận thưởng hấp dẫn cho mỗi khách hàng bạn giới thiệu.
            </p>
            <div className="flex space-x-4 mt-5">
              <a href="#" className="text-white hover:text-blue-400">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-white hover:text-blue-400">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-white hover:text-blue-400">
                <Instagram size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Liên kết hữu ích</h3>
            <ul className="space-y-2 text-gray-300">
              <li>
                <Link href="/commission-policy">
                  <a className="hover:text-blue-400 flex items-center">
                    <span className="mr-2">›</span> Chính sách hoa hồng
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/terms-of-service">
                  <a className="hover:text-blue-400 flex items-center">
                    <span className="mr-2">›</span> Điều khoản dịch vụ
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/support">
                  <a className="hover:text-blue-400 flex items-center">
                    <span className="mr-2">›</span> Hỗ trợ
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/faq">
                  <a className="hover:text-blue-400 flex items-center">
                    <span className="mr-2">›</span> FAQ
                  </a>
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Thông tin liên hệ</h3>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-center">
                <Mail size={18} className="mr-3 text-blue-400" />
                <span>affiliate@colormedia.vn</span>
              </li>
              <li className="flex items-center">
                <Phone size={18} className="mr-3 text-blue-400" />
                <span>+84 (0) 123 456 789</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-blue-800 mt-8 pt-6">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex justify-center md:justify-start">
              <span className="text-gray-400 text-sm">
                © {new Date().getFullYear()} ColorMedia Affiliate. Mọi quyền được bảo lưu.
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
