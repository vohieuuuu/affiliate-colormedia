import { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ReferredCustomer } from "@shared/schema";
import { Eye, RefreshCw } from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { useQueryClient } from "@tanstack/react-query";

interface ReferredCustomersSectionProps {
  referredCustomers?: ReferredCustomer[];
  onViewTimeline: (customer: ReferredCustomer) => void;
}

export default function ReferredCustomersSection({ 
  referredCustomers = [], 
  onViewTimeline 
}: ReferredCustomersSectionProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // Pagination logic
  const totalPages = Math.ceil(referredCustomers.length / itemsPerPage);
  const currentItems = referredCustomers.slice(
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
  
  const queryClient = useQueryClient();
  
  // Định kỳ làm mới dữ liệu khách hàng được giới thiệu mỗi 15 giây
  useEffect(() => {
    const interval = setInterval(() => {
      // Làm mới dữ liệu khách hàng được giới thiệu
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate'] });
    }, 15000);
    
    return () => clearInterval(interval);
  }, [queryClient]);
  
  // Hàm làm mới dữ liệu thủ công
  const handleRefreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/affiliate'] });
  };

  return (
    <Card>
      <CardHeader className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700 flex flex-row justify-between items-center">
        <div>
          <CardTitle>Referred Customers</CardTitle>
          <CardDescription>Track the progress of your referrals</CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleRefreshData}
          title="Refresh Data"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-700">
              <TableRow>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Customer
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Last Updated
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.map((customer, index) => (
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
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              
              {currentItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No customers found
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
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, referredCustomers.length)}
                  </span>{" "}
                  of <span className="font-medium">{referredCustomers.length}</span> results
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
                    <span className="sr-only">Previous</span>
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
                    <span className="sr-only">Next</span>
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
