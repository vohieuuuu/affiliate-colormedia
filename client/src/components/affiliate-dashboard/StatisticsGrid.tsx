import { Affiliate } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  FileText, 
  CreditCard, 
  Coins 
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface StatisticsGridProps {
  affiliate: Affiliate;
}

export default function StatisticsGrid({ affiliate }: StatisticsGridProps) {
  if (!affiliate) return null;
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
      {/* Referred Leads Card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Referred Leads</p>
            <Users className="h-5 w-5 text-primary-500" />
          </div>
          <div className="flex items-baseline">
            <span className="text-3xl font-semibold text-gray-900 dark:text-white">
              {affiliate.total_contacts}
            </span>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">contacts</span>
          </div>
        </CardContent>
      </Card>

      {/* Signed Contracts Card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Signed Contracts</p>
            <FileText className="h-5 w-5 text-primary-500" />
          </div>
          <div className="flex items-baseline">
            <span className="text-3xl font-semibold text-gray-900 dark:text-white">
              {affiliate.total_contracts}
            </span>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">contracts</span>
          </div>
        </CardContent>
      </Card>

      {/* Contract Value Card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Contract Value</p>
            <CreditCard className="h-5 w-5 text-primary-500" />
          </div>
          <div className="flex items-baseline">
            <span className="text-3xl font-semibold text-gray-900 dark:text-white">
              {formatCurrency(affiliate.contract_value)}
            </span>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">VND</span>
          </div>
        </CardContent>
      </Card>

      {/* Commission Balance Card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Commission Balance</p>
            <Coins className="h-5 w-5 text-primary-500" />
          </div>
          <div className="flex items-baseline">
            <span className="text-3xl font-semibold text-gray-900 dark:text-white">
              {formatCurrency(affiliate.remaining_balance)}
            </span>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">VND</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
            <div className="text-gray-500 dark:text-gray-400">
              <span>Received:</span>
              <span className="text-gray-700 dark:text-gray-300 ml-1">
                {formatCurrency(affiliate.received_balance)}
              </span>
            </div>
            <div className="text-gray-500 dark:text-gray-400">
              <span>Paid:</span>
              <span className="text-gray-700 dark:text-gray-300 ml-1">
                {formatCurrency(affiliate.paid_balance)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
