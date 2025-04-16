import { TopAffiliate } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import SalesKitMaterials from "./SalesKitMaterials";
import { formatCurrency } from "@/lib/formatters";
import { Trophy, Award, ChevronRight } from "lucide-react";

interface LeaderboardSectionProps {
  topAffiliates?: TopAffiliate[];
  isLoading: boolean;
}

export default function LeaderboardSection({ topAffiliates, isLoading }: LeaderboardSectionProps) {
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
                        ${index < 3 ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'} 
                        text-sm font-medium`}
                      >
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 flex items-center px-4">
                    <Avatar className="border-2 border-white shadow-sm">
                      <AvatarImage src={affiliate.profile_image} alt={affiliate.full_name} />
                      <AvatarFallback className="bg-gradient-to-br from-primary-500 to-primary-700 text-white">
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
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                      {affiliate.total_contracts} hợp đồng
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 text-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Xếp hạng của bạn: <span className="font-medium text-primary-600 dark:text-primary-400">2</span>
            </span>
          </div>
        </CardContent>
      </Card>
      
      <SalesKitMaterials />
    </div>
  );
}
