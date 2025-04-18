import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  Search,
  PlusCircle,
  FileSignature,
  Filter,
  X,
  Phone,
  Mail,
  Building,
  Calendar,
  Edit,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDate, formatCurrency } from "@/lib/utils";
import { KolContact, CustomerStatusType } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import UpdateContactModal from "./update-contact-modal";
import ContractModal from "./contract-modal";

interface KolContactsTableProps {
  contacts: KolContact[];
  isLoading: boolean;
  onAddContact: () => void;
  onUpdateContact: (contactId: number, data: Partial<KolContact>) => void;
  onAddContract: (contactId: number, data: { contractValue: number, note: string }) => void;
  kolId?: string;
}

const KolContactsTable = ({
  contacts,
  isLoading,
  onAddContact,
  onUpdateContact,
  onAddContract,
  kolId,
}: KolContactsTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomerStatusType | "all">("all");
  const [sortField, setSortField] = useState<keyof KolContact>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedContact, setSelectedContact] = useState<KolContact | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);

  // Xử lý sắp xếp
  const handleSort = (field: keyof KolContact) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Lọc và sắp xếp contacts
  const filteredContacts = contacts
    .filter((contact) => {
      // Lọc theo từ khóa tìm kiếm
      const searchMatch =
        contact.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.company && contact.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (contact.phone && contact.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase()));

      // Lọc theo trạng thái
      const statusMatch = statusFilter === "all" || contact.status === statusFilter;

      return searchMatch && statusMatch;
    })
    .sort((a, b) => {
      // Sắp xếp theo trường đã chọn
      if (sortField === "created_at") {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return sortDirection === "asc" ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
      }

      if (sortField === "contact_name") {
        return sortDirection === "asc"
          ? a.contact_name.localeCompare(b.contact_name)
          : b.contact_name.localeCompare(a.contact_name);
      }

      if (sortField === "company") {
        const companyA = a.company || "";
        const companyB = b.company || "";
        return sortDirection === "asc"
          ? companyA.localeCompare(companyB)
          : companyB.localeCompare(companyA);
      }

      if (sortField === "status") {
        return sortDirection === "asc"
          ? a.status.localeCompare(b.status)
          : b.status.localeCompare(a.status);
      }

      return 0;
    });

  // Xử lý cập nhật trạng thái
  const handleUpdateStatus = (contact: KolContact) => {
    setSelectedContact(contact);
    setShowUpdateModal(true);
  };

  // Xử lý thêm hợp đồng
  const handleAddContract = (contact: KolContact) => {
    setSelectedContact(contact);
    setShowContractModal(true);
  };

  // Xử lý khi submit cập nhật trạng thái
  const handleUpdateSubmit = (data: { status: CustomerStatusType; note: string }) => {
    if (selectedContact) {
      onUpdateContact(selectedContact.id, {
        status: data.status,
        note: data.note,
      });
      setShowUpdateModal(false);
    }
  };

  // Xử lý khi submit thêm hợp đồng
  const handleContractSubmit = (data: { contractValue: number; note: string }) => {
    if (selectedContact) {
      onAddContract(selectedContact.id, data);
      setShowContractModal(false);
    }
  };

  // Hiển thị badge tương ứng với trạng thái
  const renderStatusBadge = (status: CustomerStatusType) => {
    switch (status) {
      case "Đã chốt hợp đồng":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
            {status}
          </Badge>
        );
      case "Đang tư vấn":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
            {status}
          </Badge>
        );
      case "Chờ phản hồi":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
            {status}
          </Badge>
        );
      case "Không tiềm năng":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
            {status}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
        <div className="flex items-center w-full md:w-auto">
          <div className="relative w-full md:w-[280px]">
            <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên, công ty, SĐT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
            {searchTerm && (
              <X
                className="absolute right-2 top-3 h-4 w-4 text-muted-foreground cursor-pointer"
                onClick={() => setSearchTerm("")}
              />
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as CustomerStatusType | "all")}
            >
              <SelectTrigger className="w-full md:w-[200px]">
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
          </div>

          <Button variant="default" onClick={onAddContact} className="w-full md:w-auto">
            <PlusCircle className="h-4 w-4 mr-2" />
            Thêm liên hệ
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <ScrollArea className="h-[500px] rounded-md">
          <Table>
            <TableHeader className="sticky top-0 bg-white">
              <TableRow>
                <TableHead
                  className="cursor-pointer w-[200px]"
                  onClick={() => handleSort("contact_name")}
                >
                  <div className="flex items-center gap-1">
                    Tên liên hệ
                    {sortField === "contact_name" && (
                      <span>
                        {sortDirection === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hidden md:table-cell"
                  onClick={() => handleSort("company")}
                >
                  <div className="flex items-center gap-1">
                    Công ty
                    {sortField === "company" && (
                      <span>
                        {sortDirection === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="hidden md:table-cell">Thông tin liên hệ</TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("created_at")}
                >
                  <div className="flex items-center gap-1">
                    Ngày thêm
                    {sortField === "created_at" && (
                      <span>
                        {sortDirection === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer text-center"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center gap-1 justify-center">
                    Trạng thái
                    {sortField === "status" && (
                      <span>
                        {sortDirection === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-center w-[140px]">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-9 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredContacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Không tìm thấy liên hệ nào
                  </TableCell>
                </TableRow>
              ) : (
                filteredContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">
                      <div>
                        {contact.contact_name}
                        {contact.position && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {contact.position}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {contact.company || "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="space-y-1">
                        {contact.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {contact.phone}
                          </div>
                        )}
                        {contact.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {contact.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(contact.created_at)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {renderStatusBadge(contact.status)}
                      {contact.contract_value > 0 && (
                        <div className="text-xs text-green-600 font-medium mt-1">
                          {formatCurrency(contact.contract_value)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleUpdateStatus(contact)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Cập nhật trạng thái</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {contact.status !== "Đã chốt hợp đồng" && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleAddContract(contact)}
                                >
                                  <FileSignature className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Chốt hợp đồng</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {selectedContact && showUpdateModal && (
        <UpdateContactModal
          isOpen={showUpdateModal}
          onClose={() => setShowUpdateModal(false)}
          contact={selectedContact}
          onSubmit={handleUpdateSubmit}
        />
      )}

      {selectedContact && showContractModal && (
        <ContractModal
          isOpen={showContractModal}
          onClose={() => setShowContractModal(false)}
          contact={selectedContact}
          onSubmit={handleContractSubmit}
        />
      )}
    </div>
  );
};

export default KolContactsTable;