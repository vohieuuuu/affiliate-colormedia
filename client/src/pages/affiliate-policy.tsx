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
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowRight, 
  CheckCircle2, 
  Landmark, 
  MonitorSmartphone, 
  ScrollText, 
  UserCheck, 
  UserPlus,
  ExternalLink,
  InfoIcon,
  AlertCircle,
  FileText
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

export default function AffiliatePolicy() {
  const { user } = useAuth();
  const [showFullPolicy, setShowFullPolicy] = useState(false);
  const [showFullGuide, setShowFullGuide] = useState(false);
  
  // Tiêu đề
  useEffect(() => {
    document.title = "Chính sách Affiliate | ColorMedia";
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header 
        fullName={user?.full_name} 
        affiliateId={user?.affiliate_id}
      />
      
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[#07ADB8] to-[#05868f] z-0"></div>
              <div className="relative z-10">
                <CardTitle className="text-3xl font-bold tracking-tight text-white">
                  Chính sách Affiliate ColorMedia
                </CardTitle>
                <CardDescription className="text-white/80 max-w-3xl">
                  Tham gia chương trình Affiliate của ColorMedia và nhận hoa hồng từ mỗi hợp đồng 
                  thành công. Chúng tôi cung cấp hệ thống theo dõi, công cụ tiếp thị và hỗ trợ 
                  chuyên nghiệp để giúp bạn tối đa hóa thu nhập.
                </CardDescription>
                <a 
                  href="https://colormedia.sg.larksuite.com/docx/OCzqdz5xUogQLkxCofolRNbCgcd" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-md transition-colors"
                >
                  <span className="mr-2">Xem tài liệu đầy đủ</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </a>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <Tabs defaultValue="policy" className="w-full">
                <TabsList className="grid w-full max-w-lg grid-cols-2 mb-8">
                  <TabsTrigger value="policy">Chính sách hoa hồng</TabsTrigger>
                  <TabsTrigger value="guide">Hướng dẫn đăng ký</TabsTrigger>
                </TabsList>
                
                <TabsContent value="policy" className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border border-[#07ADB8]/20 shadow-sm hover:shadow-md transition-shadow">
                      <CardHeader className="bg-[#07ADB8]/5 border-b border-[#07ADB8]/10">
                        <Badge variant="outline" className="w-fit bg-[#07ADB8]/10 text-[#07ADB8] border-[#07ADB8]/30 mb-2">
                          Partner
                        </Badge>
                        <CardTitle className="text-xl font-semibold">Chính sách Partner</CardTitle>
                        <CardDescription>
                          Dành cho đối tác giới thiệu khách hàng lớn với hợp đồng giá trị cao
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <ul className="space-y-4">
                          <li className="flex items-start">
                            <CheckCircle2 className="h-5 w-5 text-[#07ADB8] mr-2 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium">Giá trị hợp đồng: </span>
                              từ 30.000.000 VND trở lên
                            </div>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle2 className="h-5 w-5 text-[#07ADB8] mr-2 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium">Hoa hồng: </span>
                              3% giá trị hợp đồng
                            </div>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle2 className="h-5 w-5 text-[#07ADB8] mr-2 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium">Thời gian nhận hoa hồng: </span>
                              Sau khi khách hàng thanh toán hợp đồng
                            </div>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle2 className="h-5 w-5 text-[#07ADB8] mr-2 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium">Không giới hạn số lượng hợp đồng</span>
                            </div>
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                    
                    <Card className="border border-[#FFC919]/20 shadow-sm hover:shadow-md transition-shadow">
                      <CardHeader className="bg-[#FFC919]/5 border-b border-[#FFC919]/10">
                        <Badge variant="outline" className="w-fit bg-[#FFC919]/10 text-[#a3820e] border-[#FFC919]/30 mb-2">
                          SME
                        </Badge>
                        <CardTitle className="text-xl font-semibold">Chính sách SME</CardTitle>
                        <CardDescription>
                          Dành cho đối tác giới thiệu khách hàng vừa và nhỏ
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <ul className="space-y-4">
                          <li className="flex items-start">
                            <CheckCircle2 className="h-5 w-5 text-[#a3820e] mr-2 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium">Giá trị hợp đồng: </span>
                              từ 1.000.000 đến 29.990.000 VND
                            </div>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle2 className="h-5 w-5 text-[#a3820e] mr-2 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium">Hoa hồng cố định: </span>
                              500.000 VND/hợp đồng
                            </div>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle2 className="h-5 w-5 text-[#a3820e] mr-2 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium">Thời gian nhận hoa hồng: </span>
                              Sau khi khách hàng thanh toán hợp đồng
                            </div>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle2 className="h-5 w-5 text-[#a3820e] mr-2 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium">Không giới hạn số lượng hợp đồng</span>
                            </div>
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Card className="border border-[#07ADB8]/20 shadow-sm overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-[#07ADB8]/10 to-transparent border-b border-[#07ADB8]/10">
                      <Badge variant="outline" className="w-fit bg-[#FFC919]/10 text-[#a3820e] border-[#FFC919]/30 mb-2">
                        VIP / KOL
                      </Badge>
                      <CardTitle className="text-xl font-semibold">Chính sách KOL/VIP</CardTitle>
                      <CardDescription>
                        Dành cho KOL hoặc đối tác VIP với cam kết dài hạn
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <Alert variant="default" className="mb-6 bg-blue-50 border-blue-200 text-blue-900">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Chương trình KOL/VIP</AlertTitle>
                        <AlertDescription>
                          <p className="mt-2">
                            Chương trình KOL/VIP là mô hình hợp tác đặc biệt dành cho những đối tác có tầm ảnh hưởng hoặc mạng lưới rộng trong ngành truyền thông, marketing, quảng cáo. KOL/VIP được hưởng lương cố định hàng tháng cùng với hoa hồng 3% từ mỗi hợp đồng thành công.
                          </p>
                          <p className="mt-2">
                            KOL/VIP được phân thành 3 cấp độ với chế độ lương và yêu cầu KPI khác nhau. Việc đánh giá hiệu suất và điều chỉnh cấp độ sẽ được thực hiện vào cuối mỗi tháng. Đối tác xuất sắc có thể được nâng cấp lên cấp cao hơn sau 3 tháng liên tiếp đạt vượt chỉ tiêu KPI.
                          </p>
                        </AlertDescription>
                      </Alert>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="border border-gray-200 shadow-sm relative overflow-hidden">
                          <div className="absolute top-0 right-0 bg-[#07ADB8]/10 text-[#07ADB8] px-2 py-1 text-xs font-semibold rounded-bl">
                            Level 1
                          </div>
                          <CardHeader className="pt-8">
                            <CardTitle className="text-xl font-semibold">Fresher</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div>
                                <p className="text-sm text-gray-500 mb-1">Lương cố định</p>
                                <p className="text-2xl font-bold">5.000.000 VND</p>
                                <p className="text-sm text-gray-500">mỗi tháng</p>
                              </div>
                              <Separator />
                              <div className="space-y-2">
                                <p className="font-medium">KPI</p>
                                <div className="flex items-start">
                                  <UserCheck className="h-4 w-4 text-gray-500 mr-2 shrink-0 mt-0.5" />
                                  <p className="text-sm">10 liên hệ mỗi tháng</p>
                                </div>
                                <div className="flex items-start">
                                  <UserPlus className="h-4 w-4 text-gray-500 mr-2 shrink-0 mt-0.5" />
                                  <p className="text-sm">5 liên hệ tiềm năng</p>
                                </div>
                              </div>
                              <Separator />
                              <div>
                                <p className="font-medium mb-2">Hoa hồng</p>
                                <p className="text-sm flex items-center">
                                  <ArrowRight className="h-4 w-4 mr-1 text-[#07ADB8]" />
                                  3% giá trị hợp đồng
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card className="border border-gray-200 shadow-sm relative overflow-hidden">
                          <div className="absolute top-0 right-0 bg-[#07ADB8]/20 text-[#07ADB8] px-2 py-1 text-xs font-semibold rounded-bl">
                            Level 2
                          </div>
                          <CardHeader className="pt-8">
                            <CardTitle className="text-xl font-semibold">Advanced</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div>
                                <p className="text-sm text-gray-500 mb-1">Lương cố định</p>
                                <p className="text-2xl font-bold">10.000.000 VND</p>
                                <p className="text-sm text-gray-500">mỗi tháng</p>
                              </div>
                              <Separator />
                              <div className="space-y-2">
                                <p className="font-medium">KPI</p>
                                <div className="flex items-start">
                                  <UserCheck className="h-4 w-4 text-gray-500 mr-2 shrink-0 mt-0.5" />
                                  <p className="text-sm">20 liên hệ mỗi tháng</p>
                                </div>
                                <div className="flex items-start">
                                  <UserPlus className="h-4 w-4 text-gray-500 mr-2 shrink-0 mt-0.5" />
                                  <p className="text-sm">10 liên hệ tiềm năng</p>
                                </div>
                                <div className="flex items-start">
                                  <Landmark className="h-4 w-4 text-gray-500 mr-2 shrink-0 mt-0.5" />
                                  <p className="text-sm">1 hợp đồng</p>
                                </div>
                              </div>
                              <Separator />
                              <div>
                                <p className="font-medium mb-2">Hoa hồng</p>
                                <p className="text-sm flex items-center">
                                  <ArrowRight className="h-4 w-4 mr-1 text-[#07ADB8]" />
                                  3% giá trị hợp đồng
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card className="border border-gray-200 shadow-sm relative overflow-hidden">
                          <div className="absolute top-0 right-0 bg-[#07ADB8]/30 text-[#07ADB8] px-2 py-1 text-xs font-semibold rounded-bl">
                            Level 3
                          </div>
                          <CardHeader className="pt-8">
                            <CardTitle className="text-xl font-semibold">Elite</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div>
                                <p className="text-sm text-gray-500 mb-1">Lương cố định</p>
                                <p className="text-2xl font-bold">15.000.000 VND</p>
                                <p className="text-sm text-gray-500">mỗi tháng</p>
                              </div>
                              <Separator />
                              <div className="space-y-2">
                                <p className="font-medium">KPI</p>
                                <div className="flex items-start">
                                  <UserCheck className="h-4 w-4 text-gray-500 mr-2 shrink-0 mt-0.5" />
                                  <p className="text-sm">30 liên hệ mỗi tháng</p>
                                </div>
                                <div className="flex items-start">
                                  <UserPlus className="h-4 w-4 text-gray-500 mr-2 shrink-0 mt-0.5" />
                                  <p className="text-sm">15 liên hệ tiềm năng</p>
                                </div>
                                <div className="flex items-start">
                                  <Landmark className="h-4 w-4 text-gray-500 mr-2 shrink-0 mt-0.5" />
                                  <p className="text-sm">2 hợp đồng</p>
                                </div>
                              </div>
                              <Separator />
                              <div>
                                <p className="font-medium mb-2">Hoa hồng</p>
                                <p className="text-sm flex items-center">
                                  <ArrowRight className="h-4 w-4 mr-1 text-[#07ADB8]" />
                                  3% giá trị hợp đồng
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <div className="mt-8 border rounded-lg p-5 bg-gray-50 dark:bg-gray-800/50">
                        <h3 className="font-semibold text-lg mb-4 flex items-center">
                          <InfoIcon className="h-5 w-5 mr-2 text-[#07ADB8]" />
                          Quy trình làm việc và đánh giá hiệu suất KOL/VIP
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <h4 className="font-medium">Quy trình làm việc</h4>
                            <ul className="space-y-2 pl-5 list-disc text-sm text-gray-700 dark:text-gray-300">
                              <li>KOL/VIP sẽ được cấp tài khoản và quyền truy cập riêng trên hệ thống</li>
                              <li>Cập nhật thông tin liên hệ khách hàng và tiềm năng hợp tác lên hệ thống</li>
                              <li>Đội ngũ ColorMedia sẽ tiếp nhận và xử lý các liên hệ</li>
                              <li>KOL/VIP có thể theo dõi tiến trình xử lý và trạng thái khách hàng</li>
                              <li>Khi khách hàng ký kết hợp đồng, hệ thống sẽ ghi nhận và tính hoa hồng</li>
                            </ul>
                          </div>
                          <div className="space-y-3">
                            <h4 className="font-medium">Đánh giá hiệu suất và điều chỉnh cấp độ</h4>
                            <ul className="space-y-2 pl-5 list-disc text-sm text-gray-700 dark:text-gray-300">
                              <li>Đánh giá hiệu suất được thực hiện vào ngày cuối cùng của mỗi tháng</li>
                              <li>Nếu đạt vượt chỉ tiêu KPI 3 tháng liên tiếp: nâng cấp lên mức cao hơn</li>
                              <li>Nếu không đạt đủ KPI 2 tháng liên tiếp: hạ xuống mức thấp hơn</li>
                              <li>Lương của tháng tiếp theo sẽ được điều chỉnh theo cấp độ mới</li>
                              <li>ColorMedia có thể ngừng hợp tác nếu KOL/VIP không đạt KPI 3 tháng liên tiếp</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Quy định về rút tiền</CardTitle>
                      <CardDescription>
                        Các quy định về việc rút tiền và thuế thu nhập cá nhân
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg">Giới hạn rút tiền</h3>
                        <p className="text-gray-700 dark:text-gray-300">
                          Số tiền tối đa có thể rút trong một ngày là <span className="font-medium">20.000.000 VND</span>. 
                          Giới hạn này được làm mới vào lúc 9:00 sáng mỗi ngày.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg">Thuế thu nhập cá nhân</h3>
                        <p className="text-gray-700 dark:text-gray-300">
                          Khi rút tiền với số tiền vượt quá <span className="font-medium">2.000.000 VND</span>, 
                          hệ thống sẽ tự động khấu trừ <span className="font-medium">10%</span> thuế thu nhập cá nhân theo quy định.
                          Nếu bạn có mã số thuế, vui lòng cung cấp trong quá trình rút tiền.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg">Thời gian xử lý</h3>
                        <p className="text-gray-700 dark:text-gray-300">
                          Thời gian xử lý yêu cầu rút tiền thông thường từ 1-3 ngày làm việc. 
                          Bạn có thể theo dõi trạng thái yêu cầu rút tiền trong mục "Lịch sử rút tiền" trên dashboard.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="guide" className="space-y-8">
                  <Alert variant="default" className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <AlertTitle className="text-amber-800 dark:text-amber-300">Tóm tắt quy trình</AlertTitle>
                    <AlertDescription className="text-amber-700 dark:text-amber-400">
                      Dưới đây là bản tóm tắt quy trình và thông tin đăng ký. Để xem hướng dẫn chi tiết, nhấp vào nút "Xem hướng dẫn đầy đủ" hoặc mở rộng các mục bên dưới.
                    </AlertDescription>
                  </Alert>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Quy trình đăng ký tham gia chương trình Affiliate</CardTitle>
                      <CardDescription>
                        Hướng dẫn các bước đăng ký và tham gia chương trình Affiliate của ColorMedia
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="step1">
                            <AccordionTrigger className="text-base font-medium">
                              <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-[#07ADB8]/10 text-[#07ADB8] flex items-center justify-center mr-3">1</div>
                                Đăng ký tài khoản Affiliate
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pl-11">
                              <div className="space-y-4 text-gray-700 dark:text-gray-300">
                                <p>Để đăng ký tài khoản Affiliate, bạn cần thực hiện các bước sau:</p>
                                <ul className="list-disc pl-5 space-y-2">
                                  <li>Điền đầy đủ thông tin cá nhân vào form đăng ký</li>
                                  <li>Cung cấp thông tin tài khoản ngân hàng để nhận hoa hồng</li>
                                  <li>Xác nhận email đăng ký</li>
                                  <li>Chờ quản trị viên xét duyệt (trong vòng 24-48 giờ)</li>
                                </ul>
                                <p className="text-sm italic text-gray-500 dark:text-gray-400">
                                  Lưu ý: Các thông tin bạn cung cấp phải chính xác và phải trùng khớp với thông tin trên CMND/CCCD/Hộ chiếu.
                                </p>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                          
                          <AccordionItem value="step2">
                            <AccordionTrigger className="text-base font-medium">
                              <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-[#07ADB8]/10 text-[#07ADB8] flex items-center justify-center mr-3">2</div>
                                Xác nhận thông tin
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pl-11">
                              <div className="space-y-4 text-gray-700 dark:text-gray-300">
                                <p>Sau khi đăng ký, đội ngũ ColorMedia sẽ tiến hành:</p>
                                <ul className="list-disc pl-5 space-y-2">
                                  <li>Liên hệ xác nhận qua điện thoại hoặc email</li>
                                  <li>Kiểm tra thông tin cá nhân và tài khoản ngân hàng</li>
                                  <li>Tư vấn về chính sách hoa hồng và cách thức hoạt động</li>
                                </ul>
                                <p className="text-sm italic text-gray-500 dark:text-gray-400">
                                  Thời gian xác nhận thường mất từ 24-48 giờ làm việc.
                                </p>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                          
                          <AccordionItem value="step3">
                            <AccordionTrigger className="text-base font-medium">
                              <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-[#07ADB8]/10 text-[#07ADB8] flex items-center justify-center mr-3">3</div>
                                Nhận tài khoản và bắt đầu
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pl-11">
                              <div className="space-y-4 text-gray-700 dark:text-gray-300">
                                <p>Sau khi được phê duyệt, bạn sẽ nhận được:</p>
                                <ul className="list-disc pl-5 space-y-2">
                                  <li>Thông tin đăng nhập vào hệ thống Affiliate</li>
                                  <li>Bộ tài liệu marketing và hướng dẫn sử dụng</li>
                                  <li>Mã giới thiệu riêng (affiliate ID)</li>
                                  <li>Hỗ trợ kỹ thuật và tư vấn từ đội ngũ chuyên nghiệp</li>
                                </ul>
                                <p className="text-sm italic text-gray-500 dark:text-gray-400">
                                  Khi đăng nhập lần đầu, bạn sẽ được yêu cầu đổi mật khẩu.
                                </p>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                        
                        <div className="mt-8 space-y-4">
                          <h3 className="text-lg font-semibold">Quy trình làm việc</h3>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                              <div className="flex items-center mb-3">
                                <div className="w-8 h-8 rounded-full bg-[#07ADB8]/10 text-[#07ADB8] flex items-center justify-center mr-2">1</div>
                                <h4 className="font-medium">Giới thiệu khách hàng</h4>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Thêm thông tin khách hàng tiềm năng vào hệ thống Affiliate.
                              </p>
                            </div>
                            
                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                              <div className="flex items-center mb-3">
                                <div className="w-8 h-8 rounded-full bg-[#07ADB8]/10 text-[#07ADB8] flex items-center justify-center mr-2">2</div>
                                <h4 className="font-medium">ColorMedia tiếp cận</h4>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Đội ngũ bán hàng liên hệ với khách hàng và tiến hành tư vấn.
                              </p>
                            </div>
                            
                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                              <div className="flex items-center mb-3">
                                <div className="w-8 h-8 rounded-full bg-[#07ADB8]/10 text-[#07ADB8] flex items-center justify-center mr-2">3</div>
                                <h4 className="font-medium">Khách hàng ký hợp đồng</h4>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Sau khi ký hợp đồng, thông tin sẽ được cập nhật trên hệ thống.
                              </p>
                            </div>
                            
                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                              <div className="flex items-center mb-3">
                                <div className="w-8 h-8 rounded-full bg-[#07ADB8]/10 text-[#07ADB8] flex items-center justify-center mr-2">4</div>
                                <h4 className="font-medium">Nhận hoa hồng</h4>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Hoa hồng được ghi nhận và có thể rút về tài khoản ngân hàng.
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-6 flex justify-center">
                          <a 
                            href="https://colormedia.sg.larksuite.com/wiki/LQxvwbgBjixFpfkGeUolFnMjgnb" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-md bg-[#07ADB8] px-6 py-3 text-white font-medium hover:bg-[#06969f] transition-colors"
                          >
                            Xem hướng dẫn đầy đủ
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>FAQ - Câu hỏi thường gặp</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="faq1">
                          <AccordionTrigger>Tôi cần những giấy tờ gì để đăng ký Affiliate?</AccordionTrigger>
                          <AccordionContent>
                            <p className="text-gray-700 dark:text-gray-300">
                              Bạn cần cung cấp thông tin cá nhân (CMND/CCCD), thông tin ngân hàng, và thông tin liên hệ. 
                              Nếu bạn đăng ký là doanh nghiệp, cần thêm giấy phép kinh doanh.
                            </p>
                          </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="faq2">
                          <AccordionTrigger>Làm thế nào để biết khách hàng đã ký hợp đồng?</AccordionTrigger>
                          <AccordionContent>
                            <p className="text-gray-700 dark:text-gray-300">
                              Sau khi khách hàng ký hợp đồng với ColorMedia, bạn sẽ được thông báo qua email và có thể theo dõi
                              trạng thái trên dashboard. Thông tin hợp đồng, giá trị và hoa hồng sẽ được hiển thị rõ ràng.
                            </p>
                          </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="faq3">
                          <AccordionTrigger>Tôi có được hỗ trợ khi tư vấn khách hàng không?</AccordionTrigger>
                          <AccordionContent>
                            <p className="text-gray-700 dark:text-gray-300">
                              Có, đội ngũ ColorMedia sẽ hỗ trợ bạn trong quá trình tư vấn khách hàng, cung cấp thông tin chuyên sâu về dịch vụ, 
                              và tham gia họp với khách hàng nếu cần thiết.
                            </p>
                          </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="faq4">
                          <AccordionTrigger>Khi nào tôi có thể rút tiền hoa hồng?</AccordionTrigger>
                          <AccordionContent>
                            <p className="text-gray-700 dark:text-gray-300">
                              Bạn có thể rút tiền hoa hồng sau khi khách hàng đã thanh toán hợp đồng cho ColorMedia. 
                              Việc rút tiền được thực hiện qua dashboard với giới hạn rút tối đa 20 triệu VND/ngày.
                            </p>
                          </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="faq5">
                          <AccordionTrigger>Làm thế nào để đăng ký tham gia chương trình KOL/VIP?</AccordionTrigger>
                          <AccordionContent>
                            <p className="text-gray-700 dark:text-gray-300">
                              Để đăng ký chương trình KOL/VIP, bạn cần đáp ứng một trong các điều kiện sau:
                            </p>
                            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-700 dark:text-gray-300">
                              <li>Có kinh nghiệm trong lĩnh vực truyền thông, marketing hoặc sản xuất nội dung</li>
                              <li>Có mạng lưới khách hàng doanh nghiệp rộng</li>
                              <li>Có tầm ảnh hưởng trên mạng xã hội với trên 10,000 followers</li>
                              <li>Đã làm việc trong ngành quảng cáo, truyền thông ít nhất 1 năm</li>
                            </ul>
                            <p className="text-gray-700 dark:text-gray-300 mt-2">
                              Vui lòng liên hệ với chúng tôi qua email <span className="font-medium">affiliate@colormedia.vn</span> kèm theo thông tin về bản thân, kinh nghiệm và lý do bạn muốn trở thành KOL/VIP của ColorMedia.
                            </p>
                            <p className="text-gray-700 dark:text-gray-300 mt-2">
                              Sau khi nhận được đơn đăng ký, chúng tôi sẽ liên hệ để phỏng vấn và đánh giá khả năng hợp tác.
                            </p>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                      
                      <div className="mt-6 flex justify-center">
                        <a
                          href="https://colormedia.sg.larksuite.com/docx/OCzqdz5xUogQLkxCofolRNbCgcd"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-[#07ADB8] hover:text-[#06969f] hover:underline"
                        >
                          <InfoIcon className="h-4 w-4 mr-2" />
                          <span>Xem thêm câu hỏi khác trong tài liệu đầy đủ</span>
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Liên hệ hỗ trợ: <a href="mailto:affiliate@colormedia.vn" className="text-[#07ADB8] hover:underline">affiliate@colormedia.vn</a> | Hotline: <a href="tel:0986123456" className="text-[#07ADB8] hover:underline">0986 123 456</a>
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}