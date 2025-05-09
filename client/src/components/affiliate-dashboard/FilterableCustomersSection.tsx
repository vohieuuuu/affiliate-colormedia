import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Eye, ListFilter } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/formatters";
import { 
  StatisticsPeriodType, 
  ReferredCustomer 
} from "@shared/schema";

interface FilterableCustomersSectionProps {
  onViewTimeline: (customer: ReferredCustomer) => void;
}

export default function FilterableCustomersSection({ 
  onViewTimeline 
}: FilterableCustomersSectionProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [period, setPeriod] = useState<StatisticsPeriodType>("all");
  const [status, setStatus] = useState<string>("all");
  const itemsPerPage = 5;
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [period, status]);
  
  // Fetch filtered customers
  const { data: apiResponse, isLoading } = useQuery({
    queryKey: ['/api/affiliate/customer-statistics', { period, status: status === "all" ? undefined : status }],
  });
  
  // Extract customers from response
  const customers = apiResponse?.status === "success" 
    ? apiResponse.data?.customers || [] 
    : [];
  
  // Pagination logic
  const totalPages = Math.ceil(customers.length / itemsPerPage);
  const currentItems = customers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Contact received":
        return "bg-gray-500";
      case "Presenting idea":
        return "bg-yellow-500";
      case "Contract signed":
        return "bg-green-500";
      case "Pending reconciliation":
        return "bg-blue-500";
      case "Ready to disburse":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };
  
  return (
    <Card>
      <CardHeader className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Khách hàng giới thiệu</CardTitle>
            <CardDescription>Theo dõi trạng thái khách hàng của bạn</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-nowrap">
            <Select 
              value={period} 
              onValueChange={(value) => setPeriod(value as StatisticsPeriodType)}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Chọn thời gian" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="week">Tuần này</SelectItem>
                <SelectItem value="month">Tháng này</SelectItem>
                <SelectItem value="year">Năm nay</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={status} 
              onValueChange={(value) => setStatus(value)}
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="Contact received">Đã nhận thông tin</SelectItem>
                <SelectItem value="Presenting idea">Đang tư vấn</SelectItem>
                <SelectItem value="Contract signed">Đã ký hợp đồng</SelectItem>
                <SelectItem value="Pending reconciliation">Chờ đối soát</SelectItem>
                <SelectItem value="Ready to disburse">Sẵn sàng thanh toán</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-700">
              <TableRow>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Khách hàng
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Trạng thái
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Giá trị HĐ
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Hoa hồng
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Cập nhật
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(itemsPerPage).fill(0).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={6} className="px-6 py-4">
                      <div className="animate-pulse flex space-x-4">
                        <div className="flex-1 space-y-4 py-1">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : currentItems.length > 0 ? (
                currentItems.map((customer, index) => (
                  <TableRow 
                    key={index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {customer.customer_name}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span 
                          className={`w-2.5 h-2.5 rounded-full mr-1.5 ${getStatusColor(customer.status)}`}
                        ></span>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {customer.status}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {customer.contract_value 
                        ? formatCurrency(customer.contract_value) 
                        : "-"}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {customer.commission 
                        ? formatCurrency(customer.commission) 
                        : "-"}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(customer.updated_at)}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button 
                        variant="ghost" 
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                        onClick={() => onViewTimeline(customer)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Xem
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Không tìm thấy khách hàng nào phù hợp với bộ lọc
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Sau
              </Button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Hiển thị <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> đến{" "}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, customers.length)}
                  </span>{" "}
                  trong <span className="font-medium">{customers.length}</span> kết quả
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-l-md"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <span className="sr-only">Trước</span>
                    &larr;
                  </Button>
                  
                  {[...Array(totalPages)].map((_, index) => (
                    <Button
                      key={index}
                      variant={currentPage === index + 1 ? "default" : "outline"}
                      size="sm"
                      className="rounded-none"
                      onClick={() => setCurrentPage(index + 1)}
                    >
                      {index + 1}
                    </Button>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-r-md"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    <span className="sr-only">Sau</span>
                    &rarr;
                  </Button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}