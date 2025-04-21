import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileText, Download, ExternalLink } from "lucide-react";

// Danh sách tài liệu bán hàng mẫu
const salesMaterials = [
  {
    id: 1,
    title: "Hướng dẫn chăm sóc KH cho KOL/VIP",
    description: "Tài liệu chi tiết về quy trình chăm sóc khách hàng tiềm năng",
    url: "https://docs.google.com/document/d/example1",
    type: "pdf",
    updatedAt: "2025-03-15"
  },
  {
    id: 2,
    title: "Bộ slide giới thiệu dịch vụ",
    description: "Slide trình bày chuyên nghiệp về các dịch vụ của ColorMedia",
    url: "https://docs.google.com/presentation/d/example2",
    type: "ppt",
    updatedAt: "2025-03-20"
  },
  {
    id: 3,
    title: "Bảng giá dịch vụ 2025",
    description: "Bảng giá chi tiết các dịch vụ, phân theo từng gói",
    url: "https://docs.google.com/spreadsheets/d/example3",
    type: "xlsx",
    updatedAt: "2025-04-01"
  },
  {
    id: 4,
    title: "Mẫu hợp đồng dịch vụ",
    description: "Mẫu hợp đồng chi tiết dành cho khách hàng",
    url: "https://docs.google.com/document/d/example4",
    type: "docx",
    updatedAt: "2025-04-10"
  },
  {
    id: 5,
    title: "Quy trình ký kết hợp đồng",
    description: "Hướng dẫn từng bước quy trình ký kết hợp đồng với khách hàng",
    url: "https://docs.google.com/document/d/example5",
    type: "pdf",
    updatedAt: "2025-04-15"
  }
];

// Hiển thị icon dựa vào loại tài liệu
const getFileIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'pdf':
      return <FileText className="h-6 w-6 text-red-500" />;
    case 'ppt':
    case 'pptx':
      return <FileText className="h-6 w-6 text-orange-500" />;
    case 'xlsx':
    case 'xls':
      return <FileText className="h-6 w-6 text-green-500" />;
    case 'docx':
    case 'doc':
      return <FileText className="h-6 w-6 text-blue-500" />;
    default:
      return <FileText className="h-6 w-6 text-gray-500" />;
  }
};

// Component hiển thị một tài liệu
const MaterialItem = ({ material }: { material: typeof salesMaterials[0] }) => {
  const handleOpen = () => {
    window.open(material.url, '_blank');
  };

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border hover:shadow-sm transition-shadow">
      <div className="mt-1 flex-shrink-0">
        {getFileIcon(material.type)}
      </div>
      <div className="flex-grow space-y-1">
        <h4 className="font-semibold">{material.title}</h4>
        <p className="text-sm text-muted-foreground">{material.description}</p>
        <p className="text-xs text-muted-foreground">Cập nhật: {new Date(material.updatedAt).toLocaleDateString('vi-VN')}</p>
      </div>
      <div className="flex-shrink-0">
        <Button variant="outline" size="sm" onClick={handleOpen}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Xem
        </Button>
      </div>
    </div>
  );
};

// Component hiển thị skeleton loading cho tài liệu
const MaterialItemSkeleton = () => (
  <div className="flex items-start gap-4 p-4 rounded-lg border">
    <Skeleton className="h-6 w-6 rounded-md" />
    <div className="flex-grow space-y-2">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-3 w-1/3" />
    </div>
    <Skeleton className="h-8 w-16 rounded-md" />
  </div>
);

// Component chính hiển thị tài liệu bán hàng
export default function KolSalesMaterials() {
  // Giả định đang tải dữ liệu
  const isLoading = false;

  return (
    <Card className="mt-8">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Tài liệu bán hàng</CardTitle>
        <CardDescription>
          Bộ tài liệu hỗ trợ bán hàng dành cho KOL/VIP
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        <div className="space-y-4">
          {isLoading ? (
            <>
              <MaterialItemSkeleton />
              <MaterialItemSkeleton />
              <MaterialItemSkeleton />
            </>
          ) : salesMaterials.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center">
              <p className="text-center text-sm text-muted-foreground">
                Chưa có tài liệu bán hàng nào.
              </p>
            </div>
          ) : (
            salesMaterials.map((material) => (
              <MaterialItem key={material.id} material={material} />
            ))
          )}
        </div>
        
        <div className="mt-4 flex justify-end">
          <Button variant="default" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Tải tất cả tài liệu
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}