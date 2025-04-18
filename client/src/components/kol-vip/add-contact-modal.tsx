import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogHeader,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerStatusType } from "@shared/schema";

// Định nghĩa schema cho form
const contactFormSchema = z.object({
  contact_name: z.string().min(1, { message: "Tên liên hệ là bắt buộc" }),
  company: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().min(1, { message: "Số điện thoại là bắt buộc" }),
  email: z.string().email({ message: "Email không hợp lệ" }).optional().or(z.literal("")),
  status: z.enum(["Mới nhập", "Đang tư vấn", "Chờ phản hồi", "Đã chốt hợp đồng", "Không tiềm năng"] as const),
  note: z.string().optional(),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ContactFormValues) => void;
  kolId?: string;
  initialData?: Partial<ContactFormValues>;
}

const AddContactModal = ({ isOpen, onClose, onSubmit, kolId, initialData }: AddContactModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Khởi tạo form với giá trị mặc định
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      contact_name: initialData?.contact_name || "",
      company: initialData?.company || "",
      position: initialData?.position || "",
      phone: initialData?.phone || "",
      email: initialData?.email || "",
      status: initialData?.status || "Mới nhập",
      note: initialData?.note || "",
    },
  });

  const handleSubmit = async (data: ContactFormValues) => {
    setError(null);
    setIsSubmitting(true);
    
    try {
      // Thêm kolId nếu có
      const fullData = kolId ? { ...data, kol_id: kolId } : data;
      await onSubmit(fullData);
      form.reset(); // Reset form sau khi submit thành công
    } catch (error) {
      console.error("Error adding contact:", error);
      setError("Có lỗi xảy ra khi thêm liên hệ mới");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm liên hệ mới</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Lỗi</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên liên hệ *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập tên liên hệ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Công ty</FormLabel>
                    <FormControl>
                      <Input placeholder="Tên công ty" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chức vụ</FormLabel>
                    <FormControl>
                      <Input placeholder="Chức vụ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Điện thoại *</FormLabel>
                    <FormControl>
                      <Input placeholder="Số điện thoại" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Email" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trạng thái</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn trạng thái" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Mới nhập">Mới nhập</SelectItem>
                        <SelectItem value="Đang tư vấn">Đang tư vấn</SelectItem>
                        <SelectItem value="Chờ phản hồi">Chờ phản hồi</SelectItem>
                        <SelectItem value="Đã chốt hợp đồng">Đã chốt hợp đồng</SelectItem>
                        <SelectItem value="Không tiềm năng">Không tiềm năng</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ghi chú thêm về liên hệ..."
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang thêm..." : "Thêm liên hệ"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddContactModal;