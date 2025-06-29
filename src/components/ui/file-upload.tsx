"use client";

import * as React from "react";
import { Upload, X, File, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface FileUploadProps {
  id?: string;
  value?: File[];
  onChange?: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
  dragActiveClassName?: string;
  children?: React.ReactNode;
  onError?: (error: string) => void;
}

const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  (
    {
      id,
      value = [],
      onChange,
      accept,
      multiple = false,
      maxSize = 5 * 1024 * 1024, // 5MB default
      maxFiles = multiple ? 10 : 1,
      disabled = false,
      className,
      dragActiveClassName,
      children,
      onError,
      ...props
    },
    ref
  ) => {
    const [isDragActive, setIsDragActive] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const validateFile = (file: File): string | null => {
      if (maxSize && file.size > maxSize) {
        return `File size must be less than ${formatFileSize(maxSize)}`;
      }

      if (accept) {
        const acceptedTypes = accept.split(",").map((type) => type.trim());
        const isAccepted = acceptedTypes.some((type) => {
          if (type.startsWith(".")) {
            return file.name.toLowerCase().endsWith(type.toLowerCase());
          }
          return file.type.match(type.replace("*", ".*"));
        });

        if (!isAccepted) {
          return `File type not accepted. Allowed types: ${accept}`;
        }
      }

      return null;
    };

    const handleFiles = (newFiles: FileList) => {
      const filesArray = Array.from(newFiles);
      const validFiles: File[] = [];

      for (const file of filesArray) {
        const error = validateFile(file);
        if (error) {
          onError?.(error);
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length === 0) return;

      let finalFiles: File[];
      if (multiple) {
        const totalFiles = value.length + validFiles.length;
        if (totalFiles > maxFiles) {
          onError?.(`Maximum ${maxFiles} files allowed`);
          finalFiles = [...value, ...validFiles].slice(0, maxFiles);
        } else {
          finalFiles = [...value, ...validFiles];
        }
      } else {
        finalFiles = [validFiles[0]];
      }

      onChange?.(finalFiles);
    };

    const handleDragEnter = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragActive(true);
      }
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        handleFiles(files);
      }
      // Reset input value to allow same file selection
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    };

    const handleClick = () => {
      if (!disabled) {
        inputRef.current?.click();
      }
    };

    const removeFile = (index: number) => {
      const newFiles = value.filter((_, i) => i !== index);
      onChange?.(newFiles);
    };

    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const getFileIcon = (file: File) => {
      if (file.type.startsWith("image/")) {
        return <ImageIcon className="h-4 w-4" />;
      }
      return <File className="h-4 w-4" />;
    };

    return (
      <div className="w-full">
        <div
          ref={ref}
          className={cn(
            "relative border-2 border-dashed border-gray-300 rounded-lg p-6 transition-colors",
            "hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
            isDragActive && "border-blue-500 bg-blue-50",
            isDragActive && dragActiveClassName,
            disabled && "opacity-50 cursor-not-allowed",
            !disabled && "cursor-pointer",
            className
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClick}
          {...props}
        >
          <input
            id={id}
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            disabled={disabled}
            onChange={handleInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          {children || (
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  {isDragActive ? (
                    "Drop files here"
                  ) : (
                    <>
                      <span className="font-semibold text-blue-600">
                        Click to upload
                      </span>
                      {" or drag and drop"}
                    </>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {accept && `Accepted types: ${accept}`}
                  {maxSize && ` • Max size: ${formatFileSize(maxSize)}`}
                  {multiple && ` • Max files: ${maxFiles}`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* File List */}
        {value.length > 0 && (
          <div className="mt-4 space-y-2">
            {value.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center space-x-3">
                  {getFileIcon(file)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  disabled={disabled}
                  className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

FileUpload.displayName = "FileUpload";

export { FileUpload };
