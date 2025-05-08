import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { VideoData } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

// Component hiển thị một video YouTube nhỏ
const VideoItem = ({ video }: { video: VideoData }) => {
  const handlePlayVideo = () => {
    window.open(`https://www.youtube.com/watch?v=${video.youtube_id}`, '_blank');
  };

  // State để quản lý chất lượng thumbnail hiện tại
  const [currentThumbnail, setCurrentThumbnail] = useState(
    `https://img.youtube.com/vi/${video.youtube_id}/maxresdefault.jpg`
  );
  
  // State để kiểm soát nếu đã thử tất cả các chất lượng nhưng vẫn lỗi
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  
  // Danh sách chất lượng thumbnail theo thứ tự giảm dần
  const qualities = ['maxresdefault.jpg', 'sddefault.jpg', 'hqdefault.jpg', 'mqdefault.jpg', 'default.jpg'];
  
  // Xử lý khi thumbnail lỗi
  const handleThumbnailError = () => {
    // Tìm chất lượng hiện tại trong danh sách
    const currentQualityName = currentThumbnail.split('/').pop();
    const currentIndex = qualities.findIndex(q => q === currentQualityName);
    
    // Nếu còn chất lượng thấp hơn, thử tiếp
    if (currentIndex < qualities.length - 1) {
      const nextQuality = qualities[currentIndex + 1];
      setCurrentThumbnail(`https://img.youtube.com/vi/${video.youtube_id}/${nextQuality}`);
    } else {
      // Đã thử tất cả các chất lượng
      setThumbnailFailed(true);
    }
  };

  return (
    <div className="group relative flex flex-col gap-2 rounded-lg overflow-hidden border p-3 transition-all hover:shadow-md">
      <div 
        className="relative aspect-video w-full overflow-hidden rounded-md flex items-center justify-center cursor-pointer"
        onClick={handlePlayVideo}
        style={{
          backgroundImage: !thumbnailFailed ? `url(${currentThumbnail})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#1e293b', // Fallback background color
          backgroundBlendMode: thumbnailFailed ? 'normal' : 'darken'
        }}
      >
        {/* Overlay gradient luôn có để đảm bảo text đọc được */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-60"></div>
        
        {/* YouTube icon */}
        <div className="absolute left-4 top-4 z-10">
          <div className="rounded-full bg-red-600 p-2 shadow-lg">
            <Play className="h-4 w-4 text-white" fill="white" />
          </div>
        </div>

        {/* Tiêu đề luôn hiển thị rõ ràng */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-sm font-medium text-white p-2 line-clamp-2 bg-black/70 rounded backdrop-blur-sm">
            {video.title}
          </h3>
        </div>

        {/* Biểu tượng play khi hover */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="rounded-full bg-primary p-3 transform scale-90 group-hover:scale-110 transition-transform duration-200 shadow-lg">
            <Play className="h-8 w-8 text-white" fill="currentColor" />
          </div>
        </div>
        
        {/* Ảnh thumbnail ẩn để phát hiện lỗi */}
        <img 
          src={currentThumbnail}
          alt={video.title}
          className="hidden" // Hidden image to detect loading errors
          onError={handleThumbnailError}
          crossOrigin="anonymous" // Giúp tránh một số vấn đề CORS
        />
      </div>
      
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{video.views ? `${video.views.toLocaleString()} lượt xem` : ''}</p>
      </div>
      
      <Button 
        size="sm" 
        variant="secondary" 
        className="mt-1 w-full" 
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