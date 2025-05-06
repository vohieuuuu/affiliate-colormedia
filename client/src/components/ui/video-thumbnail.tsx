import { Play } from "lucide-react";
import { useState } from "react";

interface VideoThumbnailProps {
  title: string;
  youtubeId: string;
  onPlay: () => void;
  views?: number;
}

export function VideoThumbnail({ title, youtubeId, onPlay, views }: VideoThumbnailProps) {
  // Sử dụng state để kiểm soát hiển thị
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div className="group relative flex flex-col gap-2 rounded-lg overflow-hidden border p-3 transition-all hover:shadow-md">
      <div 
        className="relative aspect-video w-full overflow-hidden rounded-md bg-gray-200 dark:bg-gray-800 flex items-center justify-center"
        onClick={onPlay}
      >
        {/* Hình đại diện video */}
        {!imageError && (
          <img
            src={`https://img.youtube.com/vi/${youtubeId}/default.jpg`}
            alt={title}
            className={`absolute inset-0 h-full w-full object-cover transition-transform duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'} ${!imageError && 'group-hover:scale-105'}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            loading="lazy"
          />
        )}

        {/* Overlay chính */}
        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-3 text-center">
          <div className="mb-2 rounded-full bg-primary/90 p-3 transform transition-transform duration-200 group-hover:scale-110">
            <Play className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-sm font-medium text-white shadow-sm line-clamp-3 px-2 py-1 rounded bg-black/40">
            {title}
          </h3>
        </div>
      </div>

      {/* Phần thông tin video */}
      <div className="flex flex-col space-y-1">
        <h4 className="text-sm font-semibold line-clamp-2">{title}</h4>
        {views !== undefined && (
          <p className="text-xs text-muted-foreground">{views.toLocaleString()} lượt xem</p>
        )}
      </div>
    </div>
  );
}
