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

// Sample Sprite definitions drawn dynamically using 16x16 color grids
const SAMPLES = {
  potion: {
    name: "Bình Máu Potion",
    width: 16,
    height: 16,
    palette: {
      '.': 'transparent',
      'k': '#10141f', // outline
      'c': '#ad7757', // cork
      'g': '#819796', // glass
      'w': '#ebede9', // glass shine
      'f': '#a53030', // potion red
      'l': '#cf573c', // potion light red
      'd': '#752438', // potion dark red
      'b': '#df84a5', // bubble
    },
    data: [
      "......kkkk......",
      ".....kcccck.....",
      ".....kcccck.....",
      "......kkkk......",
      "....kkggggkk....",
      "....kggwwggggk..",
      "...kggwwddffddk.",
      "..kggwwddffffddk",
      "..kggwddffffffdk",
      "..kggdfffffffffk",
      "..kggdffffbbfffk",
      "..kggdfffffffffk",
      "..kggldfffffflfk",
      "...kggldddffddk.",
      "....kggllddddk..",
      ".....kkkkkkkk..."
    ]
  },
  sword: {
    name: "Kiếm Hiệp Sĩ",
    width: 16,
    height: 16,
    palette: {
      '.': 'transparent',
      'k': '#10141f', // outline
      's': '#819796', // steel
      'm': '#577277', // mid steel
      'w': '#ebede9', // white shine
      'g': '#de9e41', // gold hilt
      'h': '#be772b', // dark gold hilt
      'r': '#a53030', // red gem
      'b': '#4d2b32', // dark grip
    },
    data: [
      "............wwkk",
      "...........wwskk",
      "..........wwskk.",
      ".........wwskk..",
      "........wwskk...",
      ".......wwskk....",
      "......wwskk.....",
      ".....wwskk......",
      "....wwskk.......",
      "...wwskk........",
      "..kghhkk........",
      ".krghgk.........",
      "kbbkkhk.........",
      "kk..krk.........",
      ".....kk.........",
      "................"
    ]
  },
  shield: {
    name: "Khiên Hoàng Gia",
    width: 16,
    height: 16,
    palette: {
      '.': 'transparent',
      'k': '#10141f', // outline
      'b': '#402751', // blue-purple center
      'l': '#7a367b', // light blue-purple
      's': '#819796', // steel rim
      'w': '#ebede9', // shine rim
      'd': '#394a50', // dark steel rim
      'g': '#ffd700', // gold gem
      'y': '#de9e41', // gold rim
    },
    data: [
      "....kkkkkkkk....",
      "  kwwssssssddk  ",
      " kwwssssssssddk ",
      "kwwssyyyyyyssddk",
      "kwsybbllggbbysdk",
      "kwsybllllggbysdk",
      "kwsybllllllbysdk",
      "kwsybllllllbysdk",
      "kwsybllllllbysdk",
      " kwsybllllbysdk ",
      " kwsybllllbysdk ",
      "  kwsybllbysdk  ",
      "   kwsybysdk    ",
      "    kwsbsdk     ",
      "     kwsdk      ",
      "      kkk       "
    ]
  }
};

// Global App State
let originalImage = null;
let originalImageData = null;
let rules = [];
let zoom = 400; // in percentage
let panX = 0;
let panY = 0;
let isPanning = false;
let startX, startY;
let activePickingRuleId = null;
let activePopoverRuleId = null;
let ruleIdCounter = 0;

let recolorMode = 'global'; // default to global recolor mode
let globalSubMode = 'tint'; // sub-mode: 'tint' or 'hueshift'
let globalColor = '#172038';
let globalStrength = 100;
let globalColorizeWhite = false;
let globalHueShiftAngle = 0; // range: -180 to 180
let originalDominantColors = []; // stores top dominant colors extracted from loaded image

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
const rulesList = document.getElementById('rulesList');
const btnAddRule = document.getElementById('btnAddRule');
const btnDownload = document.getElementById('btnDownload');
const btnDownloadBatch = document.getElementById('btnDownloadBatch');
const btnClearRules = document.getElementById('btnClearRules');
const presetNameInput = document.getElementById('presetNameInput');
const btnSavePreset = document.getElementById('btnSavePreset');
const presetsContainer = document.getElementById('presetsContainer');
const palettePopover = document.getElementById('palettePopover');
const paletteGrid = document.getElementById('paletteGrid');
const notificationBanner = document.getElementById('notificationBanner');

const btnModeRules = document.getElementById('btnModeRules');
const btnModeGlobal = document.getElementById('btnModeGlobal');
const globalTintBox = document.getElementById('globalTintBox');
const globalReplacePreview = document.getElementById('globalReplacePreview');
const globalReplaceInput = document.getElementById('globalReplaceInput');
const globalTintStrengthEl = document.getElementById('globalTintStrength');
const globalTintStrengthValEl = document.getElementById('globalTintStrengthVal');
const globalColorizeWhiteEl = document.getElementById('globalColorizeWhite');

