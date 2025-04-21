import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

// Định nghĩa schema validation cho form thêm bonus
const addBonusSchema = z.object({
  user_id: z.string().transform(val => parseInt(val)),
  user_type: z.enum(["partner", "kol_vip", "sme"]),
  bonus_amount: z.string().transform(val => parseInt(val)),
  description: z.string().optional(),
});

type AddBonusFormData = z.infer<typeof addBonusSchema>;

// Định nghĩa schema cho form tính lại hoa hồng
const recalculateCommissionSchema = z.object({
  affiliate_id: z.string(),
  customer_id: z.string(),
});

type RecalculateCommissionFormData = z.infer<typeof recalculateCommissionSchema>;

export default function CommissionManagementPage() {
  const { toast } = useToast();
  const [isAddingBonus, setIsAddingBonus] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalculateResult, setRecalculateResult] = useState<any>(null);

  // Form thêm bonus
  const addBonusForm = useForm<AddBonusFormData>({
    resolver: zodResolver(addBonusSchema),
    defaultValues: {
      user_id: "",
      user_type: "partner",
      bonus_amount: "",
      description: "",
    },
  });

  // Form tính lại hoa hồng
  const recalculateForm = useForm<RecalculateCommissionFormData>({
    resolver: zodResolver(recalculateCommissionSchema),
    defaultValues: {
      affiliate_id: "",
      customer_id: "",
    },
  });

  // Xử lý submit form thêm bonus
  async function onAddBonusSubmit(values: AddBonusFormData) {
    setIsAddingBonus(true);
    try {
      const res = await apiRequest("POST", "/api/commission/add-bonus", values);
      const data = await res.json();
      
      if (data.status === "success") {
        toast({
          title: "Thêm bonus thành công",
          description: `Đã thêm ${values.bonus_amount.toLocaleString()} VNĐ vào hoa hồng tích lũy.`,
        });
        
        addBonusForm.reset({
          user_id: "",
          user_type: "partner",
          bonus_amount: "",
          description: "",
        });
      } else {
        toast({
          title: "Lỗi khi thêm bonus",
          description: data.error?.message || "Đã xảy ra lỗi không xác định",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding bonus:", error);
      toast({
        title: "Lỗi khi thêm bonus",
        description: "Không thể kết nối đến máy chủ",
        variant: "destructive",
      });
    } finally {
      setIsAddingBonus(false);
    }
  }

  // Xử lý submit form tính lại hoa hồng
  async function onRecalculateSubmit(values: RecalculateCommissionFormData) {
    setIsRecalculating(true);
    setRecalculateResult(null);
    
    try {
      const res = await apiRequest(
        "PATCH", 
        `/api/commission/recalculate/${values.affiliate_id}/${values.customer_id}`,
        {}
      );
      const data = await res.json();
      
      if (data.status === "success") {
        toast({
          title: "Tính lại hoa hồng thành công",
          description: "Hoa hồng đã được tính lại thành công",
        });
        
        setRecalculateResult(data.data);
      } else {
        toast({
          title: "Lỗi khi tính lại hoa hồng",
          description: data.error?.message || "Đã xảy ra lỗi không xác định",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error recalculating commission:", error);
      toast({
        title: "Lỗi khi tính lại hoa hồng",
        description: "Không thể kết nối đến máy chủ",
        variant: "destructive",
      });
    } finally {
      setIsRecalculating(false);
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Quản lý hoa hồng</h1>
      <p className="text-gray-600 mb-8">
        Trang quản lý hoa hồng cho phép thêm bonus và tính lại hoa hồng theo cấu trúc mới.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Thêm Bonus */}
        <Card>
          <CardHeader>
            <CardTitle>Thêm Bonus</CardTitle>
            <CardDescription>
              Thêm bonus vào hoa hồng tích lũy cho affiliate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...addBonusForm}>
              <form
                id="add-bonus-form"
                onSubmit={addBonusForm.handleSubmit(onAddBonusSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={addBonusForm.control}
                  name="user_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Nhập ID người dùng" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addBonusForm.control}
                  name="user_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loại người dùng</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn loại người dùng" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="partner">Partner (>30M VND)</SelectItem>
                          <SelectItem value="sme">SME (1-29.99M VND)</SelectItem>
                          <SelectItem value="kol_vip">KOL/VIP</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addBonusForm.control}
                  name="bonus_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số tiền bonus (VNĐ)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Nhập số tiền bonus"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addBonusForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mô tả (tùy chọn)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Nhập mô tả cho khoản bonus"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </CardContent>
          <CardFooter>
            <Button 
              form="add-bonus-form" 
              type="submit" 
              className="w-full"
              disabled={isAddingBonus}
            >
              {isAddingBonus ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Thêm Bonus"
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Tính lại hoa hồng */}
        <Card>
          <CardHeader>
            <CardTitle>Tính lại hoa hồng</CardTitle>
            <CardDescription>
              Tính lại hoa hồng cho khách hàng theo cấu trúc mới
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...recalculateForm}>
              <form
                id="recalculate-form"
                onSubmit={recalculateForm.handleSubmit(onRecalculateSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={recalculateForm.control}
                  name="affiliate_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Affiliate ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Nhập ID affiliate" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={recalculateForm.control}
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Nhập ID khách hàng" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>

            {recalculateResult && (
              <div className="mt-4 p-4 border rounded-md bg-slate-50">
                <h4 className="font-medium mb-2">Kết quả tính lại hoa hồng:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Hoa hồng cũ:</span>
                    <span>{recalculateResult.old_commission.toLocaleString()} VNĐ</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hoa hồng mới:</span>
                    <span>{recalculateResult.new_commission.toLocaleString()} VNĐ</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Chênh lệch:</span>
                    <span className={recalculateResult.difference >= 0 ? "text-green-600" : "text-red-600"}>
                      {recalculateResult.difference >= 0 ? "+" : ""}{recalculateResult.difference.toLocaleString()} VNĐ
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              form="recalculate-form" 
              type="submit" 
              className="w-full"
              disabled={isRecalculating}
            >
              {isRecalculating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tính toán...
                </>
              ) : (
                "Tính lại hoa hồng"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}