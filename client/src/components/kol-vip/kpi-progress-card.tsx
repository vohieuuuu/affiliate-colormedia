import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  AlertCircle, 
  CheckCircle, 
  PieChart, 
  AlertTriangle, 
  TrendingUp,
  Award
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { KolVipLevel, MonthlyKpi } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";

interface KpiProgressCardProps {
  level: KolVipLevel;
  monthlyKpi?: MonthlyKpi;
  isCurrentMonth?: boolean;
}

// Định nghĩa các yêu cầu KPI cho từng cấp độ
const KPI_REQUIREMENTS = {
  "LEVEL_1": {
    title: "Fresher",
    salary: 5000000,
    contacts: 10,
    potentialContacts: 5,
    contracts: 0,
    description: "Đội ngũ KOL/VIP mới, nhiệm vụ chủ yếu là tiếp cận và giới thiệu dịch vụ"
  },
  "LEVEL_2": {
    title: "Advanced",
    salary: 10000000,
    contacts: 20,
    potentialContacts: 10,
    contracts: 1,
    description: "Đội ngũ KOL/VIP có kinh nghiệm, đã làm quen với quy trình bán hàng"
  },
  "LEVEL_3": {
    title: "Elite",
    salary: 15000000,
    contacts: 30,
    potentialContacts: 15,
    contracts: 2,
    description: "Đội ngũ KOL/VIP cao cấp, chuyên nghiệp trong việc chốt hợp đồng"
  }
};

const KpiProgressCard = ({ level, monthlyKpi, isCurrentMonth = false }: KpiProgressCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Lấy yêu cầu KPI theo cấp độ
  const kpiRequirement = KPI_REQUIREMENTS[level];
  
  // Tính toán tiến độ KPI
  const contactsProgress = monthlyKpi ? Math.min(100, (monthlyKpi.total_contacts / kpiRequirement.contacts) * 100) : 0;
  const potentialProgress = monthlyKpi ? Math.min(100, (monthlyKpi.potential_contacts / kpiRequirement.potentialContacts) * 100) : 0;
  const contractsProgress = kpiRequirement.contracts > 0 && monthlyKpi
    ? Math.min(100, (monthlyKpi.signed_contracts / kpiRequirement.contracts) * 100)
    : kpiRequirement.contracts === 0 ? 100 : 0;
  
  // Kiểm tra đã đạt KPI hay chưa
  const contactsAchieved = monthlyKpi ? monthlyKpi.total_contacts >= kpiRequirement.contacts : false;
  const potentialAchieved = monthlyKpi ? monthlyKpi.potential_contacts >= kpiRequirement.potentialContacts : false;
  const contractsAchieved = monthlyKpi 
    ? kpiRequirement.contracts === 0 || monthlyKpi.signed_contracts >= kpiRequirement.contracts
    : false;
  
  // Kiểm tra KPI đạt hay chưa
  const isKpiAchieved = contactsAchieved && potentialAchieved && contractsAchieved;
  
  // Tính tổng tiến độ
  const totalProgress = (contactsProgress + potentialProgress + (kpiRequirement.contracts > 0 ? contractsProgress : 0)) /
    (kpiRequirement.contracts > 0 ? 3 : 2);
  
  return (
    <Card className={`${isKpiAchieved ? 'border-green-500' : isCurrentMonth ? 'border-primary' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              <span>KPI Cấp độ {kpiRequirement.title}</span>
            </CardTitle>
            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <PieChart className="h-4 w-4" />
              <span>Tổng tiến độ: {Math.round(totalProgress)}%</span>
            </div>
          </div>
          
          {isKpiAchieved ? (
            <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Đạt KPI
            </Badge>
          ) : isCurrentMonth ? (
            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Đang tiến hành
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
              <AlertCircle className="h-3 w-3 mr-1" />
              Chưa đạt KPI
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 pb-4">
        <div className="mt-2 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1">
                {contactsAchieved ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-muted-foreground" />
                )}
                Tổng số liên hệ
              </span>
              <span className="font-medium">
                {monthlyKpi ? monthlyKpi.total_contacts : 0} / {kpiRequirement.contacts}
              </span>
            </div>
            <Progress value={contactsProgress} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1">
                {potentialAchieved ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-muted-foreground" />
                )}
                Liên hệ tiềm năng
              </span>
              <span className="font-medium">
                {monthlyKpi ? monthlyKpi.potential_contacts : 0} / {kpiRequirement.potentialContacts}
              </span>
            </div>
            <Progress value={potentialProgress} className="h-2" />
          </div>
          
          {kpiRequirement.contracts > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1">
                  {contractsAchieved ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-muted-foreground" />
                  )}
                  Hợp đồng đã ký
                </span>
                <span className="font-medium">
                  {monthlyKpi ? monthlyKpi.signed_contracts : 0} / {kpiRequirement.contracts}
                </span>
              </div>
              <Progress value={contractsProgress} className="h-2" />
            </div>
          )}
        </div>
        
        <div 
          className="mt-4 text-sm flex items-center cursor-pointer text-primary"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "Ẩn chi tiết" : "Xem chi tiết"} 
          <TrendingUp className="h-3 w-3 ml-1" />
        </div>
        
        {isExpanded && (
          <div className="mt-4 space-y-3 pt-3 border-t">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Lương cơ bản:</div>
              <div className="font-medium text-right">{formatCurrency(kpiRequirement.salary)}</div>
              
              <div className="text-muted-foreground">Tỷ lệ hoa hồng:</div>
              <div className="font-medium text-right">3% giá trị hợp đồng</div>
              
              <div className="text-muted-foreground">Tổng doanh thu:</div>
              <div className="font-medium text-right">
                {monthlyKpi ? formatCurrency(monthlyKpi.total_revenue || 0) : formatCurrency(0)}
              </div>
              
              <div className="text-muted-foreground">Hoa hồng nhận được:</div>
              <div className="font-medium text-right">
                {monthlyKpi ? formatCurrency(monthlyKpi.total_commission || 0) : formatCurrency(0)}
              </div>
            </div>
            
            <Separator className="my-2" />
            
            <div className="text-xs text-muted-foreground">
              {kpiRequirement.description}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default KpiProgressCard;