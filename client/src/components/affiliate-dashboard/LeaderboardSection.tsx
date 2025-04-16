import { TopAffiliate } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import SalesKitMaterials from "./SalesKitMaterials";
import { formatCurrency } from "@/lib/formatters";

interface LeaderboardSectionProps {
  topAffiliates?: TopAffiliate[];
  isLoading: boolean;
}

export default function LeaderboardSection({ topAffiliates, isLoading }: LeaderboardSectionProps) {
  return (
    <div className="lg:col-span-1 space-y-8">
      <Card>
        <CardHeader className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <CardTitle>Top Affiliates</CardTitle>
          <CardDescription>Ranking based on total contract value</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="px-4 py-4 flex items-center">
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
                <li key={index} className="px-4 py-4 flex items-center">
                  <div className="min-w-8 text-center">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{index + 1}</span>
                  </div>
                  <div className="min-w-0 flex-1 flex items-center px-4">
                    <div className="flex-shrink-0">
                      <Avatar>
                        <AvatarImage src={affiliate.profile_image} alt={affiliate.full_name} />
                        <AvatarFallback>{affiliate.full_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="min-w-0 flex-1 px-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {affiliate.full_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {formatCurrency(affiliate.contract_value)} VND
                      </p>
                    </div>
                  </div>
                  <div>
                    <Badge variant="success">
                      {affiliate.total_contracts} contracts
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      
      <SalesKitMaterials />
    </div>
  );
}
