import React, { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, RotateCcw, X, RefreshCw, Check } from 'lucide-react';
import { EmployeeAvatar } from './EmployeeAvatar';

interface AvatarUploadPickerProps {
  name: string;
  avatar?: string | null;
  gender?: string | null;
  disabled?: boolean;
  loading?: boolean;
  status?: string | null;
  compact?: boolean;
  onSelect: (file: File) => Promise<void> | void;
  onClear?: () => void;
}

interface CropSource {
  file: File;
  image: HTMLImageElement;
  previewUrl: string;
}

const buttonClass =
  'inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors';
const CROP_STAGE_SIZE = 280;
const CROP_OUTPUT_SIZE = 1024;
const DEBUG_PREFIX = '[AvatarUploadPicker]';

function debugLog(message: string, data?: unknown) {
  console.log(`${DEBUG_PREFIX} ${message}`, data ?? '');
}

function debugError(message: string, error?: unknown) {
  console.error(`${DEBUG_PREFIX} ${message}`, error ?? '');
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    debugLog('loadImage:start', {
      name: file.name,
      type: file.type,
      size: file.size,
      objectUrl,
    });

    image.onload = () => {
      debugLog('loadImage:success', {
        name: file.name,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      });
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      debugError('loadImage:error', {
        name: file.name,
        type: file.type,
        size: file.size,
      });
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to read selected image'));
    };

    image.src = objectUrl;
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export const AvatarUploadPicker: React.FC<AvatarUploadPickerProps> = ({
  name,
  avatar,
  gender,
  disabled = false,
  loading = false,
  status,
  compact = false,
  onSelect,
  onClear,
}) => {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cropStageRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ pointerId: number; startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const [cropSource, setCropSource] = useState<CropSource | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropError, setCropError] = useState<string | null>(null);
  const [cropping, setCropping] = useState(false);

  const stopCamera = () => {
    debugLog('camera:stop', {
      hadStream: !!streamRef.current,
      tracks: streamRef.current?.getTracks().map(track => ({
        kind: track.kind,
        label: track.label,
        readyState: track.readyState,
      })),
    });
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const closeCropper = () => {
    debugLog('cropper:close', {
      hadSource: !!cropSource,
      previewUrl: cropSource?.previewUrl,
      cropZoom,
      cropOffset,
      cropError,
    });
    setCropOpen(false);
    setCropError(null);
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    setCropSource(null);
  };

  const openCropper = async (file: File) => {
    debugLog('cropper:open:start', {
      name: file.name,
      type: file.type,
      size: file.size,
    });
    setCropError(null);
    const image = await loadImage(file);
    const previewUrl = URL.createObjectURL(file);
    debugLog('cropper:open:source-ready', {
      previewUrl,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });
    setCropSource({ file, image, previewUrl });
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    setCropOpen(true);
  };

  useEffect(() => {
    if (!cameraOpen) {
      stopCamera();
      return;
    }

    let cancelled = false;

    const startCamera = async () => {
      debugLog('camera:start', {
        hasMediaDevices: !!navigator.mediaDevices,
        hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia,
        locationProtocol: window.location.protocol,
        userAgent: navigator.userAgent,
      });
      setCameraError(null);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera access is not available in this browser.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });

        if (cancelled) {
          debugLog('camera:start:cancelled-after-stream');
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        debugLog('camera:stream-ready', {
          tracks: stream.getTracks().map(track => ({
            kind: track.kind,
            label: track.label,
            enabled: track.enabled,
            readyState: track.readyState,
          })),
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          debugLog('camera:video-play', {
            videoWidth: videoRef.current.videoWidth,
            videoHeight: videoRef.current.videoHeight,
            readyState: videoRef.current.readyState,
          });
        }
      } catch (err) {
        debugError('camera:start:error', err);
        setCameraError('Camera access is not available in this browser.');
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [cameraOpen]);

  useEffect(() => {
    return () => {
      if (cropSource) {
        debugLog('cropper:revoke-preview-url', cropSource.previewUrl);
        URL.revokeObjectURL(cropSource.previewUrl);
      }
    };
  }, [cropSource]);

  const handleSourceFile = async (file: File | undefined, input: HTMLInputElement | null) => {
    debugLog('gallery:file-change', {
      hasFile: !!file,
      inputValue: input?.value,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
    });
    if (!file) return;
    try {
      await openCropper(file);
    } catch (err: any) {
      debugError('gallery:open-cropper:error', err);
      setCropError(err.message || 'Unable to open image');
      setCropOpen(true);
    } finally {
      if (input) {
        input.value = '';
      }
    }
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    debugLog('camera:capture:click', {
      hasVideo: !!video,
      videoWidth: video?.videoWidth,
      videoHeight: video?.videoHeight,
      readyState: video?.readyState,
      cameraError,
    });
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError('Camera is still starting up. Please try again in a moment.');
      return;
    }

    setCapturing(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      debugLog('camera:capture:canvas-created', {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
      });
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Camera capture is not supported in this browser');
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (!result) {
            reject(new Error('Unable to capture photo'));
            return;
          }
          resolve(result);
        }, 'image/jpeg', 0.92);
      });

      debugLog('camera:capture:blob-ready', {
        blobType: blob.type,
        blobSize: blob.size,
      });
      stopCamera();
      setCameraOpen(false);
      await openCropper(new File([blob], 'camera-avatar.jpg', { type: 'image/jpeg' }));
    } catch (err: any) {
      debugError('camera:capture:error', err);
      setCameraError(err.message || 'Unable to capture photo');
    } finally {
      setCapturing(false);
    }
  };

  const restartCamera = () => {
    debugLog('camera:restart');
    stopCamera();
    setCameraOpen(false);
    window.setTimeout(() => setCameraOpen(true), 50);
  };

  const clampOffsetForState = (nextZoom = cropZoom, nextSource = cropSource) => {
    if (!nextSource) return { x: 0, y: 0 };
    const baseScale = Math.max(
      CROP_STAGE_SIZE / nextSource.image.naturalWidth,
      CROP_STAGE_SIZE / nextSource.image.naturalHeight
    );
    const renderWidth = nextSource.image.naturalWidth * baseScale * nextZoom;
    const renderHeight = nextSource.image.naturalHeight * baseScale * nextZoom;
    const maxX = Math.max(0, (renderWidth - CROP_STAGE_SIZE) / 2);
    const maxY = Math.max(0, (renderHeight - CROP_STAGE_SIZE) / 2);
    return {
      x: clamp(cropOffset.x, -maxX, maxX),
      y: clamp(cropOffset.y, -maxY, maxY),
    };
  };

  useEffect(() => {
    if (!cropSource) return;
    setCropOffset(clampOffsetForState());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropZoom, cropSource]);

  const applyCrop = async () => {
    debugLog('crop:apply:click', {
      hasCropSource: !!cropSource,
      cropZoom,
      cropOffset,
    });
    if (!cropSource) return;

    const stage = cropStageRef.current;
    if (!stage) {
      setCropError('Crop area is not ready yet');
      return;
    }

    setCropping(true);
    setCropError(null);
    try {
      const stageSize = stage.clientWidth || CROP_STAGE_SIZE;
      const baseScale = Math.max(
        stageSize / cropSource.image.naturalWidth,
        stageSize / cropSource.image.naturalHeight
      );
      const renderScale = baseScale * cropZoom;
      const renderWidth = cropSource.image.naturalWidth * renderScale;
      const renderHeight = cropSource.image.naturalHeight * renderScale;
      const clamped = clampOffsetForState();
      const left = stageSize / 2 - renderWidth / 2 + clamped.x;
      const top = stageSize / 2 - renderHeight / 2 + clamped.y;

      debugLog('crop:apply:geometry', {
        stageClientWidth: stage.clientWidth,
        stageClientHeight: stage.clientHeight,
        stageSize,
        sourceWidth: cropSource.image.naturalWidth,
        sourceHeight: cropSource.image.naturalHeight,
        baseScale,
        renderScale,
        renderWidth,
        renderHeight,
        clamped,
        left,
        top,
      });

      const canvas = document.createElement('canvas');
      canvas.width = CROP_OUTPUT_SIZE;
      canvas.height = CROP_OUTPUT_SIZE;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Image cropping is not supported in this browser');
      }

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(
        cropSource.image,
        (0 - left) / renderScale,
        (0 - top) / renderScale,
        stageSize / renderScale,
        stageSize / renderScale,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (!result) {
            reject(new Error('Unable to crop image'));
            return;
          }
          resolve(result);
        }, 'image/jpeg', 0.94);
      });

      const croppedFile = new File([blob], 'avatar-cropped.jpg', { type: 'image/jpeg' });
      debugLog('crop:apply:cropped-file-ready', {
        name: croppedFile.name,
        type: croppedFile.type,
        size: croppedFile.size,
      });
      await onSelect(croppedFile);
      debugLog('crop:apply:onSelect-complete');
      closeCropper();
    } catch (err: any) {
      debugError('crop:apply:error', err);
      setCropError(err.message || 'Unable to crop image');
    } finally {
      setCropping(false);
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cropSource) return;
    dragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: cropOffset.x,
      offsetY: cropOffset.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !cropSource) return;

    const baseScale = Math.max(
      CROP_STAGE_SIZE / cropSource.image.naturalWidth,
      CROP_STAGE_SIZE / cropSource.image.naturalHeight
    );
    const renderScale = baseScale * cropZoom;
    const renderWidth = cropSource.image.naturalWidth * renderScale;
    const renderHeight = cropSource.image.naturalHeight * renderScale;
    const maxX = Math.max(0, (renderWidth - CROP_STAGE_SIZE) / 2);
    const maxY = Math.max(0, (renderHeight - CROP_STAGE_SIZE) / 2);

    setCropOffset({
      x: clamp(drag.offsetX + (e.clientX - drag.startX), -maxX, maxX),
      y: clamp(drag.offsetY + (e.clientY - drag.startY), -maxY, maxY),
    });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.pointerId === e.pointerId) {
      dragStateRef.current = null;
    }
  };

  const cropImageStyle = cropSource
    ? ({
        transform: `translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropZoom})`,
        transformOrigin: 'center center',
      } as React.CSSProperties)
    : undefined;

  const currentStatus =
    status || (avatar ? 'Current photo active' : gender ? `${gender} clipart will be used until a photo is added` : 'Initials shown until a photo is added');

  return (
    <div className={`rounded-2xl border border-orange-100/60 bg-orange-50/25 ${compact ? 'p-3 flex flex-col gap-3' : 'p-4 flex flex-col sm:flex-row sm:items-center gap-4'}`}>
      {!compact && (
        <EmployeeAvatar
          name={name}
          avatar={avatar}
          gender={gender}
          size="w-16 h-16"
          shape="rounded"
          className="shadow-md shadow-orange-200/40"
        />
      )}

      <div className="min-w-0 flex-1">
        {!compact && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Profile Photo</p>
            <p className="text-xs font-medium text-slate-500 mt-1">{currentStatus}</p>
          </>
        )}

        <div className={`flex flex-wrap gap-2 ${compact ? '' : 'mt-3'}`}>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={disabled || loading}
            className={`${buttonClass} bg-white border-orange-100 text-slate-700 hover:bg-orange-50 hover:text-[#f46617] disabled:opacity-60`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            Gallery
          </button>
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            disabled={disabled || loading}
            className={`${buttonClass} bg-white border-orange-100 text-slate-700 hover:bg-orange-50 hover:text-[#f46617] disabled:opacity-60`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            Camera
          </button>
          {onClear && avatar && (
            <button
              type="button"
              onClick={onClear}
              disabled={disabled || loading}
              className={`${buttonClass} bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-60`}
            >
              <RotateCcw className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {compact && <p className="text-[10px] font-medium text-slate-500 mt-2">{currentStatus}</p>}
      </div>

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleSourceFile(e.target.files?.[0], e.currentTarget)}
      />

      {cameraOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !capturing && setCameraOpen(false)} />
          <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-orange-100/60 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-orange-100/60 px-5 py-4">
              <div>
                <p className="text-sm font-black text-slate-800">Take Photo</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Use your camera</p>
              </div>
              <button
                type="button"
                onClick={() => setCameraOpen(false)}
                disabled={capturing}
                className="rounded-xl p-2 text-slate-400 hover:bg-orange-50 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950">
              <video
                ref={videoRef}
                className="aspect-[4/5] w-full object-cover"
                playsInline
                muted
                autoPlay
              />
            </div>

            <div className="space-y-3 px-5 py-4">
              {cameraError && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                  {cameraError}
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setCameraOpen(false);
                  }}
                  disabled={capturing}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={restartCamera}
                    disabled={capturing}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={() => void capturePhoto()}
                    disabled={capturing || !!cameraError}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-[#f46617] px-4 py-2 text-xs font-bold text-white hover:brightness-95 disabled:opacity-60"
                  >
                    {capturing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Capture
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {cropOpen && cropSource && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/65 backdrop-blur-sm" onClick={() => !cropping && closeCropper()} />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-[30px] border border-orange-100/60 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-orange-100/60 px-6 py-4">
              <div>
                <p className="text-sm font-black text-slate-800">Crop Photo</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Drag to position, zoom to fit</p>
              </div>
              <button
                type="button"
                onClick={() => !cropping && closeCropper()}
                disabled={cropping}
                className="rounded-xl p-2 text-slate-400 hover:bg-orange-50 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-4">
                <div
                  ref={cropStageRef}
                  className="relative mx-auto h-[280px] w-[280px] overflow-hidden rounded-[28px] bg-slate-950 select-none touch-none border border-slate-800"
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerLeave={onPointerUp}
                >
                  <img
                    src={cropSource.previewUrl}
                    alt="Crop preview"
                    draggable={false}
                    className="absolute left-0 top-0 h-full w-full select-none object-cover opacity-95"
                    style={cropImageStyle}
                    onLoad={(event) => debugLog('crop:preview-img:onLoad', {
                      src: cropSource.previewUrl,
                      naturalWidth: event.currentTarget.naturalWidth,
                      naturalHeight: event.currentTarget.naturalHeight,
                      renderedWidth: event.currentTarget.clientWidth,
                      renderedHeight: event.currentTarget.clientHeight,
                    })}
                    onError={(event) => debugError('crop:preview-img:onError', {
                      src: event.currentTarget.src,
                      cropSource,
                    })}
                  />
                  <div className="absolute inset-0 ring-1 ring-inset ring-white/20" />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-[65%] w-[65%] rounded-[22px] border border-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.28)]" />
                  </div>
                </div>

                {cropError && (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                    {cropError}
                  </div>
                )}
              </div>

              <div className="space-y-4 rounded-[24px] border border-orange-100/60 bg-orange-50/20 p-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Zoom</p>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={cropZoom}
                    onChange={e => {
                      const next = Number(e.target.value);
                      setCropZoom(next);
                      setCropOffset(clampOffsetForState(next));
                    }}
                    className="w-full accent-[#f46617]"
                  />
                  <div className="mt-1 flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Fit</span>
                    <span>Zoom</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCropZoom(1);
                    setCropOffset({ x: 0, y: 0 });
                  }}
                  disabled={cropping}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset Crop
                </button>

                <div className="rounded-2xl border border-orange-100 bg-white px-4 py-3 text-xs text-slate-500 leading-relaxed">
                  Drag the photo to center the face, then confirm to upload the cropped version.
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => !cropping && closeCropper()}
                    disabled={cropping}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void applyCrop()}
                    disabled={cropping}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-[#f46617] px-4 py-2.5 text-xs font-bold text-white hover:brightness-95 disabled:opacity-60"
                  >
                    {cropping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {cropping ? 'Saving...' : 'Use Photo'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvatarUploadPicker;
