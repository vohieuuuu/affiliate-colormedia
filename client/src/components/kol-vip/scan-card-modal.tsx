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
import { AlertCircle, Camera, Upload, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ask_secrets } from "@/lib/secrets";
import { askOpenAISecrets } from "@/lib/openai-secrets"; // Giả định chúng ta có một helper function

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

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
    onClose();
  };

  // Xử lý khi submit
  const handleSubmit = async () => {
    if (!image) {
      setError("Vui lòng tải lên hoặc chụp ảnh card visit");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Chuyển đổi dataURL thành base64 bằng cách loại bỏ phần prefix
      const base64Image = image.split(',')[1];
      
      // Kiểm tra xem có OPENAI_API_KEY không
      // Đây là chức năng giả định - thực tế cần triển khai kiểm tra API key
      const hasOpenAiKey = await askOpenAISecrets();
      
      if (!hasOpenAiKey) {
        setError("Chức năng quét card visit yêu cầu cấu hình OpenAI API key");
        setIsLoading(false);
        return;
      }
      
      // Gửi dữ liệu cho parent component xử lý
      onSubmit({ image_base64: base64Image });
      
      // Reset state
      setImage(null);
    } catch (error) {
      console.error("Error scanning card:", error);
      setError("Có lỗi xảy ra khi xử lý ảnh");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quét Card Visit</DialogTitle>
          <DialogDescription>
            Tải lên hoặc chụp ảnh card visit để trích xuất thông tin liên hệ
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Lỗi</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {!isCapturing && (
            <div className="space-y-4">
              {image ? (
                <div className="space-y-2">
                  <Card>
                    <CardContent className="p-2">
                      <img 
                        src={image} 
                        alt="Card Visit" 
                        className="max-h-[250px] w-full object-contain rounded"
                      />
                    </CardContent>
                  </Card>
                  
                  <div className="flex justify-center">
                    <Button 
                      variant="outline" 
                      onClick={() => setImage(null)}
                      disabled={isLoading}
                    >
                      Chọn ảnh khác
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
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Lưu ý</AlertTitle>
              <AlertDescription>
                Hệ thống sẽ trích xuất thông tin từ card visit sử dụng AI. 
                Kết quả có thể không chính xác 100% và cần được kiểm tra lại.
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Hủy
          </Button>
          
          <Button 
            onClick={handleSubmit} 
            disabled={!image || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              "Xử lý ảnh"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScanCardModal;