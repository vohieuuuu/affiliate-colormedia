import { TopAffiliate } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import SalesKitMaterials from "./SalesKitMaterials";
import { formatCurrency } from "@/lib/formatters";
import { Trophy, Award, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

interface LeaderboardSectionProps {
  topAffiliates?: TopAffiliate[];
  isLoading: boolean;
}

export default function LeaderboardSection({ topAffiliates, isLoading }: LeaderboardSectionProps) {
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  
  // Lấy thông tin affiliate hiện tại để so sánh với bảng xếp hạng
  const { data: apiAffiliateResponse } = useQuery({
    queryKey: ['/api/affiliate'],
    staleTime: 5 * 60 * 1000, // 5 phút, để giảm số lượng requests
  });
  
  // Hàm để tính toán xếp hạng của người dùng hiện tại
  useEffect(() => {
    if (topAffiliates && topAffiliates.length > 0 && apiAffiliateResponse) {
      try {
        console.log("Calculating rank with topAffiliates:", topAffiliates);
        
        const affiliateData = apiAffiliateResponse && typeof apiAffiliateResponse === 'object' && 'status' in apiAffiliateResponse && apiAffiliateResponse.status === "success" 
          ? (apiAffiliateResponse as any).data 
          : undefined;
        
        console.log("Current user affiliate data:", affiliateData?.affiliate_id);
        
        if (affiliateData && affiliateData.affiliate_id) {
          // Tìm vị trí của affiliate trong danh sách topAffiliates
          const affiliateIndex = topAffiliates.findIndex(
            (affiliate) => String(affiliate.affiliate_id) === String(affiliateData.affiliate_id)
          );
          
          console.log("Found index in top affiliates:", affiliateIndex);
          
          if (affiliateIndex !== -1) {
            // Nếu tìm thấy, xếp hạng = index + 1
            setCurrentUserRank(affiliateIndex + 1);
            console.log("Setting rank to:", affiliateIndex + 1);
          } else {
            // Nếu không tìm thấy trong danh sách top, có thể họ không nằm trong top
            setCurrentUserRank(topAffiliates.length + 1);
            console.log("Setting rank outside top list:", topAffiliates.length + 1);
          }
        }
      } catch (error) {
        console.error("Error calculating user rank:", error);
      }
    }
  }, [topAffiliates, apiAffiliateResponse]);
  
  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Trophy className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Trophy className="h-5 w-5 text-amber-700" />;
    return null;
  };

  return (
    <div className="lg:col-span-1 space-y-8">
      <Card className="border-none shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-[#07ADB8] to-[#05868f] px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center">
                <Award className="mr-2 h-5 w-5 text-[#FFC919]" />
                Bảng xếp hạng
              </h3>
              <p className="text-white/80 text-sm mt-1">
                Dựa trên tổng giá trị hợp đồng
              </p>
            </div>
            <a href="#" className="text-xs text-white/80 hover:text-[#FFC919] flex items-center">
              Xem tất cả
              <ChevronRight className="h-3 w-3 ml-1" />
            </a>
          </div>
        </div>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="px-6 py-4 flex items-center">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="ml-4 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {topAffiliates?.map((affiliate, index) => (
                <li key={index} className="px-4 py-4 flex items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center justify-center min-w-10">
                    {getRankIcon(index) || (
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full 
                        ${index < 3 ? 'bg-[#07ADB8]/10 text-[#07ADB8] dark:bg-[#07ADB8]/20 dark:text-[#07ADB8]' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'} 
                        text-sm font-medium`}
                      >
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 flex items-center px-4">
                    <Avatar className="border-2 border-white shadow-sm">
                      <AvatarFallback className="bg-gradient-to-br from-[#07ADB8] to-[#05868f] text-white">
                        {affiliate.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 px-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {affiliate.full_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {formatCurrency(affiliate.contract_value)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Badge variant="outline" className="bg-[#FFC919]/10 text-[#a3820e] border-[#FFC919]/30 dark:bg-[#FFC919]/20 dark:text-[#FFC919] dark:border-[#FFC919]/30">
                      {affiliate.total_contracts} hợp đồng
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 text-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Xếp hạng của bạn: <span className="font-medium text-[#07ADB8] dark:text-[#07ADB8]">
                {currentUserRank !== null ? currentUserRank : 'Đang tính...'}
              </span>
            </span>
          </div>
        </CardContent>
      </Card>
      
      <SalesKitMaterials />
    </div>
  );
}
