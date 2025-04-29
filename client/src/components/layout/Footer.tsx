export default function Footer() {
  return (
    <footer className="bg-[#07ADB8] text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo */}
          <div className="mb-6 md:mb-0">
            <div className="bg-white rounded p-2 inline-block">
              <img src="/logo-colormedia.png" alt="ColorMedia Logo" className="h-12" />
            </div>
          </div>

          {/* Địa chỉ */}
          <div className="mb-6 md:mb-0">
            <h3 className="font-bold text-lg mb-4">ĐỊA CHỈ:</h3>
            <div>
              <p className="mb-1">
                <span className="font-semibold">Hà Nội: </span>
                Tầng 5, Tòa nhà Lucky Building, 81 Trần Thái Tông, Dịch Vọng, Hà Nội
              </p>
              <p>
                <span className="font-semibold">Hồ Chí Minh: </span>
                Số 26B, Đường Lê Quốc Hưng, Phường 13, Quận 4, Hồ Chí Minh
              </p>
            </div>
          </div>

          {/* Hotline */}
          <div className="mb-6 md:mb-0">
            <h3 className="font-bold text-lg mb-4">HOTLINE:</h3>
            <div>
              <p>ColorMedia Hà Nội: 0776.511.511</p>
              <p>ColorMedia Sài Gòn: 0854.511.511</p>
              <p>ColorStudio: 0843.511.511</p>
            </div>
          </div>

          {/* Email và DMCA */}
          <div className="mb-6 md:mb-0 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-lg mb-4">EMAIL:</h3>
              <p>contact@colormedia.vn</p>
            </div>
            <div className="mt-4 md:mt-0 text-right md:self-end">
              <img src="/dmca-badge.svg" alt="DMCA Protected" className="h-8 inline-block" />
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-4 border-t border-teal-500 text-right">
          <p className="text-sm">© 2019 All rights reserved by ColorMedia</p>
        </div>
      </div>
    </footer>
  );
}
