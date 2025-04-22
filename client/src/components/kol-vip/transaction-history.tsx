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
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Khoảng thời gian" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="week">7 ngày qua</SelectItem>
              <SelectItem value="month">30 ngày qua</SelectItem>
              <SelectItem value="year">1 năm qua</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={typeFilter || ""} onValueChange={(value) => setTypeFilter(value || null)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Loại giao dịch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tất cả</SelectItem>
              {Object.entries(TRANSACTION_TYPES).map(([type, label]) => (
                <SelectItem key={type} value={type}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-lg flex flex-col">
            <span className="text-sm text-blue-700">Tổng thu</span>
            <span className="text-2xl font-bold text-blue-700">{formatCurrency(summary.income)}</span>
            <div className="flex items-center mt-1 text-blue-600">
              <ArrowUp className="h-4 w-4 mr-1" />
            </div>
          </div>
          
          <div className="p-4 bg-red-50 rounded-lg flex flex-col">
            <span className="text-sm text-red-700">Tổng chi</span>
            <span className="text-2xl font-bold text-red-700">{formatCurrency(summary.expense)}</span>
            <div className="flex items-center mt-1 text-red-600">
              <ArrowDown className="h-4 w-4 mr-1" />
            </div>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg flex flex-col">
            <span className="text-sm text-green-700">Số dư ròng</span>
            <span className="text-2xl font-bold text-green-700">{formatCurrency(summary.net)}</span>
            <div className="flex items-center mt-1 text-green-600">
              <Filter className="h-4 w-4 mr-1" />
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
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Loại giao dịch</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead className="text-right">Số dư sau</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data && data.length > 0 ? (
                  data.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(transaction.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getBadgeClass(transaction.transaction_type)}>
                          {TRANSACTION_TYPES[transaction.transaction_type as keyof typeof TRANSACTION_TYPES] || transaction.transaction_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                      <TableCell className={`text-right font-medium ${transaction.transaction_type === "WITHDRAWAL" || transaction.transaction_type === "TAX" ? "text-red-600" : "text-green-600"}`}>
                        {transaction.transaction_type === "WITHDRAWAL" || transaction.transaction_type === "TAX" 
                          ? `- ${formatCurrency(transaction.amount)}`
                          : `+ ${formatCurrency(transaction.amount)}`}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(transaction.balance_after)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      Không có giao dịch nào trong khoảng thời gian này
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-end">
        <Button variant="outline" onClick={() => window.print()} className="mr-2">
          Xuất báo cáo
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TransactionHistoryComponent;