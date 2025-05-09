import { useState, useRef, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogHeader,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
// Import hook theo cách thủ công để tránh lỗi path
import { useState as useMediaQueryState, useEffect as useMediaQueryEffect } from "react";

// Sử dụng hook media query trong file để tránh lỗi import
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useMediaQueryState<boolean>(false);
  
  useMediaQueryEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);
    
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }, [query]);
  
  return matches;
}
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
  Mail,
  Check,
  Save,
  ArrowRight,
  CheckCircle
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
import { Textarea } from "@/components/ui/textarea";

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
  onSubmit: (data: any) => void;
  kolId?: string;
}

const ScanCardModal = ({ isOpen, onClose, onSubmit, kolId }: ScanCardModalProps) => {
  const { toast } = useToast();
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  
  // Kiểm tra nếu là thiết bị di động
  const isMobile = useMediaQuery("(max-width: 640px)");
  
  // Tham chiếu đến timeout để có thể clear
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Xử lý khi quét ảnh sử dụng API OCR
  const scanImageWithOCR = async (imageBase64: string) => {
    if (!imageBase64) return;
    
    setIsScanning(true);
    setError(null);
    setScanSuccess(false);
    
    // Clear any existing timeout
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
    
    try {
      // Lấy ra base64 thực sự (bỏ phần đầu data:image/...)
      const base64Data = imageBase64.split(',')[1];
      
      if (!kolId) {
        setError("Không tìm thấy ID của KOL/VIP để quét ảnh");
        setIsScanning(false);
        return;
      }
      
      // Hiển thị thông báo tải lên mobile
      if (isMobile) {
        toast({
          title: "Đang xử lý ảnh",
          description: "Hệ thống đang xử lý ảnh và trích xuất thông tin, vui lòng đợi...",
        });
      }
      
      // Gọi API để quét với kolId
      const response = await fetch(`/api/kol/${kolId}/scan-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: base64Data
        }),
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        // Hiển thị kết quả quét
        const extractedData = data.data.contact_data;
        
        // Nếu có văn bản trích xuất thì hiển thị
        if (data.data.raw_text) {
          setExtractedText(data.data.raw_text);
        } else {
          setExtractedText("");
        }
        
        // Nếu có hình ảnh preview thì hiển thị
        if (data.data.image_preview) {
          setImage(data.data.image_preview);
        }
        
        // Đánh dấu quét thành công
        setScanSuccess(true);
        
        // Cập nhật form với dữ liệu trích xuất - Sử dụng setTimeout để đảm bảo chuyển tab hoạt động đúng
        setTimeout(() => {
          form.setValue('contact_name', extractedData.contact_name || '');
          form.setValue('company', extractedData.company || '');
          form.setValue('position', extractedData.position || '');
          form.setValue('phone', extractedData.phone || '');
          form.setValue('email', extractedData.email || '');
          form.setValue('note', 'Thêm từ quét card visit');
          
          // Thông báo trên mobile
          if (isMobile) {
            toast({
              title: "Quét thành công",
              description: "Vui lòng kiểm tra và điền thông tin còn thiếu trước khi lưu.",
              variant: "default",
            });
          }
          
          // Quy trình 2 bước: Đầu tiên dừng scanning, sau đó chuyển tab
          setIsScanning(false);
          
          // Chờ thêm để đảm bảo UI cập nhật xong
          setTimeout(() => {
            setActiveTab("info");
          }, 300);
        }, 800); // Tăng độ trễ lên 800ms để đảm bảo đủ thời gian cho các thao tác xử lý
        
      } else {
        // Xử lý lỗi
        setError(data.error?.message || "Có lỗi xảy ra khi quét ảnh");
        
        // Vẫn chuyển sang tab nhập thông tin nhưng với form trống, sử dụng setTimeout lồng nhau
        setTimeout(() => {
          setIsScanning(false);
          setTimeout(() => {
            setActiveTab("manual");
          }, 300);
        }, 500);
      }
    } catch (error) {
      console.error("Lỗi khi quét ảnh:", error);
      setError("Có lỗi xảy ra khi quét ảnh. Vui lòng nhập thông tin thủ công.");
      
      // Vẫn chuyển sang tab nhập thông tin, sử dụng setTimeout lồng nhau
      setTimeout(() => {
        setIsScanning(false);
        setTimeout(() => {
          setActiveTab("manual");
        }, 300);
      }, 500);
    }
  };
  
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
      
      // Quét ảnh với OCR
      scanImageWithOCR(result);
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
        
        // Quét ảnh với OCR giống như khi tải ảnh lên
        scanImageWithOCR(dataUrl);
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
    
    // Clear any existing timeout
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
    
    onClose();
  };
  
  // useEffect để cleanup timeouts khi component unmounts
  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      stopCamera();
    }
  }, []);

  // Xử lý khi submit form
  const onFormSubmit = (values: ContactFormValues) => {
    if (!image) {
      setError("Vui lòng tải lên hoặc chụp ảnh card visit");
      return;
    }
    
    if (!kolId) {
      setError("Không tìm thấy ID của KOL/VIP để lưu thông tin");
      return;
    }
    
    // Kiểm tra dữ liệu bắt buộc
    if (!values.contact_name || !values.phone) {
      if (!values.contact_name) form.setError("contact_name", { message: "Vui lòng nhập tên liên hệ" });
      if (!values.phone) form.setError("phone", { message: "Vui lòng nhập số điện thoại" });
      return;
    }
    
    // Nếu đang ở tab manual và chưa ở tab info, chuyển sang tab info
    if (activeTab === "manual") {
      setActiveTab("info");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Chuyển đổi dataURL thành base64 bằng cách loại bỏ phần prefix
      const base64Image = image.split(',')[1];
      
      // Lưu thông tin liên hệ và ảnh, đánh dấu là đã xác nhận
      onSubmit({ 
        image_base64: base64Image,
        confirm_scan: true,  // Đánh dấu là đã xác nhận trước khi lưu
        kolId: kolId,        // Thêm kolId vào dữ liệu gửi đi
        ...values 
      } as any);
      
      // Reset state
      setImage(null);
      setExtractedText("");
      setScanSuccess(false);
      form.reset();
      setActiveTab("upload");
      
      // Hiển thị thông báo thành công
      toast({
        title: "Thành công",
        description: "Đã lưu thông tin liên hệ mới thành công!",
        variant: "default",
      });
    } catch (error) {
      console.error("Error processing card:", error);
      setError("Có lỗi xảy ra khi xử lý ảnh");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={isMobile ? "p-2 max-h-[90vh] overflow-y-auto" : ""} style={{ touchAction: "pan-y", overscrollBehavior: "contain" }}>
        <DialogHeader className={isMobile ? "pb-1" : "pb-2"}>
          <DialogTitle className={isMobile ? "text-center text-lg font-medium" : ""}>Thông tin Card Visit</DialogTitle>
          <DialogDescription className={isMobile ? "text-center text-xs" : ""}>
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
              <TabsTrigger value="upload" className="w-1/3 px-1 h-8" style={{ touchAction: "manipulation" }}>
                <Camera className={isMobile ? "h-3 w-3" : "mr-2 h-4 w-4"} />
                {!isMobile && "Tải ảnh"}
              </TabsTrigger>
              <TabsTrigger value="manual" className="w-1/3 px-1 h-8" disabled={!image} style={{ touchAction: "manipulation" }}>
                <FileText className={isMobile ? "h-3 w-3" : "mr-2 h-4 w-4"} />
                {!isMobile ? "Dữ liệu OCR" : "OCR"}
              </TabsTrigger>
              <TabsTrigger value="info" className="w-1/3 px-1 h-8" disabled={!image} style={{ touchAction: "manipulation" }}>
                <UserCircle className={isMobile ? "h-3 w-3" : "mr-2 h-4 w-4"} />
                {!isMobile ? "Thông tin liên hệ" : "Thông tin"}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="space-y-4 py-4">
              {!isCapturing && (
                <div className="space-y-4">
                  {image ? (
                    <div className="space-y-3">
                      <Card>
                        <CardContent className="p-1">
                          <img 
                            src={image} 
                            alt="Card Visit" 
                            className={isMobile ? "max-h-[180px] w-full object-contain rounded" : "max-h-[250px] w-full object-contain rounded"}
                          />
                        </CardContent>
                      </Card>
                      
                      <div className="flex justify-center gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setImage(null)}
                          disabled={isLoading}
                          size={isMobile ? "sm" : "default"}
                          className="flex-1"
                          style={{ touchAction: "manipulation" }}
                        >
                          Chọn ảnh khác
                        </Button>
                        
                        <Button 
                          onClick={() => setActiveTab("manual")}
                          disabled={isLoading}
                          size={isMobile ? "sm" : "default"}
                          className="bg-gradient-to-r from-[#07ADB8] to-[#07ADB8]/80 hover:from-[#07ADB8]/90 hover:to-[#07ADB8]/70 flex-1"
                          style={{ touchAction: "manipulation" }}
                        >
                          Tiếp theo
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className={isMobile ? "flex flex-col gap-3" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
                      <Button 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        className={isMobile ? "h-20 flex flex-col gap-1 text-sm" : "h-32 flex flex-col gap-2"}
                        disabled={isLoading}
                        style={{ touchAction: "manipulation" }}
                      >
                        <Upload className={isMobile ? "h-5 w-5" : "h-6 w-6"} />
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
                        className={isMobile ? "h-20 flex flex-col gap-1 text-sm" : "h-32 flex flex-col gap-2"}
                        disabled={isLoading}
                        style={{ touchAction: "manipulation" }}
                      >
                        <Camera className={isMobile ? "h-5 w-5" : "h-6 w-6"} />
                        Chụp ảnh
                      </Button>
                    </div>
                  )}
                </div>
              )}
              
              {isCapturing && (
                <div className="space-y-3">
                  <div className="relative border rounded-md overflow-hidden">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-auto"
                    />
                  </div>
                  
                  <div className="flex justify-center gap-2">
                    <Button 
                      variant="outline" 
                      onClick={stopCamera} 
                      size={isMobile ? "sm" : "default"}
                      className="flex-1"
                      style={{ touchAction: "manipulation" }}
                    >
                      Hủy
                    </Button>
                    <Button 
                      onClick={captureImage}
                      size={isMobile ? "sm" : "default"}
                      className="bg-gradient-to-r from-[#07ADB8] to-[#07ADB8]/80 hover:from-[#07ADB8]/90 hover:to-[#07ADB8]/70 flex-1"
                      style={{ touchAction: "manipulation" }}
                    >
                      Chụp ảnh
                    </Button>
                  </div>
                </div>
              )}
              
              {image && (
                <Alert className="bg-gradient-to-r from-[#07ADB8]/10 to-[#FFC919]/5">
                  <AlertCircle className={isMobile ? "h-3 w-3" : "h-4 w-4"} />
                  <AlertTitle className={isMobile ? "text-sm" : ""}>Đang xử lý OCR</AlertTitle>
                  <AlertDescription className={isMobile ? "text-xs" : ""}>
                    {isMobile ? "Nhấn 'Tiếp theo' để xem kết quả OCR" : "Hệ thống đang trích xuất thông tin từ card visit. Nhấn 'Tiếp theo' khi đã sẵn sàng."}
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
                  
                  {/* Hiển thị văn bản trích xuất */}
                  {extractedText && (
                    <div className="mt-4">
                      <Label className="mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Văn bản đã trích xuất
                      </Label>
                      <Card>
                        <CardContent className="p-2">
                          <div className="text-xs whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                            {extractedText}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
                
                <div>
                  {isScanning ? (
                    <Alert className="mb-4 bg-gradient-to-r from-[#07ADB8]/10 to-[#07ADB8]/5">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <AlertTitle>Đang quét...</AlertTitle>
                      <AlertDescription>
                        Hệ thống đang trích xuất thông tin từ ảnh card visit
                      </AlertDescription>
                    </Alert>
                  ) : scanSuccess ? (
                    <Alert className="mb-4 bg-gradient-to-r from-[#07ADB8]/10 to-[#FFC919]/5">
                      <Check className="h-4 w-4 text-green-500" />
                      <AlertTitle>Quét thành công</AlertTitle>
                      <AlertDescription>
                        Đã trích xuất thông tin từ card visit. Vui lòng kiểm tra và chỉnh sửa nếu cần.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="mb-4 bg-gradient-to-r from-[#FFC919]/10 to-[#FFC919]/5">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Hướng dẫn</AlertTitle>
                      <AlertDescription>
                        Nhập thông tin từ card visit. Những trường không có thông tin có thể để trống.
                      </AlertDescription>
                    </Alert>
                  )}
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
                            <Input placeholder="Nguyễn Văn A" {...field} className={scanSuccess ? "bg-green-50 border-green-200" : ""} />
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
                            <Input placeholder="Tên công ty" {...field} className={scanSuccess ? "bg-green-50 border-green-200" : ""} />
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
                            <Input placeholder="Giám đốc, Trưởng phòng..." {...field} className={scanSuccess ? "bg-green-50 border-green-200" : ""} />
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
                            <Input placeholder="0912345678" {...field} className={scanSuccess ? "bg-green-50 border-green-200" : ""} />
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
                            <Input placeholder="email@example.com" {...field} className={scanSuccess ? "bg-green-50 border-green-200" : ""} />
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

                  <div className="flex flex-row justify-between gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      disabled={isLoading}
                      className="flex-1"
                      style={{ touchAction: "manipulation" }}
                    >
                      Hủy
                    </Button>
                    
                    <Button 
                      type="submit"
                      className="bg-gradient-to-r from-[#07ADB8] to-[#07ADB8]/80 hover:from-[#07ADB8]/90 hover:to-[#07ADB8]/70 flex-1"
                      disabled={isLoading}
                      style={{ touchAction: "manipulation" }}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Đang xử lý...
                        </>
                      ) : (
                        <>
                          {scanSuccess ? <Check className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
                          {scanSuccess ? "Lưu thông tin" : "Tiếp tục"}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="info" className="space-y-4 py-4">
              <div className="space-y-4">
                {image && (
                  <Card className="mb-4">
                    <CardContent className="p-2">
                      <img 
                        src={image} 
                        alt="Card Visit" 
                        className="max-h-[200px] w-full object-contain rounded"
                      />
                    </CardContent>
                  </Card>
                )}
                
                <Alert className="bg-gradient-to-r from-[#07ADB8]/10 to-[#FFC919]/5 mb-4">
                  <Check className="h-4 w-4 text-green-500" />
                  <AlertTitle>Thông tin liên hệ</AlertTitle>
                  <AlertDescription>
                    Kiểm tra và chỉnh sửa thông tin liên hệ trước khi lưu. Những thông tin có dấu * là bắt buộc.
                  </AlertDescription>
                </Alert>
                
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
                              Họ tên *
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Nguyễn Văn A" {...field} className={scanSuccess ? "bg-green-50 border-green-200" : ""} />
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
                              <Input placeholder="Tên công ty" {...field} className={scanSuccess ? "bg-green-50 border-green-200" : ""} />
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
                              <Input placeholder="Giám đốc, Trưởng phòng..." {...field} className={scanSuccess ? "bg-green-50 border-green-200" : ""} />
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
                              Số điện thoại *
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="0912345678" {...field} className={scanSuccess ? "bg-green-50 border-green-200" : ""} />
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
                              <Input placeholder="email@example.com" {...field} className={scanSuccess ? "bg-green-50 border-green-200" : ""} />
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

                    <div className="flex flex-row justify-between gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={isLoading}
                        className="flex-1"
                        style={{ touchAction: "manipulation" }}
                      >
                        Hủy
                      </Button>
                      
                      <Button 
                        type="submit"
                        className="bg-gradient-to-r from-[#07ADB8] to-[#07ADB8]/80 hover:from-[#07ADB8]/90 hover:to-[#07ADB8]/70 flex-1"
                        disabled={isLoading}
                        style={{ touchAction: "manipulation" }}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Đang xử lý...
                          </>
                        ) : (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Lưu thông tin
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScanCardModal;