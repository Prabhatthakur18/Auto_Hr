const DEFAULT_MAX_BYTES = 950_000;
const DEFAULT_MAX_DIMENSION = 1600;
const DEBUG_PREFIX = '[imageCompression]';

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    console.log(`${DEBUG_PREFIX} loadImage:start`, {
      name: file.name,
      type: file.type,
      size: file.size,
      objectUrl,
    });

    image.onload = () => {
      console.log(`${DEBUG_PREFIX} loadImage:success`, {
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      });
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      console.error(`${DEBUG_PREFIX} loadImage:error`, {
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

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Unable to compress image'));
        return;
      }
      resolve(blob);
    }, mimeType, quality);
  });
}

export async function compressAvatarImage(
  file: File,
  maxBytes = DEFAULT_MAX_BYTES,
  maxDimension = DEFAULT_MAX_DIMENSION
) {
  console.log(`${DEBUG_PREFIX} compress:start`, {
    name: file.name,
    type: file.type,
    size: file.size,
    maxBytes,
    maxDimension,
  });

  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file');
  }

  const image = await loadImage(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Image compression is not supported in this browser');
  }

  const mimeType = 'image/jpeg';
  let width = image.naturalWidth || image.width;
  let height = image.naturalHeight || image.height;

  if (width > maxDimension || height > maxDimension) {
    const scale = Math.min(maxDimension / width, maxDimension / height);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
    console.log(`${DEBUG_PREFIX} compress:resize-initial`, {
      scale,
      width,
      height,
    });
  }

  const draw = () => {
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
  };

  let quality = 0.82;
  let blob: Blob;

  do {
    draw();
    blob = await canvasToBlob(canvas, mimeType, quality);
    console.log(`${DEBUG_PREFIX} compress:iteration`, {
      blobSize: blob.size,
      quality,
      width,
      height,
    });

    if (blob.size <= maxBytes) {
      break;
    }

    if (quality > 0.55) {
      quality = Math.max(0.55, quality - 0.12);
    } else {
      const scale = Math.sqrt(maxBytes / blob.size);
      width = Math.max(1, Math.round(width * Math.min(0.9, scale)));
      height = Math.max(1, Math.round(height * Math.min(0.9, scale)));
      quality = 0.78;
      console.log(`${DEBUG_PREFIX} compress:resize-loop`, {
        scale,
        width,
        height,
        quality,
      });
    }
  } while (blob.size > maxBytes);

  const safeName = file.name.replace(/\.[^.]+$/, '') || 'avatar';
  const compressed = new File([blob], `${safeName}.jpg`, { type: mimeType });
  console.log(`${DEBUG_PREFIX} compress:done`, {
    name: compressed.name,
    type: compressed.type,
    size: compressed.size,
  });
  return compressed;
}

export async function compressDocumentImage(file: File) {
  return compressAvatarImage(file, 1_800_000, 2200);
}
