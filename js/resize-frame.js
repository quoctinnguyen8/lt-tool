// Palette of 46 colors used in retro games (custom game-dev list)
const PALETTE = [
  "#172038", "#253a5e", "#3c5e8b", "#4f8fba", "#73bed3", "#a4dddb",
  "#19332d", "#25562e", "#468232", "#75a743", "#a8ca58", "#d0da91",
  "#4d2b32", "#7a4841", "#ad7757", "#c09473", "#d7b594", "#e7d5b3",
  "#341c27", "#602c2c", "#884b2b", "#be772b", "#de9e41", "#e8c170",
  "#241527", "#411d31", "#752438", "#a53030", "#cf573c", "#da863e",
  "#1e1d39", "#402751", "#7a367b", "#a23e8c", "#c65197", "#df84a5",
  "#090a14", "#10141f", "#151d28", "#202e37", "#394a50", "#577277",
  "#819796", "#a8b5b2", "#c7cfcc", "#ebede9"
];

const SAMPLES = {
  cat: {
    name: "Mèo Lười (Idle)",
    src: "samples/cat-idle.png",
    frameWidth: 25,
    frameHeight: 36
  },
  dog: {
    name: "Chó Săn (Attack)",
    src: "samples/dog-attack.png",
    frameWidth: 64,
    frameHeight: 64
  },
  slime: {
    name: "Slime (Attack)",
    src: "samples/slime-attack.png",
    frameWidth: 32,
    frameHeight: 32
  }
};

// Global App State
let originalImage = null;
let originalImageData = null;
let zoom = 400; // in percentage
let panX = 0;
let panY = 0;
let isPanning = false;
let startX, startY;

// Image state for canvas resizing
let frameWidth = 16;
let frameHeight = 16;
let targetWidth = 32;
let targetHeight = 32;
let activeAnchor = 'middle-center';
let gridEnabled = true;

// Animation preview state
let isPlaying = true;
let fps = 8;
let lastFrameTime = 0;
let currentFrameIndex = 0;
let cachedProcessedFrames = []; // holds pre-rendered canvases of processed frames
let animationFrameId = null;

// Batch mode variables
let imageFiles = [];
let activeImageId = null;

// DOM Elements
const canvasOrig = document.getElementById('canvasOrig');
const canvasResult = document.getElementById('canvasResult');
const viewportOrig = document.getElementById('viewportOrig');
const viewportResult = document.getElementById('viewportResult');
const zoomSlider = document.getElementById('zoomSlider');
const zoomValue = document.getElementById('zoomValue');
const btnResetView = document.getElementById('btnResetView');
const origDim = document.getElementById('origDim');
const resDim = document.getElementById('resDim');

const frameWidthInput = document.getElementById('frameWidthInput');
const frameHeightInput = document.getElementById('frameHeightInput');
const frameCountText = document.getElementById('frameCountText');

const targetWidthInput = document.getElementById('targetWidthInput');
const targetHeightInput = document.getElementById('targetHeightInput');
const multiplierButtons = document.querySelectorAll('.multiplier-buttons button');
const anchorGridButtons = document.querySelectorAll('.anchor-grid button');

const previewCanvas = document.getElementById('previewCanvas');
const btnPlayPause = document.getElementById('btnPlayPause');
const previewFps = document.getElementById('previewFps');
const previewFpsVal = document.getElementById('previewFpsVal');

const btnDownload = document.getElementById('btnDownload');
const btnDownloadBatch = document.getElementById('btnDownloadBatch');

const presetNameInput = document.getElementById('presetNameInput');
const btnSavePreset = document.getElementById('btnSavePreset');
const presetsContainer = document.getElementById('presetsContainer');

const gridToggle = document.getElementById('gridToggle');
const crtToggle = document.getElementById('crtToggle');
const lightBgToggle = document.getElementById('lightBgToggle');

const batchListSection = document.getElementById('batchListSection');
const batchGrid = document.getElementById('batchGrid');
const notificationBanner = document.getElementById('notificationBanner');

// Initialize app when DOM loaded
document.addEventListener('DOMContentLoaded', () => {
    initViewportInteraction(viewportOrig);
    initViewportInteraction(viewportResult);
    initFileUpload();
    initSamples();
    renderPresets();
    
    // Bind General DOM events
    zoomSlider.addEventListener('input', (e) => {
        zoom = parseInt(e.target.value);
        updateTransforms();
    });
    
    btnResetView.addEventListener('click', resetView);
    btnDownload.addEventListener('click', downloadResult);
    btnDownloadBatch.addEventListener('click', downloadBatch);
    btnSavePreset.addEventListener('click', savePreset);
    
    // Input parameters binding
    frameWidthInput.addEventListener('input', () => {
        frameWidth = Math.max(1, parseInt(frameWidthInput.value) || 1);
        updateFrameCountText();
        processImage();
    });
    frameHeightInput.addEventListener('input', () => {
        frameHeight = Math.max(1, parseInt(frameHeightInput.value) || 1);
        updateFrameCountText();
        processImage();
    });
    
    targetWidthInput.addEventListener('input', () => {
        targetWidth = Math.max(1, parseInt(targetWidthInput.value) || 1);
        deactivateMultiplierButtons();
        processImage();
    });
    targetHeightInput.addEventListener('input', () => {
        targetHeight = Math.max(1, parseInt(targetHeightInput.value) || 1);
        deactivateMultiplierButtons();
        processImage();
    });
    
    // Multiplier buttons
    multiplierButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            multiplierButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const factor = parseFloat(btn.dataset.mul);
            
            targetWidth = Math.round(frameWidth * factor);
            targetHeight = Math.round(frameHeight * factor);
            targetWidthInput.value = targetWidth;
            targetHeightInput.value = targetHeight;
            
            processImage();
        });
    });
    
    // Anchor Grid selection
    anchorGridButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            anchorGridButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeAnchor = btn.dataset.anchor;
            processImage();
        });
    });
    
    // Animation Controls
    btnPlayPause.addEventListener('click', () => {
        isPlaying = !isPlaying;
        btnPlayPause.textContent = isPlaying ? "[ TẠM DỪNG ]" : "[ TIẾP TỤC ]";
    });
    
    previewFps.addEventListener('input', (e) => {
        fps = parseInt(e.target.value);
        previewFpsVal.textContent = fps + 'fps';
    });
    
    // Viewport switch checks
    gridToggle.addEventListener('change', (e) => {
        gridEnabled = e.target.checked;
        drawCanvases(); // redraw grid lines dynamically without reprocessing image coordinates
    });
    
    if (crtToggle) {
        crtToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.classList.add('crt');
            } else {
                document.body.classList.remove('crt');
            }
        });
    }
    
    if (lightBgToggle) {
        // Load initial state
        const savedLightBg = localStorage.getItem('lt_resize_light_bg') === 'true';
        lightBgToggle.checked = savedLightBg;
        if (savedLightBg) {
            viewportOrig.classList.add('light-bg');
            viewportResult.classList.add('light-bg');
            const previewBox = document.querySelector('.preview-viewport-box');
            if (previewBox) previewBox.classList.add('light-bg');
        }
        
        lightBgToggle.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            localStorage.setItem('lt_resize_light_bg', isChecked);
            const previewBox = document.querySelector('.preview-viewport-box');
            if (isChecked) {
                viewportOrig.classList.add('light-bg');
                viewportResult.classList.add('light-bg');
                if (previewBox) previewBox.classList.add('light-bg');
            } else {
                viewportOrig.classList.remove('light-bg');
                viewportResult.classList.remove('light-bg');
                if (previewBox) previewBox.classList.remove('light-bg');
            }
            drawCanvases(); // Redraw grid separator lines to apply dynamic contrast change
        });
    }
    
    // Start animation loop
    requestAnimationFrame(animationLoop);
    
    // Select first sample by default
    const firstSample = document.querySelector('.sample-item');
    if (firstSample) {
        firstSample.click();
    }
});

// Helper to remove active state from multiplier buttons when custom size is typed
function deactivateMultiplierButtons() {
    multiplierButtons.forEach(btn => btn.classList.remove('active'));
}

