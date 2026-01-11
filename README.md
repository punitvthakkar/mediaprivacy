# MediaPrivacy

This is an integrated web application combining **Video to Audio Converter** and **PDF Privacy Tools** with privacy-focused local processing.

## Features

### Video to Audio Converter
- Convert video files to audio formats (MP3, WAV, M4A, OGG)
- Adjustable audio quality/bitrate
- 100% local processing using FFmpeg.wasm
- No uploads - everything runs in your browser

### PDF Tools
All the original PDF Privacy features:
- **PDF to Image**: Convert PDF pages to PNG images
- **Split PDF**: Split a PDF into multiple files
- **Merge PDF**: Combine multiple PDFs into one
- **Compress PDF**: Reduce PDF file size
- **Image to PDF**: Convert images to PDF
- **Image Resize**: Resize images
- **Image Converter**: Convert images between formats

## Files

- `index.html` - Main HTML file with integrated interface
- `styles.css` - 1984 Macintosh-inspired styling
- `app.js` - Integrated application logic combining both tools
- `converter.js` - Video conversion logic
- `ffmpeg-manager.js` - FFmpeg.wasm manager

## How to Use

1. Open `index.html` in a modern web browser
2. Choose either "Video to Audio" or "PDF Tools"
3. Follow the on-screen instructions for your chosen tool
4. All processing happens locally in your browser

## Privacy

- **No uploads**: All files are processed locally in your browser
- **No tracking**: No analytics or tracking scripts
- **No servers**: Everything runs client-side using WebAssembly

## Technical Details

- Uses FFmpeg.wasm for video conversion
- Uses PDF.js and PDF-lib for PDF operations
- Pure client-side JavaScript - no backend required
- Works offline after initial library load

## Browser Requirements

- Modern browser with WebAssembly support
- Chrome, Firefox, Safari, or Edge (latest versions)
- Sufficient RAM for large files (recommended 4GB+)

## Notes

- First video conversion will download FFmpeg (~25MB) - cached by browser
- Large files may take time to process
- File size limits depend on available browser memory
