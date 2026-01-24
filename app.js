// MediaPrivacy App - Action-first inline expansion flow

class MediaPrivacyApp {
    constructor() {
        this.ffmpegManager = ffmpegManager;
        this.videoConverter = new VideoConverter(this.ffmpegManager);
        this.ffmpegReady = false;

        // Keyboard shortcut sequence tracking
        this.keySequence = '';
        this.keySequenceTimeout = null;
        this.KEY_SEQUENCE_DELAY = 500; // milliseconds to wait for next digit

        // State for each action
        this.state = {
            'video-audio': { file: null, result: null },
            'pdf-images': { file: null, pdfDoc: null, pdfData: null },
            'split-pdf': { file: null, pdfDoc: null, pdfData: null },
            'merge-pdf': { files: [] },
            'compress-pdf': { file: null, pdfDoc: null, pdfData: null },
            'images-pdf': { files: [] },
            'resize-image': { file: null, originalWidth: 0, originalHeight: 0 },
            'convert-image': { file: null },
            'compress-image': { file: null, originalSize: 0 },
            'video-mp4': { file: null, result: null },
            'video-compress': { file: null, result: null },
            'trim-video': { file: null, result: null },
            'video-gif': { file: null, result: null },
            'audio-mp3': { file: null, result: null },
            'audio-compress': { file: null, result: null },
            'trim-audio': { file: null, result: null },
            'normalize-audio': { file: null, result: null },
            'remove-metadata': { file: null, result: null, blobURL: null },
            'srt-pdf': { file: null, result: null }
        };

        this.init();
    }

    async init() {
        // Initialize PDF.js
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js';
        }