// Sync Zoom & Pan transforms on both canvases
function updateTransforms() {
    const transformString = `translate(${panX}px, ${panY}px) scale(${zoom / 100})`;
    canvasOrig.style.transform = transformString;
    canvasResult.style.transform = transformString;
    zoomValue.textContent = zoom + "%";
    zoomSlider.value = zoom;
}

function resetView() {
    zoom = 400;
    panX = 0;
    panY = 0;
    updateTransforms();
}

function initViewportInteraction(viewport) {
    viewport.addEventListener('mousedown', (e) => {
        isPanning = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
        viewportOrig.style.cursor = 'grabbing';
        viewportResult.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        panX = e.clientX - startX;
        panY = e.clientY - startY;
        updateTransforms();
    });

    window.addEventListener('mouseup', () => {
        if (isPanning) {
            isPanning = false;
            viewportOrig.style.cursor = 'grab';
            viewportResult.style.cursor = 'grab';
        }
    });

    // Mouse scroll wheel zoom
    viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomStep = 50;
        if (e.deltaY < 0) {
            zoom = Math.min(2000, zoom + zoomStep);
        } else {
            zoom = Math.max(100, zoom - zoomStep);
        }
        updateTransforms();
    }, { passive: false });
}

// Image Loader & Draw
function handleImageLoaded(img) {
    originalImage = img;
    
    // Auto-detect frame size (based on image height)
    frameWidth = img.naturalHeight;
    frameHeight = img.naturalHeight;
    
    // Safeguard for weird wide-only aspect ratios
    if (frameWidth > img.naturalWidth) {
        frameWidth = img.naturalWidth;
    }
    
    frameWidthInput.value = frameWidth;
    frameHeightInput.value = frameHeight;
    
    // Auto-trigger multiplier target calculation (defaults to active multiplier button, which is usually 2x)
    const activeMulBtn = document.querySelector('.multiplier-buttons button.active');
    if (activeMulBtn) {
        const factor = parseFloat(activeMulBtn.dataset.mul);
        targetWidth = Math.round(frameWidth * factor);
        targetHeight = Math.round(frameHeight * factor);
    } else {
        targetWidth = frameWidth * 2;
        targetHeight = frameHeight * 2;
    }
    targetWidthInput.value = targetWidth;
    targetHeightInput.value = targetHeight;
    
    canvasOrig.width = img.naturalWidth;
    canvasOrig.height = img.naturalHeight;
    
    const ctx = canvasOrig.getContext('2d');
    ctx.clearRect(0, 0, canvasOrig.width, canvasOrig.height);
    ctx.drawImage(img, 0, 0);
    
    originalImageData = ctx.getImageData(0, 0, canvasOrig.width, canvasOrig.height);
    
    resetView();
    updateFrameCountText();
    processImage();
}

function updateFrameCountText() {
    if (!originalImage) return;
    const totalW = originalImage.naturalWidth;
    const totalH = originalImage.naturalHeight;
    const count = Math.floor(totalW / frameWidth);
    
    frameCountText.textContent = `Đang phát hiện: ${count} frame (${frameWidth}x${frameHeight}) - Tổng ảnh: ${totalW}x${totalH}`;
}

function drawSampleSprite(key) {
    const sample = SAMPLES[key];
    if (!sample) return;
    
    // Clear batch upload list on sample click
    imageFiles = [];
    activeImageId = null;
    renderBatchGrid();
    
    const img = new Image();
    img.onload = () => {
        originalImage = img;
        // Don't auto-reset frame size to height for samples since we already know their specifications
        frameWidth = sample.frameWidth;
        frameHeight = sample.frameHeight;
        frameWidthInput.value = frameWidth;
        frameHeightInput.value = frameHeight;
        
        const activeMulBtn = document.querySelector('.multiplier-buttons button.active');
        const factor = activeMulBtn ? parseFloat(activeMulBtn.dataset.mul) : 2;
        targetWidth = Math.round(frameWidth * factor);
        targetHeight = Math.round(frameHeight * factor);
        targetWidthInput.value = targetWidth;
        targetHeightInput.value = targetHeight;
        
        canvasOrig.width = img.naturalWidth;
        canvasOrig.height = img.naturalHeight;
        
        const ctx = canvasOrig.getContext('2d');
        ctx.clearRect(0, 0, canvasOrig.width, canvasOrig.height);
        ctx.drawImage(img, 0, 0);
        
        originalImageData = ctx.getImageData(0, 0, canvasOrig.width, canvasOrig.height);
        
        resetView();
        updateFrameCountText();
        processImage();
    };
    img.src = sample.src;
}

