import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronRight,
  Search,
  SlidersHorizontal,
  FileCheck,
  Ban,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Phone,
  Mail,
  Building
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { KolContact, CustomerStatusType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import UpdateContactModal from "./update-contact-modal";
import ContractModal from "./contract-modal";

interface KolContactsTableProps {
  onRefresh?: () => void;
}

const KolContactsTable = ({ onRefresh }: KolContactsTableProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<KolContact | null>(null);
  
  // Lấy thông tin affiliate từ API
  const { data: kolData, isLoading: isKolLoading } = useQuery<{
    status: string;
    data: {
      id: number;
      affiliate_id: string;
      full_name: string;
    }
  }>({
    queryKey: ['/api/kol/me'],
    retry: 1,
  });

  // Lấy danh sách contacts từ API
  const { data: contactsData, isLoading, isError, refetch } = useQuery<{
    status: string;
    data: KolContact[];
  }>({
    queryKey: ['/api/kol/contacts'],
    queryFn: async () => {
      if (!kolData?.data?.affiliate_id) {
        throw new Error("KOL ID not available");
      }
      
      const res = await fetch(`/api/kol/${kolData.data.affiliate_id}/contacts`);
      if (!res.ok) {
        throw new Error("Failed to fetch contacts");
      }
      
      return res.json();
    },
    enabled: !!kolData?.data?.affiliate_id,
    retry: 1,
  });

  // Cập nhật trạng thái contact
  const updateContactMutation = useMutation({
    mutationFn: async ({ contactId, status, note }: { contactId: number, status: CustomerStatusType, note: string }) => {
      if (!kolData?.data?.affiliate_id) {
        throw new Error("KOL ID not available");
      }
      
      const res = await fetch(`/api/kol/${kolData.data.affiliate_id}/contacts/${contactId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status, note })
      });
      
      if (!res.ok) {
        throw new Error("Failed to update contact");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Cập nhật trạng thái liên hệ thành công",
      });
      
      refetch();
      if (onRefresh) onRefresh();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Có lỗi xảy ra khi cập nhật trạng thái liên hệ",
        variant: "destructive"
      });
    }
  });

  // Cập nhật thông tin hợp đồng
  const updateContractMutation = useMutation({
    mutationFn: async ({ contactId, contractValue, note }: { contactId: number, contractValue: number, note: string }) => {
      if (!kolData?.data?.affiliate_id) {
        throw new Error("KOL ID not available");
      }
      
      const res = await fetch(`/api/kol/${kolData.data.affiliate_id}/contacts/${contactId}/contract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ contract_value: contractValue, note })
      });
      
      if (!res.ok) {
        throw new Error("Failed to update contract");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Cập nhật thông tin hợp đồng thành công",
      });
      
      refetch();
      if (onRefresh) onRefresh();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Có lỗi xảy ra khi cập nhật thông tin hợp đồng",
        variant: "destructive"
      });
    }
  });

  const handleUpdateContact = (contact: KolContact) => {
    setSelectedContact(contact);
    setIsUpdateModalOpen(true);
  };

  const handleOpenContractModal = (contact: KolContact) => {
    setSelectedContact(contact);
    setIsContractModalOpen(true);
  };

  const handleUpdateStatus = (data: { status: CustomerStatusType, note: string }) => {
    if (!selectedContact) return;
    
    updateContactMutation.mutate({
      contactId: selectedContact.id,
      status: data.status,
      note: data.note
    });
    
    setIsUpdateModalOpen(false);
  };

  const handleUpdateContract = (data: { contractValue: number, note: string }) => {
    if (!selectedContact) return;
    
    updateContractMutation.mutate({
      contactId: selectedContact.id,
      contractValue: data.contractValue,
      note: data.note
    });
    
    setIsContractModalOpen(false);
  };

  // Lọc danh sách contacts
  const filteredContacts = contactsData?.data ? contactsData.data.filter(contact => {
    const matchesSearch = 
      contact.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.company && contact.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (contact.phone && contact.phone.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || contact.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) : [];

  // Status badge component
  const StatusBadge = ({ status }: { status: CustomerStatusType }) => {
    const statusMap: Record<CustomerStatusType, { color: string, icon: React.ReactNode }> = {
      "Mới nhập": { color: "bg-blue-100 text-blue-800", icon: <Clock className="w-3 h-3 mr-1" /> },
      "Đang tư vấn": { color: "bg-orange-100 text-orange-800", icon: <Users className="w-3 h-3 mr-1" /> },
      "Chờ phản hồi": { color: "bg-purple-100 text-purple-800", icon: <Clock className="w-3 h-3 mr-1" /> },
      "Đã chốt hợp đồng": { color: "bg-green-100 text-green-800", icon: <CheckCircle className="w-3 h-3 mr-1" /> },
      "Không tiềm năng": { color: "bg-red-100 text-red-800", icon: <XCircle className="w-3 h-3 mr-1" /> },
    };

    const { color, icon } = statusMap[status] || { color: "bg-gray-100 text-gray-800", icon: null };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
        {icon}
        {status}
      </span>
    );
  };

  if (isLoading || isKolLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-10 h-10 border-4 border-dashed rounded-full animate-spin border-primary"></div>
      </div>
    );
  }

  if (isError || !contactsData) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Lỗi khi tải dữ liệu</h2>
        <p className="text-gray-500 mb-4">Không thể tải danh sách liên hệ. Vui lòng thử lại sau.</p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Tải lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Tìm kiếm liên hệ..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="w-[180px]">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Lọc theo trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="Mới nhập">Mới nhập</SelectItem>
              <SelectItem value="Đang tư vấn">Đang tư vấn</SelectItem>
              <SelectItem value="Chờ phản hồi">Chờ phản hồi</SelectItem>
              <SelectItem value="Đã chốt hợp đồng">Đã chốt hợp đồng</SelectItem>
              <SelectItem value="Không tiềm năng">Không tiềm năng</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Hiển thị {filteredContacts.length} liên hệ
      </div>
      
      {/* Table */}
      {filteredContacts.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên liên hệ</TableHead>
                <TableHead>Thông tin liên hệ</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày thêm</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">
                    <div>{contact.contact_name}</div>
                    <div className="text-sm text-muted-foreground">{contact.company || "-"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm">
                      <Phone className="mr-1 h-3 w-3 text-muted-foreground" />
                      {contact.phone || "-"}
                    </div>
                    <div className="flex items-center text-sm">
                      <Mail className="mr-1 h-3 w-3 text-muted-foreground" />
                      {contact.email || "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={contact.status} />
                    {contact.status === "Đã chốt hợp đồng" && contact.contract_value && (
                      <div className="mt-1 text-xs text-green-600">
                        {formatCurrency(contact.contract_value)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(contact.created_at).toLocaleDateString("vi-VN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => handleUpdateContact(contact)}
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Cập nhật trạng thái</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => handleOpenContractModal(contact)}
                              disabled={contact.status === "Đã chốt hợp đồng"}
                            >
                              <FileCheck className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Chốt hợp đồng</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-center mb-2 font-medium">Không tìm thấy liên hệ nào</p>
            <p className="text-center text-sm text-muted-foreground">
              Hãy thử tìm kiếm với từ khóa khác hoặc thay đổi bộ lọc
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Update Status Modal */}
      {selectedContact && (
        <UpdateContactModal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          contact={selectedContact}
          onSubmit={handleUpdateStatus}
        />
      )}
      
      {/* Contract Modal */}
      {selectedContact && (
        <ContractModal
          isOpen={isContractModalOpen}
          onClose={() => setIsContractModalOpen(false)}
          contact={selectedContact}
          onSubmit={handleUpdateContract}
        />
      )}
    </div>
  );
};

export default KolContactsTable;