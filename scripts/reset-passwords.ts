/**
 * Script đặt lại mật khẩu cho các tài khoản người dùng
 * 
 * Chạy: tsx scripts/reset-passwords.ts
 */

import { eq } from "drizzle-orm";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { hashPassword } from "../server/auth";

async function resetPasswords() {
  try {
    // Mật khẩu mới
    const newPassword = "color1234@";
    const hashedPassword = await hashPassword(newPassword);
    
    // Đặt lại mật khẩu cho tài khoản hoangdung@colormedia.vn
    const updateHoangDung = await db.update(users)
      .set({ 
        password: hashedPassword,
        is_first_login: 1 // Để yêu cầu người dùng đổi mật khẩu khi đăng nhập
      })
      .where(eq(users.username, "hoangdung@colormedia.vn"))
      .returning({ id: users.id, username: users.username });
    
    console.log("Đã đặt lại mật khẩu cho:", updateHoangDung);
    
    // Đặt lại mật khẩu cho tài khoản contact@colormedia.vn
    const updateContact = await db.update(users)
      .set({ 
        password: hashedPassword,
        is_first_login: 1 // Để yêu cầu người dùng đổi mật khẩu khi đăng nhập
      })
      .where(eq(users.username, "contact@colormedia.vn"))
      .returning({ id: users.id, username: users.username });
    
    console.log("Đã đặt lại mật khẩu cho:", updateContact);
    
    console.log("\nĐã hoàn tất việc đặt lại mật khẩu!");
    console.log("Mật khẩu mới: color1234@");
    console.log("Yêu cầu đổi mật khẩu khi đăng nhập lần đầu: Đã bật");
    
  } catch (error) {
    console.error("Lỗi khi đặt lại mật khẩu:", error);
  } finally {
    process.exit(0);
  }
}

resetPasswords();
