import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, RefreshCw, Check, ShieldAlert, AlertTriangle, Video, Image as ImageIcon } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  title?: string;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Take Customer Photo',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false);
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'loading' | 'active' | 'denied' | 'no-camera' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);

  // Stop camera tracks cleanly
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Check if multiple camera devices exist (e.g. front & rear mobile cameras)
  const checkForMultipleCameras = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputCount = devices.filter((device) => device.kind === 'videoinput').length;
        setHasMultipleCameras(videoInputCount > 1);
      }
    } catch (e) {
      console.warn('Unable to enumerate media devices:', e);
    }
  };

  // Start video stream
  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    setCameraStatus('loading');
    setErrorMessage('');
    setCapturedDataUrl(null);

    // Stop existing stream first
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus('no-camera');
      setErrorMessage('Camera access is not supported by your browser. Please upload a photo instead.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setCameraStatus('active');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch((err) => console.warn('Video play error:', err));
      }
    } catch (err: any) {
      console.error('Error starting camera stream:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraStatus('denied');
        setErrorMessage('Camera access was denied. Please enable camera permissions in your browser settings or use Upload Photo.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraStatus('no-camera');
        setErrorMessage('No camera device detected on your system. Please upload a photo file instead.');
      } else {
        setCameraStatus('error');
        setErrorMessage(err.message || 'Failed to initialize camera. Please upload a photo file.');
      }
    }
  }, [stream]);

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      checkForMultipleCameras();
      startCamera(facingMode);
    } else {
      stopStream();
      setCapturedDataUrl(null);
      setCameraStatus('idle');
    }

    return () => {
      stopStream();
    };
  }, [isOpen]);

  // Re-bind stream to video tag whenever video element loads
  useEffect(() => {
    if (stream && videoRef.current && cameraStatus === 'active') {
      videoRef.current.srcObject = stream;
    }
  }, [stream, cameraStatus]);

  const handleSwitchCamera = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    startCamera(newMode);
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally if front camera for natural mirror preview
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);

    // Convert to JPG data URL with quality 0.88
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedDataUrl(dataUrl);

    // Pause stream while previewing captured photo
    stopStream();
  };

  const handleConfirmCapturedPhoto = () => {
    if (capturedDataUrl) {
      onCapture(capturedDataUrl);
      onClose();
    }
  };

  const handleRetakePhoto = () => {
    setCapturedDataUrl(null);
    startCamera(facingMode);
  };

  const handleCloseModal = () => {
    stopStream();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-950/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-gold-300/40 bg-white p-6 dark:border-gold-800/40 dark:bg-charcoal-900 shadow-2xl space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-charcoal-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold-500/20 text-gold-600 dark:text-gold-300">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-charcoal-950 dark:text-slate-100">
                {title}
              </h3>
              <p className="text-[11px] text-slate-500">Take customer photo using laptop or mobile camera</p>
            </div>
          </div>

          <button
            onClick={handleCloseModal}
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-charcoal-800 dark:text-slate-300 dark:hover:bg-charcoal-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live Video / Captured Photo Viewport */}
        <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl bg-charcoal-950 border-2 border-dashed border-gold-300/50 dark:border-gold-800/50">
          {capturedDataUrl ? (
            /* Captured Photo Preview */
            <div className="relative h-full w-full">
              <img
                src={capturedDataUrl}
                alt="Captured customer"
                className="h-full w-full object-cover"
              />
              <span className="absolute top-3 left-3 rounded-lg bg-emerald-600/90 px-2.5 py-1 text-[10px] font-bold text-white shadow-md">
                Captured Preview
              </span>
            </div>
          ) : cameraStatus === 'active' ? (
            /* Live Camera Stream */
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
          ) : cameraStatus === 'loading' ? (
            /* Camera Initializing */
            <div className="flex flex-col items-center gap-2 text-gold-400">
              <RefreshCw className="h-8 w-8 animate-spin" />
              <span className="text-xs font-semibold text-slate-300">Opening camera...</span>
            </div>
          ) : cameraStatus === 'denied' ? (
            /* Permission Denied Error */
            <div className="p-6 text-center text-slate-200 space-y-2">
              <ShieldAlert className="h-10 w-10 text-red-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">Camera Access Denied</h4>
              <p className="text-xs text-slate-300 max-w-xs mx-auto">
                {errorMessage}
              </p>
            </div>
          ) : cameraStatus === 'no-camera' ? (
            /* No Camera Found */
            <div className="p-6 text-center text-slate-200 space-y-2">
              <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">No Camera Detected</h4>
              <p className="text-xs text-slate-300 max-w-xs mx-auto">
                {errorMessage}
              </p>
            </div>
          ) : (
            /* Generic Error */
            <div className="p-6 text-center text-slate-200 space-y-2">
              <AlertTriangle className="h-10 w-10 text-red-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">Camera Error</h4>
              <p className="text-xs text-slate-300 max-w-xs mx-auto">
                {errorMessage || 'Unable to open camera.'}
              </p>
            </div>
          )}

          {/* Hidden Canvas for Frame Capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2">
          {capturedDataUrl ? (
            /* Controls after Photo Capture */
            <div className="flex w-full items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRetakePhoto}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-charcoal-700 dark:text-slate-300 dark:hover:bg-charcoal-800"
              >
                <RefreshCw className="h-4 w-4" /> Retake Photo
              </button>

              <button
                type="button"
                onClick={handleConfirmCapturedPhoto}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gold-500 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
              >
                <Check className="h-4 w-4" /> Use This Photo
              </button>
            </div>
          ) : cameraStatus === 'active' ? (
            /* Controls during Live Stream */
            <div className="flex w-full items-center justify-between gap-2">
              {hasMultipleCameras && (
                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Switch Camera
                </button>
              )}

              <button
                type="button"
                onClick={handleCapturePhoto}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gold-500 py-3 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 transition-transform active:scale-95"
              >
                <Camera className="h-5 w-5" /> Capture Customer Photo
              </button>
            </div>
          ) : (
            /* Fallback Controls if Camera Error */
            <div className="flex w-full justify-end">
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
              >
                Close & Use File Upload
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

