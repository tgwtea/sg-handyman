// Same limit as the upload middleware in server.js
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// every JPG and PNG file starts with these bytes, so a renamed file of another type is rejected
const JPEG_START = [0xff, 0xd8, 0xff];
const PNG_START = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function startsWith(data, bytes) {
  return bytes.every((byte, index) => data[index] === byte);
}

// Checks the optional image that express-fileupload put in files[field].
// Returns { error, image }; image is null when no file was sent.
export function getUploadedImage(files, field) {
  const file = files?.[field];
  if (!file) {
    return { error: '', image: null };
  }

  if (Array.isArray(file)) {
    return { error: 'You can attach only 1 image', image: null };
  }

  if (!Buffer.isBuffer(file.data) || file.size > MAX_IMAGE_BYTES) {
    return { error: 'Image must be 5 MB or smaller', image: null };
  }

  const isJpeg = file.mimetype === 'image/jpeg' && startsWith(file.data, JPEG_START);
  const isPng = file.mimetype === 'image/png' && startsWith(file.data, PNG_START);
  if (!isJpeg && !isPng) {
    return { error: 'Only JPG and PNG images are allowed', image: null };
  }

  return { error: '', image: { name: file.name, data: file.data, mimetype: file.mimetype } };
}
