// Video to audio conversion logic for FFmpeg.wasm 0.10.x

class VideoConverter {
    constructor(ffmpegManager) {
        this.ffmpegManager = ffmpegManager;
        this.currentBlobURL = null;
    }

    validateFile(file) {
        const validExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.wmv', '.flv', '.3gp', '.ogv'];
        const fileExtension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] || '';

        const isValidType = validExtensions.includes(fileExtension) || file.type.startsWith('video/');
        
        if (!isValidType) {
            return {
                valid: false,
                error: 'Unsupported file format. Please select a video file (MP4, MOV, AVI, MKV, WebM, etc).'
            };
        }

        const maxSize = 2000 * 1024 * 1024; // 2GB
        if (file.size > maxSize) {
            return {
                valid: false,
                error: 'File is too large (>2GB). Browser memory limits may cause issues.'
            };
        }

        const warnSize = 500 * 1024 * 1024; // 500MB
        if (file.size > warnSize) {
            return {
                valid: true,
                warning: `Large file detected (${this.formatFileSize(file.size)}). Conversion may take several minutes.`
            };
        }

        return { valid: true };
    }

    async convertToAudio(file, options, onProgress) {
        const ffmpeg = this.ffmpegManager.getFFmpegInstance();
        if (!ffmpeg) {
            throw new Error('FFmpeg not loaded');
        }

        const inputFileName = 'input' + this.getFileExtension(file.name);
        const outputFileName = 'output.' + options.format;

        try {
            // Clean up previous blob URL
            this.cleanup();

            // Phase 1: Reading file (0-10%)
            if (onProgress) {
                onProgress({ phase: 'Reading file...', percentage: 0 });
            }

            // Read file as Uint8Array with progress tracking
            const fileData = await this.readFileAsUint8Array(file, (progress) => {
                if (onProgress) {
                    const percentage = Math.round(progress * 10); // 0-10%
                    onProgress({ 
                        phase: 'Reading file...', 
                        percentage: percentage 
                    });
                }
            });

            // Phase 2: Loading file into FFmpeg (10-15%)
            if (onProgress) {
                onProgress({ phase: 'Loading file into FFmpeg...', percentage: 10 });
            }

            // Write to FFmpeg virtual filesystem
            // Use setTimeout to allow UI to update and show progress
            await new Promise(resolve => {
                setTimeout(() => {
                    ffmpeg.FS('writeFile', inputFileName, fileData);
                    if (onProgress) {
                        onProgress({ phase: 'Loading file into FFmpeg...', percentage: 15 });
                    }
                    resolve();
                }, 50); // Small delay to show progress
            });

            // Phase 3: Converting audio (15-85%)
            if (onProgress) {
                onProgress({ phase: 'Converting audio...', percentage: 15 });
            }

            // Track conversion progress with fallback timer
            let lastProgressRatio = 0;
            let lastProgressTime = Date.now();
            let progressUpdateCount = 0;
            const progressStartTime = Date.now();
            const estimatedDuration = this.estimateConversionTime(file.size);
            
            // Fallback: provide smooth progress updates
            // If FFmpeg doesn't report frequently, estimate based on elapsed time
            const fallbackInterval = setInterval(() => {
                if (!onProgress) return;
                
                const timeSinceLastUpdate = Date.now() - lastProgressTime;
                const elapsed = Date.now() - progressStartTime;
                
                // If no progress updates received yet, estimate based on time
                if (progressUpdateCount === 0) {
                    const estimatedProgress = Math.min(0.7, elapsed / estimatedDuration);
                    const percentage = Math.round(15 + estimatedProgress * 70);
                    onProgress({
                        phase: 'Converting audio...',
                        percentage: percentage
                    });
                } 
                // If progress hasn't updated in 3 seconds, use time-based estimation
                // but don't exceed the last reported ratio
                else if (timeSinceLastUpdate > 3000 && lastProgressRatio < 0.9) {
                    const estimatedProgress = Math.min(0.9, elapsed / estimatedDuration);
                    // Use the maximum of time-based estimate and last reported ratio
                    const safeRatio = Math.max(lastProgressRatio, estimatedProgress);
                    const percentage = Math.min(85, Math.round(15 + safeRatio * 70));
                    onProgress({
                        phase: 'Converting audio...',
                        percentage: percentage
                    });
                }
            }, 500); // Update every 500ms

            // Set up progress handler for conversion
            ffmpeg.setProgress(({ ratio }) => {
                progressUpdateCount++;
                lastProgressTime = Date.now();
                if (onProgress && ratio >= 0 && ratio <= 1) {
                    lastProgressRatio = Math.max(lastProgressRatio, ratio); // Never go backwards
                    // Map ratio (0-1) to percentage range 15-85%
                    const percentage = Math.min(85, Math.round(15 + ratio * 70));
                    onProgress({
                        phase: 'Converting audio...',
                        percentage: percentage
                    });
                }
            });

            // Build and execute FFmpeg command
            const args = this.buildFFmpegArgs(inputFileName, outputFileName, options);
            console.log('FFmpeg command:', args.join(' '));
            
            await ffmpeg.run(...args);

            // Clear fallback interval
            clearInterval(fallbackInterval);

            // Ensure we're at least at 85% after conversion completes
            if (onProgress && lastProgressRatio < 1) {
                onProgress({ phase: 'Converting audio...', percentage: 85 });
            }

            // Phase 4: Reading output (85-92%)
            if (onProgress) {
                onProgress({ phase: 'Reading output...', percentage: 85 });
            }

            // Read output file
            const data = ffmpeg.FS('readFile', outputFileName);

            if (onProgress) {
                onProgress({ phase: 'Reading output...', percentage: 92 });
            }

            // Clean up virtual filesystem
            try {
                ffmpeg.FS('unlink', inputFileName);
                ffmpeg.FS('unlink', outputFileName);
            } catch (e) {
                console.warn('Cleanup warning:', e);
            }

            // Phase 5: Creating download (92-98%)
            if (onProgress) {
                onProgress({ phase: 'Creating download...', percentage: 92 });
            }

            // Create blob and URL
            const mimeType = this.getMimeType(options.format);
            const blob = new Blob([data.buffer], { type: mimeType });
            this.currentBlobURL = URL.createObjectURL(blob);

            if (onProgress) {
                onProgress({ phase: 'Creating download...', percentage: 98 });
            }

            const outputName = this.getOutputFilename(file.name, options.format);

            // Phase 6: Complete (100%)
            if (onProgress) {
                onProgress({ phase: 'Complete!', percentage: 100 });
            }

            return {
                blob: blob,
                url: this.currentBlobURL,
                filename: outputName,
                size: blob.size,
                format: options.format
            };

        } catch (error) {
            console.error('Conversion error:', error);
            
            // Try to clean up on error
            try {
                ffmpeg.FS('unlink', inputFileName);
            } catch (e) {}
            try {
                ffmpeg.FS('unlink', outputFileName);
            } catch (e) {}
            
            throw new Error(`Conversion failed: ${error.message || 'Unknown error'}`);
        }
    }

    buildFFmpegArgs(inputFile, outputFile, options) {
        const args = ['-i', inputFile];

        // Remove video stream
        args.push('-vn');

        // Remove all metadata
        args.push('-map_metadata', '-1');

        // Audio codec and quality based on format
        switch (options.format) {
            case 'mp3':
                args.push('-acodec', 'libmp3lame');
                args.push('-b:a', options.bitrate || '192k');
                break;
            case 'wav':
                args.push('-acodec', 'pcm_s16le');
                break;
            case 'm4a':
                args.push('-acodec', 'aac');
                args.push('-b:a', options.bitrate || '192k');
                break;
            case 'ogg':
                args.push('-acodec', 'libvorbis');
                args.push('-b:a', options.bitrate || '192k');
                break;
            default:
                throw new Error('Unsupported output format: ' + options.format);
        }

        // Overwrite output without asking
        args.push('-y');
        args.push(outputFile);
        
        return args;
    }

    cleanup() {
        if (this.currentBlobURL) {
            URL.revokeObjectURL(this.currentBlobURL);
            this.currentBlobURL = null;
        }
    }

    readFileAsUint8Array(file, onProgress) {
        return new Promise((resolve, reject) => {
            // For small files, read directly
            if (file.size < 10 * 1024 * 1024) { // < 10MB
                const reader = new FileReader();
                reader.onload = () => {
                    if (onProgress) onProgress(1);
                    resolve(new Uint8Array(reader.result));
                };
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsArrayBuffer(file);
                return;
            }

            // For larger files, read in chunks with progress
            const chunkSize = 2 * 1024 * 1024; // 2MB chunks
            const chunks = [];
            let offset = 0;
            let loaded = 0;

            const readChunk = () => {
                const chunk = file.slice(offset, offset + chunkSize);
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    chunks.push(new Uint8Array(e.target.result));
                    loaded += e.target.result.byteLength;
                    
                    if (onProgress) {
                        onProgress(loaded / file.size);
                    }
                    
                    offset += chunkSize;
                    
                    if (offset < file.size) {
                        readChunk();
                    } else {
                        // Combine all chunks
                        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
                        const result = new Uint8Array(totalLength);
                        let position = 0;
                        for (const chunk of chunks) {
                            result.set(chunk, position);
                            position += chunk.length;
                        }
                        resolve(result);
                    }
                };
                
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsArrayBuffer(chunk);
            };

            readChunk();
        });
    }

    estimateConversionTime(fileSizeBytes) {
        // Rough estimate: ~1MB per second for conversion
        // This is a conservative estimate that will be overridden by real progress
        const mbPerSecond = 1;
        const fileSizeMB = fileSizeBytes / (1024 * 1024);
        return Math.max(5000, fileSizeMB / mbPerSecond * 1000); // Minimum 5 seconds
    }

    getFileExtension(filename) {
        const match = filename.match(/\.[^.]+$/);
        return match ? match[0].toLowerCase() : '.mp4';
    }

    getOutputFilename(inputName, format) {
        const baseName = inputName.replace(/\.[^.]+$/, '');
        return `${baseName}.${format}`;
    }

    getMimeType(format) {
        const mimeTypes = {
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'm4a': 'audio/mp4',
            'ogg': 'audio/ogg'
        };
        return mimeTypes[format] || 'audio/mpeg';
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
}
