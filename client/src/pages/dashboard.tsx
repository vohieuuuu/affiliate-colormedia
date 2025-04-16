import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import DashboardInfoBar from "@/components/affiliate-dashboard/DashboardInfoBar";
import StatisticsGrid from "@/components/affiliate-dashboard/StatisticsGrid";
import LeaderboardSection from "@/components/affiliate-dashboard/LeaderboardSection";
import ReferredCustomersSection from "@/components/affiliate-dashboard/ReferredCustomersSection";
import WithdrawalHistorySection from "@/components/affiliate-dashboard/WithdrawalHistorySection";
import TimelineModal from "@/components/affiliate-dashboard/TimelineModal";
import WithdrawalModal from "@/components/affiliate-dashboard/WithdrawalModal";
import { ReferredCustomer } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { toast } = useToast();
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ReferredCustomer | null>(null);
  
  // Fetch affiliate data
  const { data: affiliateData, isLoading: isAffiliateLoading, error: affiliateError } = useQuery({
    queryKey: ['/api/affiliate'],
  });

  // Fetch top affiliates
  const { data: topAffiliates, isLoading: isTopAffiliatesLoading, error: topAffiliatesError } = useQuery({
    queryKey: ['/api/affiliates/top'],
  });

  // Handle timeline view click
  const handleViewTimeline = (customer: ReferredCustomer) => {
    setSelectedCustomer(customer);
    setIsTimelineModalOpen(true);
  };

  // Handle withdrawal request modal
  const handleWithdrawalRequest = () => {
    setIsWithdrawalModalOpen(true);
  };

  // Handle success notification for withdrawal request
  const handleWithdrawalSuccess = () => {
    toast({
      title: "Success!",
      description: "Your withdrawal request has been submitted successfully.",
      variant: "success",
    });
    setIsWithdrawalModalOpen(false);
  };

  if (affiliateError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Data</h1>
          <p className="text-gray-600">{(affiliateError as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header fullName={affiliateData?.full_name} />
      
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isAffiliateLoading ? (
          <div className="animate-pulse space-y-8">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="lg:col-span-2 h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
          </div>
        ) : (
          <>
            <DashboardInfoBar 
              affiliate={affiliateData} 
              onWithdrawalRequest={handleWithdrawalRequest} 
            />
            
            <StatisticsGrid affiliate={affiliateData} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
              <LeaderboardSection 
                topAffiliates={topAffiliates} 
                isLoading={isTopAffiliatesLoading} 
              />
              
              <div className="lg:col-span-2 space-y-8">
                <ReferredCustomersSection 
                  referredCustomers={affiliateData?.referred_customers} 
                  onViewTimeline={handleViewTimeline} 
                />
                
                <WithdrawalHistorySection 
                  withdrawalHistory={affiliateData?.withdrawal_history} 
                />
              </div>
            </div>
          </>
        )}
      </main>
      
      <Footer />
      
      {/* Modals */}
      {selectedCustomer && (
        <TimelineModal 
          isOpen={isTimelineModalOpen} 
          onClose={() => setIsTimelineModalOpen(false)}
          customer={selectedCustomer}
        />
      )}
      
      {affiliateData && (
        <WithdrawalModal 
          isOpen={isWithdrawalModalOpen}
          onClose={() => setIsWithdrawalModalOpen(false)}
          onSuccess={handleWithdrawalSuccess}
          affiliate={affiliateData}
        />
      )}
    </div>
  );
}