        this.attachEventListeners();
        await this.checkFFmpegLibrary();
    }

    async checkFFmpegLibrary() {
        await new Promise(resolve => setTimeout(resolve, 500));
        const ffmpegLib = window.createFFmpeg ||
            window.FFmpeg?.createFFmpeg ||
            (typeof FFmpegWASM !== 'undefined' ? FFmpegWASM.createFFmpeg : null) ||
            (typeof FFmpeg !== 'undefined' ? FFmpeg.createFFmpeg : null);

        if (typeof ffmpegLib === 'function') {
            window.createFFmpeg = ffmpegLib;
            this.ffmpegReady = true;
        }
    }

    attachEventListeners() {
        // Help toggle
        document.getElementById('helpToggle').addEventListener('click', () => {
            document.getElementById('helpPanel').classList.toggle('hidden');
        });

        // Card headers - expand on click
        document.querySelectorAll('.card-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.classList.contains('card-close')) return;
                const cardId = header.dataset.card;
                this.expandCard(cardId);
            });
        });

        // Close buttons
        document.querySelectorAll('.card-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const cardId = btn.dataset.close;
                this.collapseCard(cardId);
            });
        });

        // Global drop zone
        this.setupGlobalDropZone();

        // Set up each action card
        this.setupVideoAudioCard();
        this.setupPdfImagesCard();
        this.setupSplitPdfCard();
        this.setupMergePdfCard();
        this.setupCompressPdfCard();
        this.setupImagesPdfCard();
        this.setupResizeImageCard();
        this.setupConvertImageCard();
        this.setupCompressImageCard();
        this.setupVideoMp4Card();
        this.setupVideoCompressCard();
        this.setupTrimVideoCard();
        this.setupVideoGifCard();
        this.setupAudioMp3Card();
        this.setupAudioCompressCard();
        this.setupTrimAudioCard();
        this.setupNormalizeAudioCard();
        this.setupRemoveMetadataCard();
        this.setupSrtPdfCard();

        // Error dismiss
        document.getElementById('errorDismiss').addEventListener('click', () => {
            document.getElementById('errorPanel').classList.add('hidden');
        });

        // Keyboard shortcuts (1-18 to open cards, supports multi-digit)
        document.addEventListener('keydown', (e) => {
            // Only handle if not typing in an input/textarea/select
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }

            // Check if it's a number key (0-9)
            if (/^[0-9]$/.test(e.key)) {
                e.preventDefault();

                // Clear existing timeout
                if (this.keySequenceTimeout) {
                    clearTimeout(this.keySequenceTimeout);
                    this.keySequenceTimeout = null;
                }

                // Add digit to sequence
                this.keySequence += e.key;
                const cardNumber = parseInt(this.keySequence, 10);

                // Handle immediate execution for single digits (except 1, which could be multi-digit)
                if (this.keySequence.length === 1) {
                    if (e.key === '0') {
                        // 0 is shortcut for card 18 (normalize-audio)
                        this.executeKeyboardShortcut(18);
                        this.keySequence = '';
                    } else if (e.key >= '2' && e.key <= '9') {
                        // Digits 2-9 are single-digit cards, execute immediately
                        this.executeKeyboardShortcut(cardNumber);
                        this.keySequence = '';
                    } else if (e.key === '1') {
                        // 1 could be card 1 or start of 10-18, wait for next digit
                        this.keySequenceTimeout = setTimeout(() => {
                            // Timeout expired, execute as card 1
                            this.executeKeyboardShortcut(1);
                            this.keySequence = '';
                            this.keySequenceTimeout = null;
                        }, this.KEY_SEQUENCE_DELAY);
                    }
                } else if (this.keySequence.length === 2) {
                    // Two-digit number entered
                    if (cardNumber >= 10 && cardNumber <= 19) {
                        // Valid two-digit card, execute immediately
                        this.executeKeyboardShortcut(cardNumber);
                        this.keySequence = '';
                    } else {
                        // Invalid two-digit number, execute first digit
                        const firstDigit = parseInt(this.keySequence[0], 10);
                        if (firstDigit >= 1 && firstDigit <= 9) {
                            this.executeKeyboardShortcut(firstDigit);
                        }
                        this.keySequence = '';
                    }
                } else {
                    // More than 2 digits (invalid), execute previous valid sequence
                    const prevSequence = this.keySequence.slice(0, -1);
                    const prevCardNumber = parseInt(prevSequence, 10);
                    if (prevCardNumber >= 1 && prevCardNumber <= 19) {
                        this.executeKeyboardShortcut(prevCardNumber);
                    }
                    this.keySequence = '';
                }
            }
        });
    }

    executeKeyboardShortcut(cardNumber) {
        // Map card numbers (1-18) to action IDs
        const cardMap = {
            1: 'pdf-images',
            2: 'split-pdf',
            3: 'merge-pdf',
            4: 'compress-pdf',
            5: 'images-pdf',
            6: 'resize-image',
            7: 'convert-image',
            8: 'compress-image',
            9: 'remove-metadata',
            10: 'video-audio',
            11: 'video-mp4',
            12: 'video-compress',
            13: 'trim-video',
            14: 'video-gif',
            15: 'audio-mp3',
            16: 'audio-compress',
            17: 'trim-audio',
            18: 'normalize-audio',
            19: 'srt-pdf'
        };

        const cardId = cardMap[cardNumber];
        if (cardId) {
            this.expandCard(cardId);
        }
    }

    setupGlobalDropZone() {
        let dragCounter = 0;

        document.body.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        document.body.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dragCounter++;
        });

        document.body.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dragCounter--;
        });

        document.body.addEventListener('drop', (e) => {
            e.preventDefault();
            dragCounter = 0;

            // Don't handle if dropped on a card's own dropzone (let card handle it)
            if (e.target.closest('.card-dropzone')) {
                return;
            }

            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                this.handleGlobalDrop(files);
            }
        });
    }

    handleGlobalDrop(files) {
        const file = files[0];
        const type = file.type;
        const name = file.name.toLowerCase();

        // Detect file type and automatically start workflow
        if (type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|m4v|wmv|flv)$/i.test(name)) {
            // Video file -> Video to Audio workflow
            this.expandCard('video-audio');
            setTimeout(() => this.handleFileForCard('video-audio', file), 100);
        } else if (type === 'application/pdf' || name.endsWith('.pdf')) {
            // Multiple PDFs = merge workflow
            if (files.length > 1) {
                this.expandCard('merge-pdf');
                setTimeout(() => {
                    files.forEach(f => {
                        if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
                            this.addMergeFile(f);
                        }
                    });
                }, 100);
            } else {
                // Single PDF -> PDF to Images workflow (most common)
                this.expandCard('pdf-images');
                setTimeout(() => this.handleFileForCard('pdf-images', file), 100);
            }
        } else if (type.startsWith('image/')) {
            // Multiple images = Images to PDF workflow
            if (files.length > 1) {
                this.expandCard('images-pdf');
                setTimeout(() => {
                    files.forEach(f => {
                        if (f.type.startsWith('image/')) {
                            this.addImageFile(f);
                        }
                    });
                }, 100);
            } else {
                // Single image -> Compress Image workflow (most common for office workers)
                this.expandCard('compress-image');
                setTimeout(() => this.handleFileForCard('compress-image', file), 100);
            }
        } else {
            // Unknown file type -> Suggest metadata removal
            this.expandCard('remove-metadata');
            setTimeout(() => this.handleFileForCard('remove-metadata', file), 100);
        }
    }

    highlightCards(cardIds) {
        // Remove previous highlights
        document.querySelectorAll('.action-card.highlight').forEach(c => c.classList.remove('highlight'));

        cardIds.forEach(id => {
            const card = document.getElementById(`card-${id}`);
            if (card) {
                card.classList.add('highlight');
                setTimeout(() => card.classList.remove('highlight'), 2000);
            }
        });
    }

    expandCard(cardId) {
        const card = document.getElementById(`card-${cardId}`);
        const body = document.getElementById(`body-${cardId}`);
        const closeBtn = card.querySelector('.card-close');

        if (card.classList.contains('expanded')) return;

        // Collapse other expanded cards
        document.querySelectorAll('.action-card.expanded').forEach(c => {
            const otherId = c.dataset.action;
            if (otherId !== cardId) {
                this.collapseCard(otherId);
            }
        });

        card.classList.add('expanded');
        body.classList.remove('hidden');
        closeBtn.classList.remove('hidden');
    }

    collapseCard(cardId) {
        const card = document.getElementById(`card-${cardId}`);
        const body = document.getElementById(`body-${cardId}`);
        const closeBtn = card.querySelector('.card-close');

        card.classList.remove('expanded');
        body.classList.add('hidden');
        closeBtn.classList.add('hidden');

        // Reset card state
        this.resetCard(cardId);
    }

    resetCard(cardId) {
        const dropzone = document.getElementById(`dropzone-${cardId}`);
        const options = document.getElementById(`options-${cardId}`);
        const progress = document.getElementById(`progress-${cardId}`);
        const result = document.getElementById(`result-${cardId}`);

        if (dropzone) dropzone.classList.remove('hidden');
        if (options) options.classList.add('hidden');
        if (progress) progress.classList.add('hidden');
        if (result) result.classList.add('hidden');

        // Reset file input
        const fileInput = document.getElementById(`file-${cardId}`);
        if (fileInput) fileInput.value = '';

        // Reset state
        if (this.state[cardId]) {
            if (cardId === 'merge-pdf') {
                this.state[cardId].files = [];
                this.updateMergeFileList();
            } else if (cardId === 'images-pdf') {
                this.state[cardId].files = [];
                this.updateImagesFileList();
            } else {
                this.state[cardId].file = null;
                this.state[cardId].result = null;
                if (this.state[cardId].blobURL) {
                    URL.revokeObjectURL(this.state[cardId].blobURL);
                    this.state[cardId].blobURL = null;
                }
            }
        }
    }

    handleFileForCard(cardId, file) {
        const fileInput = document.getElementById(`file-${cardId}`);
        if (fileInput) {
            const dt = new DataTransfer();
            dt.items.add(file);
            fileInput.files = dt.files;
            fileInput.dispatchEvent(new Event('change'));
        }
    }

    // ==================== VIDEO TO AUDIO ====================
    setupVideoAudioCard() {
        const cardId = 'video-audio';
        const fileInput = document.getElementById(`file-${cardId}`);
        const dropzone = document.getElementById(`dropzone-${cardId}`);
        const formatSelect = document.getElementById(`format-${cardId}`);

        // Drag and drop on dropzone
        this.setupDropzone(dropzone, fileInput);

        // File selection
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleVideoFile(file);
        });

        // Format change
        formatSelect.addEventListener('change', () => {
            const format = formatSelect.value;
            const bitrateRow = document.getElementById(`bitrate-row-${cardId}`);
            bitrateRow.classList.toggle('hidden', format === 'wav');
        });

        // Remove file
        document.getElementById(`remove-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });

        // Convert button
        document.getElementById(`convert-${cardId}`).addEventListener('click', () => {
            this.convertVideoToAudio();
        });

        // Download
        document.getElementById(`download-${cardId}`).addEventListener('click', () => {
            this.downloadVideoResult();
        });

        // Another
        document.getElementById(`another-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });
    }

    handleVideoFile(file) {
        const cardId = 'video-audio';
        const validation = this.videoConverter.validateFile(file);

        if (!validation.valid) {
            this.showError(validation.error);
            return;
        }

        this.state[cardId].file = file;

        // Show options
        document.getElementById(`dropzone-${cardId}`).classList.add('hidden');
        document.getElementById(`options-${cardId}`).classList.remove('hidden');
        document.getElementById(`filename-${cardId}`).textContent = file.name;
        document.getElementById(`filesize-${cardId}`).textContent = `(${this.formatFileSize(file.size)})`;
    }

    async convertVideoToAudio() {
        const cardId = 'video-audio';
        const file = this.state[cardId].file;
        if (!file) return;

        // Show progress
        document.getElementById(`options-${cardId}`).classList.add('hidden');
        document.getElementById(`progress-${cardId}`).classList.remove('hidden');

        const updateProgress = (phase, percent) => {
            document.getElementById(`progress-status-${cardId}`).textContent = phase;
            document.getElementById(`progress-bar-${cardId}`).style.width = percent + '%';
            document.getElementById(`progress-percent-${cardId}`).textContent = Math.round(percent) + '%';
        };

        try {
            if (!this.ffmpegManager.isFFmpegLoaded()) {
                updateProgress('Loading FFmpeg engine...', 5);
                await this.ffmpegManager.loadFFmpeg((p) => updateProgress(p.phase, p.percentage));
            }

            const options = {
                format: document.getElementById(`format-${cardId}`).value,
                bitrate: document.getElementById(`bitrate-${cardId}`).value
            };

            const result = await this.videoConverter.convertToAudio(file, options, (p) => {
                updateProgress(p.phase, p.percentage);
            });

            this.state[cardId].result = result;

            // Show result
            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`result-${cardId}`).classList.remove('hidden');
            document.getElementById(`result-file-${cardId}`).textContent =
                `${result.filename} (${this.formatFileSize(result.size)})`;

        } catch (error) {
            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`options-${cardId}`).classList.remove('hidden');
            this.showError(error.message);
        }
    }

    async downloadVideoResult() {
        const result = this.state['video-audio'].result;
        if (!result) return;

        // Strip metadata before download
        const cleanBlob = await this.stripMetadataFromBlob(result.blob, result.filename, result.blob.type);
        const cleanUrl = URL.createObjectURL(cleanBlob);

        const a = document.createElement('a');
        a.href = cleanUrl;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Clean up URL after a delay
        setTimeout(() => URL.revokeObjectURL(cleanUrl), 100);
    }

    // ==================== PDF TO IMAGES ====================
    setupPdfImagesCard() {
        const cardId = 'pdf-images';
        const fileInput = document.getElementById(`file-${cardId}`);
        const dropzone = document.getElementById(`dropzone-${cardId}`);

        this.setupDropzone(dropzone, fileInput);

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) await this.handlePdfFile(cardId, file);
        });

        // Page selection toggle
        document.querySelectorAll(`input[name="pages-${cardId}"]`).forEach(radio => {
            radio.addEventListener('change', (e) => {
                document.getElementById(`page-input-row-${cardId}`).classList.toggle('hidden', e.target.value !== 'specific');
            });
        });

        document.getElementById(`remove-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });

        document.getElementById(`convert-${cardId}`).addEventListener('click', () => {
            this.convertPdfToImages();
        });

        document.getElementById(`another-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });
    }

    async handlePdfFile(cardId, file) {
        try {
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            const pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;

            this.state[cardId].file = file;
            this.state[cardId].pdfDoc = pdfDoc;
            this.state[cardId].pdfData = arrayBuffer;

            document.getElementById(`dropzone-${cardId}`).classList.add('hidden');
            document.getElementById(`options-${cardId}`).classList.remove('hidden');
            document.getElementById(`filename-${cardId}`).textContent = file.name;
            document.getElementById(`filesize-${cardId}`).textContent = `(${this.formatFileSize(file.size)})`;

            if (document.getElementById(`filepages-${cardId}`)) {
                document.getElementById(`filepages-${cardId}`).textContent = `${pdfDoc.numPages} pages`;
            }
        } catch (error) {
            this.showError('Failed to load PDF: ' + error.message);
        }
    }

    async convertPdfToImages() {
        const cardId = 'pdf-images';
        const pdfDoc = this.state[cardId].pdfDoc;
        if (!pdfDoc) return;

        document.getElementById(`options-${cardId}`).classList.add('hidden');
        document.getElementById(`progress-${cardId}`).classList.remove('hidden');

        const pagesOption = document.querySelector(`input[name="pages-${cardId}"]:checked`).value;
        let pagesToConvert = [];

        if (pagesOption === 'all') {
            pagesToConvert = Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1);
        } else {
            const pageInput = document.getElementById(`page-input-${cardId}`).value;
            pagesToConvert = this.parsePageRanges(pageInput, pdfDoc.numPages);
        }

        const baseName = this.state[cardId].file.name.replace('.pdf', '');

        try {
            const downloadPromises = [];
            for (let i = 0; i < pagesToConvert.length; i++) {
                const pageNum = pagesToConvert[i];
                const page = await pdfDoc.getPage(pageNum);
                const scale = 3;
                const viewport = page.getViewport({ scale });
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: ctx, viewport }).promise;

                // Create promise for async metadata stripping and download
                const downloadPromise = new Promise((resolve) => {
                    canvas.toBlob(async (blob) => {
                        // Strip metadata from image before download
                        const cleanBlob = await this.stripMetadataFromBlob(blob, `${baseName} ${pageNum}.png`, 'image/png');
                        download(cleanBlob, `${baseName} ${pageNum}.png`, 'image/png');
                        resolve();
                    }, 'image/png', 1);
                });
                downloadPromises.push(downloadPromise);

                const percent = ((i + 1) / pagesToConvert.length) * 100;
                document.getElementById(`progress-bar-${cardId}`).style.width = percent + '%';
                document.getElementById(`progress-percent-${cardId}`).textContent = Math.round(percent) + '%';
            }

            // Wait for all downloads to complete
            await Promise.all(downloadPromises);

            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`result-${cardId}`).classList.remove('hidden');
        } catch (error) {
            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`options-${cardId}`).classList.remove('hidden');
            this.showError('Conversion failed: ' + error.message);
        }
    }

    // ==================== SPLIT PDF ====================
    setupSplitPdfCard() {
        const cardId = 'split-pdf';
        const fileInput = document.getElementById(`file-${cardId}`);
        const dropzone = document.getElementById(`dropzone-${cardId}`);

        this.setupDropzone(dropzone, fileInput);

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) await this.handlePdfFileForSplit(file);
        });

        document.getElementById(`remove-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });

        document.getElementById(`convert-${cardId}`).addEventListener('click', () => {
            this.splitPdf();
        });

        document.getElementById(`another-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });
    }

    async handlePdfFileForSplit(file) {
        const cardId = 'split-pdf';
        try {
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);

            this.state[cardId].file = file;
            this.state[cardId].pdfDoc = pdfDoc;
            this.state[cardId].pdfData = arrayBuffer;

            document.getElementById(`dropzone-${cardId}`).classList.add('hidden');
            document.getElementById(`options-${cardId}`).classList.remove('hidden');
            document.getElementById(`filename-${cardId}`).textContent = file.name;
            document.getElementById(`filesize-${cardId}`).textContent = `(${this.formatFileSize(file.size)})`;
            document.getElementById(`filepages-${cardId}`).textContent = `${pdfDoc.getPageCount()} pages`;
            document.getElementById('split-page-input').max = pdfDoc.getPageCount() - 1;
        } catch (error) {
            this.showError('Failed to load PDF: ' + error.message);
        }
    }

    async splitPdf() {
        const cardId = 'split-pdf';
        const pdfDoc = this.state[cardId].pdfDoc;
        if (!pdfDoc) return;

        const splitPage = parseInt(document.getElementById('split-page-input').value);
        const totalPages = pdfDoc.getPageCount();

        if (isNaN(splitPage) || splitPage < 1 || splitPage >= totalPages) {
            this.showError('Please enter a valid page number (1 to ' + (totalPages - 1) + ')');
            return;
        }

        document.getElementById(`options-${cardId}`).classList.add('hidden');
        document.getElementById(`progress-${cardId}`).classList.remove('hidden');

        try {
            const baseName = this.state[cardId].file.name.replace('.pdf', '');

            const pdf1 = await PDFLib.PDFDocument.create();
            const pdf2 = await PDFLib.PDFDocument.create();

            const pages1 = await pdf1.copyPages(pdfDoc, Array.from({ length: splitPage }, (_, i) => i));
            pages1.forEach(page => pdf1.addPage(page));

            const pages2 = await pdf2.copyPages(pdfDoc, Array.from({ length: totalPages - splitPage }, (_, i) => i + splitPage));
            pages2.forEach(page => pdf2.addPage(page));

            const bytes1 = await pdf1.save();
            const bytes2 = await pdf2.save();

            // Strip metadata from PDFs before download
            const blob1 = new Blob([bytes1], { type: 'application/pdf' });
            const blob2 = new Blob([bytes2], { type: 'application/pdf' });
            const cleanBlob1 = await this.stripMetadataFromBlob(blob1, `${baseName} part 1.pdf`, 'application/pdf');
            const cleanBlob2 = await this.stripMetadataFromBlob(blob2, `${baseName} part 2.pdf`, 'application/pdf');

            download(cleanBlob1, `${baseName} part 1.pdf`, 'application/pdf');
            download(cleanBlob2, `${baseName} part 2.pdf`, 'application/pdf');

            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`result-${cardId}`).classList.remove('hidden');
        } catch (error) {
            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`options-${cardId}`).classList.remove('hidden');
            this.showError('Split failed: ' + error.message);
        }
    }

    // ==================== MERGE PDFS ====================
    setupMergePdfCard() {
        const cardId = 'merge-pdf';
        const fileInput = document.getElementById(`file-${cardId}`);
        const dropzone = document.getElementById(`dropzone-${cardId}`);

        this.setupDropzone(dropzone, fileInput);

        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            files.forEach(f => this.addMergeFile(f));
        });

        document.getElementById('add-more-merge-pdf').addEventListener('click', () => {
            fileInput.click();
        });

        document.getElementById(`convert-${cardId}`).addEventListener('click', () => {
            this.mergePdfs();
        });

        document.getElementById(`another-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });
    }

    addMergeFile(file) {
        const cardId = 'merge-pdf';
        this.state[cardId].files.push(file);
        this.updateMergeFileList();

        document.getElementById(`dropzone-${cardId}`).classList.add('hidden');
        document.getElementById(`options-${cardId}`).classList.remove('hidden');
    }

    updateMergeFileList() {
        const list = document.getElementById('merge-file-list');
        const files = this.state['merge-pdf'].files;

        list.innerHTML = files.map((file, i) => `
            <div class="merge-file-item">
                <span>${this.escapeHtml(file.name)}</span>
                <button class="remove-btn" data-index="${i}">x</button>
            </div>
        `).join('');

        list.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.index);
                this.state['merge-pdf'].files.splice(idx, 1);
                this.updateMergeFileList();
                if (this.state['merge-pdf'].files.length === 0) {
                    document.getElementById('dropzone-merge-pdf').classList.remove('hidden');
                    document.getElementById('options-merge-pdf').classList.add('hidden');
                }
            });
        });
    }

    async mergePdfs() {
        const cardId = 'merge-pdf';
        const files = this.state[cardId].files;

        if (files.length < 2) {
            this.showError('Please add at least 2 PDF files to merge');
            return;
        }

        document.getElementById(`options-${cardId}`).classList.add('hidden');
        document.getElementById(`progress-${cardId}`).classList.remove('hidden');

        try {
            const mergedPdf = await PDFLib.PDFDocument.create();

            for (const file of files) {
                const bytes = await this.readFileAsArrayBuffer(file);
                const pdf = await PDFLib.PDFDocument.load(bytes);
                const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                pages.forEach(page => mergedPdf.addPage(page));
            }

            const mergedBytes = await mergedPdf.save();
            const mergedBlob = new Blob([mergedBytes], { type: 'application/pdf' });
            // Strip metadata from merged PDF before download
            const cleanBlob = await this.stripMetadataFromBlob(mergedBlob, 'merged.pdf', 'application/pdf');
            download(cleanBlob, 'merged.pdf', 'application/pdf');

            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`result-${cardId}`).classList.remove('hidden');
        } catch (error) {
            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`options-${cardId}`).classList.remove('hidden');
            this.showError('Merge failed: ' + error.message);
        }
    }

    // ==================== COMPRESS PDF ====================
    setupCompressPdfCard() {
        const cardId = 'compress-pdf';
        const fileInput = document.getElementById(`file-${cardId}`);
        const dropzone = document.getElementById(`dropzone-${cardId}`);

        this.setupDropzone(dropzone, fileInput);

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) await this.handlePdfFile(cardId, file);
        });

        document.getElementById(`remove-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });

        document.getElementById(`convert-${cardId}`).addEventListener('click', () => {
            this.compressPdf();
        });

        document.getElementById(`another-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });
    }

    async compressPdf() {
        const cardId = 'compress-pdf';
        const file = this.state[cardId].file;
        const pdfData = this.state[cardId].pdfData;
        if (!pdfData) return;

        document.getElementById(`options-${cardId}`).classList.add('hidden');
        document.getElementById(`progress-${cardId}`).classList.remove('hidden');

        const quality = parseFloat(document.querySelector('input[name="compress-level"]:checked').value);

        try {
            const pdf = await pdfjsLib.getDocument(pdfData).promise;
            const pages = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 2 });
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({ canvasContext: ctx, viewport }).promise;

                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                pages.push({
                    data: dataUrl,
                    width: viewport.width / 2,
                    height: viewport.height / 2
                });

                const percent = (i / pdf.numPages) * 100;
                document.getElementById(`progress-bar-${cardId}`).style.width = percent + '%';
                document.getElementById(`progress-percent-${cardId}`).textContent = Math.round(percent) + '%';
            }

            const newPdf = await PDFLib.PDFDocument.create();
            for (const pageData of pages) {
                const img = await newPdf.embedJpg(pageData.data);
                const pdfPage = newPdf.addPage([pageData.width, pageData.height]);
                pdfPage.drawImage(img, { x: 0, y: 0, width: pageData.width, height: pageData.height });
            }

            const compressedBytes = await newPdf.save();
            const compressedName = file.name.replace('.pdf', '_compressed.pdf');
            const compressedBlob = new Blob([compressedBytes], { type: 'application/pdf' });
            // Strip metadata from compressed PDF before download
            const cleanBlob = await this.stripMetadataFromBlob(compressedBlob, compressedName, 'application/pdf');
            download(cleanBlob, compressedName, 'application/pdf');

            document.getElementById(`result-file-${cardId}`).textContent =
                `${compressedName} (${this.formatFileSize(compressedBytes.length)})`;
            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`result-${cardId}`).classList.remove('hidden');
        } catch (error) {
            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`options-${cardId}`).classList.remove('hidden');
            this.showError('Compression failed: ' + error.message);
        }
    }

    // ==================== IMAGES TO PDF ====================
    setupImagesPdfCard() {
        const cardId = 'images-pdf';
        const fileInput = document.getElementById(`file-${cardId}`);
        const dropzone = document.getElementById(`dropzone-${cardId}`);

        this.setupDropzone(dropzone, fileInput);

        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            files.forEach(f => this.addImageFile(f));
        });

        document.getElementById('add-more-images-pdf').addEventListener('click', () => {
            fileInput.click();
        });

        document.getElementById(`convert-${cardId}`).addEventListener('click', () => {
            this.convertImagesToPdf();
        });

        document.getElementById(`another-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });
    }

    addImageFile(file) {
        const cardId = 'images-pdf';
        this.state[cardId].files.push(file);
        this.updateImagesFileList();

        document.getElementById(`dropzone-${cardId}`).classList.add('hidden');
        document.getElementById(`options-${cardId}`).classList.remove('hidden');
    }

    updateImagesFileList() {
        const list = document.getElementById('images-file-list');
        const files = this.state['images-pdf'].files;

        list.innerHTML = files.map((file, i) => `
            <div class="merge-file-item">
                <span>${this.escapeHtml(file.name)}</span>
                <button class="remove-btn" data-index="${i}">x</button>
            </div>
        `).join('');

        list.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.index);
                this.state['images-pdf'].files.splice(idx, 1);
                this.updateImagesFileList();
                if (this.state['images-pdf'].files.length === 0) {
                    document.getElementById('dropzone-images-pdf').classList.remove('hidden');
                    document.getElementById('options-images-pdf').classList.add('hidden');
                }
            });
        });
    }

    async convertImagesToPdf() {
        const cardId = 'images-pdf';
        const files = this.state[cardId].files;

        if (files.length === 0) {
            this.showError('Please add at least one image');
            return;
        }

        document.getElementById(`options-${cardId}`).classList.add('hidden');
        document.getElementById(`progress-${cardId}`).classList.remove('hidden');

        try {
            const pdfDoc = await PDFLib.PDFDocument.create();

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const img = new Image();
                const loadPromise = new Promise(resolve => { img.onload = resolve; });
                img.src = URL.createObjectURL(file);
                await loadPromise;

                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                const pngData = canvas.toDataURL('image/png');
                const pngBytes = Uint8Array.from(atob(pngData.split(',')[1]), c => c.charCodeAt(0));

                const embeddedImg = await pdfDoc.embedPng(pngBytes);
                const page = pdfDoc.addPage([embeddedImg.width, embeddedImg.height]);
                page.drawImage(embeddedImg, { x: 0, y: 0, width: embeddedImg.width, height: embeddedImg.height });

                const percent = ((i + 1) / files.length) * 100;
                document.getElementById(`progress-bar-${cardId}`).style.width = percent + '%';
                document.getElementById(`progress-percent-${cardId}`).textContent = Math.round(percent) + '%';
            }

            const pdfBytes = await pdfDoc.save();
            const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
            // Strip metadata from PDF before download
            const cleanBlob = await this.stripMetadataFromBlob(pdfBlob, 'images_to_pdf.pdf', 'application/pdf');
            download(cleanBlob, 'images_to_pdf.pdf', 'application/pdf');

            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`result-${cardId}`).classList.remove('hidden');
        } catch (error) {
            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`options-${cardId}`).classList.remove('hidden');
            this.showError('Conversion failed: ' + error.message);
        }
    }

    // ==================== RESIZE IMAGE ====================
    setupResizeImageCard() {
        const cardId = 'resize-image';
        const fileInput = document.getElementById(`file-${cardId}`);
        const dropzone = document.getElementById(`dropzone-${cardId}`);

        this.setupDropzone(dropzone, fileInput);

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleResizeImage(file);
        });

        const widthInput = document.getElementById(`width-${cardId}`);
        const heightInput = document.getElementById(`height-${cardId}`);
        const lockCheck = document.getElementById(`lock-${cardId}`);

        widthInput.addEventListener('input', () => {
            if (lockCheck.checked && this.state[cardId].originalWidth) {
                const ratio = this.state[cardId].originalHeight / this.state[cardId].originalWidth;
                heightInput.value = Math.round(widthInput.value * ratio);
            }
        });

        heightInput.addEventListener('input', () => {
            if (lockCheck.checked && this.state[cardId].originalHeight) {
                const ratio = this.state[cardId].originalWidth / this.state[cardId].originalHeight;
                widthInput.value = Math.round(heightInput.value * ratio);
            }
        });

        document.getElementById(`remove-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });

        document.getElementById(`convert-${cardId}`).addEventListener('click', () => {
            this.resizeImage();
        });

        document.getElementById(`another-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });
    }

    handleResizeImage(file) {
        const cardId = 'resize-image';
        const img = new Image();
        img.onload = () => {
            this.state[cardId].file = file;
            this.state[cardId].originalWidth = img.width;
            this.state[cardId].originalHeight = img.height;

            document.getElementById(`dropzone-${cardId}`).classList.add('hidden');
            document.getElementById(`options-${cardId}`).classList.remove('hidden');
            document.getElementById(`filename-${cardId}`).textContent = file.name;
            document.getElementById(`filesize-${cardId}`).textContent = `(${img.width}x${img.height})`;
            document.getElementById(`width-${cardId}`).value = img.width;
            document.getElementById(`height-${cardId}`).value = img.height;
        };
        img.src = URL.createObjectURL(file);
    }

    async resizeImage() {
        const cardId = 'resize-image';
        const file = this.state[cardId].file;
        if (!file) return;

        const width = parseInt(document.getElementById(`width-${cardId}`).value);
        const height = parseInt(document.getElementById(`height-${cardId}`).value);

        if (!width || !height || width <= 0 || height <= 0) {
            this.showError('Please enter valid dimensions');
            return;
        }

        try {
            const img = new Image();
            const loadPromise = new Promise(resolve => { img.onload = resolve; });
            img.src = URL.createObjectURL(file);
            await loadPromise;

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(async (blob) => {
                // Strip metadata from resized image before download
                const cleanBlob = await this.stripMetadataFromBlob(blob, `resized_${file.name}`, file.type);
                download(cleanBlob, `resized_${file.name}`, file.type);
                document.getElementById(`options-${cardId}`).classList.add('hidden');
                document.getElementById(`result-${cardId}`).classList.remove('hidden');
            }, file.type);
        } catch (error) {
            this.showError('Resize failed: ' + error.message);
        }
    }

    // ==================== CONVERT IMAGE ====================
    setupConvertImageCard() {
        const cardId = 'convert-image';
        const fileInput = document.getElementById(`file-${cardId}`);
        const dropzone = document.getElementById(`dropzone-${cardId}`);

        this.setupDropzone(dropzone, fileInput);

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleConvertImage(file);
        });

        document.getElementById(`remove-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });

        document.getElementById(`convert-${cardId}`).addEventListener('click', () => {
            this.convertImage();
        });

        document.getElementById(`another-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });
    }

    handleConvertImage(file) {
        const cardId = 'convert-image';
        this.state[cardId].file = file;

        document.getElementById(`dropzone-${cardId}`).classList.add('hidden');
        document.getElementById(`options-${cardId}`).classList.remove('hidden');
        document.getElementById(`filename-${cardId}`).textContent = file.name;
        document.getElementById(`filesize-${cardId}`).textContent = `(${this.formatFileSize(file.size)})`;
    }

    async convertImage() {
        const cardId = 'convert-image';
        const file = this.state[cardId].file;
        if (!file) return;

        const format = document.getElementById(`format-${cardId}`).value;
        const ext = format.split('/')[1];

        try {
            const img = new Image();
            const loadPromise = new Promise(resolve => { img.onload = resolve; });
            img.src = URL.createObjectURL(file);
            await loadPromise;

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            canvas.toBlob(async (blob) => {
                const baseName = file.name.replace(/\.[^.]+$/, '');
                // Strip metadata from converted image before download
                const cleanBlob = await this.stripMetadataFromBlob(blob, `${baseName}.${ext}`, format);
                download(cleanBlob, `${baseName}.${ext}`, format);
                document.getElementById(`options-${cardId}`).classList.add('hidden');
                document.getElementById(`result-${cardId}`).classList.remove('hidden');
            }, format);
        } catch (error) {
            this.showError('Conversion failed: ' + error.message);
        }
    }

    // ==================== COMPRESS IMAGE ====================
    setupCompressImageCard() {
        const cardId = 'compress-image';
        const fileInput = document.getElementById(`file-${cardId}`);
        const dropzone = document.getElementById(`dropzone-${cardId}`);
        const qualitySlider = document.getElementById(`quality-${cardId}`);
        const qualityValue = document.getElementById(`quality-value-${cardId}`);

        this.setupDropzone(dropzone, fileInput);

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleCompressImage(file);
        });

        // Update quality display
        qualitySlider.addEventListener('input', () => {
            qualityValue.textContent = qualitySlider.value + '%';
        });

        document.getElementById(`remove-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });

        document.getElementById(`convert-${cardId}`).addEventListener('click', () => {
            this.compressImage();
        });

        document.getElementById(`another-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });
    }

    handleCompressImage(file) {
        const cardId = 'compress-image';

        if (!file.type.startsWith('image/')) {
            this.showError('Please select an image file');
            return;
        }

        this.state[cardId].file = file;
        this.state[cardId].originalSize = file.size;

        document.getElementById(`dropzone-${cardId}`).classList.add('hidden');
        document.getElementById(`options-${cardId}`).classList.remove('hidden');
        document.getElementById(`filename-${cardId}`).textContent = file.name;
        document.getElementById(`filesize-${cardId}`).textContent = `(${this.formatFileSize(file.size)})`;
    }

    async compressImage() {
        const cardId = 'compress-image';
        const file = this.state[cardId].file;
        if (!file) return;

        const quality = parseInt(document.getElementById(`quality-${cardId}`).value) / 100;

        try {
            document.getElementById(`options-${cardId}`).classList.add('hidden');

            const img = new Image();
            const loadPromise = new Promise(resolve => { img.onload = resolve; });
            img.src = URL.createObjectURL(file);
            await loadPromise;

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Determine output format - use JPEG for compression unless it's PNG with transparency
            let outputFormat = 'image/jpeg';

            // Check if PNG has transparency
            if (file.type === 'image/png') {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const hasTransparency = imageData.data.some((_, i) => i % 4 === 3 && imageData.data[i] < 255);
                if (hasTransparency) {
                    outputFormat = 'image/png';
                }
            }

            canvas.toBlob(async (blob) => {
                const baseName = file.name.replace(/\.[^.]+$/, '');
                const ext = outputFormat === 'image/png' ? 'png' : 'jpg';
                const filename = `${baseName}_compressed.${ext}`;

                // Strip metadata from compressed image before download
                const cleanBlob = await this.stripMetadataFromBlob(blob, filename, outputFormat);
                download(cleanBlob, filename, outputFormat);

                const originalSize = this.state[cardId].originalSize;
                const newSize = cleanBlob.size;
                const reduction = Math.round((1 - newSize / originalSize) * 100);

                document.getElementById(`result-file-${cardId}`).textContent =
                    `${filename} (${this.formatFileSize(newSize)}) - ${reduction}% smaller`;
                document.getElementById(`result-${cardId}`).classList.remove('hidden');
            }, outputFormat, quality);
        } catch (error) {
            document.getElementById(`options-${cardId}`).classList.remove('hidden');
            this.showError('Compression failed: ' + error.message);
        }
    }

    // ==================== VIDEO TO MP4 ====================
    setupVideoMp4Card() {
        const cardId = 'video-mp4';
        const fileInput = document.getElementById(`file-${cardId}`);
        const dropzone = document.getElementById(`dropzone-${cardId}`);

        this.setupDropzone(dropzone, fileInput);

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleVideoMp4File(file);
        });

        document.getElementById(`remove-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });

        document.getElementById(`convert-${cardId}`).addEventListener('click', () => {
            this.convertVideoToMp4();
        });

        document.getElementById(`download-${cardId}`).addEventListener('click', () => {
            this.downloadResult(cardId);
        });

        document.getElementById(`another-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });
    }

    handleVideoMp4File(file) {
        const cardId = 'video-mp4';
        const validation = this.videoConverter.validateFile(file);

        if (!validation.valid) {
            this.showError(validation.error);
            return;
        }

        this.state[cardId].file = file;

        document.getElementById(`dropzone-${cardId}`).classList.add('hidden');
        document.getElementById(`options-${cardId}`).classList.remove('hidden');
        document.getElementById(`filename-${cardId}`).textContent = file.name;
        document.getElementById(`filesize-${cardId}`).textContent = `(${this.formatFileSize(file.size)})`;
    }

    async convertVideoToMp4() {
        const cardId = 'video-mp4';
        const file = this.state[cardId].file;
        if (!file) return;

        document.getElementById(`options-${cardId}`).classList.add('hidden');
        document.getElementById(`progress-${cardId}`).classList.remove('hidden');

        const updateProgress = (phase, percent) => {
            document.getElementById(`progress-status-${cardId}`).textContent = phase;
            document.getElementById(`progress-bar-${cardId}`).style.width = percent + '%';
            document.getElementById(`progress-percent-${cardId}`).textContent = Math.round(percent) + '%';
        };

        try {
            if (!this.ffmpegManager.isFFmpegLoaded()) {
                updateProgress('Loading FFmpeg engine...', 5);
                await this.ffmpegManager.loadFFmpeg((p) => updateProgress(p.phase, p.percentage));
            }

            const result = await this.convertVideoWithFFmpeg(file, {
                format: 'mp4',
                codec: 'libx264',
                preset: 'medium'
            }, updateProgress);

            this.state[cardId].result = result;

            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`result-${cardId}`).classList.remove('hidden');
            document.getElementById(`result-file-${cardId}`).textContent =
                `${result.filename} (${this.formatFileSize(result.size)})`;

        } catch (error) {
            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`options-${cardId}`).classList.remove('hidden');
            this.showError(error.message);
        }
    }

    // ==================== VIDEO COMPRESS ====================
    setupVideoCompressCard() {
        const cardId = 'video-compress';
        const fileInput = document.getElementById(`file-${cardId}`);
        const dropzone = document.getElementById(`dropzone-${cardId}`);

        this.setupDropzone(dropzone, fileInput);

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleVideoCompressFile(file);
        });

        document.getElementById(`remove-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });

        document.getElementById(`convert-${cardId}`).addEventListener('click', () => {
            this.compressVideo();
        });

        document.getElementById(`download-${cardId}`).addEventListener('click', () => {
            this.downloadResult(cardId);
        });

        document.getElementById(`another-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });
    }

    handleVideoCompressFile(file) {
        const cardId = 'video-compress';
        const validation = this.videoConverter.validateFile(file);

        if (!validation.valid) {
            this.showError(validation.error);
            return;
        }

        this.state[cardId].file = file;

        document.getElementById(`dropzone-${cardId}`).classList.add('hidden');
        document.getElementById(`options-${cardId}`).classList.remove('hidden');
        document.getElementById(`filename-${cardId}`).textContent = file.name;
        document.getElementById(`filesize-${cardId}`).textContent = `(${this.formatFileSize(file.size)})`;
    }

    async compressVideo() {
        const cardId = 'video-compress';
        const file = this.state[cardId].file;
        if (!file) return;

        const crf = document.querySelector('input[name="compress-quality"]:checked').value;

        document.getElementById(`options-${cardId}`).classList.add('hidden');
        document.getElementById(`progress-${cardId}`).classList.remove('hidden');

        const updateProgress = (phase, percent) => {
            document.getElementById(`progress-status-${cardId}`).textContent = phase;
            document.getElementById(`progress-bar-${cardId}`).style.width = percent + '%';
            document.getElementById(`progress-percent-${cardId}`).textContent = Math.round(percent) + '%';
        };

        try {
            if (!this.ffmpegManager.isFFmpegLoaded()) {
                updateProgress('Loading FFmpeg engine...', 5);
                await this.ffmpegManager.loadFFmpeg((p) => updateProgress(p.phase, p.percentage));
            }

            const result = await this.convertVideoWithFFmpeg(file, {
                format: 'mp4',
                codec: 'libx264',
                crf: crf,
                preset: 'medium'
            }, updateProgress);

            this.state[cardId].result = result;

            const reduction = Math.round((1 - result.size / file.size) * 100);

            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`result-${cardId}`).classList.remove('hidden');
            document.getElementById(`result-file-${cardId}`).textContent =
                `${result.filename} (${this.formatFileSize(result.size)}) - ${reduction}% smaller`;

        } catch (error) {
            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`options-${cardId}`).classList.remove('hidden');
            this.showError(error.message);
        }
    }

    // ==================== TRIM VIDEO ====================
    setupTrimVideoCard() {
        const cardId = 'trim-video';
        const fileInput = document.getElementById(`file-${cardId}`);
        const dropzone = document.getElementById(`dropzone-${cardId}`);

        this.setupDropzone(dropzone, fileInput);

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleTrimVideoFile(file);
        });

        document.getElementById(`remove-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });

        document.getElementById(`convert-${cardId}`).addEventListener('click', () => {
            this.trimVideo();
        });

        document.getElementById(`download-${cardId}`).addEventListener('click', () => {
            this.downloadResult(cardId);
        });

        document.getElementById(`another-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });
    }

    handleTrimVideoFile(file) {
        const cardId = 'trim-video';
        const validation = this.videoConverter.validateFile(file);

        if (!validation.valid) {
            this.showError(validation.error);
            return;
        }

        this.state[cardId].file = file;

        document.getElementById(`dropzone-${cardId}`).classList.add('hidden');
        document.getElementById(`options-${cardId}`).classList.remove('hidden');
        document.getElementById(`filename-${cardId}`).textContent = file.name;
        document.getElementById(`filesize-${cardId}`).textContent = `(${this.formatFileSize(file.size)})`;
    }

    async trimVideo() {
        const cardId = 'trim-video';
        const file = this.state[cardId].file;
        if (!file) return;

        const startTime = parseFloat(document.getElementById(`start-${cardId}`).value) || 0;
        const endTime = parseFloat(document.getElementById(`end-${cardId}`).value) || 0;

        document.getElementById(`options-${cardId}`).classList.add('hidden');
        document.getElementById(`progress-${cardId}`).classList.remove('hidden');

        const updateProgress = (phase, percent) => {
            document.getElementById(`progress-status-${cardId}`).textContent = phase;
            document.getElementById(`progress-bar-${cardId}`).style.width = percent + '%';
            document.getElementById(`progress-percent-${cardId}`).textContent = Math.round(percent) + '%';
        };

        try {
            if (!this.ffmpegManager.isFFmpegLoaded()) {
                updateProgress('Loading FFmpeg engine...', 5);
                await this.ffmpegManager.loadFFmpeg((p) => updateProgress(p.phase, p.percentage));
            }

            const result = await this.convertVideoWithFFmpeg(file, {
                format: 'mp4',
                codec: 'copy',
                startTime: startTime,
                endTime: endTime > 0 ? endTime : null
            }, updateProgress);

            this.state[cardId].result = result;

            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`result-${cardId}`).classList.remove('hidden');
            document.getElementById(`result-file-${cardId}`).textContent =
                `${result.filename} (${this.formatFileSize(result.size)})`;

        } catch (error) {
            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`options-${cardId}`).classList.remove('hidden');
            this.showError(error.message);
        }
    }

    // ==================== VIDEO TO GIF ====================
    setupVideoGifCard() {
        const cardId = 'video-gif';
        const fileInput = document.getElementById(`file-${cardId}`);
        const dropzone = document.getElementById(`dropzone-${cardId}`);

        this.setupDropzone(dropzone, fileInput);

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleVideoGifFile(file);
        });

        document.getElementById(`remove-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });

        document.getElementById(`convert-${cardId}`).addEventListener('click', () => {
            this.convertVideoToGif();
        });

        document.getElementById(`download-${cardId}`).addEventListener('click', () => {
            this.downloadResult(cardId);
        });

        document.getElementById(`another-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });
    }

    handleVideoGifFile(file) {
        const cardId = 'video-gif';
        const validation = this.videoConverter.validateFile(file);

        if (!validation.valid) {
            this.showError(validation.error);
            return;
        }

        this.state[cardId].file = file;

        document.getElementById(`dropzone-${cardId}`).classList.add('hidden');
        document.getElementById(`options-${cardId}`).classList.remove('hidden');
        document.getElementById(`filename-${cardId}`).textContent = file.name;
        document.getElementById(`filesize-${cardId}`).textContent = `(${this.formatFileSize(file.size)})`;
    }

    async convertVideoToGif() {
        const cardId = 'video-gif';
        const file = this.state[cardId].file;
        if (!file) return;

        const startTime = parseFloat(document.getElementById(`start-${cardId}`).value) || 0;
        const duration = parseFloat(document.getElementById(`duration-${cardId}`).value) || 3;
        const fps = parseInt(document.getElementById(`fps-${cardId}`).value) || 15;
        const width = parseInt(document.getElementById(`width-${cardId}`).value) || 480;

        if (duration > 10) {
            this.showError('Duration cannot exceed 10 seconds for GIF');
            return;
        }

        document.getElementById(`options-${cardId}`).classList.add('hidden');
        document.getElementById(`progress-${cardId}`).classList.remove('hidden');

        const updateProgress = (phase, percent) => {
            document.getElementById(`progress-status-${cardId}`).textContent = phase;
            document.getElementById(`progress-bar-${cardId}`).style.width = percent + '%';
            document.getElementById(`progress-percent-${cardId}`).textContent = Math.round(percent) + '%';
        };

        try {
            if (!this.ffmpegManager.isFFmpegLoaded()) {
                updateProgress('Loading FFmpeg engine...', 5);
                await this.ffmpegManager.loadFFmpeg((p) => updateProgress(p.phase, p.percentage));
            }

            const result = await this.convertVideoWithFFmpeg(file, {
                format: 'gif',
                startTime: startTime,
                duration: duration,
                fps: fps,
                width: width
            }, updateProgress);

            this.state[cardId].result = result;

            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`result-${cardId}`).classList.remove('hidden');
            document.getElementById(`result-file-${cardId}`).textContent =
                `${result.filename} (${this.formatFileSize(result.size)})`;

        } catch (error) {
            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`options-${cardId}`).classList.remove('hidden');
            this.showError(error.message);
        }
    }

    // ==================== AUDIO TO MP3 ====================
    setupAudioMp3Card() {
        const cardId = 'audio-mp3';
        const fileInput = document.getElementById(`file-${cardId}`);
        const dropzone = document.getElementById(`dropzone-${cardId}`);

        this.setupDropzone(dropzone, fileInput);

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleAudioMp3File(file);
        });

        document.getElementById(`remove-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });

        document.getElementById(`convert-${cardId}`).addEventListener('click', () => {
            this.convertAudioToMp3();
        });

        document.getElementById(`download-${cardId}`).addEventListener('click', () => {
            this.downloadResult(cardId);
        });

        document.getElementById(`another-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });
    }

    handleAudioMp3File(file) {
        const cardId = 'audio-mp3';
        this.state[cardId].file = file;

        document.getElementById(`dropzone-${cardId}`).classList.add('hidden');
        document.getElementById(`options-${cardId}`).classList.remove('hidden');
        document.getElementById(`filename-${cardId}`).textContent = file.name;
        document.getElementById(`filesize-${cardId}`).textContent = `(${this.formatFileSize(file.size)})`;
    }

    async convertAudioToMp3() {
        const cardId = 'audio-mp3';
        const file = this.state[cardId].file;
        if (!file) return;

        const bitrate = document.getElementById(`bitrate-${cardId}`).value;

        document.getElementById(`options-${cardId}`).classList.add('hidden');
        document.getElementById(`progress-${cardId}`).classList.remove('hidden');

        const updateProgress = (phase, percent) => {
            document.getElementById(`progress-status-${cardId}`).textContent = phase;
            document.getElementById(`progress-bar-${cardId}`).style.width = percent + '%';
            document.getElementById(`progress-percent-${cardId}`).textContent = Math.round(percent) + '%';
        };

        try {
            if (!this.ffmpegManager.isFFmpegLoaded()) {
                updateProgress('Loading FFmpeg engine...', 5);
                await this.ffmpegManager.loadFFmpeg((p) => updateProgress(p.phase, p.percentage));
            }

            const result = await this.convertAudioWithFFmpeg(file, {
                format: 'mp3',
                bitrate: bitrate
            }, updateProgress);

            this.state[cardId].result = result;

            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`result-${cardId}`).classList.remove('hidden');
            document.getElementById(`result-file-${cardId}`).textContent =
                `${result.filename} (${this.formatFileSize(result.size)})`;

        } catch (error) {
            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`options-${cardId}`).classList.remove('hidden');
            this.showError(error.message);
        }
    }

    // ==================== AUDIO COMPRESS ====================
    setupAudioCompressCard() {
        const cardId = 'audio-compress';
        const fileInput = document.getElementById(`file-${cardId}`);
        const dropzone = document.getElementById(`dropzone-${cardId}`);

        this.setupDropzone(dropzone, fileInput);

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleAudioCompressFile(file);
        });

        document.getElementById(`remove-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });

        document.getElementById(`convert-${cardId}`).addEventListener('click', () => {
            this.compressAudio();
        });

        document.getElementById(`download-${cardId}`).addEventListener('click', () => {
            this.downloadResult(cardId);
        });

        document.getElementById(`another-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });
    }

    handleAudioCompressFile(file) {
        const cardId = 'audio-compress';
        this.state[cardId].file = file;

        document.getElementById(`dropzone-${cardId}`).classList.add('hidden');
        document.getElementById(`options-${cardId}`).classList.remove('hidden');
        document.getElementById(`filename-${cardId}`).textContent = file.name;
        document.getElementById(`filesize-${cardId}`).textContent = `(${this.formatFileSize(file.size)})`;
    }

    async compressAudio() {
        const cardId = 'audio-compress';
        const file = this.state[cardId].file;
        if (!file) return;

        const bitrate = document.getElementById(`bitrate-${cardId}`).value;

        document.getElementById(`options-${cardId}`).classList.add('hidden');
        document.getElementById(`progress-${cardId}`).classList.remove('hidden');

        const updateProgress = (phase, percent) => {
            document.getElementById(`progress-status-${cardId}`).textContent = phase;
            document.getElementById(`progress-bar-${cardId}`).style.width = percent + '%';
            document.getElementById(`progress-percent-${cardId}`).textContent = Math.round(percent) + '%';
        };

        try {
            if (!this.ffmpegManager.isFFmpegLoaded()) {
                updateProgress('Loading FFmpeg engine...', 5);
                await this.ffmpegManager.loadFFmpeg((p) => updateProgress(p.phase, p.percentage));
            }

            const result = await this.convertAudioWithFFmpeg(file, {
                format: 'mp3',
                bitrate: bitrate
            }, updateProgress);

            this.state[cardId].result = result;

            const reduction = Math.round((1 - result.size / file.size) * 100);

            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`result-${cardId}`).classList.remove('hidden');
            document.getElementById(`result-file-${cardId}`).textContent =
                `${result.filename} (${this.formatFileSize(result.size)}) - ${reduction}% smaller`;

        } catch (error) {
            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`options-${cardId}`).classList.remove('hidden');
            this.showError(error.message);
        }
    }

    // ==================== TRIM AUDIO ====================
    setupTrimAudioCard() {
        const cardId = 'trim-audio';
        const fileInput = document.getElementById(`file-${cardId}`);
        const dropzone = document.getElementById(`dropzone-${cardId}`);

        this.setupDropzone(dropzone, fileInput);

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleTrimAudioFile(file);
        });

        document.getElementById(`remove-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });

        document.getElementById(`convert-${cardId}`).addEventListener('click', () => {
            this.trimAudio();
        });

        document.getElementById(`download-${cardId}`).addEventListener('click', () => {
            this.downloadResult(cardId);
        });

        document.getElementById(`another-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });
    }

    handleTrimAudioFile(file) {
        const cardId = 'trim-audio';
        this.state[cardId].file = file;

        document.getElementById(`dropzone-${cardId}`).classList.add('hidden');
        document.getElementById(`options-${cardId}`).classList.remove('hidden');
        document.getElementById(`filename-${cardId}`).textContent = file.name;
        document.getElementById(`filesize-${cardId}`).textContent = `(${this.formatFileSize(file.size)})`;
    }

    async trimAudio() {
        const cardId = 'trim-audio';
        const file = this.state[cardId].file;
        if (!file) return;

        const startTime = parseFloat(document.getElementById(`start-${cardId}`).value) || 0;
        const endTime = parseFloat(document.getElementById(`end-${cardId}`).value) || 0;

        document.getElementById(`options-${cardId}`).classList.add('hidden');
        document.getElementById(`progress-${cardId}`).classList.remove('hidden');

        const updateProgress = (phase, percent) => {
            document.getElementById(`progress-status-${cardId}`).textContent = phase;
            document.getElementById(`progress-bar-${cardId}`).style.width = percent + '%';
            document.getElementById(`progress-percent-${cardId}`).textContent = Math.round(percent) + '%';
        };

        try {
            if (!this.ffmpegManager.isFFmpegLoaded()) {
                updateProgress('Loading FFmpeg engine...', 5);
                await this.ffmpegManager.loadFFmpeg((p) => updateProgress(p.phase, p.percentage));
            }

            const result = await this.convertAudioWithFFmpeg(file, {
                format: 'mp3',
                bitrate: '192k',
                startTime: startTime,
                endTime: endTime > 0 ? endTime : null
            }, updateProgress);

            this.state[cardId].result = result;

            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`result-${cardId}`).classList.remove('hidden');
            document.getElementById(`result-file-${cardId}`).textContent =
                `${result.filename} (${this.formatFileSize(result.size)})`;

        } catch (error) {
            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`options-${cardId}`).classList.remove('hidden');
            this.showError(error.message);
        }
    }

    // ==================== NORMALIZE AUDIO ====================
    setupNormalizeAudioCard() {
        const cardId = 'normalize-audio';
        const fileInput = document.getElementById(`file-${cardId}`);
        const dropzone = document.getElementById(`dropzone-${cardId}`);

        this.setupDropzone(dropzone, fileInput);

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleNormalizeAudioFile(file);
        });

        document.getElementById(`remove-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });

        document.getElementById(`convert-${cardId}`).addEventListener('click', () => {
            this.normalizeAudio();
        });

        document.getElementById(`download-${cardId}`).addEventListener('click', () => {
            this.downloadResult(cardId);
        });

        document.getElementById(`another-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });
    }

    handleNormalizeAudioFile(file) {
        const cardId = 'normalize-audio';
        this.state[cardId].file = file;

        document.getElementById(`dropzone-${cardId}`).classList.add('hidden');
        document.getElementById(`options-${cardId}`).classList.remove('hidden');
        document.getElementById(`filename-${cardId}`).textContent = file.name;
        document.getElementById(`filesize-${cardId}`).textContent = `(${this.formatFileSize(file.size)})`;
    }

    async normalizeAudio() {
        const cardId = 'normalize-audio';
        const file = this.state[cardId].file;
        if (!file) return;

        const targetLevel = document.querySelector('input[name="normalize-level"]:checked').value;

        document.getElementById(`options-${cardId}`).classList.add('hidden');
        document.getElementById(`progress-${cardId}`).classList.remove('hidden');

        const updateProgress = (phase, percent) => {
            document.getElementById(`progress-status-${cardId}`).textContent = phase;
            document.getElementById(`progress-bar-${cardId}`).style.width = percent + '%';
            document.getElementById(`progress-percent-${cardId}`).textContent = Math.round(percent) + '%';
        };

        try {
            if (!this.ffmpegManager.isFFmpegLoaded()) {
                updateProgress('Loading FFmpeg engine...', 5);
                await this.ffmpegManager.loadFFmpeg((p) => updateProgress(p.phase, p.percentage));
            }

            const result = await this.convertAudioWithFFmpeg(file, {
                format: 'mp3',
                bitrate: '192k',
                normalize: targetLevel
            }, updateProgress);

            this.state[cardId].result = result;

            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`result-${cardId}`).classList.remove('hidden');
            document.getElementById(`result-file-${cardId}`).textContent =
                `${result.filename} (${this.formatFileSize(result.size)})`;

        } catch (error) {
            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`options-${cardId}`).classList.remove('hidden');
            this.showError(error.message);
        }
    }

    // ==================== SRT TO PDF ====================
    setupSrtPdfCard() {
        const cardId = 'srt-pdf';
        const fileInput = document.getElementById(`file-${cardId}`);
        const dropzone = document.getElementById(`dropzone-${cardId}`);

        this.setupDropzone(dropzone, fileInput);

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleSrtFile(file);
        });

        document.getElementById(`remove-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });

        document.getElementById(`convert-${cardId}`).addEventListener('click', () => {
            this.convertSrtToPdf();
        });

        document.getElementById(`another-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });
    }

    handleSrtFile(file) {
        const cardId = 'srt-pdf';
        this.state[cardId].file = file;

        document.getElementById(`dropzone-${cardId}`).classList.add('hidden');
        document.getElementById(`options-${cardId}`).classList.remove('hidden');
        document.getElementById(`filename-${cardId}`).textContent = file.name;
        document.getElementById(`filesize-${cardId}`).textContent = `(${this.formatFileSize(file.size)})`;
    }

    parseSrtFile(content) {
        const entries = [];
        // Split by double newlines (SRT entries are separated by blank lines)
        const blocks = content.trim().split(/\n\s*\n/);

        for (const block of blocks) {
            const lines = block.trim().split('\n');
            if (lines.length < 3) continue;

            // Line 1: sequence number (skip)
            // Line 2: timestamp line (e.g., "00:00:05,000 --> 00:00:08,000")
            // Lines 3+: subtitle text

            const timestampLine = lines[1];
            const timestampMatch = timestampLine.match(/(\d{2}):(\d{2}):(\d{2}),\d{3}/);

            if (!timestampMatch) continue;

            // Convert to MM:SS format (or HH:MM:SS if hours > 0)
            const hours = parseInt(timestampMatch[1], 10);
            const minutes = parseInt(timestampMatch[2], 10);
            const seconds = parseInt(timestampMatch[3], 10);

            let timestamp;
            if (hours > 0) {
                timestamp = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            } else {
                timestamp = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }

            // Get subtitle text (lines 3 onwards)
            // Strip HTML tags (like <b>, </b>, <i>, </i>, <u>, </u>, <font>, etc.)
            const text = lines.slice(2).join(' ').trim().replace(/<[^>]*>/g, '');

            // Check if text starts with a speaker name (format: "Name:")
            let speaker = null;
            let subtitleText = text;

            const speakerMatch = text.match(/^([^:]+):\s*(.*)$/);
            if (speakerMatch) {
                speaker = speakerMatch[1].trim();
                subtitleText = speakerMatch[2].trim();
            }

            entries.push({
                timestamp,
                speaker,
                text: subtitleText
            });
        }

        return entries;
    }

    async convertSrtToPdf() {
        const cardId = 'srt-pdf';
        const file = this.state[cardId].file;
        if (!file) return;

        document.getElementById(`options-${cardId}`).classList.add('hidden');
        document.getElementById(`progress-${cardId}`).classList.remove('hidden');

        const updateProgress = (percent) => {
            document.getElementById(`progress-bar-${cardId}`).style.width = percent + '%';
            document.getElementById(`progress-percent-${cardId}`).textContent = Math.round(percent) + '%';
        };

        try {
            updateProgress(10);

            // Read file content
            const content = await file.text();
            updateProgress(30);

            // Parse SRT
            const entries = this.parseSrtFile(content);
            updateProgress(50);

            if (entries.length === 0) {
                throw new Error('No valid subtitle entries found in the SRT file');
            }

            // Create PDF using PDFKit
            const doc = new PDFDocument({
                margin: 50,
                size: 'A4'
            });

            // Collect PDF data chunks into an array
            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));

            // Set up fonts (using built-in Helvetica)
            const fontRegular = 'Helvetica';
            const fontBold = 'Helvetica-Bold';

            // Track current speaker to group entries
            let currentSpeaker = null;

            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];

                // Check if we need a new page (leave some margin at bottom)
                if (doc.y > 700) {
                    doc.addPage();
                }

                // If speaker changed or is different, print speaker name
                if (entry.speaker && entry.speaker !== currentSpeaker) {
                    currentSpeaker = entry.speaker;
                    doc.font(fontBold).fontSize(12).text(`${entry.speaker}:`, { continued: false });
                } else if (!entry.speaker && currentSpeaker) {
                    // No speaker in this entry but we had one before - reset
                    currentSpeaker = null;
                }

                // Print timestamp
                doc.font(fontRegular).fontSize(11).text(entry.timestamp, { continued: false });

                // Print text
                doc.font(fontRegular).fontSize(11).text(entry.text, { continued: false });

                // Add spacing between entries
                doc.moveDown(0.8);

                updateProgress(50 + (i / entries.length) * 40);
            }

            // Wait for PDF generation to complete
            const blob = await new Promise((resolve, reject) => {
                doc.on('end', () => {
                    const pdfBlob = new Blob(chunks, { type: 'application/pdf' });
                    resolve(pdfBlob);
                });
                doc.on('error', reject);
                doc.end();
            });

            updateProgress(100);

            // Download the PDF
            const baseName = file.name.replace(/\.srt$/i, '');
            download(blob, `${baseName}.pdf`, 'application/pdf');

            // Show result
            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`result-${cardId}`).classList.remove('hidden');
            document.getElementById(`result-file-${cardId}`).textContent = `${baseName}.pdf downloaded`;

        } catch (error) {
            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`options-${cardId}`).classList.remove('hidden');
            this.showError('Conversion failed: ' + error.message);
        }
    }

    // ==================== HELPER FUNCTIONS ====================
    async convertVideoWithFFmpeg(file, options, onProgress) {
        const ffmpeg = this.ffmpegManager.getFFmpegInstance();
        if (!ffmpeg) throw new Error('FFmpeg not loaded');

        const inputFileName = 'input' + this.videoConverter.getFileExtension(file.name);
        const outputExt = options.format === 'gif' ? '.gif' : '.mp4';
        const outputFileName = 'output' + outputExt;

        try {
            if (onProgress) onProgress('Reading file...', 15);

            const fileData = await this.videoConverter.readFileAsUint8Array(file);
            ffmpeg.FS('writeFile', inputFileName, fileData);

            if (onProgress) onProgress('Processing...', 20);

            const args = ['-i', inputFileName];

            if (options.startTime !== undefined) {
                args.push('-ss', options.startTime.toString());
            }

            if (options.duration !== undefined) {
                args.push('-t', options.duration.toString());
            } else if (options.endTime !== undefined) {
                args.push('-to', options.endTime.toString());
            }

            if (options.format === 'gif') {
                args.push('-vf', `fps=${options.fps || 15},scale=${options.width || 480}:-1:flags=lanczos`);
            } else {
                if (options.codec === 'copy') {
                    args.push('-c', 'copy');
                } else {
                    args.push('-c:v', options.codec || 'libx264');
                    if (options.crf) {
                        args.push('-crf', options.crf);
                    }
                    if (options.preset) {
                        args.push('-preset', options.preset);
                    }
                }
            }

            args.push('-map_metadata', '-1');
            args.push('-y', outputFileName);

            ffmpeg.setProgress(({ ratio }) => {
                if (onProgress && ratio >= 0 && ratio <= 1) {
                    const percentage = Math.min(90, Math.round(20 + ratio * 70));
                    onProgress('Processing...', percentage);
                }
            });

            await ffmpeg.run(...args);

            if (onProgress) onProgress('Reading output...', 92);

            const data = ffmpeg.FS('readFile', outputFileName);

            try {
                ffmpeg.FS('unlink', inputFileName);
                ffmpeg.FS('unlink', outputFileName);
            } catch (e) { }

            const baseName = file.name.replace(/\.[^.]+$/, '');
            const filename = `${baseName}${outputExt}`;
            const mimeType = options.format === 'gif' ? 'image/gif' : 'video/mp4';
            const blob = new Blob([data.buffer], { type: mimeType });

            if (onProgress) onProgress('Complete!', 100);

            return {
                blob: blob,
                url: URL.createObjectURL(blob),
                filename: filename,
                size: blob.size
            };

        } catch (error) {
            try {
                ffmpeg.FS('unlink', inputFileName);
                ffmpeg.FS('unlink', outputFileName);
            } catch (e) { }
            throw new Error(`Processing failed: ${error.message || 'Unknown error'}`);
        }
    }

    async convertAudioWithFFmpeg(file, options, onProgress) {
        const ffmpeg = this.ffmpegManager.getFFmpegInstance();
        if (!ffmpeg) throw new Error('FFmpeg not loaded');

        const inputFileName = 'input' + this.videoConverter.getFileExtension(file.name);
        const outputFileName = 'output.mp3';

        try {
            if (onProgress) onProgress('Reading file...', 15);

            const fileData = await this.videoConverter.readFileAsUint8Array(file);
            ffmpeg.FS('writeFile', inputFileName, fileData);

            if (onProgress) onProgress('Processing...', 20);

            const args = ['-i', inputFileName];

            if (options.startTime !== undefined) {
                args.push('-ss', options.startTime.toString());
            }

            if (options.endTime !== undefined) {
                args.push('-to', options.endTime.toString());
            }

            args.push('-vn');
            args.push('-acodec', 'libmp3lame');
            args.push('-b:a', options.bitrate || '192k');

            if (options.normalize) {
                args.push('-af', `loudnorm=I=${options.normalize}:TP=-1.5:LRA=11`);
            }

            args.push('-map_metadata', '-1');
            args.push('-y', outputFileName);

            ffmpeg.setProgress(({ ratio }) => {
                if (onProgress && ratio >= 0 && ratio <= 1) {
                    const percentage = Math.min(90, Math.round(20 + ratio * 70));
                    onProgress('Processing...', percentage);
                }
            });

            await ffmpeg.run(...args);

            if (onProgress) onProgress('Reading output...', 92);

            const data = ffmpeg.FS('readFile', outputFileName);

            try {
                ffmpeg.FS('unlink', inputFileName);
                ffmpeg.FS('unlink', outputFileName);
            } catch (e) { }

            const baseName = file.name.replace(/\.[^.]+$/, '');
            const filename = `${baseName}.mp3`;
            const blob = new Blob([data.buffer], { type: 'audio/mpeg' });

            if (onProgress) onProgress('Complete!', 100);

            return {
                blob: blob,
                url: URL.createObjectURL(blob),
                filename: filename,
                size: blob.size
            };

        } catch (error) {
            try {
                ffmpeg.FS('unlink', inputFileName);
                ffmpeg.FS('unlink', outputFileName);
            } catch (e) { }
            throw new Error(`Processing failed: ${error.message || 'Unknown error'}`);
        }
    }

    downloadResult(cardId) {
        const result = this.state[cardId].result;
        if (!result) return;

        const a = document.createElement('a');
        a.href = result.url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // ==================== REMOVE METADATA ====================
    setupRemoveMetadataCard() {
        const cardId = 'remove-metadata';
        const fileInput = document.getElementById(`file-${cardId}`);
        const dropzone = document.getElementById(`dropzone-${cardId}`);

        this.setupDropzone(dropzone, fileInput);

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleMetadataFile(file);
        });

        document.getElementById(`remove-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });

        document.getElementById(`convert-${cardId}`).addEventListener('click', () => {
            this.removeMetadata();
        });

        document.getElementById(`download-${cardId}`).addEventListener('click', () => {
            this.downloadMetadataResult();
        });

        document.getElementById(`another-${cardId}`).addEventListener('click', () => {
            this.resetCard(cardId);
            this.expandCard(cardId);
        });
    }

    handleMetadataFile(file) {
        const cardId = 'remove-metadata';
        this.state[cardId].file = file;

        document.getElementById(`dropzone-${cardId}`).classList.add('hidden');
        document.getElementById(`options-${cardId}`).classList.remove('hidden');
        document.getElementById(`filename-${cardId}`).textContent = file.name;
        document.getElementById(`filesize-${cardId}`).textContent = `(${this.formatFileSize(file.size)})`;
    }

    async removeMetadata() {
        const cardId = 'remove-metadata';
        const file = this.state[cardId].file;
        if (!file) return;

        document.getElementById(`options-${cardId}`).classList.add('hidden');
        document.getElementById(`progress-${cardId}`).classList.remove('hidden');

        const updateProgress = (phase, percent) => {
            document.getElementById(`progress-status-${cardId}`).textContent = phase;
            document.getElementById(`progress-bar-${cardId}`).style.width = percent + '%';
            document.getElementById(`progress-percent-${cardId}`).textContent = Math.round(percent) + '%';
        };

        try {
            updateProgress('Analyzing file type...', 10);

            const fileType = file.type;
            const fileName = file.name.toLowerCase();
            let result;

            // Determine file type and process accordingly
            if (fileType.startsWith('image/')) {
                updateProgress('Removing image metadata...', 30);
                result = await this.removeImageMetadata(file);
            } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
                updateProgress('Removing PDF metadata...', 30);
                result = await this.removePdfMetadata(file);
            } else if (fileType.startsWith('video/') || fileType.startsWith('audio/') ||
                /\.(mp4|mov|avi|mkv|webm|m4v|wmv|flv|mp3|wav|m4a|ogg|aac|flac)$/i.test(fileName)) {
                updateProgress('Removing media metadata...', 30);
                result = await this.removeMediaMetadata(file, updateProgress);
            } else {
                // For other file types, try to create a clean copy
                updateProgress('Creating clean copy...', 50);
                result = await this.removeGenericMetadata(file);
            }

            updateProgress('Finalizing...', 95);

            this.state[cardId].result = result;

            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`result-${cardId}`).classList.remove('hidden');
            document.getElementById(`result-file-${cardId}`).textContent =
                `${result.filename} (${this.formatFileSize(result.size)})`;

            updateProgress('Complete!', 100);
        } catch (error) {
            document.getElementById(`progress-${cardId}`).classList.add('hidden');
            document.getElementById(`options-${cardId}`).classList.remove('hidden');
            this.showError('Metadata removal failed: ' + error.message);
        }
    }

    async removeImageMetadata(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');

                    // Draw image to canvas - this strips all EXIF and metadata
                    ctx.drawImage(img, 0, 0);

                    // Determine output format (prefer PNG for lossless, or keep original format)
                    const outputFormat = file.type === 'image/png' ? 'image/png' :
                        file.type === 'image/webp' ? 'image/webp' :
                            'image/jpeg';

                    canvas.toBlob((blob) => {
                        const baseName = file.name.replace(/\.[^.]+$/, '');
                        const ext = outputFormat === 'image/png' ? 'png' :
                            outputFormat === 'image/webp' ? 'webp' : 'jpg';
                        const filename = `${baseName}_no_metadata.${ext}`;
                        const blobURL = URL.createObjectURL(blob);

                        const result = {
                            blob: blob,
                            url: blobURL,
                            filename: filename,
                            size: blob.size
                        };
                        this.state['remove-metadata'].blobURL = blobURL;
                        resolve(result);
                    }, outputFormat, 0.95);
                } catch (error) {
                    reject(error);
                }
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(file);
        });
    }

    async removePdfMetadata(file) {
        try {
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);

            // Create a new PDF document without copying metadata
            const newPdf = await PDFLib.PDFDocument.create();

            // Copy all pages
            const pages = await newPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            pages.forEach(page => newPdf.addPage(page));

            // Save without metadata
            const pdfBytes = await newPdf.save();
            const baseName = file.name.replace('.pdf', '');
            const filename = `${baseName}_no_metadata.pdf`;
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const blobURL = URL.createObjectURL(blob);

            const result = {
                blob: blob,
                url: blobURL,
                filename: filename,
                size: blob.size
            };
            this.state['remove-metadata'].blobURL = blobURL;
            return result;
        } catch (error) {
            throw new Error('PDF processing failed: ' + error.message);
        }
    }

    async removeMediaMetadata(file, onProgress) {
        // Use FFmpeg to strip metadata from video/audio files
        if (!this.ffmpegManager.isFFmpegLoaded()) {
            if (onProgress) onProgress('Loading FFmpeg engine...', 35);
            await this.ffmpegManager.loadFFmpeg((p) => {
                if (onProgress) onProgress(p.phase, 35 + (p.percentage * 0.3));
            });
        }

        const ffmpeg = this.ffmpegManager.getFFmpegInstance();
        if (!ffmpeg) {
            throw new Error('FFmpeg not available');
        }

        const inputFileName = 'input' + this.getFileExtension(file.name);
        const outputFileName = 'output' + this.getFileExtension(file.name);

        try {
            if (onProgress) onProgress('Reading file...', 50);

            const fileData = await this.readFileAsUint8Array(file);
            ffmpeg.FS('writeFile', inputFileName, fileData);

            if (onProgress) onProgress('Removing metadata...', 60);

            // FFmpeg command to copy streams but remove all metadata
            const args = [
                '-i', inputFileName,
                '-map_metadata', '-1',  // Remove all metadata
                '-c', 'copy',            // Copy streams without re-encoding
                '-y',                    // Overwrite output
                outputFileName
            ];

            ffmpeg.setProgress(({ ratio }) => {
                if (onProgress && ratio > 0) {
                    const percentage = Math.min(90, Math.round(60 + ratio * 30));
                    onProgress('Removing metadata...', percentage);
                }
            });

            await ffmpeg.run(...args);

            if (onProgress) onProgress('Reading output...', 92);

            const data = ffmpeg.FS('readFile', outputFileName);

            // Cleanup
            try {
                ffmpeg.FS('unlink', inputFileName);
                ffmpeg.FS('unlink', outputFileName);
            } catch (e) {
                console.warn('Cleanup warning:', e);
            }

            const baseName = file.name.replace(/\.[^.]+$/, '');
            const ext = this.getFileExtension(file.name);
            const filename = `${baseName}_no_metadata${ext}`;
            const mimeType = file.type || this.getMimeTypeFromExtension(ext);
            const blob = new Blob([data.buffer], { type: mimeType });
            const blobURL = URL.createObjectURL(blob);

            const result = {
                blob: blob,
                url: blobURL,
                filename: filename,
                size: blob.size
            };
            this.state['remove-metadata'].blobURL = blobURL;
            return result;
        } catch (error) {
            // Cleanup on error
            try {
                ffmpeg.FS('unlink', inputFileName);
            } catch (e) { }
            try {
                ffmpeg.FS('unlink', outputFileName);
            } catch (e) { }

            throw new Error('Media processing failed: ' + error.message);
        }
    }

    async removeGenericMetadata(file) {
        // For unknown file types, create a copy by reading and writing
        // This won't remove embedded metadata but will remove file system metadata
        const arrayBuffer = await this.readFileAsArrayBuffer(file);
        const blob = new Blob([arrayBuffer], { type: file.type });
        const baseName = file.name.replace(/\.[^.]+$/, '');
        const ext = file.name.match(/\.[^.]+$/) || '';
        const filename = `${baseName}_no_metadata${ext}`;
        const blobURL = URL.createObjectURL(blob);

        const result = {
            blob: blob,
            url: blobURL,
            filename: filename,
            size: blob.size
        };
        this.state['remove-metadata'].blobURL = blobURL;
        return result;
    }

    async downloadMetadataResult() {
        const result = this.state['remove-metadata'].result;
        if (!result) return;

        // Metadata is already stripped, but ensure it's clean
        const cleanBlob = await this.stripMetadataFromBlob(result.blob, result.filename, result.blob.type);
        const cleanUrl = URL.createObjectURL(cleanBlob);

        const a = document.createElement('a');
        a.href = cleanUrl;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Clean up URL after a delay
        setTimeout(() => URL.revokeObjectURL(cleanUrl), 100);
    }

    readFileAsUint8Array(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(new Uint8Array(reader.result));
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    getFileExtension(filename) {
        const match = filename.match(/\.[^.]+$/);
        return match ? match[0].toLowerCase() : '';
    }

    getMimeTypeFromExtension(ext) {
        const mimeTypes = {
            '.mp4': 'video/mp4',
            '.mov': 'video/quicktime',
            '.avi': 'video/x-msvideo',
            '.mkv': 'video/x-matroska',
            '.webm': 'video/webm',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.m4a': 'audio/mp4',
            '.ogg': 'audio/ogg',
            '.aac': 'audio/aac',
            '.flac': 'audio/flac'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

    // ==================== METADATA STRIPPING UTILITY ====================
    /**
     * Strips metadata from a blob/file before download
     * This is called automatically for all downloads
     */
    async stripMetadataFromBlob(blob, filename, mimeType) {
        const fileName = filename.toLowerCase();

        // For images, use canvas to strip EXIF/metadata
        if (mimeType && mimeType.startsWith('image/')) {
            return await this.stripImageMetadata(blob, mimeType);
        }

        // For PDFs, recreate without metadata
        if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
            return await this.stripPdfMetadata(blob);
        }

        // For video/audio, use FFmpeg if available
        if (mimeType && (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) ||
            /\.(mp4|mov|avi|mkv|webm|m4v|wmv|flv|mp3|wav|m4a|ogg|aac|flac)$/i.test(fileName)) {
            try {
                return await this.stripMediaMetadata(blob, filename, mimeType);
            } catch (error) {
                // If FFmpeg fails, return original (better than failing completely)
                console.warn('Could not strip media metadata:', error);
                return blob;
            }
        }

        // For other types, return as-is (can't strip metadata reliably)
        return blob;
    }

    async stripImageMetadata(blob, mimeType) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);

                    // Use original mime type, default to PNG for lossless
                    const outputFormat = mimeType === 'image/png' ? 'image/png' :
                        mimeType === 'image/webp' ? 'image/webp' : 'image/jpeg';

                    canvas.toBlob((newBlob) => {
                        resolve(newBlob || blob);
                    }, outputFormat, 0.95);
                } catch (error) {
                    reject(error);
                }
            };
            img.onerror = () => resolve(blob); // Return original if image load fails
            img.src = URL.createObjectURL(blob);
        });
    }

    async stripPdfMetadata(blob) {
        try {
            const arrayBuffer = await this.readFileAsArrayBuffer(blob);
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const newPdf = await PDFLib.PDFDocument.create();

            const pages = await newPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            pages.forEach(page => newPdf.addPage(page));

            const pdfBytes = await newPdf.save();
            return new Blob([pdfBytes], { type: 'application/pdf' });
        } catch (error) {
            console.warn('Could not strip PDF metadata:', error);
            return blob; // Return original if processing fails
        }
    }

    async stripMediaMetadata(blob, filename, mimeType) {
        // Only use FFmpeg if it's already loaded (don't force load for every download)
        if (!this.ffmpegManager.isFFmpegLoaded()) {
            // For media files, if FFmpeg isn't loaded, return original
            // User can use the dedicated metadata remover if they need it
            return blob;
        }

        const ffmpeg = this.ffmpegManager.getFFmpegInstance();
        const inputFileName = 'input' + this.getFileExtension(filename);
        const outputFileName = 'output' + this.getFileExtension(filename);

        try {
            const fileData = await this.readFileAsUint8Array(blob);
            ffmpeg.FS('writeFile', inputFileName, fileData);

            const args = [
                '-i', inputFileName,
                '-map_metadata', '-1',
                '-c', 'copy',
                '-y',
                outputFileName
            ];

            await ffmpeg.run(...args);
            const data = ffmpeg.FS('readFile', outputFileName);

            // Cleanup
            try {
                ffmpeg.FS('unlink', inputFileName);
                ffmpeg.FS('unlink', outputFileName);
            } catch (e) { }

            return new Blob([data.buffer], { type: mimeType || blob.type });
        } catch (error) {
            // Cleanup on error
            try {
                ffmpeg.FS('unlink', inputFileName);
                ffmpeg.FS('unlink', outputFileName);
            } catch (e) { }
            throw error;
        }
    }

    // ==================== UTILITIES ====================
    setupDropzone(dropzone, fileInput) {
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-over');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('drag-over');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                const dt = new DataTransfer();
                Array.from(e.dataTransfer.files).forEach(f => dt.items.add(f));
                fileInput.files = dt.files;
                fileInput.dispatchEvent(new Event('change'));
            }
        });
    }

    readFileAsArrayBuffer(fileOrBlob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(fileOrBlob);
        });
    }

    parsePageRanges(input, maxPages) {
        const pages = new Set();
        const ranges = input.split(',');

        for (const range of ranges) {
            const parts = range.trim().split('-');
            if (parts.length === 1) {
                const page = parseInt(parts[0]);
                if (!isNaN(page) && page >= 1 && page <= maxPages) {
                    pages.add(page);
                }
            } else if (parts.length === 2) {
                const start = parseInt(parts[0]);
                const end = parseInt(parts[1]);
                if (!isNaN(start) && !isNaN(end) && start <= end && start >= 1 && end <= maxPages) {
                    for (let i = start; i <= end; i++) {
                        pages.add(i);
                    }
                }
            }
        }
        return Array.from(pages).sort((a, b) => a - b);
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorPanel').classList.remove('hidden');
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MediaPrivacyApp();
});
