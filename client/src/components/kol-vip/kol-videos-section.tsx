import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { VideoData } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

// Component hiển thị một video YouTube nhỏ
const VideoItem = ({ video }: { video: VideoData }) => {
  const handlePlayVideo = () => {
    window.open(`https://www.youtube.com/watch?v=${video.youtube_id}`, '_blank');
  };

  return (
    <div className="group relative flex flex-col gap-2 rounded-lg overflow-hidden border p-3 transition-all hover:shadow-md">
      <div className="relative aspect-video w-full overflow-hidden rounded-md">
        <img 
          src={`https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`} 
          alt={video.title}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          onError={(e) => {
            // Nếu ảnh lỗi, thử sử dụng một định dạng khác
            const target = e.target as HTMLImageElement;
            if (target.src.includes('hqdefault.jpg')) {
              target.src = `https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`;
            } else if (target.src.includes('mqdefault.jpg')) {
              target.src = `https://img.youtube.com/vi/${video.youtube_id}/default.jpg`;
            }
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <div className="rounded-full bg-primary/80 p-2">
            <Play className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
      <div className="flex flex-col space-y-1">
        <h4 className="text-sm font-semibold line-clamp-2">{video.title}</h4>
        <p className="text-xs text-muted-foreground">{video.views ? `${video.views.toLocaleString()} lượt xem` : ''}</p>
      </div>
      <Button 
        size="sm" 
        variant="secondary" 
        className="mt-auto w-full" 
        onClick={handlePlayVideo}
      >
        Xem video
      </Button>
    </div>
  );
};

// Component hiển thị loading cho video
const VideoItemSkeleton = () => (
  <div className="flex flex-col gap-2 rounded-lg border p-3">
    <Skeleton className="aspect-video w-full rounded-md" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-3 w-1/2" />
    <Skeleton className="h-8 w-full mt-auto" />
  </div>
);

// Component chính hiển thị danh sách videos
export default function KolVideosSection() {
  const { data, isLoading, error } = useQuery<{ status: string; data: VideoData[] }>({
    queryKey: ['/api/videos'],
    retry: 1,
    staleTime: 30 * 60 * 1000, // 30 phút, vì videos thường không thay đổi thường xuyên
    refetchOnWindowFocus: false, // không cần refetch khi focus lại tab 
  });

  const videos = data?.data || [];

  return (
    <Card className="mt-8 bg-transparent border-none shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Video ColorMedia cho KOL/VIP</CardTitle>
        <CardDescription>
          Tư liệu video và hướng dẫn chuyên biệt dành cho KOL/VIP
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        <ScrollArea className="h-[330px] pr-4">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <VideoItemSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="flex h-[200px] items-center justify-center">
              <p className="text-center text-sm text-muted-foreground">
                Không thể tải video. Vui lòng thử lại sau.
              </p>
            </div>
          ) : videos.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center">
              <p className="text-center text-sm text-muted-foreground">
                Chưa có video nào.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {videos.map((video) => (
                <VideoItem key={video.id} video={video} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}