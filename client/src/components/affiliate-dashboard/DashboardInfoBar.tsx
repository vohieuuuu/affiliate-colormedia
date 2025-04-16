import { Affiliate } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Mail, 
  Phone, 
  CreditCard, 
  DollarSign 
} from "lucide-react";

interface DashboardInfoBarProps {
  affiliate: Affiliate;
  onWithdrawalRequest: () => void;
}

export default function DashboardInfoBar({ affiliate, onWithdrawalRequest }: DashboardInfoBarProps) {
  if (!affiliate) return null;
  
  return (
    <Card className="mb-8">
      <CardContent className="p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {affiliate.full_name}
            </h1>
            <div className="space-y-2">
              <div className="flex items-start">
                <Mail className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5" />
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {affiliate.email}
                </span>
              </div>
              <div className="flex items-start">
                <Phone className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5" />
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {affiliate.phone}
                </span>
              </div>
              <div className="flex items-start">
                <CreditCard className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="text-gray-700 dark:text-gray-300">
                    {affiliate.bank_name}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300 ml-1">-</span>
                  <span className="text-gray-700 dark:text-gray-300 ml-1">
                    {affiliate.bank_account}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button 
              variant="default" 
              className="bg-primary-600 hover:bg-primary-700"
              onClick={onWithdrawalRequest}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Request Withdrawal
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
