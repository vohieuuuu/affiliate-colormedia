import { Facebook, Twitter, Instagram, MapPin, Phone, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#07ADB8] text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Logo và thông tin công ty */}
        <div className="flex flex-wrap justify-between items-start">
          <div className="w-full md:w-auto mb-6 md:mb-0">
            <div className="flex items-center">
              <div className="text-white font-bold text-2xl">
                <img src="/color-media-logo-white.png" alt="ColorMedia Logo" className="h-16" />
              </div>
            </div>
          </div>

          {/* Địa chỉ */}
          <div className="w-full md:w-1/4 mb-6 md:mb-0">
            <h3 className="font-bold text-lg mb-4">ĐỊA CHỈ:</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <span className="font-semibold">Hà Nội:</span> 
                <span className="ml-1">Tầng 5, Tòa nhà Lucky Building, 81 Trần Thái Tông, Dịch Vọng, Hà Nội</span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold">Hồ Chí Minh:</span>
                <span className="ml-1">Số 26B, Đường Lê Quốc Hưng, Phường 13, Quận 4, Hồ Chí Minh</span>
              </div>
            </div>
          </div>

          {/* Hotline */}
          <div className="w-full md:w-1/4 mb-6 md:mb-0">
            <h3 className="font-bold text-lg mb-4">HOTLINE:</h3>
            <div className="space-y-2">
              <p>ColorMedia Hà Nội: 0776.511.511</p>
              <p>ColorMedia Sài Gòn: 0854.511.511</p>
              <p>ColorStudio: 0843.511.511</p>
            </div>
          </div>

          {/* Email và DMCA */}
          <div className="w-full md:w-1/4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg mb-4">EMAIL:</h3>
                <p>contact@colormedia.vn</p>
              </div>
              <div>
                <a href="#" className="inline-block">
                  <img src="/dmca-badge.png" alt="DMCA Protected" className="h-8" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-4 text-right">
          <p className="text-sm">© 2019 All rights reserved by ColorMedia</p>
        </div>
      </div>
    </footer>
  );
}
