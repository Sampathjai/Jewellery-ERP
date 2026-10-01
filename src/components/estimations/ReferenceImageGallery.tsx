import React, { useState, useRef } from 'react';
import {
  Upload,
  Camera,
  Trash2,
  Maximize2,
  X,
  FileImage,
  Tag,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from 'lucide-react';
import { EstimationReferenceImage, ReferenceImageLabel } from '@/types';
import { CameraModal } from '@/components/common/CameraModal';
import { uploadEstimationReferenceImage } from '@/lib/dataService';

const IMAGE_LABELS: ReferenceImageLabel[] = [
  'Front View',
  'Side View',
  'Close-up',
  'Design Detail',
  'Customer Photo',
  'Other',
];

interface ReferenceImageGalleryProps {
  images: EstimationReferenceImage[];
  onChange?: (images: EstimationReferenceImage[]) => void;
  readOnly?: boolean;
}

export const ReferenceImageGallery: React.FC<ReferenceImageGalleryProps> = ({
  images,
  onChange,
  readOnly = false,
}) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<EstimationReferenceImage | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !onChange) return;
    setUploading(true);
    setErrorMessage(null);

    const newImages: EstimationReferenceImage[] = [...images];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage(`File ${file.name} exceeds max limit of 10MB.`);
        continue;
      }

      // Validate type
      if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/i)) {
        setErrorMessage(`File ${file.name} is not a supported format (JPG, PNG, WEBP).`);
        continue;
      }

      try {
        const uploaded = await uploadEstimationReferenceImage(file, 'Customer Photo');
        newImages.push(uploaded);
      } catch (err: any) {
        setErrorMessage(`Failed to upload ${file.name}: ${err.message || 'Error'}`);
      }
    }

    onChange(newImages);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCameraCapture = (dataUrl: string) => {
    if (!onChange) return;
    const newImage: EstimationReferenceImage = {
      id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      image_url: dataUrl,
      file_name: `camera_capture_${Date.now()}.jpg`,
      file_type: 'image/jpeg',
      file_size: Math.round((dataUrl.length * 3) / 4),
      label: 'Customer Photo',
      notes: 'Captured via camera',
      uploaded_at: new Date().toISOString(),
    };
    onChange([...images, newImage]);
    setIsCameraOpen(false);
  };

  const handleRemoveImage = (index: number) => {
    if (!onChange) return;
    const updated = images.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  const handleLabelChange = (index: number, label: string) => {
    if (!onChange) return;
    const updated = [...images];
    updated[index] = { ...updated[index], label: label as ReferenceImageLabel };
    onChange(updated);
  };

  const handleNotesChange = (index: number, notes: string) => {
    if (!onChange) return;
    const updated = [...images];
    updated[index] = { ...updated[index], notes };
    onChange(updated);
  };

  const openZoom = (img: EstimationReferenceImage) => {
    setZoomImage(img);
    setZoomScale(1);
    setRotation(0);
  };

  const closeZoom = () => {
    setZoomImage(null);
  };

  return (
    <div className="space-y-4">
      {/* Upload Controls for staff */}
      {!readOnly && (
        <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/50 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <FileImage className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Customer Reference Jewellery Photos
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Upload photos sent by customer (Front, Side, Detail). Visual reference only; does not affect stock.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-sm disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                {uploading ? 'Uploading...' : 'Upload Photos'}
              </button>

              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 bg-white dark:bg-gray-800 hover:bg-amber-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                <Camera className="w-3.5 h-3.5" />
                Take Photo
              </button>
            </div>
          </div>

          {errorMessage && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
              {errorMessage}
            </p>
          )}
        </div>
      )}

      {/* Empty State */}
      {images.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-900/30">
          <FileImage className="w-10 h-10 text-gray-400 mx-auto mb-2 opacity-60" />
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            No customer reference design photos attached yet.
          </p>
          {!readOnly && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              Add photos to provide visual craftsmanship guidance for this estimation.
            </p>
          )}
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((img, idx) => (
            <div
              key={img.id || idx}
              className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow transition-all flex flex-col"
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-square w-full bg-gray-100 dark:bg-gray-900 overflow-hidden flex items-center justify-center">
                <img
                  src={img.image_url}
                  alt={img.label || 'Reference Design'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 cursor-pointer"
                  onClick={() => openZoom(img)}
                />

                {/* Overlay actions */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => openZoom(img)}
                    className="p-1 text-white hover:text-amber-400 transition-colors"
                    title="Zoom in"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="p-1 text-white hover:text-red-400 transition-colors"
                      title="Remove image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Badge Label */}
                <span className="absolute bottom-2 left-2 px-2 py-0.5 text-[10px] font-semibold bg-black/70 text-amber-300 rounded backdrop-blur-sm">
                  {img.label || 'Reference'}
                </span>
              </div>

              {/* Editable Label & Notes (if not readOnly) */}
              {!readOnly ? (
                <div className="p-2.5 space-y-2 flex-1 flex flex-col justify-between bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <Tag className="w-3 h-3" /> Label
                    </label>
                    <select
                      value={img.label || 'Customer Photo'}
                      onChange={(e) => handleLabelChange(idx, e.target.value)}
                      className="w-full text-xs py-1 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      {IMAGE_LABELS.map((lbl) => (
                        <option key={lbl} value={lbl}>
                          {lbl}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <input
                      type="text"
                      placeholder="Note (e.g. Floral pendant)"
                      value={img.notes || ''}
                      onChange={(e) => handleNotesChange(idx, e.target.value)}
                      className="w-full text-[11px] py-1 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              ) : (
                img.notes && (
                  <div className="p-2 border-t border-gray-100 dark:border-gray-700 text-[11px] text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40">
                    {img.notes}
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
        title="Capture Reference Jewellery Photo"
      />

      {/* Lightbox / Zoom Modal */}
      {zoomImage && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4">
          {/* Header Bar */}
          <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
            <div className="text-white">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <span className="text-amber-400">{zoomImage.label || 'Reference Design'}</span>
                <span className="text-gray-400 text-xs">({zoomImage.file_name})</span>
              </h3>
              {zoomImage.notes && (
                <p className="text-xs text-gray-300 mt-0.5">{zoomImage.notes}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomScale((s) => Math.min(s + 0.3, 3))}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale((s) => Math.max(s - 0.3, 0.5))}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Rotate"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={closeZoom}
                className="p-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white transition-colors ml-2"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Interactive Image Display */}
          <div
            className="w-full h-full flex items-center justify-center overflow-hidden"
            onClick={closeZoom}
          >
            <img
              src={zoomImage.image_url}
              alt="Zoomed Reference"
              onClick={(e) => e.stopPropagation()}
              style={{
                transform: `scale(${zoomScale}) rotate(${rotation}deg)`,
                transition: 'transform 0.15s ease-out',
                maxHeight: '85vh',
                maxWidth: '90vw',
              }}
              className="object-contain rounded-lg shadow-2xl select-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};
