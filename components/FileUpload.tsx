
import React, { useCallback, useRef } from 'react';
import { UploadIcon } from './Icons';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}

/**
 * A component for handling file uploads via both drag-and-drop and a standard file input.
 * It provides visual feedback for drag events and displays the name of the selected file.
 * @param {FileUploadProps} props - The component's props.
 * @returns {React.FC} The rendered file upload component.
 */
export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, selectedFile }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handles the file selection when a user uses the file input dialog.
   * @param {React.ChangeEvent<HTMLInputElement>} event - The file input change event.
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onFileSelect(event.target.files[0]);
    }
  };

  /**
   * Handles the drag-over event to provide visual feedback.
   * Prevents the browser's default behavior and adds a highlight style.
   * @param {React.DragEvent<HTMLLabelElement>} event - The drag event.
   */
  const handleDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.currentTarget.classList.add('border-indigo-400');
  }, []);
  
  /**
   * Handles the drag-leave event to remove visual feedback.
   * @param {React.DragEvent<HTMLLabelElement>} event - The drag event.
   */
  const handleDragLeave = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.currentTarget.classList.remove('border-indigo-400');
  }, []);

  /**
   * Handles the drop event, validates the file type, and passes the file to the parent.
   * @param {React.DragEvent<HTMLLabelElement>} event - The drop event.
   */
  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.currentTarget.classList.remove('border-indigo-400');
      if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      const file = event.dataTransfer.files[0];
      // Basic validation to ensure the dropped file is an ePub or ZIP.
      if (file.name.toLowerCase().endsWith('.epub') || file.name.toLowerCase().endsWith('.zip') || file.type === 'application/epub+zip' || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
        onFileSelect(file);
      } else {
        alert('Please drop an .epub or .zip file.');
      }
    }
  }, [onFileSelect]);
  
  /**
   * Programmatically clicks the hidden file input when the label area is clicked.
   * This provides a better user experience than a standard file input button.
   */
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className="flex justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-indigo-400 focus:outline-none"
      >
        <span className="flex items-center space-x-2">
          <UploadIcon />
          <span className="font-medium text-gray-600">
            {selectedFile ? selectedFile.name : 'Drop .epub or .zip file here, or click to select'}
          </span>
        </span>
        <input
          ref={fileInputRef}
          type="file"
          id="epub-upload"
          name="epub-upload"
          accept=".epub,application/epub+zip,.zip,application/zip,application/x-zip-compressed"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>
    </div>
  );
};
