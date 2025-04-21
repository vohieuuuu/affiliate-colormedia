import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Users, 
  FileText, 
  TrendingUp, 
  Wallet, 
  BarChart4
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { StatisticsPeriodType } from "@shared/schema";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  LineChart, 
  Line 
} from "recharts";

interface StatisticsByPeriodProps {
  defaultPeriod?: StatisticsPeriodType;
  affiliate?: any; // Affiliate data passed from parent
}

type ChartData = {
  name: string;
  contractValue: number;
  commission: number;
  count: number;
};

export default function StatisticsByPeriod({ defaultPeriod = "month", affiliate }: StatisticsByPeriodProps) {
  const [period, setPeriod] = useState<StatisticsPeriodType>(defaultPeriod);
  const [chartType, setChartType] = useState<"line" | "bar">("bar");
  const [chartData, setChartData] = useState<ChartData[]>([]);
  
  // Fetch affiliate data if not provided
  const { data: affiliateData, isLoading: isAffiliateLoading } = useQuery({
    queryKey: ['/api/affiliate'],
    enabled: !affiliate
  });
  
  // Use provided affiliate data or the one fetched from API
  const currentAffiliate = affiliate || (affiliateData?.status === "success" ? affiliateData.data : null);
  const isLoading = !affiliate && isAffiliateLoading;
  
  // Generate statistics and chart data from affiliate data
  useEffect(() => {
    if (currentAffiliate) {
      // Generate statistics
      const customers = currentAffiliate.referred_customers || [];
      let filteredCustomers = [...customers];
      
      // Apply time period filtering
      let periodStart = new Date();
      let periodEnd = new Date();
      
      // Define period ranges similar to server-side filtering
      switch (period) {
        case "week":
          periodStart = new Date();
          periodStart.setDate(periodStart.getDate() - periodStart.getDay() + (periodStart.getDay() === 0 ? -6 : 1));
          periodStart.setHours(0, 0, 0, 0);
          
          periodEnd = new Date(periodStart);
          periodEnd.setDate(periodEnd.getDate() + 6);
          periodEnd.setHours(23, 59, 59, 999);
          break;
          
        case "month":
          periodStart = new Date();
          periodStart.setDate(1);
          periodStart.setHours(0, 0, 0, 0);
          
          periodEnd = new Date(periodStart);
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          periodEnd.setDate(0);
          periodEnd.setHours(23, 59, 59, 999);
          break;
          
        case "year":
          periodStart = new Date();
          periodStart.setMonth(0, 1);
          periodStart.setHours(0, 0, 0, 0);
          
          periodEnd = new Date(periodStart);
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          periodEnd.setDate(0);
          periodEnd.setHours(23, 59, 59, 999);
          break;
          
        default: // all - all time
          periodStart = new Date(0);
          periodEnd = new Date();
      }
      
      // Filter customers by period
      if (period !== "all") {
        filteredCustomers = customers.filter(customer => {
          const createdDate = new Date(customer.created_at);
          return createdDate >= periodStart && createdDate <= periodEnd;
        });
      }
      
      // Calculate statistics
      const totalCustomers = filteredCustomers.length;
      const contractSignedCustomers = filteredCustomers.filter(c => c.status === "Đã chốt hợp đồng");
      const totalContracts = contractSignedCustomers.length;
      const totalContractValue = contractSignedCustomers.reduce((sum, c) => sum + (c.contract_value || 0), 0);
      const totalCommission = contractSignedCustomers.reduce((sum, c) => sum + (c.commission || 0), 0);
      
      // Generate chart data
      // Group by day, week, or month depending on period
      const chartDataMap = new Map();
      
      filteredCustomers.forEach(customer => {
        if (customer.status === "Đã chốt hợp đồng" && customer.contract_value) {
          const date = new Date(customer.created_at);
          let periodKey;
          
          if (period === "week" || period === "month") {
            // Group by day
            periodKey = date.toISOString().slice(0, 10); // YYYY-MM-DD
          } else if (period === "year") {
            // Group by month
            periodKey = date.toISOString().slice(0, 7); // YYYY-MM
          } else {
            // Group by month for all time
            periodKey = date.toISOString().slice(0, 7); // YYYY-MM
          }
          
          if (!chartDataMap.has(periodKey)) {
            chartDataMap.set(periodKey, {
              period: periodKey,
              contractValue: 0,
              commission: 0,
              contractCount: 0,
            });
          }
          
          const data = chartDataMap.get(periodKey);
          data.contractValue += customer.contract_value;
          data.commission += customer.commission || 0;
          data.contractCount += 1;
        }
      });
      
      // Convert to array and format for display
      const formattedChartData = Array.from(chartDataMap.values())
        .sort((a, b) => a.period.localeCompare(b.period))
        .map(item => {
          // Format date label based on period
          let name = item.period;
          if (period === "month" || period === "week") {
            // For month and week, show day
            const date = new Date(item.period);
            name = date.getDate().toString();
          } else if (period === "year") {
            // For year, show month
            const date = new Date(item.period + "-01"); // Add day for valid date
            name = date.toLocaleString('default', { month: 'short' });
          }
          
          return {
            name,
            contractValue: item.contractValue / 1000000, // Convert to million
            commission: item.commission / 1000000, // Convert to million
            count: item.contractCount
          };
        });
      
      setChartData(formattedChartData);
      
      // Update stats in state
      const statsData = {
        totalCustomers,
        totalContracts,
        totalContractValue,
        totalCommission,
        periodType: period,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString()
      };
      
      setStats(statsData);
    }
  }, [currentAffiliate, period]);
  
  // Local stats state
  const [stats, setStats] = useState<any>(null);
  
  // Determine appropriate chart height
  const chartHeight = period === "year" ? 300 : period === "month" ? 350 : 250;
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Performance Metrics</h2>
        <div className="flex items-center gap-4">
          <Select 
            value={period} 
            onValueChange={(value) => setPeriod(value as StatisticsPeriodType)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          
          <Select 
            value={chartType} 
            onValueChange={(value) => setChartType(value as "line" | "bar")}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Chart type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">Bar Chart</SelectItem>
              <SelectItem value="line">Line Chart</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Statistics Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-32 animate-pulse">
              <CardContent className="p-4 flex items-center justify-center">
                <div className="w-full h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Contacts Card */}
          <Card className="border-none shadow-md overflow-hidden">
            <div className="h-2 bg-[#07ADB8]" />
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Khách hàng giới thiệu
                  </p>
                  <div className="flex items-baseline mt-2">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats?.totalCustomers || 0}
                    </span>
                    <span className="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                      liên hệ
                    </span>
                  </div>
                </div>
                <div className="bg-[#07ADB8]/10 dark:bg-[#07ADB8]/30 p-3 rounded-full">
                  <Users className="h-6 w-6 text-[#07ADB8] dark:text-[#07ADB8]" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Signed Contracts Card */}
          <Card className="border-none shadow-md overflow-hidden">
            <div className="h-2 bg-[#07ADB8]" />
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Hợp đồng ký kết
                  </p>
                  <div className="flex items-baseline mt-2">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats?.totalContracts || 0}
                    </span>
                    <span className="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                      hợp đồng
                    </span>
                  </div>
                </div>
                <div className="bg-[#07ADB8]/10 dark:bg-[#07ADB8]/30 p-3 rounded-full">
                  <FileText className="h-6 w-6 text-[#07ADB8] dark:text-[#07ADB8]" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contract Value Card */}
          <Card className="border-none shadow-md overflow-hidden">
            <div className="h-2 bg-[#07ADB8]" />
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Giá trị hợp đồng
                  </p>
                  <div className="flex items-baseline mt-2">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(stats?.totalContractValue || 0)}
                    </span>
                  </div>
                </div>
                <div className="bg-[#07ADB8]/10 dark:bg-[#07ADB8]/30 p-3 rounded-full">
                  <TrendingUp className="h-6 w-6 text-[#07ADB8] dark:text-[#07ADB8]" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Commission Card */}
          <Card className="border-none shadow-md overflow-hidden">
            <div className="h-2 bg-[#FFC919]" />
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Hoa hồng ({period === "all" ? "Tổng" : period === "year" ? "Năm" : period === "month" ? "Tháng" : "Tuần"})
                  </p>
                  <div className="flex items-baseline mt-2">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(stats?.totalCommission || 0)}
                    </span>
                  </div>
                </div>
                <div className="bg-[#FFC919]/10 dark:bg-[#FFC919]/30 p-3 rounded-full">
                  <Wallet className="h-6 w-6 text-[#FFC919] dark:text-[#FFC919]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Charts */}
      <Card>
        <CardHeader className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>
                {period === "week" 
                  ? "Daily performance for this week" 
                  : period === "month" 
                  ? "Daily performance for this month" 
                  : "Monthly performance for this year"}
              </CardDescription>
            </div>
            <BarChart4 className="w-6 h-6 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="animate-pulse flex flex-col space-y-4">
              <div className="h-[300px] bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No data available for the selected period
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "bar" ? (
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    height={chartHeight}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#07ADB8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#FFC919" />
                    <Tooltip formatter={(value, name) => {
                      if (name === 'count') return [value, 'Hợp đồng'];
                      return [`${value} triệu`, name === 'contractValue' ? 'Giá trị HĐ' : 'Hoa hồng'];
                    }} />
                    <Legend />
                    <Bar 
                      yAxisId="left"
                      dataKey="contractValue" 
                      name="Giá trị HĐ (triệu)" 
                      fill="#07ADB8"
                    />
                    <Bar 
                      yAxisId="right"
                      dataKey="commission" 
                      name="Hoa hồng (triệu)"
                      fill="#FFC919" 
                    />
                  </BarChart>
                ) : (
                  <LineChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    height={chartHeight}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#07ADB8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#FFC919" />
                    <Tooltip formatter={(value, name) => {
                      if (name === 'count') return [value, 'Hợp đồng'];
                      return [`${value} triệu`, name === 'contractValue' ? 'Giá trị HĐ' : 'Hoa hồng'];
                    }} />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="contractValue" 
                      name="Giá trị HĐ (triệu)"
                      stroke="#07ADB8" 
                      activeDot={{ r: 8 }}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="commission" 
                      name="Hoa hồng (triệu)"
                      stroke="#FFC919" 
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}