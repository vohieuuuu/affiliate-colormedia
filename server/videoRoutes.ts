import { Express, Request, Response } from "express";
import { storage } from "./storage";

/**
 * Đăng ký các routes quản lý video
 */
export function setupVideoRoutes(app: Express) {
  // API để lấy danh sách top videos từ YouTube
  app.get("/api/videos", async (req: Request, res: Response) => {
    try {
      // Lấy limit từ query parameters hoặc mặc định là 5
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      
      // Lấy top videos từ storage
      const videos = await storage.getTopVideos(limit);
      
      res.status(200).json({
        status: "success",
        data: videos
      });
    } catch (error) {
      console.error("Error retrieving videos:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Không thể lấy danh sách video"
        }
      });
    }
  });
  
  // API để lấy chi tiết video theo ID
  app.get("/api/videos/:id", async (req: Request, res: Response) => {
    try {
      const videoId = parseInt(req.params.id);
      
      // Lấy tất cả videos và tìm theo ID
      const videos = await storage.getTopVideos(100); // Lấy số lượng lớn để tìm kiếm
      const video = videos.find(v => v.id === videoId);
      
      if (!video) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "NOT_FOUND",
            message: "Không tìm thấy video với ID đã cho"
          }
        });
      }
      
      res.status(200).json({
        status: "success",
        data: video
      });
    } catch (error) {
      console.error("Error retrieving video:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Không thể lấy thông tin video"
        }
      });
    }
  });
  
  // API để thêm mới video (chỉ cho admin)
  app.post("/api/admin/videos", async (req: Request, res: Response) => {
    try {
      const videoData = req.body;
      
      if (!videoData.title || !videoData.youtube_id) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "VALIDATION_ERROR",
            message: "Title và YouTube ID là bắt buộc"
          }
        });
      }
      
      const newVideo = await storage.addVideo(videoData);
      
      res.status(201).json({
        status: "success",
        data: newVideo
      });
    } catch (error) {
      console.error("Error adding video:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Không thể thêm video mới"
        }
      });
    }
  });
  
  // API để cập nhật video (chỉ cho admin)
  app.put("/api/admin/videos/:id", async (req: Request, res: Response) => {
    try {
      const videoId = parseInt(req.params.id);
      const videoData = req.body;
      
      const updatedVideo = await storage.updateVideo(videoId, videoData);
      
      if (!updatedVideo) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "NOT_FOUND",
            message: "Không tìm thấy video với ID đã cho"
          }
        });
      }
      
      res.status(200).json({
        status: "success",
        data: updatedVideo
      });
    } catch (error) {
      console.error("Error updating video:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Không thể cập nhật video"
        }
      });
    }
  });
  
  // API để xóa video (chỉ cho admin)
  app.delete("/api/admin/videos/:id", async (req: Request, res: Response) => {
    try {
      const videoId = parseInt(req.params.id);
      
      const success = await storage.deleteVideo(videoId);
      
      if (!success) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "NOT_FOUND",
            message: "Không tìm thấy video với ID đã cho"
          }
        });
      }
      
      res.status(200).json({
        status: "success",
        message: "Xóa video thành công"
      });
    } catch (error) {
      console.error("Error deleting video:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Không thể xóa video"
        }
      });
    }
  });
}