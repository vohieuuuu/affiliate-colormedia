import { useState, useRef } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogHeader,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  AlertCircle, 
  Camera, 
  Upload, 
  Loader2, 
  FileText, 
  UserCircle,
  Building,
  Briefcase,
  Phone,
  Mail 
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Form } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Schema cho form thông tin liên hệ
const contactFormSchema = z.object({
  contact_name: z.string().min(1, "Vui lòng nhập tên liên hệ"),
  company: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().min(1, "Vui lòng nhập số điện thoại"),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  note: z.string().optional()
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

interface ScanCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { image_base64: string }) => void;
}

const ScanCardModal = ({ isOpen, onClose, onSubmit }: ScanCardModalProps) => {
  const { toast } = useToast();
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Form cho nhập thông tin thủ công
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      contact_name: "",
      company: "",
      position: "",
      phone: "",
      email: "",
      note: ""
    }
  });

  // Xử lý khi chọn file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    
    if (!file) return;
    
    // Kiểm tra loại file
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn file hình ảnh");
      return;
    }
    
    // Đọc file thành base64
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImage(result);
      setActiveTab("manual"); // Chuyển sang tab nhập thủ công
    };
    reader.onerror = () => {
      setError("Không thể đọc file");
    };
    reader.readAsDataURL(file);
  };

  // Xử lý khi chụp ảnh từ camera
  const startCamera = async () => {
    setError(null);
    setIsCapturing(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Không thể truy cập camera:", err);
      setError("Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập camera của trình duyệt.");
      setIsCapturing(false);
    }
  };

  // Chụp ảnh từ camera
  const captureImage = () => {
    if (!videoRef.current) return;
    
    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setImage(dataUrl);
        stopCamera();
        setActiveTab("manual"); // Chuyển sang tab nhập thủ công
      }
    } catch (err) {
      console.error("Lỗi khi chụp ảnh:", err);
      setError("Có lỗi xảy ra khi chụp ảnh");
    }
  };

  // Dừng camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  };

  // Xử lý khi hủy modal
  const handleClose = () => {
    stopCamera();
    setImage(null);
    setError(null);
    setIsLoading(false);
    form.reset();
    setActiveTab("upload");
    onClose();
  };

  // Xử lý khi submit form
  const onFormSubmit = (values: ContactFormValues) => {
    if (!image) {
      setError("Vui lòng tải lên hoặc chụp ảnh card visit");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Chuyển đổi dataURL thành base64 bằng cách loại bỏ phần prefix
      const base64Image = image.split(',')[1];
      
      // Lưu thông tin liên hệ và ảnh
      onSubmit({ 
        image_base64: base64Image,
        ...values 
      } as any);
      
      // Reset state
      setImage(null);
      form.reset();
      setActiveTab("upload");
    } catch (error) {
      console.error("Error processing card:", error);
      setError("Có lỗi xảy ra khi xử lý ảnh");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Thông tin Card Visit</DialogTitle>
          <DialogDescription>
            Tải lên ảnh card visit và nhập thông tin liên hệ
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Lỗi</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="upload" className="w-1/2">
                <Camera className="mr-2 h-4 w-4" />
                Tải ảnh
              </TabsTrigger>
              <TabsTrigger value="manual" className="w-1/2" disabled={!image}>
                <FileText className="mr-2 h-4 w-4" />
                Nhập thông tin
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="space-y-4 py-4">
              {!isCapturing && (
                <div className="space-y-4">
                  {image ? (
                    <div className="space-y-4">
                      <Card>
                        <CardContent className="p-2">
                          <img 
                            src={image} 
                            alt="Card Visit" 
                            className="max-h-[250px] w-full object-contain rounded"
                          />
                        </CardContent>
                      </Card>
                      
                      <div className="flex justify-center gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setImage(null)}
                          disabled={isLoading}
                        >
                          Chọn ảnh khác
                        </Button>
                        
                        <Button 
                          onClick={() => setActiveTab("manual")}
                          disabled={isLoading}
                          className="bg-gradient-to-r from-[#07ADB8] to-[#07ADB8]/80 hover:from-[#07ADB8]/90 hover:to-[#07ADB8]/70"
                        >
                          Tiếp theo
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        className="h-32 flex flex-col gap-2"
                        disabled={isLoading}
                      >
                        <Upload className="h-6 w-6" />
                        Tải ảnh lên
                        <Input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                          disabled={isLoading}
                        />
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        onClick={startCamera}
                        className="h-32 flex flex-col gap-2"
                        disabled={isLoading}
                      >
                        <Camera className="h-6 w-6" />
                        Chụp ảnh
                      </Button>
                    </div>
                  )}
                </div>
              )}
              
              {isCapturing && (
                <div className="space-y-4">
                  <div className="relative border rounded-md overflow-hidden">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-auto"
                    />
                  </div>
                  
                  <div className="flex justify-center gap-4">
                    <Button variant="secondary" onClick={stopCamera}>
                      Hủy
                    </Button>
                    <Button onClick={captureImage}>
                      Chụp ảnh
                    </Button>
                  </div>
                </div>
              )}
              
              {image && (
                <Alert className="bg-gradient-to-r from-[#07ADB8]/10 to-[#FFC919]/5">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Tiếp theo</AlertTitle>
                  <AlertDescription>
                    Bạn đã tải lên ảnh thành công. Nhấn "Tiếp theo" để nhập thông tin liên hệ từ card visit.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
            
            <TabsContent value="manual" className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  {image && (
                    <Card>
                      <CardContent className="p-2">
                        <img 
                          src={image} 
                          alt="Card Visit" 
                          className="max-h-[250px] w-full object-contain rounded"
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
                
                <div>
                  <Alert className="mb-4 bg-gradient-to-r from-[#FFC919]/10 to-[#FFC919]/5">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Hướng dẫn</AlertTitle>
                    <AlertDescription>
                      Nhập thông tin từ card visit. Những trường không có thông tin có thể để trống.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contact_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <UserCircle className="mr-2 h-4 w-4" />
                            Họ tên
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Nguyễn Văn A" {...field} />
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
                          <FormLabel className="flex items-center">
                            <Building className="mr-2 h-4 w-4" />
                            Công ty
                          </FormLabel>
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
                          <FormLabel className="flex items-center">
                            <Briefcase className="mr-2 h-4 w-4" />
                            Chức vụ
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Giám đốc, Trưởng phòng..." {...field} />
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
                          <FormLabel className="flex items-center">
                            <Phone className="mr-2 h-4 w-4" />
                            Số điện thoại
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="0912345678" {...field} />
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
                          <FormLabel className="flex items-center">
                            <Mail className="mr-2 h-4 w-4" />
                            Email
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="note"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <FileText className="mr-2 h-4 w-4" />
                            Ghi chú
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Ghi chú thêm" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter className="pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      disabled={isLoading}
                    >
                      Hủy
                    </Button>
                    
                    <Button 
                      type="submit"
                      className="bg-gradient-to-r from-[#07ADB8] to-[#FFC919] hover:from-[#07ADB8]/90 hover:to-[#FFC919]/90"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Đang xử lý...
                        </>
                      ) : (
                        "Lưu thông tin"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScanCardModal;