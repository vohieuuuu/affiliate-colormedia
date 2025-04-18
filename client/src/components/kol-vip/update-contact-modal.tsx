import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogHeader,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KolContact, CustomerStatusType } from "@shared/schema";

interface UpdateContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: KolContact;
  onSubmit: (data: { status: CustomerStatusType, note: string }) => void;
}

const UpdateContactModal = ({ isOpen, onClose, contact, onSubmit }: UpdateContactModalProps) => {
  const [status, setStatus] = useState<CustomerStatusType>(contact.status);
  const [note, setNote] = useState(contact.note || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      onSubmit({
        status,
        note
      });
    } catch (error) {
      console.error("Error updating contact:", error);
    } finally {
      setIsSubmitting(false);
      // No need to close here as the parent component will handle it
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cập nhật trạng thái liên hệ</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="font-medium">{contact.contact_name}</div>
            <div className="text-sm text-muted-foreground">
              {contact.company} - {contact.phone}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status">Trạng thái</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as CustomerStatusType)}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mới nhập">Mới nhập</SelectItem>
                <SelectItem value="Đang tư vấn">Đang tư vấn</SelectItem>
                <SelectItem value="Chờ phản hồi">Chờ phản hồi</SelectItem>
                <SelectItem value="Đã chốt hợp đồng">Đã chốt hợp đồng</SelectItem>
                <SelectItem value="Không tiềm năng">Không tiềm năng</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea
              id="note"
              placeholder="Nhập ghi chú về tiến độ và thông tin chi tiết..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
          
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang cập nhật..." : "Cập nhật"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateContactModal;