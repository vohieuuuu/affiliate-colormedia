import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface KpiProgressCardProps {
  title: string;
  icon: React.ReactNode;
  current: number;
  target: number;
  percentage: number;
}

const KpiProgressCard: React.FC<KpiProgressCardProps> = ({
  title,
  icon,
  current,
  target,
  percentage
}) => {
  // Determine the status color based on the percentage
  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return "text-green-500";
    if (percentage >= 70) return "text-yellow-500";
    return "text-red-500";
  };

  const statusColor = getStatusColor(percentage);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-md">
            {React.cloneElement(icon as React.ReactElement, { className: "h-5 w-5 text-primary" })}
          </div>
          <span className="font-medium">{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-semibold">{current}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">{target}</span>
          <span className={`ml-2 font-semibold ${statusColor}`}>
            {percentage}%
          </span>
        </div>
      </div>
      <Progress 
        value={percentage} 
        className={percentage >= 100 ? "bg-muted border border-green-500" : ""}
      />
    </div>
  );
};

export default KpiProgressCard;