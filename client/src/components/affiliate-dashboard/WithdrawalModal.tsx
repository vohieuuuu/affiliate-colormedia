import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Affiliate } from "@shared/schema";
import { DollarSign } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/formatters";

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  affiliate: Affiliate;
}

export default function WithdrawalModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  affiliate 
}: WithdrawalModalProps) {
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [confirmBankInfo, setConfirmBankInfo] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const maxAmount = affiliate?.remaining_balance || 0;
  
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0 || amountValue > maxAmount) {
        throw new Error(`Please enter a valid amount (between 1 and ${formatCurrency(maxAmount)} VND)`);
      }
      
      if (!confirmBankInfo) {
        throw new Error("Please confirm your bank account information");
      }
      
      return apiRequest("POST", "/api/withdrawal-request", {
        amount: amountValue,
        note
      });
    },
    onSuccess: () => {
      resetForm();
      onSuccess();
    },
    onError: (error: Error) => {
      setError(error.message);
    }
  });
  
  const resetForm = () => {
    setAmount("");
    setNote("");
    setConfirmBankInfo(false);
    setError(null);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    mutate();
  };
  
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary-500" />
            <DialogTitle>Request Commission Withdrawal</DialogTitle>
          </div>
          <DialogDescription>
            Fill out the form below to request a withdrawal of your commission.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount (VND)</Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  max={maxAmount}
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 dark:text-gray-400 text-sm">VND</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Maximum available: {formatCurrency(maxAmount)} VND
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea
                id="note"
                placeholder="Add a note to your withdrawal request"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            
            <div className="flex items-start space-x-2 pt-2">
              <Checkbox
                id="confirmBankInfo"
                checked={confirmBankInfo}
                onCheckedChange={(checked) => setConfirmBankInfo(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="confirmBankInfo"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Confirm bank information
                </Label>
                <p className="text-sm text-muted-foreground">
                  I confirm that my bank account information is correct and up to date.
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Bank Name:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {affiliate?.bank_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Account Number:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {affiliate?.bank_account}
                </span>
              </div>
            </div>
            
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" type="button" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
