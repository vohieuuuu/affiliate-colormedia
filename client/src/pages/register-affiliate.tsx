import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  BriefcaseBusiness, 
  Building2, 
  Check, 
  Mail, 
  Phone,
  SendToBack,
  User,
  UserCheck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function RegisterAffiliate() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    companyName: "",
    position: "",
    affiliateType: "individual",
    experience: "",
    industry: "",
    bankName: "",
    bankAccount: "",
    accountHolder: "",
    taxId: "",
    acceptTerms: false,
    acceptPrivacy: false
  });
  
  // Tiêu đề
  useEffect(() => {
    document.title = "Đăng ký Affiliate | ColorMedia";
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleRadioChange = (value: string) => {
    setFormData(prev => ({ ...prev, affiliateType: value }));
  };

  const validateStep1 = () => {
    if (!formData.fullName || !formData.email || !formData.phone) {
      toast({
        title: "Thông tin chưa đầy đủ",
        description: "Vui lòng điền đầy đủ họ tên, email và số điện thoại",
        variant: "destructive"
      });
      return false;
    }
    if (!formData.email.includes('@') || !formData.email.includes('.')) {
      toast({
        title: "Email không hợp lệ",
        description: "Vui lòng kiểm tra lại định dạng email",
        variant: "destructive"
      });
      return false;
    }
    if (formData.phone.length < 10) {
      toast({
        title: "Số điện thoại không hợp lệ",
        description: "Vui lòng kiểm tra lại số điện thoại",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.experience || !formData.industry) {
      toast({
        title: "Thông tin chưa đầy đủ",
        description: "Vui lòng chọn kinh nghiệm và lĩnh vực hoạt động",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!formData.bankName || !formData.bankAccount || !formData.accountHolder) {
      toast({
        title: "Thông tin ngân hàng chưa đầy đủ",
        description: "Vui lòng điền đầy đủ thông tin ngân hàng",
        variant: "destructive"
      });
      return false;
    }
    if (!formData.acceptTerms || !formData.acceptPrivacy) {
      toast({
        title: "Vui lòng đồng ý với các điều khoản",
        description: "Bạn cần đồng ý với điều khoản dịch vụ và chính sách bảo mật để tiếp tục",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateStep3()) {
      // Gửi dữ liệu đến API - chỉ mô phỏng trong demo này
      toast({
        title: "Đăng ký thành công!",
        description: "Đơn đăng ký của bạn đã được gửi. Chúng tôi sẽ liên hệ với bạn trong vòng 24-48 giờ.",
      });
      
      // Redirect sau 2 giây
      setTimeout(() => {
        window.location.href = "/affiliate-policy";
      }, 2000);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header 
        fullName={user?.full_name} 
        affiliateId={user?.affiliate_id}
      />
      
      <main className="flex-grow max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Đăng ký tham gia chương trình Affiliate
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Hợp tác với ColorMedia để giới thiệu khách hàng và nhận hoa hồng hấp dẫn. 
              Chỉ cần vài phút để hoàn tất đăng ký.
            </p>
            <div className="mt-4">
              <a 
                href="https://colormedia.sg.larksuite.com/wiki/LQxvwbgBjixFpfkGeUolFnMjgnb" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center bg-[#07ADB8]/10 hover:bg-[#07ADB8]/20 text-[#07ADB8] px-4 py-2 rounded-md transition-colors"
              >
                <span className="mr-2">Xem hướng dẫn đầy đủ</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="w-full max-w-xs mx-auto flex justify-between items-center relative mb-8">
              <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 -z-10"></div>
              
              <div className={`flex flex-col items-center ${step >= 1 ? "text-[#07ADB8]" : "text-gray-400"}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${step >= 1 ? "bg-[#07ADB8] text-white" : "bg-gray-200 text-gray-500 dark:bg-gray-700"}`}>
                  {step > 1 ? <Check className="h-5 w-5" /> : "1"}
                </div>
                <span className="text-xs font-medium">Thông tin cá nhân</span>
              </div>
              
              <div className={`flex flex-col items-center ${step >= 2 ? "text-[#07ADB8]" : "text-gray-400"}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${step >= 2 ? "bg-[#07ADB8] text-white" : "bg-gray-200 text-gray-500 dark:bg-gray-700"}`}>
                  {step > 2 ? <Check className="h-5 w-5" /> : "2"}
                </div>
                <span className="text-xs font-medium">Lĩnh vực hoạt động</span>
              </div>
              
              <div className={`flex flex-col items-center ${step >= 3 ? "text-[#07ADB8]" : "text-gray-400"}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${step >= 3 ? "bg-[#07ADB8] text-white" : "bg-gray-200 text-gray-500 dark:bg-gray-700"}`}>
                  {step > 3 ? <Check className="h-5 w-5" /> : "3"}
                </div>
                <span className="text-xs font-medium">Thông tin thanh toán</span>
              </div>
            </div>
          </div>
          
          <Card className="border-none shadow-lg">
            <CardHeader className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[#07ADB8]/10 to-transparent z-0"></div>
              <div className="relative z-10">
                <CardTitle className="text-xl font-bold tracking-tight">
                  {step === 1 && "Thông tin cá nhân"}
                  {step === 2 && "Lĩnh vực hoạt động"}
                  {step === 3 && "Thông tin thanh toán và xác nhận"}
                </CardTitle>
                <CardDescription>
                  {step === 1 && "Vui lòng cung cấp thông tin cá nhân để đăng ký Affiliate"}
                  {step === 2 && "Cho chúng tôi biết về lĩnh vực hoạt động và kinh nghiệm của bạn"}
                  {step === 3 && "Nhập thông tin thanh toán để nhận hoa hồng"}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {step === 1 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-gray-400" />
                          Họ và tên
                        </Label>
                        <Input
                          id="fullName"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleChange}
                          placeholder="Nguyễn Văn A"
                          className="w-full"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-gray-400" />
                          Email
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="example@gmail.com"
                          className="w-full"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="flex items-center">
                          <Phone className="h-4 w-4 mr-2 text-gray-400" />
                          Số điện thoại
                        </Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="0987 654 321"
                          className="w-full"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <p className="font-medium text-sm flex items-center">
                          <UserCheck className="h-4 w-4 mr-2 text-gray-400" />
                          Loại hình đăng ký
                        </p>
                        <RadioGroup value={formData.affiliateType} onValueChange={handleRadioChange} className="flex flex-col space-y-3">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="individual" id="individual" />
                            <Label htmlFor="individual">Cá nhân</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="business" id="business" />
                            <Label htmlFor="business">Doanh nghiệp</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      
                      {formData.affiliateType === "business" && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="companyName" className="flex items-center">
                              <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                              Tên công ty
                            </Label>
                            <Input
                              id="companyName"
                              name="companyName"
                              value={formData.companyName}
                              onChange={handleChange}
                              placeholder="Công ty ABC"
                              className="w-full"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="position" className="flex items-center">
                              <BriefcaseBusiness className="h-4 w-4 mr-2 text-gray-400" />
                              Chức vụ
                            </Label>
                            <Input
                              id="position"
                              name="position"
                              value={formData.position}
                              onChange={handleChange}
                              placeholder="Giám đốc kinh doanh"
                              className="w-full"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
                
                {step === 2 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="experience">Kinh nghiệm làm việc</Label>
                        <Select
                          value={formData.experience}
                          onValueChange={(value) => handleSelectChange("experience", value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Chọn kinh nghiệm làm việc" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="less-than-1">Dưới 1 năm</SelectItem>
                            <SelectItem value="1-3">1-3 năm</SelectItem>
                            <SelectItem value="3-5">3-5 năm</SelectItem>
                            <SelectItem value="5-10">5-10 năm</SelectItem>
                            <SelectItem value="10+">Trên 10 năm</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="industry">Lĩnh vực hoạt động</Label>
                        <Select
                          value={formData.industry}
                          onValueChange={(value) => handleSelectChange("industry", value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Chọn lĩnh vực hoạt động" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="technology">Công nghệ</SelectItem>
                            <SelectItem value="marketing">Marketing & Truyền thông</SelectItem>
                            <SelectItem value="finance">Tài chính - Ngân hàng</SelectItem>
                            <SelectItem value="education">Giáo dục</SelectItem>
                            <SelectItem value="healthcare">Y tế - Dược phẩm</SelectItem>
                            <SelectItem value="commerce">Thương mại</SelectItem>
                            <SelectItem value="other">Khác</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
                
                {step === 3 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="bankName">Ngân hàng</Label>
                        <Select
                          value={formData.bankName}
                          onValueChange={(value) => handleSelectChange("bankName", value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Chọn ngân hàng" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vietcombank">Vietcombank</SelectItem>
                            <SelectItem value="vietinbank">Vietinbank</SelectItem>
                            <SelectItem value="bidv">BIDV</SelectItem>
                            <SelectItem value="mb">MB Bank</SelectItem>
                            <SelectItem value="techcombank">Techcombank</SelectItem>
                            <SelectItem value="tpbank">TPBank</SelectItem>
                            <SelectItem value="acb">ACB</SelectItem>
                            <SelectItem value="sacombank">Sacombank</SelectItem>
                            <SelectItem value="vpbank">VPBank</SelectItem>
                            <SelectItem value="other">Ngân hàng khác</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="bankAccount">Số tài khoản</Label>
                        <Input
                          id="bankAccount"
                          name="bankAccount"
                          value={formData.bankAccount}
                          onChange={handleChange}
                          placeholder="0123456789"
                          className="w-full"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="accountHolder">Chủ tài khoản</Label>
                        <Input
                          id="accountHolder"
                          name="accountHolder"
                          value={formData.accountHolder}
                          onChange={handleChange}
                          placeholder="NGUYEN VAN A"
                          className="w-full"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="taxId">
                          Mã số thuế cá nhân (không bắt buộc)
                        </Label>
                        <Input
                          id="taxId"
                          name="taxId"
                          value={formData.taxId}
                          onChange={handleChange}
                          placeholder="8901234567"
                          className="w-full"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Nếu không có, hệ thống sẽ tự động khấu trừ 10% thuế thu nhập cá nhân cho các giao dịch trên 2 triệu đồng
                        </p>
                      </div>
                      
                      <div className="space-y-4 pt-2">
                        <div className="flex items-start space-x-2">
                          <Checkbox 
                            id="acceptTerms" 
                            checked={formData.acceptTerms}
                            onCheckedChange={(checked) => handleCheckboxChange("acceptTerms", checked as boolean)}
                            className="mt-1"
                          />
                          <div>
                            <Label htmlFor="acceptTerms">
                              Tôi đồng ý với <Link href="/terms" className="text-[#07ADB8] hover:underline">Điều khoản dịch vụ</Link> và <Link href="/affiliate-policy" className="text-[#07ADB8] hover:underline">Chính sách Affiliate</Link>
                            </Label>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-2">
                          <Checkbox 
                            id="acceptPrivacy" 
                            checked={formData.acceptPrivacy}
                            onCheckedChange={(checked) => handleCheckboxChange("acceptPrivacy", checked as boolean)}
                            className="mt-1"
                          />
                          <div>
                            <Label htmlFor="acceptPrivacy">
                              Tôi đồng ý với <Link href="/privacy" className="text-[#07ADB8] hover:underline">Chính sách bảo mật</Link> của ColorMedia
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between pt-4">
                  {step > 1 ? (
                    <Button type="button" variant="outline" onClick={prevStep}>
                      Quay lại
                    </Button>
                  ) : (
                    <Link href="/affiliate-policy">
                      <Button type="button" variant="outline">
                        Xem chính sách
                      </Button>
                    </Link>
                  )}
                  
                  {step < 3 ? (
                    <Button type="button" onClick={nextStep}>
                      Tiếp tục
                    </Button>
                  ) : (
                    <Button type="submit" className="bg-[#07ADB8] hover:bg-[#06969f]">
                      <SendToBack className="mr-2 h-4 w-4" />
                      Gửi đăng ký
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
          
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Đã có tài khoản? <Link href="/auth" className="text-[#07ADB8] hover:underline">Đăng nhập</Link>
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}