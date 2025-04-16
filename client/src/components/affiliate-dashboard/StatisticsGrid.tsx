import { Affiliate } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  FileText, 
  Wallet, 
  Coins,
  TrendingUp,
  ArrowUpRight
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface StatisticsGridProps {
  affiliate: Affiliate;
}

export default function StatisticsGrid({ affiliate }: StatisticsGridProps) {
  if (!affiliate) return null;
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {/* Referred Leads Card */}
      <Card className="border-none shadow-md overflow-hidden">
        <div className="h-2 bg-[#07ADB8]" />
        <CardContent className="p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Khách hàng giới thiệu</p>
              <div className="flex items-baseline mt-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {affiliate.total_contacts}
                </span>
                <span className="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  liên hệ
                </span>
              </div>
            </div>
            <div className="bg-[#07ADB8]/10 dark:bg-[#07ADB8]/30 p-3 rounded-full">
              <Users className="h-6 w-6 text-[#07ADB8] dark:text-[#07ADB8]" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-green-600">
            <ArrowUpRight className="h-3 w-3 mr-1" />
            <span>5% tăng từ tháng trước</span>
          </div>
        </CardContent>
      </Card>

      {/* Signed Contracts Card */}
      <Card className="border-none shadow-md overflow-hidden">
        <div className="h-2 bg-[#07ADB8]" />
        <CardContent className="p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Hợp đồng ký kết</p>
              <div className="flex items-baseline mt-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {affiliate.total_contracts}
                </span>
                <span className="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  hợp đồng
                </span>
              </div>
            </div>
            <div className="bg-[#07ADB8]/10 dark:bg-[#07ADB8]/30 p-3 rounded-full">
              <FileText className="h-6 w-6 text-[#07ADB8] dark:text-[#07ADB8]" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-green-600">
            <ArrowUpRight className="h-3 w-3 mr-1" />
            <span>10% tăng từ tháng trước</span>
          </div>
        </CardContent>
      </Card>

      {/* Contract Value Card */}
      <Card className="border-none shadow-md overflow-hidden">
        <div className="h-2 bg-[#07ADB8]" />
        <CardContent className="p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Giá trị hợp đồng</p>
              <div className="flex items-baseline mt-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(affiliate.contract_value)}
                </span>
              </div>
            </div>
            <div className="bg-[#07ADB8]/10 dark:bg-[#07ADB8]/30 p-3 rounded-full">
              <TrendingUp className="h-6 w-6 text-[#07ADB8] dark:text-[#07ADB8]" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-green-600">
            <ArrowUpRight className="h-3 w-3 mr-1" />
            <span>15% tăng từ tháng trước</span>
          </div>
        </CardContent>
      </Card>

      {/* Commission Balance Card */}
      <Card className="border-none shadow-md overflow-hidden">
        <div className="h-2 bg-[#FFC919]" />
        <CardContent className="p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Hoa hồng tích lũy</p>
              <div className="flex items-baseline mt-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(affiliate.remaining_balance)}
                </span>
              </div>
            </div>
            <div className="bg-[#FFC919]/10 dark:bg-[#FFC919]/30 p-3 rounded-full">
              <Wallet className="h-6 w-6 text-[#FFC919] dark:text-[#FFC919]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4 text-xs">
            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
              <span className="text-gray-500 dark:text-gray-400 block">Đã nhận:</span>
              <span className="text-green-600 dark:text-green-400 font-semibold">
                {formatCurrency(affiliate.received_balance)}
              </span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
              <span className="text-gray-500 dark:text-gray-400 block">Đã rút:</span>
              <span className="text-red-600 dark:text-red-400 font-semibold">
                {formatCurrency(affiliate.paid_balance)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