// Sub-mode and Hue Shift Elements
const btnSubModeTint = document.getElementById('btnSubModeTint');
const btnSubModeHueShift = document.getElementById('btnSubModeHueShift');
const globalTintSubContainer = document.getElementById('globalTintSubContainer');
const globalHueShiftSubContainer = document.getElementById('globalHueShiftSubContainer');
const globalHueShiftAngleEl = document.getElementById('globalHueShiftAngle');
const globalHueShiftAngleValEl = document.getElementById('globalHueShiftAngleVal');
const globalStrengthLabel = document.getElementById('globalStrengthLabel');

const batchListSection = document.getElementById('batchListSection');
const batchGrid = document.getElementById('batchGrid');

// Initialize app when DOM loaded
document.addEventListener('DOMContentLoaded', () => {
    initViewportInteraction(viewportOrig);
    initViewportInteraction(viewportResult);
    initFileUpload();
    initPalettePopover();
    initSamples();
    renderPresets();
    
    // Bind General DOM events
    zoomSlider.addEventListener('input', (e) => {
        zoom = parseInt(e.target.value);
        updateTransforms();
    });
    
    btnResetView.addEventListener('click', resetView);
    btnAddRule.addEventListener('click', () => addNewRule());
    btnDownload.addEventListener('click', downloadResult);
    btnDownloadBatch.addEventListener('click', downloadBatch);
    btnClearRules.addEventListener('click', clearAllRules);
    btnSavePreset.addEventListener('click', savePreset);
    
    // Canvas click for Eyedropper
    canvasOrig.addEventListener('click', handleCanvasClick);
    
    // Mode switcher buttons
    btnModeRules.addEventListener('click', () => setRecolorMode('rules'));
    btnModeGlobal.addEventListener('click', () => setRecolorMode('global'));
    
    // Global tint events
    globalReplacePreview.addEventListener('click', (e) => {
        e.stopPropagation();
        showPalettePopoverForGlobal(e.target);
    });
    globalReplaceInput.addEventListener('click', (e) => {
        e.stopPropagation();
        showPalettePopoverForGlobal(e.target);
    });
    globalTintStrengthEl.addEventListener('input', (e) => {
        globalStrength = parseInt(e.target.value);
        globalTintStrengthValEl.textContent = globalStrength + '%';
        processImage();
    });
    globalColorizeWhiteEl.addEventListener('change', (e) => {
        globalColorizeWhite = e.target.checked;
        processImage();
    });
    
    // Sub-mode switches
    btnSubModeTint.addEventListener('click', () => setGlobalSubMode('tint'));
    btnSubModeHueShift.addEventListener('click', () => setGlobalSubMode('hueshift'));
    globalHueShiftAngleEl.addEventListener('input', (e) => {
        globalHueShiftAngle = parseInt(e.target.value);
        globalHueShiftAngleValEl.textContent = (globalHueShiftAngle >= 0 ? '+' : '') + globalHueShiftAngle + '°';
        processImage();
    });
    
    // Light background toggle
    const lightBgToggle = document.getElementById('lightBgToggle');
    if (lightBgToggle) {
        // Load initial state
        const savedLightBg = localStorage.getItem('lt_recolor_light_bg') === 'true';
        lightBgToggle.checked = savedLightBg;
        if (savedLightBg) {
            viewportOrig.classList.add('light-bg');
            viewportResult.classList.add('light-bg');
        }
        
        lightBgToggle.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            localStorage.setItem('lt_recolor_light_bg', isChecked);
            if (isChecked) {
                viewportOrig.classList.add('light-bg');
                viewportResult.classList.add('light-bg');
            } else {
                viewportOrig.classList.remove('light-bg');
                viewportResult.classList.remove('light-bg');
            }
        });
    }

    // Close popover on click outside
    window.addEventListener('click', handleOutsideClick);
    
    // Initialize default mode visually
    setRecolorMode('global');
});

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
        // If we are in eyedropper mode and click on original canvas, handle eyedropper instead of pan
        if (activePickingRuleId !== null && viewport.id === 'viewportOrig') {
            return;
        }
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
            viewportOrig.style.cursor = activePickingRuleId !== null ? 'crosshair' : 'grab';
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
    canvasOrig.width = img.naturalWidth;
    canvasOrig.height = img.naturalHeight;
    canvasResult.width = img.naturalWidth;
    canvasResult.height = img.naturalHeight;
    
    origDim.textContent = `${img.naturalWidth} x ${img.naturalHeight}`;
    resDim.textContent = `${img.naturalWidth} x ${img.naturalHeight}`;
    
    const ctx = canvasOrig.getContext('2d');
    ctx.clearRect(0, 0, canvasOrig.width, canvasOrig.height);
    ctx.drawImage(img, 0, 0);
    
    originalImageData = ctx.getImageData(0, 0, canvasOrig.width, canvasOrig.height);
    
    resetView();
    extractDominantColors(originalImageData);
    processImage();
}

