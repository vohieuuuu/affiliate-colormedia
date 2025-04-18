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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/utils";
import { KolContact } from "@shared/schema";

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: KolContact;
  onSubmit: (data: { contractValue: number, note: string }) => void;
}

const ContractModal = ({ isOpen, onClose, contact, onSubmit }: ContractModalProps) => {
  const [contractValue, setContractValue] = useState<string>("");
  const [note, setNote] = useState(contact.note || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tính toán hoa hồng (3% giá trị hợp đồng)
  const commission = contractValue ? Math.round(parseFloat(contractValue) * 0.03) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Kiểm tra giá trị hợp đồng
    if (!contractValue || parseFloat(contractValue) <= 0) {
      setError("Vui lòng nhập giá trị hợp đồng hợp lệ");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      onSubmit({
        contractValue: parseFloat(contractValue),
        note
      });
    } catch (error) {
      console.error("Error updating contract:", error);
      setError("Có lỗi xảy ra khi cập nhật thông tin hợp đồng");
    } finally {
      setIsSubmitting(false);
      // No need to close here as the parent component will handle it
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cập nhật thông tin hợp đồng</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="font-medium">{contact.contact_name}</div>
            <div className="text-sm text-muted-foreground">
              {contact.company} - {contact.phone}
            </div>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Lỗi</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="contractValue">Giá trị hợp đồng (VND)</Label>
            <Input
              id="contractValue"
              type="number"
              placeholder="Nhập giá trị hợp đồng"
              value={contractValue}
              onChange={(e) => setContractValue(e.target.value)}
              min="0"
              step="1000000"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label>Hoa hồng dự kiến (3%)</Label>
            <div className="text-lg font-semibold text-primary">
              {formatCurrency(commission)}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea
              id="note"
              placeholder="Nhập ghi chú về hợp đồng..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Lưu ý quan trọng</AlertTitle>
            <AlertDescription>
              Khi chốt hợp đồng, trạng thái của liên hệ sẽ được chuyển thành "Đã chốt hợp đồng" và không thể thay đổi sau này.
            </AlertDescription>
          </Alert>
          
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
              {isSubmitting ? "Đang cập nhật..." : "Chốt hợp đồng"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContractModal;