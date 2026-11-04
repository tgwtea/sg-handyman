import test from 'node:test';
import assert from 'node:assert/strict';
import { getUploadedImage } from '../utils/image-upload.js';

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

function upload(data, mimetype, size = data.length) {
  return { image: { name: 'photo', data, mimetype, size } };
}

test('no file is allowed and returns no image', () => {
  assert.deepEqual(getUploadedImage(undefined, 'image'), { error: '', image: null });
  assert.deepEqual(getUploadedImage({}, 'image'), { error: '', image: null });
});

test('real JPG and PNG files are accepted', () => {
  assert.equal(getUploadedImage(upload(jpeg, 'image/jpeg'), 'image').image.mimetype, 'image/jpeg');
  assert.equal(getUploadedImage(upload(png, 'image/png'), 'image').image.data, png);
});

test('renamed files, other types, large files and several files are rejected', () => {
  assert.notEqual(getUploadedImage(upload(Buffer.from('not an image'), 'image/png'), 'image').error, '');
  assert.notEqual(getUploadedImage(upload(png, 'image/jpeg'), 'image').error, '');
  assert.notEqual(getUploadedImage(upload(Buffer.from('GIF89a'), 'image/gif'), 'image').error, '');
  assert.notEqual(getUploadedImage(upload(png, 'image/png', 5 * 1024 * 1024 + 1), 'image').error, '');
  assert.notEqual(getUploadedImage({ image: [upload(png, 'image/png').image, upload(png, 'image/png').image] }, 'image').error, '');
});
