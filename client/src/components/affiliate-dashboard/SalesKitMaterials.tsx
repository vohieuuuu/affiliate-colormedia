import { Card, CardContent } from "@/components/ui/card";
import { FileText, Link as LinkIcon, PresentationIcon, Download, BookOpen, Film } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SalesKitMaterials() {
  return (
    <Card className="border-none shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-[#07ADB8] to-[#05868f] px-6 py-5">
        <h3 className="text-lg font-bold text-white flex items-center">
          <BookOpen className="mr-2 h-5 w-5 text-[#FFC919]" />
          Tài liệu bán hàng
        </h3>
        <p className="text-white/80 text-sm mt-1">
          Tài nguyên hỗ trợ giới thiệu khách hàng
        </p>
      </div>
      <CardContent className="p-0">
        <div className="p-5 bg-white dark:bg-gray-800">
          <div className="flex flex-col space-y-4">
            <div className="flex items-start bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 transition-colors hover:bg-gray-100 dark:hover:bg-gray-900/80">
              <div className="flex-shrink-0 bg-[#07ADB8]/10 dark:bg-[#07ADB8]/20 p-3 rounded-full">
                <FileText className="text-[#07ADB8] dark:text-[#07ADB8] h-5 w-5" />
              </div>
              <div className="ml-4 flex-1">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Brochure sản phẩm ColorMedia
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  PDF • 12.4 MB • Cập nhật: 10/04/2024
                </p>
                <div className="mt-2">
                  <Button variant="outline" size="sm" className="text-xs">
                    <Download className="h-3 w-3 mr-1" /> Tải xuống
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex items-start bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 transition-colors hover:bg-gray-100 dark:hover:bg-gray-900/80">
              <div className="flex-shrink-0 bg-[#07ADB8]/10 dark:bg-[#07ADB8]/20 p-3 rounded-full">
                <FileText className="text-[#07ADB8] dark:text-[#07ADB8] h-5 w-5" />
              </div>
              <div className="ml-4 flex-1">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Bảng giá dịch vụ 2024
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  PDF • 3.2 MB • Cập nhật: 01/03/2024
                </p>
                <div className="mt-2">
                  <Button variant="outline" size="sm" className="text-xs">
                    <Download className="h-3 w-3 mr-1" /> Tải xuống
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex items-start bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 transition-colors hover:bg-gray-100 dark:hover:bg-gray-900/80">
              <div className="flex-shrink-0 bg-[#FFC919]/10 dark:bg-[#FFC919]/20 p-3 rounded-full">
                <Film className="text-[#FFC919] dark:text-[#FFC919] h-5 w-5" />
              </div>
              <div className="ml-4 flex-1">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Video giới thiệu công ty
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  MP4 • 35.7 MB • Thời lượng: 2:45
                </p>
                <div className="mt-2">
                  <Button variant="outline" size="sm" className="text-xs">
                    <LinkIcon className="h-3 w-3 mr-1" /> Xem video
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex items-start bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 transition-colors hover:bg-gray-100 dark:hover:bg-gray-900/80">
              <div className="flex-shrink-0 bg-[#07ADB8]/10 dark:bg-[#07ADB8]/20 p-3 rounded-full">
                <PresentationIcon className="text-[#07ADB8] dark:text-[#07ADB8] h-5 w-5" />
              </div>
              <div className="ml-4 flex-1">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Mẫu thuyết trình bán hàng
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  PPTX • 8.1 MB • Cập nhật: 15/03/2024
                </p>
                <div className="mt-2">
                  <Button variant="outline" size="sm" className="text-xs">
                    <Download className="h-3 w-3 mr-1" /> Tải xuống
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