function initSamples() {
    const container = document.getElementById('sampleItems');
    container.innerHTML = '';
    
    Object.keys(SAMPLES).forEach(key => {
        const sample = SAMPLES[key];
        const div = document.createElement('div');
        div.className = 'sample-item';
        div.dataset.key = key;
        div.title = sample.name;
        
        const canvas = document.createElement('canvas');
        canvas.width = sample.frameWidth * 2; // draw 2 frames for animation sheet samples
        canvas.height = sample.frameHeight;
        const ctx = canvas.getContext('2d');
        
        const img = new Image();
        img.onload = () => {
            const drawWidth = Math.min(img.naturalWidth, sample.frameWidth * 2);
            ctx.drawImage(
                img,
                0, 0, drawWidth, sample.frameHeight,
                0, 0, drawWidth, sample.frameHeight
            );
        };
        img.src = sample.src;
        
        div.appendChild(canvas);
        
        div.addEventListener('click', () => {
            document.querySelectorAll('.sample-item').forEach(item => item.classList.remove('active'));
            div.classList.add('active');
            drawSampleSprite(key);
        });
        
        container.appendChild(div);
    });
}

// File Upload Logic
function initFileUpload() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    
    dropzone.addEventListener('click', () => fileInput.click());
    
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--accent-neon)';
    });
    
    dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'var(--border-pixel)';
    });
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--border-pixel)';
        if (e.dataTransfer.files.length > 0) {
            handleMultipleFiles(e.dataTransfer.files);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleMultipleFiles(e.target.files);
        }
    });
}

function handleMultipleFiles(files) {
    document.querySelectorAll('.sample-item').forEach(item => item.classList.remove('active'));
    
    let loadedCount = 0;
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    const totalFiles = validFiles.length;
    
    if (totalFiles === 0) {
        showNotification("Không tìm thấy tệp hình ảnh hợp lệ nào!", "error");
        return;
    }
    
    validFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const id = Date.now() + index + Math.random();
                
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = img.naturalWidth;
                tempCanvas.height = img.naturalHeight;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(img, 0, 0);
                const originalData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                
                imageFiles.push({
                    id: id,
                    name: file.name,
                    img: img,
                    originalImageData: originalData
                });
                
                loadedCount++;
                
                if (loadedCount === totalFiles) {
                    const lastItem = imageFiles[imageFiles.length - 1];
                    setActiveImage(lastItem.id);
                    renderBatchGrid();
                    showNotification(`Đã tải lên thành công ${totalFiles} ảnh!`);
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function renderBatchGrid() {
    if (imageFiles.length === 0) {
        batchListSection.style.display = 'none';
        btnDownloadBatch.style.display = 'none';
        return;
    }
    
    batchListSection.style.display = 'block';
    btnDownloadBatch.style.display = 'inline-block';
    btnDownloadBatch.textContent = `[ TẢI VỀ HÀNG LOẠT (${imageFiles.length} ẢNH) ]`;
    
    batchGrid.innerHTML = '';
    imageFiles.forEach(item => {
        const thumb = document.createElement('div');
        thumb.className = `sample-item ${activeImageId === item.id ? 'active' : ''}`;
        thumb.style.position = 'relative';
        thumb.style.width = '64px';
        thumb.style.height = '64px';
        thumb.style.border = activeImageId === item.id ? '3px solid var(--accent-gold)' : '2px dashed var(--border-pixel)';
        thumb.style.backgroundColor = 'var(--bg-panel-light)';
        thumb.style.cursor = 'pointer';
        thumb.title = item.name;
        
        const canvas = document.createElement('canvas');
        canvas.width = item.img.naturalWidth;
        canvas.height = item.img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(item.img, 0, 0);
        
        thumb.appendChild(canvas);
        
        // Delete button
        const delBtn = document.createElement('div');
        delBtn.innerHTML = '×';
        delBtn.style.position = 'absolute';
        delBtn.style.top = '-6px';
        delBtn.style.right = '-6px';
        delBtn.style.width = '16px';
        delBtn.style.height = '16px';
        delBtn.style.backgroundColor = 'var(--accent-red)';
        delBtn.style.color = '#fff';
        delBtn.style.fontSize = '12px';
        delBtn.style.fontWeight = 'bold';
        delBtn.style.display = 'flex';
        delBtn.style.alignItems = 'center';
        delBtn.style.justifyContent = 'center';
        delBtn.style.borderRadius = '50%';
        delBtn.style.border = '1px solid #000';
        delBtn.style.cursor = 'pointer';
        
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeImageFromBatch(item.id);
        });
        
        thumb.appendChild(delBtn);
        
        thumb.addEventListener('click', () => {
            setActiveImage(item.id);
        });
        
        batchGrid.appendChild(thumb);
    });
}

function removeImageFromBatch(id) {
    imageFiles = imageFiles.filter(item => item.id !== id);
    if (activeImageId === id) {
        if (imageFiles.length > 0) {
            setActiveImage(imageFiles[0].id);
        } else {
            activeImageId = null;
            originalImage = null;
            originalImageData = null;
            canvasOrig.width = canvasOrig.height = canvasResult.width = canvasResult.height = 0;
            origDim.textContent = resDim.textContent = '0 x 0';
            
            const firstSample = document.querySelector('#sampleItems .sample-item');
            if (firstSample) firstSample.click();
        }
    }
    renderBatchGrid();
}

function setActiveImage(id) {
    activeImageId = id;
    const item = imageFiles.find(item => item.id === id);
    if (item) {
        originalImage = item.img;
        originalImageData = item.originalImageData;
        
        frameWidth = item.img.naturalHeight;
        frameHeight = item.img.naturalHeight;
        if (frameWidth > item.img.naturalWidth) {
            frameWidth = item.img.naturalWidth;
        }
        frameWidthInput.value = frameWidth;
        frameHeightInput.value = frameHeight;
        
        const activeMulBtn = document.querySelector('.multiplier-buttons button.active');
        const factor = activeMulBtn ? parseFloat(activeMulBtn.dataset.mul) : 2;
        targetWidth = Math.round(frameWidth * factor);
        targetHeight = Math.round(frameHeight * factor);
        targetWidthInput.value = targetWidth;
        targetHeightInput.value = targetHeight;
        
        canvasOrig.width = item.img.naturalWidth;
        canvasOrig.height = item.img.naturalHeight;
        
        const ctx = canvasOrig.getContext('2d');
        ctx.clearRect(0, 0, canvasOrig.width, canvasOrig.height);
        ctx.drawImage(item.img, 0, 0);
        
        resetView();
        updateFrameCountText();
        processImage();
        renderBatchGrid();
    }
}

// Frame extention processing (Pads individual frames and stitches them back together)
function applyResizeToImageData(srcImage, fWidth, fHeight, tWidth, tHeight, anchor) {
    const totalWidth = srcImage.naturalWidth;
    const totalHeight = srcImage.naturalHeight;
    
    // Count frames
    const numFrames = Math.max(1, Math.floor(totalWidth / fWidth));
    
    // Calculate offsets based on 3x3 anchor grid
    const deltaW = tWidth - fWidth;
    const deltaH = tHeight - fHeight;
    
    let xOffset = 0;
    let yOffset = 0;
    
    switch (anchor) {
        case 'top-left':
            xOffset = 0;
            yOffset = 0;
            break;
        case 'top-center':
            xOffset = Math.floor(deltaW / 2);
            yOffset = 0;
            break;
        case 'top-right':
            xOffset = deltaW;
            yOffset = 0;
            break;
        case 'middle-left':
            xOffset = 0;
            yOffset = Math.floor(deltaH / 2);
            break;
        case 'middle-center':
            xOffset = Math.floor(deltaW / 2);
            yOffset = Math.floor(deltaH / 2);
            break;
        case 'middle-right':
            xOffset = deltaW;
            yOffset = Math.floor(deltaH / 2);
            break;
        case 'bottom-left':
            xOffset = 0;
            yOffset = deltaH;
            break;
        case 'bottom-center':
            xOffset = Math.floor(deltaW / 2);
            yOffset = deltaH;
            break;
        case 'bottom-right':
            xOffset = deltaW;
            yOffset = deltaH;
            break;
    }
    
    // Create temporary frame buffers for preview and stitching
    const processedFrames = [];
    
    for (let i = 0; i < numFrames; i++) {
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = tWidth;
        frameCanvas.height = tHeight;
        const frameCtx = frameCanvas.getContext('2d');
        
        // Draw slice of original image onto the frame canvas at offset positions
        frameCtx.drawImage(
            srcImage,
            i * fWidth, 0, fWidth, fHeight, // source slice coordinates
            xOffset, yOffset, fWidth, fHeight // target positioning
        );
        processedFrames.push(frameCanvas);
    }
    
    // Stitch all processed frames back together horizontally
    const stitchedCanvas = document.createElement('canvas');
    stitchedCanvas.width = numFrames * tWidth;
    stitchedCanvas.height = tHeight;
    const stitchedCtx = stitchedCanvas.getContext('2d');
    
    processedFrames.forEach((frameCanvas, i) => {
        stitchedCtx.drawImage(frameCanvas, i * tWidth, 0);
    });
    
    return {
        stitchedCanvas: stitchedCanvas,
        frames: processedFrames
    };
}

// Draw canvas helper lines (Grid frame separator boundaries)
function drawCanvases() {
    if (!originalImage) return;
    
    const count = Math.max(1, Math.floor(originalImage.naturalWidth / frameWidth));
    const isLightBg = lightBgToggle && lightBgToggle.checked;
    
    // 1. Draw original canvas
    const ctxOrig = canvasOrig.getContext('2d');
    ctxOrig.clearRect(0, 0, canvasOrig.width, canvasOrig.height);
    ctxOrig.drawImage(originalImage, 0, 0);
    
    if (gridEnabled && count > 1) {
        ctxOrig.strokeStyle = isLightBg ? 'rgba(180, 0, 0, 0.95)' : 'rgba(255, 51, 51, 0.85)'; // retro deep red in light bg
        ctxOrig.lineWidth = 1;
        ctxOrig.setLineDash([3, 3]);
        
        for (let i = 1; i < count; i++) {
            ctxOrig.beginPath();
            ctxOrig.moveTo(i * frameWidth, 0);
            ctxOrig.lineTo(i * frameWidth, canvasOrig.height);
            ctxOrig.stroke();
        }
    }
    
    // 2. Draw result canvas
    const ctxRes = canvasResult.getContext('2d');
    ctxRes.clearRect(0, 0, canvasResult.width, canvasResult.height);
    
    const resultWidth = count * targetWidth;
    canvasResult.width = resultWidth;
    canvasResult.height = targetHeight;
    resDim.textContent = `${resultWidth} x ${targetHeight}`;
    
    // Stitch cached processed frames into result viewport
    cachedProcessedFrames.forEach((frameCanvas, i) => {
        ctxRes.drawImage(frameCanvas, i * targetWidth, 0);
    });
    
    if (gridEnabled && count > 1) {
        ctxRes.strokeStyle = isLightBg ? 'rgba(0, 80, 200, 0.95)' : 'rgba(255, 215, 0, 0.85)'; // blue divider in light bg
        ctxRes.lineWidth = 1;
        ctxRes.setLineDash([3, 3]);
        
        for (let i = 1; i < count; i++) {
            ctxRes.beginPath();
            ctxRes.moveTo(i * targetWidth, 0);
            ctxRes.lineTo(i * targetWidth, canvasResult.height);
            ctxRes.stroke();
        }
    }
}

// Compute new canvas sizes
function processImage() {
    if (!originalImage) return;
    
    const data = applyResizeToImageData(
        originalImage, 
        frameWidth, 
        frameHeight, 
        targetWidth, 
        targetHeight, 
        activeAnchor
    );
    
    cachedProcessedFrames = data.frames;
    currentFrameIndex = 0;
    
    drawCanvases();
}

// Animation cycle
function animationLoop(timestamp) {
    requestAnimationFrame(animationLoop);
    
    if (!isPlaying || cachedProcessedFrames.length === 0) return;
    
    const elapsed = timestamp - lastFrameTime;
    const interval = 1000 / fps;
    
    if (elapsed >= interval) {
        lastFrameTime = timestamp - (elapsed % interval);
        
        // Draw frame onto preview canvas
        const pCtx = previewCanvas.getContext('2d');
        pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        
        const activeFrame = cachedProcessedFrames[currentFrameIndex];
        if (activeFrame) {
            pCtx.imageSmoothingEnabled = false; // keep retro sharp pixels
            
            // Scale and center frame inside preview box
            const scale = Math.min(previewCanvas.width / targetWidth, previewCanvas.height / targetHeight);
            const drawW = targetWidth * scale;
            const drawH = targetHeight * scale;
            const x = (previewCanvas.width - drawW) / 2;
            const y = (previewCanvas.height - drawH) / 2;
            
            pCtx.drawImage(activeFrame, x, y, drawW, drawH);
        }
        
        currentFrameIndex = (currentFrameIndex + 1) % cachedProcessedFrames.length;
    }
}

// Download Result PNG
function downloadResult() {
    if (cachedProcessedFrames.length === 0) {
        showNotification("Không có ảnh để tải về!", "error");
        return;
    }
    
    // Stitch cached frames to output clean PNG without grid helper lines
    const stitchCanvas = document.createElement('canvas');
    stitchCanvas.width = cachedProcessedFrames.length * targetWidth;
    stitchCanvas.height = targetHeight;
    const sCtx = stitchCanvas.getContext('2d');
    
    cachedProcessedFrames.forEach((frameCanvas, i) => {
        sCtx.drawImage(frameCanvas, i * targetWidth, 0);
    });
    
    const link = document.createElement('a');
    link.download = 'sprite_resized.png';
    link.href = stitchCanvas.toDataURL('image/png');
    link.click();
    showNotification("Đã tải tệp sprite_resized.png thành công!");
}

// Download batch files sequentially with timeout delays
async function downloadBatch() {
    if (imageFiles.length === 0) {
        showNotification("Không có ảnh nào trong hàng loạt để tải!", "error");
        return;
    }
    
    showNotification("Đang tải hàng loạt... Vui lòng cho phép trình duyệt tải xuống nhiều tệp.", "info");
    
    for (let index = 0; index < imageFiles.length; index++) {
        const item = imageFiles[index];
        
        // Use individual height to detect frame size for this file
        let fW = item.img.naturalHeight;
        let fH = item.img.naturalHeight;
        if (fW > item.img.naturalWidth) {
            fW = item.img.naturalWidth;
        }
        
        // Multiplier factor calculations
        const factorW = targetWidth / frameWidth;
        const factorH = targetHeight / frameHeight;
        
        const tW = Math.round(fW * factorW);
        const tH = Math.round(fH * factorH);
        
        const data = applyResizeToImageData(item.img, fW, fH, tW, tH, activeAnchor);
        
        const stitchCanvas = document.createElement('canvas');
        stitchCanvas.width = data.frames.length * tW;
        stitchCanvas.height = tH;
        const sCtx = stitchCanvas.getContext('2d');
        
        data.frames.forEach((frameCanvas, i) => {
            sCtx.drawImage(frameCanvas, i * tW, 0);
        });
        
        await new Promise(resolve => {
            setTimeout(() => {
                const link = document.createElement('a');
                const originalName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
                link.download = `${originalName}_resized.png`;
                link.href = stitchCanvas.toDataURL('image/png');
                link.click();
                resolve();
            }, index * 200);
        });
    }
    
    showNotification(`Đã tải về thành công ${imageFiles.length} ảnh!`);
}

// Preset management
function savePreset() {
    const name = presetNameInput.value.trim();
    if (!name) {
        showNotification("Vui lòng nhập tên cho Preset!", "error");
        return;
    }
    
    const presetData = {
        mode: 'resize',
        frameWidth: frameWidth,
        frameHeight: frameHeight,
        targetWidth: targetWidth,
        targetHeight: targetHeight,
        activeAnchor: activeAnchor
    };
    
    const savedPresets = JSON.parse(localStorage.getItem('lt_sprite_resize_presets') || '{}');
    savedPresets[name] = presetData;
    localStorage.setItem('lt_sprite_resize_presets', JSON.stringify(savedPresets));
    
    presetNameInput.value = '';
    showNotification(`Đã lưu thiết lập "${name}" thành công!`);
    renderPresets();
}

function renderPresets() {
    presetsContainer.innerHTML = '';
    const savedPresets = JSON.parse(localStorage.getItem('lt_sprite_resize_presets') || '{}');
    const names = Object.keys(savedPresets);
    
    if (names.length === 0) {
        presetsContainer.innerHTML = `<div style="color: #6c758f; text-align: center; padding: 20px 0; font-size: 0.9rem;">Chưa có Preset nào được lưu.</div>`;
        return;
    }
    
    names.forEach(name => {
        const item = document.createElement('div');
        item.className = 'preset-item';
        
        item.innerHTML = `
            <span class="preset-name">${name}</span>
            <div class="preset-actions">
                <button class="btn-preset-delete" data-name="${name}">[XÓA]</button>
            </div>
        `;
        
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-preset-delete')) return;
            loadPreset(name);
        });
        
        item.querySelector('.btn-preset-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            deletePreset(name);
        });
        
        presetsContainer.appendChild(item);
    });
}

function loadPreset(name) {
    const savedPresets = JSON.parse(localStorage.getItem('lt_sprite_resize_presets') || '{}');
    const presetData = savedPresets[name];
    if (!presetData) return;
    
    frameWidth = presetData.frameWidth || 16;
    frameHeight = presetData.frameHeight || 16;
    targetWidth = presetData.targetWidth || 32;
    targetHeight = presetData.targetHeight || 32;
    activeAnchor = presetData.activeAnchor || 'middle-center';
    
    frameWidthInput.value = frameWidth;
    frameHeightInput.value = frameHeight;
    targetWidthInput.value = targetWidth;
    targetHeightInput.value = targetHeight;
    
    // Update Multiplier buttons active state
    deactivateMultiplierButtons();
    multiplierButtons.forEach(btn => {
        const factor = parseFloat(btn.dataset.mul);
        if (Math.round(frameWidth * factor) === targetWidth && Math.round(frameHeight * factor) === targetHeight) {
            btn.classList.add('active');
        }
    });
    
    // Update Anchor buttons active state
    anchorGridButtons.forEach(btn => {
        if (btn.dataset.anchor === activeAnchor) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    updateFrameCountText();
    processImage();
    showNotification(`Đã áp dụng mẫu "${name}"!`);
}

function deletePreset(name) {
    const savedPresets = JSON.parse(localStorage.getItem('lt_sprite_resize_presets') || '{}');
    delete savedPresets[name];
    localStorage.setItem('lt_sprite_resize_presets', JSON.stringify(savedPresets));
    renderPresets();
    showNotification(`Đã xóa mẫu "${name}".`);
}

// Notification Banner Trigger
function showNotification(message, type = 'success') {
    notificationBanner.textContent = message;
    notificationBanner.className = 'notification-banner active';
    
    if (type === 'error') {
        notificationBanner.style.backgroundColor = 'var(--accent-red)';
        notificationBanner.style.color = '#fff';
    } else if (type === 'info') {
        notificationBanner.style.backgroundColor = 'var(--accent-blue)';
        notificationBanner.style.color = '#000';
    } else {
        notificationBanner.style.backgroundColor = 'var(--accent-neon)';
        notificationBanner.style.color = '#000';
    }
    
    if (window.notificationTimeout) clearTimeout(window.notificationTimeout);
    window.notificationTimeout = setTimeout(() => {
        notificationBanner.classList.remove('active');
    }, 3000);
}
