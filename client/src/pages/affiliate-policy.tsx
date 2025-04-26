import { useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowRight, 
  CheckCircle2, 
  Landmark, 
  MonitorSmartphone, 
  ScrollText, 
  UserCheck, 
  UserPlus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";

export default function AffiliatePolicy() {
  const { user } = useAuth();
  
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
                  <Card>
                    <CardHeader>
                      <CardTitle>Quy trình đăng ký tham gia chương trình Affiliate</CardTitle>
                      <CardDescription>
                        Hướng dẫn các bước đăng ký và tham gia chương trình Affiliate của ColorMedia
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="flex items-start">
                          <div className="flex items-center justify-center rounded-full bg-[#07ADB8]/10 p-3 w-12 h-12 shrink-0 mr-4">
                            <ScrollText className="h-5 w-5 text-[#07ADB8]" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold mb-1">1. Đăng ký thông tin</h3>
                            <p className="text-gray-700 dark:text-gray-300">
                              Điền đầy đủ thông tin vào <Link href="/register-affiliate" className="text-[#07ADB8] hover:underline">
                                biểu mẫu đăng ký Affiliate</Link> bao gồm thông tin cá nhân, thông tin ngân hàng, và lĩnh vực hoạt động.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <div className="flex items-center justify-center rounded-full bg-[#07ADB8]/10 p-3 w-12 h-12 shrink-0 mr-4">
                            <MonitorSmartphone className="h-5 w-5 text-[#07ADB8]" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold mb-1">2. Xác nhận thông tin</h3>
                            <p className="text-gray-700 dark:text-gray-300">
                              Đội ngũ ColorMedia sẽ liên hệ trong vòng 24-48 giờ để xác nhận thông tin và hướng dẫn các bước tiếp theo.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <div className="flex items-center justify-center rounded-full bg-[#07ADB8]/10 p-3 w-12 h-12 shrink-0 mr-4">
                            <Landmark className="h-5 w-5 text-[#07ADB8]" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold mb-1">3. Nhận tài khoản và hướng dẫn</h3>
                            <p className="text-gray-700 dark:text-gray-300">
                              Sau khi xác nhận thành công, bạn sẽ nhận được tài khoản đăng nhập vào hệ thống Affiliate và bộ tài liệu marketing.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <div className="flex items-center justify-center rounded-full bg-[#07ADB8]/10 p-3 w-12 h-12 shrink-0 mr-4">
                            <UserPlus className="h-5 w-5 text-[#07ADB8]" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold mb-1">4. Bắt đầu giới thiệu khách hàng</h3>
                            <p className="text-gray-700 dark:text-gray-300">
                              Sử dụng dashboard để thêm thông tin khách hàng tiềm năng và theo dõi tiến trình, gửi báo giá, và nhận hoa hồng.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-8">
                        <h3 className="text-lg font-semibold mb-4">Tài liệu và hỗ trợ</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card className="border border-gray-200">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base">Bộ tài liệu giới thiệu</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                Bao gồm brochure, slide giới thiệu dịch vụ ColorMedia, mẫu báo giá, và tài liệu tham khảo.
                              </p>
                            </CardContent>
                          </Card>
                          
                          <Card className="border border-gray-200">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base">Hỗ trợ 1-1</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                Đội ngũ hỗ trợ chuyên nghiệp sẵn sàng giúp đỡ bạn trong quá trình giới thiệu và đàm phán với khách hàng.
                              </p>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                      
                      <div className="mt-8 flex justify-center">
                        <Link href="/register-affiliate" className="inline-flex items-center justify-center rounded-md bg-[#07ADB8] px-6 py-3 text-white font-medium hover:bg-[#06969f] transition-colors">
                          Đăng ký ngay
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>FAQ - Câu hỏi thường gặp</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <h3 className="font-semibold">Tôi cần những giấy tờ gì để đăng ký Affiliate?</h3>
                        <p className="text-gray-700 dark:text-gray-300">
                          Bạn cần cung cấp thông tin cá nhân (CMND/CCCD), thông tin ngân hàng, và thông tin liên hệ. 
                          Nếu bạn đăng ký là doanh nghiệp, cần thêm giấy phép kinh doanh.
                        </p>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <h3 className="font-semibold">Làm thế nào để biết khách hàng đã ký hợp đồng?</h3>
                        <p className="text-gray-700 dark:text-gray-300">
                          Sau khi khách hàng ký hợp đồng với ColorMedia, bạn sẽ được thông báo qua email và có thể theo dõi
                          trạng thái trên dashboard. Thông tin hợp đồng, giá trị và hoa hồng sẽ được hiển thị rõ ràng.
                        </p>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <h3 className="font-semibold">Tôi có được hỗ trợ khi tư vấn khách hàng không?</h3>
                        <p className="text-gray-700 dark:text-gray-300">
                          Có, đội ngũ ColorMedia sẽ hỗ trợ bạn trong quá trình tư vấn khách hàng, cung cấp thông tin chuyên sâu về dịch vụ, 
                          và tham gia họp với khách hàng nếu cần thiết.
                        </p>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <h3 className="font-semibold">Khi nào tôi có thể rút tiền hoa hồng?</h3>
                        <p className="text-gray-700 dark:text-gray-300">
                          Bạn có thể rút tiền hoa hồng sau khi khách hàng đã thanh toán hợp đồng cho ColorMedia. 
                          Việc rút tiền được thực hiện qua dashboard với giới hạn rút tối đa 20 triệu VND/ngày.
                        </p>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <h3 className="font-semibold">Làm thế nào để đăng ký tham gia chương trình KOL/VIP?</h3>
                        <p className="text-gray-700 dark:text-gray-300">
                          Để đăng ký chương trình KOL/VIP, bạn cần có kinh nghiệm trong lĩnh vực truyền thông hoặc có mạng lưới rộng.
                          Vui lòng liên hệ với chúng tôi qua email <span className="font-medium">affiliate@colormedia.vn</span> hoặc số điện thoại
                          <span className="font-medium"> 0986 123 456</span> để được tư vấn.
                        </p>
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