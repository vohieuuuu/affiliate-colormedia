import { useState, ChangeEvent, ClipboardEvent, KeyboardEvent, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface OtpInputProps {
  length?: number;
  onComplete?: (otp: string) => void;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
}

export function OtpInput({
  length = 6,
  onComplete,
  disabled = false,
  className = "",
  inputClassName = "",
  placeholder = "•",
}: OtpInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  const focusInput = (targetIndex: number) => {
    const targetInput = inputRefs.current[targetIndex];
    if (targetInput) {
      targetInput.focus();
    }
  };

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const checkCompletion = (newOtp: string[]) => {
    const otpValue = newOtp.join("");
    if (otpValue.length === length && !newOtp.includes("") && onComplete) {
      onComplete(otpValue);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    
    // Kiểm tra nếu giá trị không phải là số
    if (value && !/^\d+$/.test(value)) {
      return;
    }

    // Lấy ký tự cuối cùng nếu paste nhiều ký tự vào một input
    const newValue = value.slice(-1);
    
    const newOtp = [...otp];
    newOtp[index] = newValue;
    setOtp(newOtp);

    // Nếu đã nhập giá trị và chưa phải input cuối, di chuyển đến input tiếp theo
    if (newValue && index < length - 1) {
      focusInput(index + 1);
    }

    checkCompletion(newOtp);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      // Nếu input hiện tại trống và nhấn Backspace, xóa giá trị input trước đó và focus vào nó
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
      focusInput(index - 1);
    } else if (e.key === "ArrowLeft" && index > 0) {
      // Di chuyển focus sang trái
      focusInput(index - 1);
    } else if (e.key === "ArrowRight" && index < length - 1) {
      // Di chuyển focus sang phải
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>, startIndex: number) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").trim();
    
    // Chỉ xử lý nếu paste toàn số
    if (!/^\d+$/.test(pastedData)) {
      return;
    }

    const pastedChars = pastedData.split("");
    const newOtp = [...otp];
    
    // Điền các ký tự được paste, tối đa bằng độ dài còn lại
    let filledIndexes = 0;
    for (let i = 0; i < Math.min(pastedChars.length, length - startIndex); i++) {
      newOtp[startIndex + i] = pastedChars[i];
      filledIndexes++;
    }
    
    setOtp(newOtp);
    
    // Di chuyển focus đến ô tiếp theo sau khi paste
    const nextIndex = Math.min(startIndex + filledIndexes, length - 1);
    focusInput(nextIndex);
    
    checkCompletion(newOtp);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {Array.from({ length }).map((_, index) => (
        <Input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={otp[index]}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={(e) => handlePaste(e, index)}
          disabled={disabled}
          className={cn(
            "w-12 h-12 text-center text-xl font-medium",
            inputClassName
          )}
          placeholder={placeholder}
          autoComplete="off"
        />
      ))}
    </div>
  );
}