function drawSampleSprite(key) {
    const sample = SAMPLES[key];
    if (!sample) return;
    
    // Clear batch upload list on sample click
    imageFiles = [];
    activeImageId = null;
    renderBatchGrid();
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = sample.width;
    tempCanvas.height = sample.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    sample.data.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
            const char = row[x];
            if (char !== '.' && char !== ' ') {
                const color = sample.palette[char] || 'transparent';
                tempCtx.fillStyle = color;
                tempCtx.fillRect(x, y, 1, 1);
            }
        }
    });
    
    const img = new Image();
    img.onload = () => handleImageLoaded(img);
    img.src = tempCanvas.toDataURL();
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
        canvas.width = sample.width;
        canvas.height = sample.height;
        const ctx = canvas.getContext('2d');
        
        sample.data.forEach((row, y) => {
            for (let x = 0; x < row.length; x++) {
                const char = row[x];
                if (char !== '.' && char !== ' ') {
                    ctx.fillStyle = sample.palette[char] || 'transparent';
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        });
        
        div.appendChild(canvas);
        
        div.addEventListener('click', () => {
            document.querySelectorAll('.sample-item').forEach(item => item.classList.remove('active'));
            div.classList.add('active');
            drawSampleSprite(key);
        });
        
        container.appendChild(div);
    });
    
    // Select first sample by default
    const firstSample = container.querySelector('.sample-item');
    if (firstSample) {
        firstSample.click();
    }
}

// File Upload Logic (Supports multiple files)
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
    // Clear sample active status
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
                
                // Create temporary canvas to extract ImageData
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
                    // Set active to the last uploaded file in this batch
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
            document.getElementById('dominantColorsBar').style.display = 'none';
            
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
        
        canvasOrig.width = item.img.naturalWidth;
        canvasOrig.height = item.img.naturalHeight;
        canvasResult.width = item.img.naturalWidth;
        canvasResult.height = item.img.naturalHeight;
        
        origDim.textContent = `${item.img.naturalWidth} x ${item.img.naturalHeight}`;
        resDim.textContent = `${item.img.naturalWidth} x ${item.img.naturalHeight}`;
        
        const ctx = canvasOrig.getContext('2d');
        ctx.clearRect(0, 0, canvasOrig.width, canvasOrig.height);
        ctx.drawImage(item.img, 0, 0);
        
        resetView();
        extractDominantColors(originalImageData);
        processImage();
        renderBatchGrid();
    }
}

// Extract dominant colors from loaded image
function extractDominantColors(imgData) {
    const data = imgData.data;
    const colorCounts = {};
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        const a = data[i+3];
        
        if (a < 128) continue; // Skip transparency
        
        const hex = rgbToHex(r, g, b);
        colorCounts[hex] = (colorCounts[hex] || 0) + 1;
    }
    
    const sortedColors = Object.keys(colorCounts).sort((a, b) => colorCounts[b] - colorCounts[a]);
    originalDominantColors = sortedColors.slice(0, 12);
    
    renderDominantColors();
}

