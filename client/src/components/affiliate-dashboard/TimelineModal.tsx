import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ReferredCustomer, CustomerStatusType } from "@shared/schema";
import { formatDate } from "@/lib/formatters";

interface TimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: ReferredCustomer;
}

export default function TimelineModal({ isOpen, onClose, customer }: TimelineModalProps) {
  if (!customer) return null;

  // Define all possible statuses in order
  const allStatuses: CustomerStatusType[] = [
    "Mới nhập",        // 🟡
    "Đang tư vấn",     // 🔵
    "Chờ phản hồi",    // 🟠
    "Đã chốt hợp đồng", // 🟢
    "Không tiềm năng"   // 🔴
  ];
  
  // Find the index of the current status
  const currentStatusIndex = allStatuses.indexOf(customer.status);
  
  // Status descriptions and dates
  const statusDescriptions: Record<CustomerStatusType, string> = {
    "Mới nhập": "Contact vừa được tạo, chưa xử lý.",
    "Đang tư vấn": "Đã có sale gọi điện hoặc tiếp cận.",
    "Chờ phản hồi": "Đã gửi báo giá hoặc thông tin thêm.",
    "Đã chốt hợp đồng": "Thành công, được tính hoa hồng.",
    "Không tiềm năng": "Không còn nhu cầu, loại khỏi KPI."
  };
  
  // Function to get color class based on status
  const getStatusColor = (status: CustomerStatusType) => {
    switch (status) {
      case "Mới nhập":
        return "bg-yellow-500"; // 🟡
      case "Đang tư vấn":
        return "bg-blue-500";   // 🔵
      case "Chờ phản hồi":
        return "bg-orange-500"; // 🟠
      case "Đã chốt hợp đồng":
        return "bg-green-500";  // 🟢
      case "Không tiềm năng":
        return "bg-red-500";    // 🔴
      default:
        return "bg-gray-500";
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{customer.customer_name}</DialogTitle>
          <DialogDescription>
            Customer referral status timeline
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-6 relative pl-8">
          <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700"></div>
          
          {allStatuses.map((status, index) => {
            const isCompleted = index <= currentStatusIndex;
            const isActive = index === currentStatusIndex;
            
            return (
              <div key={index} className={`mb-8 relative ${isCompleted ? '' : 'opacity-40'}`}>
                <div className={`absolute w-3 h-3 rounded-full -left-1.5 top-1.5 ${getStatusColor(status)}`}></div>
                <div className="ml-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">{status}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isActive ? formatDate(customer.updated_at) : (isCompleted ? 'Completed' : '-')}
                  </p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    {statusDescriptions[status]}
                  </p>
                  {status === "Đã chốt hợp đồng" && isCompleted && customer.note && (
                    <p className="mt-1 text-sm italic text-gray-600 dark:text-gray-300">
                      Ghi chú: {customer.note}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
