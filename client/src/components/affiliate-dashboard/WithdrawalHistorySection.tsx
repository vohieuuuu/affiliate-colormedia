import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WithdrawalHistory, WithdrawalStatusType } from "@shared/schema";
import { formatCurrency, formatDate } from "@/lib/formatters";

interface WithdrawalHistorySectionProps {
  withdrawalHistory?: WithdrawalHistory[];
}

export default function WithdrawalHistorySection({ 
  withdrawalHistory = [] 
}: WithdrawalHistorySectionProps) {
  
  const getStatusBadge = (status: WithdrawalStatusType) => {
    switch (status) {
      case "Pending":
        return <Badge className="bg-blue-500 hover:bg-blue-600">{status}</Badge>;
      case "Processing":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">{status}</Badge>;
      case "Completed":
        return <Badge className="bg-green-500 hover:bg-green-600">{status}</Badge>;
      case "Rejected":
        return <Badge variant="destructive">{status}</Badge>;
      case "Cancelled":
        return <Badge variant="outline">{status}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  return (
    <Card>
      <CardHeader className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
        <CardTitle>Withdrawal History</CardTitle>
        <CardDescription>Record of your commission withdrawal requests</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-700">
              <TableRow>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Request Date
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Requested Amount
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actual Amount
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Note
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawalHistory.map((withdrawal, index) => (
                <TableRow key={index}>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(withdrawal.request_date)}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatCurrency(withdrawal.amount)} VND
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {withdrawal.has_tax 
                      ? (
                        <div>
                          <span>{formatCurrency(withdrawal.amount_after_tax || withdrawal.amount)} VND</span>
                          {withdrawal.has_tax && (
                            <span className="ml-1 text-xs text-amber-600">
                              (-{(withdrawal.tax_rate || 0.1) * 100}% thuế)
                            </span>
                          )}
                        </div>
                      ) 
                      : formatCurrency(withdrawal.amount) + " VND"
                    }
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {withdrawal.note || "-"}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(withdrawal.status)}
                  </TableCell>
                </TableRow>
              ))}
              
              {withdrawalHistory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No withdrawal requests found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