// Render dominant colors grid, filtering out already chosen target colors
function renderDominantColors() {
    const container = document.getElementById('dominantColorsBar');
    const grid = document.getElementById('dominantColorsGrid');
    
    if (originalDominantColors.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    // Filter out colors that are already chosen as targetColor in any rule
    const activeTargetColors = new Set(rules.map(r => r.targetColor.toLowerCase()));
    const displayColors = originalDominantColors.filter(color => !activeTargetColors.has(color.toLowerCase()));
    
    if (displayColors.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = (recolorMode === 'rules') ? 'block' : 'none';
    grid.innerHTML = '';
    
    displayColors.forEach(color => {
        const chip = document.createElement('div');
        chip.className = 'palette-color-chip';
        chip.style.backgroundColor = color;
        chip.style.width = '24px';
        chip.style.height = '24px';
        chip.style.border = '2px solid #000';
        chip.style.cursor = 'pointer';
        chip.title = `Nhấp chọn làm màu gốc (${color})`;
        
        chip.addEventListener('click', () => {
            if (activePickingRuleId !== null) {
                updateRuleTargetColor(activePickingRuleId, color);
                deactivateEyedropper();
            } else {
                addNewRule(color);
            }
        });
        
        grid.appendChild(chip);
    });
}

// Eyedropper Selection Click Handler
function handleCanvasClick(e) {
    if (activePickingRuleId === null) return;
    
    const rect = canvasOrig.getBoundingClientRect();
    const scaleX = canvasOrig.width / rect.width;
    const scaleY = canvasOrig.height / rect.height;
    
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    
    if (x >= 0 && x < canvasOrig.width && y >= 0 && y < canvasOrig.height) {
        const ctx = canvasOrig.getContext('2d');
        const imgData = ctx.getImageData(x, y, 1, 1);
        const r = imgData.data[0];
        const g = imgData.data[1];
        const b = imgData.data[2];
        const a = imgData.data[3];
        
        if (a > 10) {
            const hex = rgbToHex(r, g, b);
            updateRuleTargetColor(activePickingRuleId, hex);
        } else {
            showNotification("Vui lòng click chọn vùng màu có thể thấy!", "error");
        }
    }
    deactivateEyedropper();
}

function activateEyedropper(ruleId) {
    deactivateEyedropper();
    activePickingRuleId = ruleId;
    
    const ruleCard = document.querySelector(`.rule-item[data-id="${ruleId}"]`);
    if (ruleCard) {
        ruleCard.classList.add('active-picking');
        const eyeBtn = ruleCard.querySelector('.btn-eyedropper');
        if (eyeBtn) eyeBtn.classList.add('active');
    }
    
    viewportOrig.classList.add('eyedropper-active');
    viewportOrig.style.cursor = 'crosshair';
    showNotification("Hút màu: Hãy nhấp vào màu mong muốn ở hình SPRITE GỐC!", "info");
}

function deactivateEyedropper() {
    if (activePickingRuleId !== null) {
        const ruleCard = document.querySelector(`.rule-item[data-id="${activePickingRuleId}"]`);
        if (ruleCard) {
            ruleCard.classList.remove('active-picking');
            const eyeBtn = ruleCard.querySelector('.btn-eyedropper');
            if (eyeBtn) eyeBtn.classList.remove('active');
        }
    }
    activePickingRuleId = null;
    viewportOrig.classList.remove('eyedropper-active');
    viewportOrig.style.cursor = 'grab';
}

function updateRuleTargetColor(ruleId, hexColor) {
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
        rule.targetColor = hexColor;
        renderRules();
        renderDominantColors();
        processImage();
    }
}

// Rule Management
function renderRules() {
    rulesList.innerHTML = '';
    if (rules.length === 0) {
        rulesList.innerHTML = `
            <div style="color: #6c758f; text-align: center; padding: 25px; font-size: 0.9rem; border: 2px dashed var(--border-pixel); background-color: var(--bg-panel-light);">
                Chưa có quy tắc nào. Hãy bấm [+ THÊM] ở trên!
            </div>
        `;
        return;
    }
    
    rules.forEach((rule, index) => {
        const ruleItem = document.createElement('div');
        ruleItem.className = `rule-item ${activePickingRuleId === rule.id ? 'active-picking' : ''}`;
        ruleItem.dataset.id = rule.id;
        
        ruleItem.innerHTML = `
            <div class="rule-header">
                <span>QUY TẮC #${index + 1}</span>
                <button class="btn-remove-rule" id="remove-btn-${rule.id}">[XÓA]</button>
            </div>
            
            <div class="rule-color-pickers">
                <!-- Target color -->
                <div class="color-input-group">
                    <label>MÀU GỐC</label>
                    <div class="picker-row">
                        <div class="color-preview-box" id="target-preview-${rule.id}" style="background-color: ${rule.targetColor};"></div>
                        <input type="text" class="color-hex-input" id="target-input-${rule.id}" value="${rule.targetColor}" maxlength="7" style="width: 75px;">
                        <button class="btn-eyedropper ${activePickingRuleId === rule.id ? 'active' : ''}" id="eyedropper-${rule.id}" title="Hút màu từ ảnh">🧪</button>
                    </div>
                </div>
                
                <div style="font-family: var(--font-pixel); font-size: 0.8rem; color: var(--accent-gold); margin-top: 15px;">➡️</div>
                
                <!-- Replacement color -->
                <div class="color-input-group">
                    <label>MÀU MỚI</label>
                    <div class="picker-row">
                        <div class="color-preview-box" id="replace-preview-${rule.id}" style="background-color: ${rule.replacementColor}; cursor: pointer;" title="Chọn màu mới từ bảng 46 màu"></div>
                        <input type="text" class="color-hex-input" id="replace-input-${rule.id}" value="${rule.replacementColor}" readonly style="cursor: pointer; width: 75px;" title="Chọn màu mới từ bảng 46 màu">
                    </div>
                </div>
            </div>
            
            <div class="rule-adjustments">
                <div class="adjustment-row">
                    <label>ĐỘ LỆCH (TOLERANCE):</label>
                    <div class="tolerance-input-container">
                        <input type="range" class="tolerance-slider" id="tolerance-${rule.id}" min="0" max="100" value="${rule.tolerance}">
                        <span class="tolerance-value" id="tolerance-val-${rule.id}">${rule.tolerance}%</span>
                    </div>
                </div>
                <div class="adjustment-row">
                    <label>BẢO TOÀN BÓNG (SHADING):</label>
                    <div class="toggle-retro toggle-shading">
                        <input type="checkbox" id="shading-${rule.id}" ${rule.shadingMode === 'preserve' ? 'checked' : ''}>
                        <label for="shading-${rule.id}" class="toggle-slider"></label>
                    </div>
                </div>
            </div>
        `;
        
        rulesList.appendChild(ruleItem);
        
        // Add event listeners inside rules manager
        ruleItem.querySelector(`#remove-btn-${rule.id}`).addEventListener('click', () => removeRule(rule.id));
        
        const targetInput = ruleItem.querySelector(`#target-input-${rule.id}`);
        targetInput.addEventListener('change', (e) => {
            let val = e.target.value.trim();
            if (!val.startsWith('#')) val = '#' + val;
            if (/^#[0-9A-F]{6}$/i.test(val)) {
                rule.targetColor = val;
                ruleItem.querySelector(`#target-preview-${rule.id}`).style.backgroundColor = val;
                renderDominantColors();
                processImage();
            } else {
                e.target.value = rule.targetColor;
                showNotification("Mã màu Hex phải có dạng #RRGGBB!", "error");
            }
        });
        
        ruleItem.querySelector(`#eyedropper-${rule.id}`).addEventListener('click', () => {
            if (activePickingRuleId === rule.id) {
                deactivateEyedropper();
            } else {
                activateEyedropper(rule.id);
            }
        });
        
        const openPopover = (e) => {
            e.stopPropagation();
            showPalettePopover(rule.id, e.target);
        };
        ruleItem.querySelector(`#replace-preview-${rule.id}`).addEventListener('click', openPopover);
        ruleItem.querySelector(`#replace-input-${rule.id}`).addEventListener('click', openPopover);
        
        const toleranceSlider = ruleItem.querySelector(`#tolerance-${rule.id}`);
        toleranceSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            rule.tolerance = val;
            ruleItem.querySelector(`#tolerance-val-${rule.id}`).textContent = val + '%';
            processImage();
        });
        
        const shadingCheckbox = ruleItem.querySelector(`#shading-${rule.id}`);
        shadingCheckbox.addEventListener('change', (e) => {
            rule.shadingMode = e.target.checked ? 'preserve' : 'exact';
            processImage();
        });
    });
}

