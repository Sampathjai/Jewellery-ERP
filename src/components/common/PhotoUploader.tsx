import React, { useState, useRef } from 'react';
import { Upload, Camera, X, RefreshCw, Trash2, CheckCircle } from 'lucide-react';
import { CameraModal } from './CameraModal';

interface PhotoUploaderProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({ label, value, onChange }) => {
  const [preview, setPreview] = useState<string | undefined>(value);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleRemove = () => {
    setPreview(undefined);
    setUploadError(null);
    onChange('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds maximum limit of 5MB.');
      return;
    }

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|png|jpg|webp)$/i)) {
      setUploadError('Please select a valid JPG or PNG image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      onChange(dataUrl);
    };
    reader.onerror = () => {
      setUploadError('Error reading image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = (dataUrl: string) => {
    setPreview(dataUrl);
    setUploadError(null);
    onChange(dataUrl);
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
        {label}
      </label>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
        title={label}
      />

      {preview ? (
        /* Selected / Captured Photo View */
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-2xl border-2 border-gold-300 bg-gold-50/30 p-4 dark:border-gold-800 dark:bg-gold-950/20">
          <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl border-2 border-white shadow-md dark:border-charcoal-800">
            <img src={preview} alt="Customer Preview" className="h-full w-full object-cover" />
            <span className="absolute bottom-1 right-1 rounded-full bg-emerald-600 p-1 text-white shadow-sm">
              <CheckCircle className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-gold-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:text-gold-300 uppercase tracking-wider">
                Photo Selected
              </span>
            </div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Customer photo ready for profile saving.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-gold-500 px-3 py-1.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
              >
                <Camera className="h-3.5 w-3.5" /> Take New Photo
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-200"
              >
                <Upload className="h-3.5 w-3.5" /> Upload Photo
              </button>

              <button
                type="button"
                onClick={handleRemove}
                className="flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State / Photo Card Upload Options */
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 dark:border-charcoal-800 dark:bg-charcoal-900 space-y-4 max-w-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold-500/20 text-gold-600 dark:text-gold-300">
                <Camera className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-charcoal-950 dark:text-slate-100">
                  Take or Upload Customer Photo
                </h4>
                <p className="text-[11px] text-slate-500">
                  JPG or PNG format • Maximum size 5MB
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                className="flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
              >
                <Camera className="h-4 w-4" /> 📷 Take Photo
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-200"
              >
                <Upload className="h-4 w-4" /> 📁 Upload Photo
              </button>
            </div>
          </div>

          {uploadError && (
            <div className="rounded-xl bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-300">
              {uploadError}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
