// FFmpeg.wasm single-thread manager

class FFmpegManager {
    constructor() {
        this.ffmpeg = null;
        this.isLoaded = false;
        this.isLoading = false;
        
        // Use jsDelivr for CORS-friendly CDN
        this.corePath = 'https://cdn.jsdelivr.net/npm/@flemist/ffmpeg.wasm-core-st@0.10.0/dist/ffmpeg-core.js';
    }

    isFFmpegLoaded() {
        return this.isLoaded && this.ffmpeg !== null;
    }

    getFFmpegInstance() {
        return this.ffmpeg;
    }

    async loadFFmpeg(onProgress) {
        if (this.isLoaded && this.ffmpeg) {
            return this.ffmpeg;
        }

        if (this.isLoading) {
            // Wait for existing load to complete
            while (this.isLoading) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return this.ffmpeg;
        }

        this.isLoading = true;

        try {
            if (onProgress) {
                onProgress({ phase: 'Initializing FFmpeg...', percentage: 5 });
            }

            // Check if createFFmpeg is available
            if (typeof createFFmpeg !== 'function') {
                throw new Error('FFmpeg library not loaded. Please refresh the page.');
            }

            if (onProgress) {
                onProgress({ phase: 'Creating FFmpeg instance...', percentage: 10 });
            }

            // Create FFmpeg instance with jsDelivr core path for CORS compatibility
            this.ffmpeg = createFFmpeg({
                log: false,
                corePath: this.corePath,
                progress: ({ ratio }) => {
                    if (onProgress && ratio >= 0) {
                        const percentage = Math.min(95, Math.round(10 + ratio * 85));
                        onProgress({
                            phase: ratio < 1 ? 'Loading FFmpeg core (~25MB)...' : 'Finalizing...',
                            percentage: percentage
                        });
                    }
                }
            });

            if (onProgress) {
                onProgress({ phase: 'Loading FFmpeg core (~25MB)...', percentage: 15 });
            }

            // Load FFmpeg - this downloads the WASM file
            await this.ffmpeg.load();

            this.isLoaded = true;
            this.isLoading = false;

            if (onProgress) {
                onProgress({ phase: 'FFmpeg ready!', percentage: 100 });
            }

            console.log('FFmpeg loaded successfully');
            return this.ffmpeg;

        } catch (error) {
            this.isLoading = false;
            this.isLoaded = false;
            console.error('Failed to load FFmpeg:', error);
            throw new Error(`Failed to load FFmpeg: ${error.message || 'Unknown error'}`);
        }
    }

    async unload() {
        if (this.ffmpeg) {
            try {
                this.ffmpeg.exit();
            } catch (e) {
                // Ignore exit errors
            }
            this.ffmpeg = null;
            this.isLoaded = false;
        }
    }
}

// Create global instance
const ffmpegManager = new FFmpegManager();
