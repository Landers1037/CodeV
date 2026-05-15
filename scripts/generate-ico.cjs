const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(projectRoot, 'assets', 'icon.png');
const outputPath = path.join(projectRoot, 'assets', 'icon.ico');
const tempPngPath = path.join(projectRoot, 'assets', 'icon.256.png');

/**
 * 将 PNG 图标缩放为 256x256 临时文件，供 ICO 封装使用。
 */
function generateSizedPng() {
  execFileSync(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      "$ErrorActionPreference='Stop'; " +
        'Add-Type -AssemblyName System.Drawing; ' +
        `$src=[System.Drawing.Image]::FromFile('${sourcePath.replace(/\\/g, '/')}'); ` +
        '$bmp=New-Object System.Drawing.Bitmap 256,256; ' +
        '$g=[System.Drawing.Graphics]::FromImage($bmp); ' +
        '$g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic; ' +
        '$g.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::HighQuality; ' +
        '$g.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality; ' +
        '$g.Clear([System.Drawing.Color]::Transparent); ' +
        '$g.DrawImage($src,0,0,256,256); ' +
        `$bmp.Save('${tempPngPath.replace(/\\/g, '/')}',[System.Drawing.Imaging.ImageFormat]::Png); ` +
        '$g.Dispose(); $bmp.Dispose(); $src.Dispose();',
    ],
    { stdio: 'inherit' },
  );
}

/**
 * 将 PNG 数据封装为单尺寸 ICO 文件。
 * @param {Buffer} pngBuffer PNG 二进制数据
 * @returns {Buffer} ICO 二进制数据
 */
function createIcoBuffer(pngBuffer) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry.writeUInt8(0, 0);
  entry.writeUInt8(0, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(6 + 16, 12);

  return Buffer.concat([header, entry, pngBuffer]);
}

function main() {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`未找到源图标文件: ${sourcePath}`);
  }

  generateSizedPng();

  try {
    const pngBuffer = fs.readFileSync(tempPngPath);
    const icoBuffer = createIcoBuffer(pngBuffer);
    fs.writeFileSync(outputPath, icoBuffer);
    console.log(`ICO 已生成: ${outputPath}`);
  } finally {
    if (fs.existsSync(tempPngPath)) {
      fs.unlinkSync(tempPngPath);
    }
  }
}

main();
