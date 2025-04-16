import { Affiliate } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Mail, 
  Phone, 
  CreditCard, 
  DollarSign,
  User,
  BadgeDollarSign
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface DashboardInfoBarProps {
  affiliate: Affiliate;
  onWithdrawalRequest: () => void;
}

export default function DashboardInfoBar({ affiliate, onWithdrawalRequest }: DashboardInfoBarProps) {
  if (!affiliate) return null;
  
  return (
    <Card className="mb-8 border-none overflow-hidden shadow-lg">
      <div className="bg-gradient-to-r from-[#07ADB8] to-[#05868f] text-white p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="bg-white p-3 rounded-full mr-4">
              <User className="h-10 w-10 text-[#07ADB8]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                {affiliate.full_name}
              </h1>
              <p className="text-white/80 mt-1">
                ID: {affiliate.affiliate_id}
              </p>
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center">
              <BadgeDollarSign className="h-8 w-8 text-[#FFC919] mr-3" />
              <div>
                <p className="text-white/80 text-sm">Số dư có thể rút</p>
                <p className="text-2xl font-bold">{formatCurrency(affiliate.remaining_balance)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <CardContent className="p-6 bg-white dark:bg-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
                <div className="flex items-start">
                  <Mail className="w-5 h-5 text-[#07ADB8] dark:text-[#07ADB8] mt-0.5" />
                  <div className="ml-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">
                      Email
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                      {affiliate.email}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
                <div className="flex items-start">
                  <Phone className="w-5 h-5 text-[#07ADB8] dark:text-[#07ADB8] mt-0.5" />
                  <div className="ml-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">
                      Số điện thoại
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                      {affiliate.phone}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
                <div className="flex items-start">
                  <CreditCard className="w-5 h-5 text-[#07ADB8] dark:text-[#07ADB8] mt-0.5" />
                  <div className="ml-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">
                      Tài khoản ngân hàng
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                      {affiliate.bank_name} - {affiliate.bank_account}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-center md:justify-end items-center">
            <Button 
              variant="default" 
              className="bg-[#FFC919] hover:bg-[#e5b517] text-gray-800 shadow-md py-6 px-6 rounded-md"
              onClick={onWithdrawalRequest}
            >
              <DollarSign className="mr-2 h-5 w-5" />
              Yêu cầu rút tiền
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