function addNewRule(targetColor = "#ffffff") {
    const id = Date.now() + ruleIdCounter++;
    rules.push({
        id: id,
        targetColor: targetColor,
        replacementColor: PALETTE[0],
        tolerance: 15,
        shadingMode: 'preserve'
    });
    renderRules();
    renderDominantColors();
    processImage();
}

function removeRule(id) {
    if (activePickingRuleId === id) deactivateEyedropper();
    rules = rules.filter(r => r.id !== id);
    renderRules();
    renderDominantColors();
    processImage();
}

function clearAllRules() {
    deactivateEyedropper();
    rules = [];
    renderRules();
    renderDominantColors();
    processImage();
    showNotification("Đã xóa sạch các quy tắc!");
}

// 46-Color Palette Popover Selection
function initPalettePopover() {
    paletteGrid.innerHTML = '';
    PALETTE.forEach(color => {
        const chip = document.createElement('div');
        chip.className = 'palette-color-chip';
        chip.style.backgroundColor = color;
        chip.dataset.color = color;
        chip.title = color;
        
        chip.addEventListener('click', () => {
            if (activePopoverRuleId !== null) {
                if (activePopoverRuleId === 'global') {
                    globalColor = color;
                    globalReplacePreview.style.backgroundColor = color;
                    globalReplaceInput.value = color;
                    processImage();
                } else {
                    const rule = rules.find(r => r.id === activePopoverRuleId);
                    if (rule) {
                        rule.replacementColor = color;
                        renderRules();
                        processImage();
                    }
                }
            }
            palettePopover.classList.remove('active');
            activePopoverRuleId = null;
        });
        
        paletteGrid.appendChild(chip);
    });
}

