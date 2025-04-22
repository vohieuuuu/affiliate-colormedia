import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowDown, ArrowUp, Filter } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { TransactionHistory } from "@shared/schema";

// Constants for transaction types and their colors
const TRANSACTION_TYPES = {
  SALARY: "Lương cơ bản",
  COMMISSION: "Hoa hồng",
  WITHDRAWAL: "Rút tiền",
  TAX: "Thuế thu nhập",
  BONUS: "Thưởng",
  OTHER: "Khác",
};

const TRANSACTION_COLORS = {
  SALARY: "bg-green-100 text-green-800",
  COMMISSION: "bg-blue-100 text-blue-800",
  WITHDRAWAL: "bg-orange-100 text-orange-800",
  TAX: "bg-red-100 text-red-800",
  BONUS: "bg-purple-100 text-purple-800",
  OTHER: "bg-gray-100 text-gray-800",
};

// Types and interfaces
type TransactionHistoryRecord = TransactionHistory;

type PeriodOption = "all" | "week" | "month" | "year";

interface TransactionHistoryProps {
  kolId: string;
}

interface PeriodDates {
  from?: Date;
  to?: Date;
}

const TransactionHistoryComponent: React.FC<TransactionHistoryProps> = ({ kolId }) => {
  const [period, setPeriod] = useState<PeriodOption>("month");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  // Helper to get date range based on selected period
  const getPeriodDates = (): PeriodDates => {
    const now = new Date();
    const result: PeriodDates = { to: now };
    
    if (period === "all") {
      return {};
    }
    
    const from = new Date();
    if (period === "week") {
      from.setDate(now.getDate() - 7);
    } else if (period === "month") {
      from.setMonth(now.getMonth() - 1);
    } else if (period === "year") {
      from.setFullYear(now.getFullYear() - 1);
    }
    
    result.from = from;
    return result;
  };

  // Query to get transaction history
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/kol", kolId, "transactions", period, typeFilter],
    queryFn: async () => {
      const dates = getPeriodDates();
      let url = `/api/kol/${kolId}/transactions`;
      const params = new URLSearchParams();
      
      if (dates.from) {
        params.append("from", dates.from.toISOString());
      }
      
      if (dates.to) {
        params.append("to", dates.to.toISOString());
      }
      
      if (typeFilter) {
        params.append("type", typeFilter);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error("Failed to fetch transaction history");
      }
      
      const result = await response.json();
      return result.data as TransactionHistoryRecord[];
    }
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Process transactions to show summary
  const calculateSummary = () => {
    if (!data) return { income: 0, expense: 0, net: 0 };
    
    let income = 0;
    let expense = 0;
    
    data.forEach(transaction => {
      if (transaction.transaction_type === "WITHDRAWAL" || transaction.transaction_type === "TAX") {
        expense += transaction.amount;
      } else {
        income += transaction.amount;
      }
    });
    
    return {
      income,
      expense,
      net: income - expense
    };
  };

  const summary = calculateSummary();

  // Determine badge color based on transaction type
  const getBadgeClass = (type: string) => {
    return TRANSACTION_COLORS[type as keyof typeof TRANSACTION_COLORS] || "bg-gray-100 text-gray-800";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Lịch sử giao dịch tài chính</CardTitle>
        <CardDescription>
          Xem chi tiết lương cơ bản, hoa hồng và các giao dịch khác
        </CardDescription>
        <div className="flex flex-wrap gap-2 mt-4">
          <Select value={period} onValueChange={(value) => setPeriod(value as PeriodOption)}>
            <SelectTrigger className="w-28 sm:w-32 h-8 text-xs sm:text-sm">
              <SelectValue placeholder="Thời gian" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="week">7 ngày qua</SelectItem>
              <SelectItem value="month">30 ngày qua</SelectItem>
              <SelectItem value="year">1 năm qua</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={typeFilter || "ALL"} onValueChange={(value) => setTypeFilter(value === "ALL" ? null : value)}>
            <SelectTrigger className="w-32 sm:w-40 h-8 text-xs sm:text-sm">
              <SelectValue placeholder="Loại giao dịch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả</SelectItem>
              {Object.entries(TRANSACTION_TYPES).map(([type, label]) => (
                <SelectItem key={type} value={type}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="px-3 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="p-3 sm:p-4 bg-blue-50 rounded-lg flex flex-col">
            <span className="text-xs sm:text-sm text-blue-700">Tổng thu</span>
            <span className="text-xl sm:text-2xl font-bold text-blue-700">{formatCurrency(summary.income)}</span>
            <div className="flex items-center mt-1 text-blue-600 text-xs sm:text-sm">
              <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            </div>
          </div>
          
          <div className="p-3 sm:p-4 bg-red-50 rounded-lg flex flex-col">
            <span className="text-xs sm:text-sm text-red-700">Tổng chi</span>
            <span className="text-xl sm:text-2xl font-bold text-red-700">{formatCurrency(summary.expense)}</span>
            <div className="flex items-center mt-1 text-red-600 text-xs sm:text-sm">
              <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            </div>
          </div>
          
          <div className="p-3 sm:p-4 bg-green-50 rounded-lg flex flex-col">
            <span className="text-xs sm:text-sm text-green-700">Số dư ròng</span>
            <span className="text-xl sm:text-2xl font-bold text-green-700">{formatCurrency(summary.net)}</span>
            <div className="flex items-center mt-1 text-green-600 text-xs sm:text-sm">
              <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Đang tải dữ liệu...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">
            Có lỗi khi tải dữ liệu: {(error as Error).message}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-2 sm:px-3 text-xs sm:text-sm">Thời gian</TableHead>
                  <TableHead className="px-2 sm:px-3 text-xs sm:text-sm">Loại</TableHead>
                  <TableHead className="px-2 sm:px-3 text-xs sm:text-sm">Mô tả</TableHead>
                  <TableHead className="px-2 sm:px-3 text-xs sm:text-sm text-right">Số tiền</TableHead>
                  <TableHead className="px-2 sm:px-3 text-xs sm:text-sm text-right">Số dư</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data && data.length > 0 ? (
                  data.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">
                        {formatDate(transaction.created_at)}
                      </TableCell>
                      <TableCell className="px-2 sm:px-3">
                        <Badge className={`${getBadgeClass(transaction.transaction_type)} text-xs`}>
                          {window.innerWidth < 360 ? 
                            (transaction.transaction_type === "WITHDRAWAL" ? "Rút" : 
                             transaction.transaction_type === "COMMISSION" ? "HH" : 
                             transaction.transaction_type === "SALARY" ? "Lương" : 
                             transaction.transaction_type === "BONUS" ? "Thưởng" : 
                             transaction.transaction_type === "TAX" ? "Thuế" : 
                             "Khác") 
                            : TRANSACTION_TYPES[transaction.transaction_type as keyof typeof TRANSACTION_TYPES] || transaction.transaction_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[80px] sm:max-w-xs truncate text-xs sm:text-sm px-2 sm:px-3">
                        {transaction.description}
                      </TableCell>
                      <TableCell className={`text-right text-xs sm:text-sm font-medium px-2 sm:px-3 ${transaction.transaction_type === "WITHDRAWAL" || transaction.transaction_type === "TAX" ? "text-red-600" : "text-green-600"}`}>
                        {transaction.transaction_type === "WITHDRAWAL" || transaction.transaction_type === "TAX" 
                          ? `- ${formatCurrency(transaction.amount)}`
                          : `+ ${formatCurrency(transaction.amount)}`}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm font-medium px-2 sm:px-3">
                        {formatCurrency(transaction.balance_after)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-xs sm:text-sm">
                      Không có giao dịch nào trong khoảng thời gian này
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-end px-3 sm:px-6">
        <Button variant="outline" size="sm" onClick={() => window.print()} className="h-8 text-xs sm:text-sm">
          Xuất báo cáo
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TransactionHistoryComponent;