function showPalettePopover(ruleId, anchorElement) {
    activePopoverRuleId = ruleId;
    const rect = anchorElement.getBoundingClientRect();
    palettePopover.style.top = (rect.bottom + window.scrollY + 5) + 'px';
    palettePopover.style.left = Math.min(window.innerWidth - 270, Math.max(10, rect.left + window.scrollX - 50)) + 'px';
    palettePopover.classList.add('active');
    
    // Highlight active chip
    const currentRule = rules.find(r => r.id === ruleId);
    const chips = palettePopover.querySelectorAll('.palette-color-chip');
    chips.forEach(chip => {
        if (chip.dataset.color.toLowerCase() === currentRule.replacementColor.toLowerCase()) {
            chip.style.outline = '3px solid var(--accent-neon)';
            chip.style.outlineOffset = '1px';
        } else {
            chip.style.outline = 'none';
        }
    });
}

function showPalettePopoverForGlobal(anchorElement) {
    activePopoverRuleId = 'global';
    const rect = anchorElement.getBoundingClientRect();
    palettePopover.style.top = (rect.bottom + window.scrollY + 5) + 'px';
    palettePopover.style.left = Math.min(window.innerWidth - 270, Math.max(10, rect.left + window.scrollX - 50)) + 'px';
    palettePopover.classList.add('active');
    
    // Highlight active chip
    const chips = palettePopover.querySelectorAll('.palette-color-chip');
    chips.forEach(chip => {
        if (chip.dataset.color.toLowerCase() === globalColor.toLowerCase()) {
            chip.style.outline = '3px solid var(--accent-neon)';
            chip.style.outlineOffset = '1px';
        } else {
            chip.style.outline = 'none';
        }
    });
}

function handleOutsideClick(e) {
    // Hide popover
    if (activePopoverRuleId !== null && 
        !palettePopover.contains(e.target) && 
        !e.target.id.startsWith('replace-preview-') && 
        !e.target.id.startsWith('replace-input-') &&
        e.target.id !== 'globalReplacePreview' &&
        e.target.id !== 'globalReplaceInput') {
        palettePopover.classList.remove('active');
        activePopoverRuleId = null;
    }
}

// Shared Image Recoloring Engine (returns new ImageData)
function applyRecolorToImageData(srcImageData, ctx) {
    const w = srcImageData.width;
    const h = srcImageData.height;
    const resultImageData = ctx.createImageData(w, h);
    
    const src = srcImageData.data;
    const dst = resultImageData.data;
    
    if (recolorMode === 'global') {
        const s = globalStrength / 100;
        
        if (globalSubMode === 'hueshift') {
            const shift = globalHueShiftAngle / 360;
            
            for (let i = 0; i < src.length; i += 4) {
                const r = src[i];
                const g = src[i+1];
                const b = src[i+2];
                const a = src[i+3];
                
                dst[i] = r;
                dst[i+1] = g;
                dst[i+2] = b;
                dst[i+3] = a;
                
                if (a < 10) continue; // Transparency preservation
                
                const pixHsl = rgbToHsl(r, g, b);
                let h = pixHsl[0];
                const ns = pixHsl[1];
                const nl = pixHsl[2];
                
                // Shift Hue and wrap around [0, 1]
                h = (h + shift) % 1.0;
                if (h < 0) h += 1.0;
                
                const rgb = hslToRgb(h, ns, nl);
                
                // Blend with original pixel according to strength
                dst[i] = Math.round(r * (1 - s) + rgb[0] * s);
                dst[i+1] = Math.round(g * (1 - s) + rgb[1] * s);
                dst[i+2] = Math.round(b * (1 - s) + rgb[2] * s);
            }
        } else {
            const rep = hexToRgb(globalColor);
            if (!rep) return srcImageData;
            const repHsl = rgbToHsl(rep.r, rep.g, rep.b);
            
            for (let i = 0; i < src.length; i += 4) {
                const r = src[i];
                const g = src[i+1];
                const b = src[i+2];
                const a = src[i+3];
                
                dst[i] = r;
                dst[i+1] = g;
                dst[i+2] = b;
                dst[i+3] = a;
                
                if (a < 10) continue; // Transparency preservation
                
                const pixHsl = rgbToHsl(r, g, b);
                const nh = repHsl[0];
                const ns = repHsl[1];
                let nl = pixHsl[2]; // Keep original pixel's lightness
                
                if (globalColorizeWhite) {
                    nl = nl * repHsl[2]; // Map white (1.0) to replacement color lightness
                }
                
                const rgb = hslToRgb(nh, ns, nl);
                
                // Blend original color with tinted color based on strength
                dst[i] = Math.round(r * (1 - s) + rgb[0] * s);
                dst[i+1] = Math.round(g * (1 - s) + rgb[1] * s);
                dst[i+2] = Math.round(b * (1 - s) + rgb[2] * s);
            }
        }
    } else {
        const preparedRules = rules.map(rule => {
            const trg = hexToRgb(rule.targetColor);
            const rep = hexToRgb(rule.replacementColor);
            if (!trg || !rep) return null;
            
            return {
                ...rule,
                trg,
                rep,
                trgHsl: rgbToHsl(trg.r, trg.g, trg.b),
                repHsl: rgbToHsl(rep.r, rep.g, rep.b),
                threshold: 442 * (rule.tolerance / 100)
            };
        }).filter(r => r !== null);
        
        for (let i = 0; i < src.length; i += 4) {
            const r = src[i];
            const g = src[i+1];
            const b = src[i+2];
            const a = src[i+3];
            
            dst[i] = r;
            dst[i+1] = g;
            dst[i+2] = b;
            dst[i+3] = a;
            
            if (a < 10) continue; // Transparency preservation
            
            for (const rule of preparedRules) {
                const dist = Math.sqrt(
                    Math.pow(r - rule.trg.r, 2) +
                    Math.pow(g - rule.trg.g, 2) +
                    Math.pow(b - rule.trg.b, 2)
                );
                
                if (dist <= rule.threshold) {
                    if (rule.shadingMode === 'exact') {
                        dst[i] = rule.rep.r;
                        dst[i+1] = rule.rep.g;
                        dst[i+2] = rule.rep.b;
                    } else {
                        const pixHsl = rgbToHsl(r, g, b);
                        const nh = rule.repHsl[0];
                        const ns = Math.max(0, Math.min(1, rule.repHsl[1] + (pixHsl[1] - rule.trgHsl[1])));
                        const nl = Math.max(0, Math.min(1, rule.repHsl[2] + (pixHsl[2] - rule.trgHsl[2])));
                        
                        const rgb = hslToRgb(nh, ns, nl);
                        dst[i] = rgb[0];
                        dst[i+1] = rgb[1];
                        dst[i+2] = rgb[2];
                    }
                    break;
                }
            }
        }
    }
    
    return resultImageData;
}

// Core Recoloring Engine (Run on active canvas preview)
function processImage() {
    if (!originalImageData) return;
    const ctx = canvasResult.getContext('2d');
    const resultImageData = applyRecolorToImageData(originalImageData, ctx);
    ctx.putImageData(resultImageData, 0, 0);
}

// Download all uploaded images in batch
async function downloadBatch() {
    if (imageFiles.length === 0) {
        showNotification("Không có ảnh nào trong hàng loạt để tải!", "error");
        return;
    }
    
    showNotification("Đang tải hàng loạt... Trình duyệt có thể hỏi quyền tải nhiều tệp, vui lòng chọn Cho phép.", "info");
    
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    for (let index = 0; index < imageFiles.length; index++) {
        const item = imageFiles[index];
        tempCanvas.width = item.img.naturalWidth;
        tempCanvas.height = item.img.naturalHeight;
        
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(item.img, 0, 0);
        
        const originalData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const resultData = applyRecolorToImageData(originalData, tempCtx);
        tempCtx.putImageData(resultData, 0, 0);
        
        // Trigger individual file downloads with a slight delay
        await new Promise(resolve => {
            setTimeout(() => {
                const link = document.createElement('a');
                const originalName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
                link.download = `${originalName}_recolored.png`;
                link.href = tempCanvas.toDataURL('image/png');
                link.click();
                resolve();
            }, index * 200); // 200ms delay to prevent browser blocking
        });
    }
    
    showNotification(`Đã tải về thành công ${imageFiles.length} ảnh!`);
}

function setRecolorMode(mode) {
    recolorMode = mode;
    const dominantColorsBar = document.getElementById('dominantColorsBar');
    
    if (mode === 'rules') {
        btnModeRules.classList.add('active');
        btnModeGlobal.classList.remove('active');
        globalTintBox.style.display = 'none';
        rulesList.style.display = 'block';
        if (originalImageData) {
            dominantColorsBar.style.display = 'block';
        }
        btnAddRule.style.display = 'inline-block';
        btnClearRules.style.display = 'inline-block';
        renderDominantColors();
    } else {
        btnModeRules.classList.remove('active');
        btnModeGlobal.classList.add('active');
        globalTintBox.style.display = 'block';
        rulesList.style.display = 'none';
        dominantColorsBar.style.display = 'none';
        btnAddRule.style.display = 'none';
        btnClearRules.style.display = 'none';
        setGlobalSubMode(globalSubMode, false);
    }
    processImage();
}

function setGlobalSubMode(subMode, shouldProcess = true) {
    globalSubMode = subMode;
    if (subMode === 'tint') {
        btnSubModeTint.classList.add('active');
        btnSubModeHueShift.classList.remove('active');
        globalTintSubContainer.style.display = 'block';
        globalHueShiftSubContainer.style.display = 'none';
        globalStrengthLabel.textContent = 'MỨC ĐỘ PHA (TINT):';
    } else {
        btnSubModeTint.classList.remove('active');
        btnSubModeHueShift.classList.add('active');
        globalTintSubContainer.style.display = 'none';
        globalHueShiftSubContainer.style.display = 'block';
        globalStrengthLabel.textContent = 'CƯỜNG ĐỘ HIỆU ỨNG:';
    }
    if (shouldProcess) {
        processImage();
    }
}

// Preset Manager
function savePreset() {
    const name = presetNameInput.value.trim();
    if (!name) {
        showNotification("Vui lòng nhập tên cho Preset!", "error");
        return;
    }
    
    let presetData = {};
    if (recolorMode === 'global') {
        presetData = {
            mode: 'global',
            globalSubMode: globalSubMode,
            color: globalColor,
            strength: globalStrength,
            colorizeWhite: globalColorizeWhite,
            hueShiftAngle: globalHueShiftAngle
        };
    } else {
        if (rules.length === 0) {
            showNotification("Cần ít nhất một quy tắc để lưu!", "error");
            return;
        }
        presetData = {
            mode: 'rules',
            rules: rules.map(({ targetColor, replacementColor, tolerance, shadingMode }) => ({
                targetColor, replacementColor, tolerance, shadingMode
            }))
        };
    }
    
    const savedPresets = JSON.parse(localStorage.getItem('lt_sprite_recolor_presets') || '{}');
    savedPresets[name] = presetData;
    localStorage.setItem('lt_sprite_recolor_presets', JSON.stringify(savedPresets));
    
    presetNameInput.value = '';
    showNotification(`Đã lưu mẫu "${name}" thành công!`);
    renderPresets();
}

function renderPresets() {
    presetsContainer.innerHTML = '';
    const savedPresets = JSON.parse(localStorage.getItem('lt_sprite_recolor_presets') || '{}');
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
    const savedPresets = JSON.parse(localStorage.getItem('lt_sprite_recolor_presets') || '{}');
    const presetData = savedPresets[name];
    if (!presetData) return;
    
    if (presetData.mode === 'global' || (!presetData.mode && presetData.color)) {
        globalColor = presetData.color || '#172038';
        globalStrength = presetData.strength !== undefined ? presetData.strength : 100;
        globalColorizeWhite = presetData.colorizeWhite !== undefined ? presetData.colorizeWhite : false;
        globalSubMode = presetData.globalSubMode || 'tint';
        globalHueShiftAngle = presetData.hueShiftAngle !== undefined ? presetData.hueShiftAngle : 0;
        
        globalReplacePreview.style.backgroundColor = globalColor;
        globalReplaceInput.value = globalColor;
        globalTintStrengthEl.value = globalStrength;
        globalTintStrengthValEl.textContent = globalStrength + '%';
        globalColorizeWhiteEl.checked = globalColorizeWhite;
        
        globalHueShiftAngleEl.value = globalHueShiftAngle;
        globalHueShiftAngleValEl.textContent = (globalHueShiftAngle >= 0 ? '+' : '') + globalHueShiftAngle + '°';
        
        setRecolorMode('global');
    } else {
        const presetRules = presetData.rules || presetData;
        rules = presetRules.map((rule, idx) => ({
            id: Date.now() + idx,
            ...rule
        }));
        
        setRecolorMode('rules');
        renderRules();
        renderDominantColors();
    }
    
    showNotification(`Đã áp dụng mẫu "${name}"!`);
}

function deletePreset(name) {
    const savedPresets = JSON.parse(localStorage.getItem('lt_sprite_recolor_presets') || '{}');
    delete savedPresets[name];
    localStorage.setItem('lt_sprite_recolor_presets', JSON.stringify(savedPresets));
    renderPresets();
    showNotification(`Đã xóa mẫu "${name}".`);
}

// Download Trigger
function downloadResult() {
    if (!originalImageData) {
        showNotification("Không có ảnh để tải về!", "error");
        return;
    }
    
    const link = document.createElement('a');
    link.download = 'sprite_recolored.png';
    link.href = canvasResult.toDataURL('image/png');
    link.click();
    showNotification("Đã tải tệp sprite_recolored.png thành công!");
}

// Notification Banner Trigger
function showNotification(message, type = 'success') {
    notificationBanner.textContent = message;
    notificationBanner.className = 'notification-banner active';
    
    if (type === 'error') {
        notificationBanner.classList.add('error');
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

// CRT Screen Effect Switch
const crtToggle = document.getElementById('crtToggle');
if (crtToggle) {
    crtToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.classList.add('crt');
        } else {
            document.body.classList.remove('crt');
        }
    });
}

// Color Space Math Utilities
function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h, s, l];
}

function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function hexToRgb(hex) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
