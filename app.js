// ============================================
// IMAGE RESIZER - 3-CROP SEQUENTIAL WORKFLOW
// WITH ROTATION & ZOOM CONTROLS
// ============================================

// ============================================
// CONFIGURATION: Aspect Ratios & Output Sizes
// ============================================

const ASPECT_RATIOS = {
    landscape: { ratio: 16/9, name: 'Landscape (16:9)', width: 1920, height: 1080 },
    portrait: { ratio: 4/5, name: 'Portrait (4:5)', width: 1080, height: 1350 },
    stories: { ratio: 9/16, name: 'Stories (9:16)', width: 1080, height: 1920 }
};

// ============================================
// GLOBAL VARIABLES
// ============================================

let originalImage = null;
let originalFileName = '';
let cropData = {
    landscape: null,
    portrait: null,
    stories: null
};
let cropSteps = [];
let currentStepIndex = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let cropBoxStartLeft = 0;
let cropBoxStartTop = 0;

// Rotation and zoom state per crop type
let rotationState = {
    landscape: 0,
    portrait: 0,
    stories: 0
};
let zoomState = {
    landscape: 1,
    portrait: 1,
    stories: 1
};

// ============================================
// INITIALIZATION: Setup Event Listeners
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const uploadBox = document.getElementById('upload-box');
    const fileInput = document.getElementById('file-input');

    // Click to upload
    uploadBox.addEventListener('click', function() {
        fileInput.click();
    });

    // Handle file selection
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
    });

    // Drag and drop handlers
    uploadBox.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadBox.style.borderColor = '#764ba2';
        uploadBox.style.background = '#f0f2ff';
    });

    uploadBox.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadBox.style.borderColor = '#667eea';
        uploadBox.style.background = '#f8f9ff';
    });

    uploadBox.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadBox.style.borderColor = '#667eea';
        uploadBox.style.background = '#f8f9ff';
        
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileUpload(file);
        }
    });

    // Setup format card click handlers
    setupFormatCardHandlers();
});

// ============================================
// FORMAT CARD HANDLERS: Toggle Checkboxes
// ============================================

function setupFormatCardHandlers() {
    const portraitCard = document.querySelector('label[class*="format-card"][class*="optional"]:has(#portrait-checkbox)');
    const storiesCard = document.querySelector('label[class*="format-card"][class*="optional"]:has(#stories-checkbox)');
    
    if (portraitCard) {
        portraitCard.addEventListener('click', function(e) {
            const checkbox = document.getElementById('portrait-checkbox');
            checkbox.checked = !checkbox.checked;
            console.log('Portrait checkbox toggled:', checkbox.checked);
        });
    }
    
    if (storiesCard) {
        storiesCard.addEventListener('click', function(e) {
            const checkbox = document.getElementById('stories-checkbox');
            checkbox.checked = !checkbox.checked;
            console.log('Stories checkbox toggled:', checkbox.checked);
        });
    }
}

// ============================================
// FILE UPLOAD: Validate and Process
// ============================================

function handleFileUpload(file) {
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        alert('Please upload a JPG, PNG, or WebP image.');
        return;
    }

    // Check file size (25MB limit)
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('File is too large. Please upload an image under 25MB.');
        return;
    }

    // Store filename (without extension)
    originalFileName = file.name.split('.')[0];

    // Read the file and create image
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const img = new Image();
        
        img.onload = function() {
            // Store the original image
            originalImage = img;
            
            // Show preview screen
            showPreview(e.target.result, file.name);
        };
        
        img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
}

// ============================================
// PREVIEW: Show Image and Format Options
// ============================================

function showPreview(imageSrc, fileName) {
    // Hide upload section
    document.getElementById('upload-section').classList.add('hidden');
    
    // Show preview section
    const previewSection = document.getElementById('preview-section');
    previewSection.classList.remove('hidden');
    
    // Set preview image and filename
    document.getElementById('preview-image').src = imageSrc;
    document.getElementById('filename').textContent = fileName;
}

// ============================================
// CROP WORKFLOW: Initialize Sequential Crops
// ============================================

function startCropWorkflow() {
    // Determine which crops are needed
    cropSteps = ['landscape']; // Always include landscape
    
    const portraitCheckbox = document.getElementById('portrait-checkbox');
    const storiesCheckbox = document.getElementById('stories-checkbox');
    
    const portraitChecked = portraitCheckbox ? portraitCheckbox.checked : false;
    const storiesChecked = storiesCheckbox ? storiesCheckbox.checked : false;
    
    console.log('Starting crop workflow...');
    console.log('Portrait checkbox:', portraitCheckbox, 'Checked:', portraitChecked);
    console.log('Stories checkbox:', storiesCheckbox, 'Checked:', storiesChecked);
    
    if (portraitChecked) {
        cropSteps.push('portrait');
        console.log('Added portrait crop');
    }
    if (storiesChecked) {
        cropSteps.push('stories');
        console.log('Added stories crop');
    }
    
    console.log('Total crop steps:', cropSteps);
    
    // Reset state
    currentStepIndex = 0;
    cropData = {
        landscape: null,
        portrait: null,
        stories: null
    };
    rotationState = {
        landscape: 0,
        portrait: 0,
        stories: 0
    };
    zoomState = {
        landscape: 1,
        portrait: 1,
        stories: 1
    };
    
    // Start first crop
    showCropModal();
}

function cancelCropWorkflow() {
    closeCropModal();
    currentStepIndex = 0;
}

// ============================================
// CROP MODAL: Show Interactive Crop Tool
// ============================================

function showCropModal() {
    const currentStep = cropSteps[currentStepIndex];
    const config = ASPECT_RATIOS[currentStep];
    
    console.log('showCropModal called for step:', currentStep, 'Config:', config);
    
    // Update modal text
    document.getElementById('crop-step-indicator').textContent = 
        `Step ${currentStepIndex + 1} of ${cropSteps.length}`;
    document.getElementById('crop-title').textContent = 
        `Crop for ${config.name}`;
    
    // Update descriptions based on crop type
    const descriptions = {
        landscape: 'Position the crop area for YouTube videos and Facebook posts',
        portrait: 'Position the crop area for Instagram feed and Facebook posts',
        stories: 'Position the crop area for TikTok, Instagram Stories, and YouTube Shorts'
    };
    document.getElementById('crop-description').textContent = descriptions[currentStep];
    
    // Update formats list
    const formatsList = {
        landscape: 'YouTube, Facebook landscape',
        portrait: 'Instagram feed, Facebook posts',
        stories: 'TikTok, Instagram/Facebook Stories, YouTube Shorts'
    };
    document.getElementById('crop-formats-list').textContent = formatsList[currentStep];
    
    // Update next button text
    const nextBtn = document.getElementById('crop-next-btn');
    if (currentStepIndex === cropSteps.length - 1) {
        nextBtn.textContent = 'Create Images ✓';
    } else {
        nextBtn.textContent = 'Next →';
    }
    
    // Set zoom slider value
    const zoomSlider = document.getElementById('zoom-slider');
    zoomSlider.value = zoomState[currentStep];
    updateZoomDisplay(zoomState[currentStep]);
    
    // Show the modal
    const modal = document.getElementById('crop-modal');
    modal.classList.remove('hidden');
    
    // Setup image and crop box with current rotation and zoom
    setupCropPreview();
}

function setupCropPreview() {
    const currentStep = cropSteps[currentStepIndex];
    const config = ASPECT_RATIOS[currentStep];
    const rotation = rotationState[currentStep];
    const zoom = zoomState[currentStep];
    
    // Set the image
    const previewImage = document.getElementById('crop-preview-image');
    previewImage.src = originalImage.src;
    
    // Apply rotation transform
    previewImage.style.transform = `rotate(${rotation}deg)`;
    
    // Wait for image to load and get dimensions
    previewImage.onload = function() {
        initializeCropBox(config.ratio, zoom);
    };
    
    // If already loaded, initialize immediately
    if (previewImage.complete) {
        initializeCropBox(config.ratio, zoom);
    }
}

function initializeCropBox(targetRatio, zoom) {
    const previewImage = document.getElementById('crop-preview-image');
    const cropBox = document.getElementById('crop-box');
    const currentStep = cropSteps[currentStepIndex];
    const rotation = rotationState[currentStep];
    
    // Get displayed image dimensions (accounting for rotation)
    let displayWidth = previewImage.offsetWidth;
    let displayHeight = previewImage.offsetHeight;
    
    // When rotated 90 or 270 degrees, swap dimensions
    if (rotation === 90 || rotation === 270) {
        [displayWidth, displayHeight] = [displayHeight, displayWidth];
    }
    
    console.log(`Display dimensions: ${displayWidth} x ${displayHeight}, Rotation: ${rotation}°, Zoom: ${zoom}`);
    
    // Calculate crop box size based on target ratio and zoom
    let boxWidth, boxHeight;
    
    // Scale the available area by zoom
    const availableWidth = displayWidth / zoom;
    const availableHeight = displayHeight / zoom;
    
    const imageRatio = displayWidth / displayHeight;
    
    if (imageRatio > targetRatio) {
        // Image is wider - height constrained
        boxHeight = availableHeight;
        boxWidth = boxHeight * targetRatio;
    } else {
        // Image is taller - width constrained
        boxWidth = availableWidth;
        boxHeight = boxWidth / targetRatio;
    }
    
    // Center the crop box
    const left = (displayWidth - boxWidth) / 2;
    const top = (displayHeight - boxHeight) / 2;
    
    // Set crop box dimensions and position
    cropBox.style.width = boxWidth + 'px';
    cropBox.style.height = boxHeight + 'px';
    cropBox.style.left = left + 'px';
    cropBox.style.top = top + 'px';
    
    console.log(`Crop box: ${boxWidth.toFixed(0)} x ${boxHeight.toFixed(0)} at (${left.toFixed(0)}, ${top.toFixed(0)})`);
    
    // Setup drag handlers
    setupCropBoxDrag();
}

function setupCropBoxDrag() {
    const cropBox = document.getElementById('crop-box');
    const previewImage = document.getElementById('crop-preview-image');
    
    // Remove old listeners
    cropBox.onmousedown = null;
    cropBox.ontouchstart = null;
    
    function startDrag(e) {
        isDragging = true;
        
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        
        dragStartX = clientX;
        dragStartY = clientY;
        cropBoxStartLeft = cropBox.offsetLeft;
        cropBoxStartTop = cropBox.offsetTop;
        
        e.preventDefault();
    }
    
    function onDrag(e) {
        if (!isDragging) return;
        
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        
        const deltaX = clientX - dragStartX;
        const deltaY = clientY - dragStartY;
        
        let newLeft = cropBoxStartLeft + deltaX;
        let newTop = cropBoxStartTop + deltaY;
        
        // Constrain to image bounds
        const maxLeft = previewImage.offsetWidth - cropBox.offsetWidth;
        const maxTop = previewImage.offsetHeight - cropBox.offsetHeight;
        
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));
        
        cropBox.style.left = newLeft + 'px';
        cropBox.style.top = newTop + 'px';
        
        e.preventDefault();
    }
    
    function endDrag() {
        isDragging = false;
    }
    
    // Mouse events
    cropBox.onmousedown = startDrag;
    document.onmousemove = onDrag;
    document.onmouseup = endDrag;
    
    // Touch events
    cropBox.ontouchstart = startDrag;
    document.ontouchmove = onDrag;
    document.ontouchend = endDrag;
}

function closeCropModal() {
    document.getElementById('crop-modal').classList.add('hidden');
}

// ============================================
// ROTATION CONTROLS
// ============================================

function rotateImage(degrees) {
    const currentStep = cropSteps[currentStepIndex];
    rotationState[currentStep] = (rotationState[currentStep] + degrees) % 360;
    if (rotationState[currentStep] < 0) rotationState[currentStep] += 360;
    
    console.log(`Rotated ${currentStep} to ${rotationState[currentStep]}°`);
    
    // Update the preview
    setupCropPreview();
}

// ============================================
// ZOOM CONTROLS
// ============================================

function updateZoom(value) {
    const currentStep = cropSteps[currentStepIndex];
    zoomState[currentStep] = parseFloat(value);
    
    updateZoomDisplay(value);
    
    // Reinitialize crop box with new zoom
    const config = ASPECT_RATIOS[currentStep];
    initializeCropBox(config.ratio, zoomState[currentStep]);
}

function updateZoomDisplay(value) {
    const percentage = Math.round(value * 100);
    document.getElementById('zoom-value').textContent = `${percentage}%`;
}

// ============================================
// CROP CONFIRMATION: Save and Move to Next
// ============================================

function confirmCurrentCrop() {
    const currentStep = cropSteps[currentStepIndex];
    
    console.log('Confirming crop for step:', currentStep, `(${currentStepIndex + 1}/${cropSteps.length})`);
    
    // Get crop box position as percentages of display image
    const cropBox = document.getElementById('crop-box');
    const previewImage = document.getElementById('crop-preview-image');
    const displayWidth = previewImage.offsetWidth;
    const displayHeight = previewImage.offsetHeight;
    
    const left = cropBox.offsetLeft / displayWidth;
    const top = cropBox.offsetTop / displayHeight;
    const width = cropBox.offsetWidth / displayWidth;
    const height = cropBox.offsetHeight / displayHeight;
    
    // Store crop data for this step (including rotation and zoom)
    cropData[currentStep] = { 
        left, 
        top, 
        width, 
        height,
        rotation: rotationState[currentStep],
        zoom: zoomState[currentStep]
    };
    
    console.log(`Saved ${currentStep} crop:`, cropData[currentStep]);
    
    // Move to next step or finish
    currentStepIndex++;
    console.log('Moving to step index:', currentStepIndex, 'Total steps:', cropSteps.length);
    
    if (currentStepIndex < cropSteps.length) {
        // More crops to do
        console.log('Showing next crop modal...');
        showCropModal();
    } else {
        // All crops done, proceed to resize
        console.log('All crops complete, proceeding to resize...');
        closeCropModal();
        processResize();
    }
}

// ============================================
// RESIZE: Generate All Images
// ============================================

async function processResize() {
    const resizeBtn = document.getElementById('start-crop-btn');
    resizeBtn.disabled = true;
    resizeBtn.textContent = 'Processing...';
    
    showStatus('Creating your images...', 'processing');
    
    try {
        // Create ZIP file
        const zip = new JSZip();
        const folder = zip.folder('resized-images');
        
        let imageCount = 0;
        
        // Process each selected format
        for (const cropType of cropSteps) {
            const config = ASPECT_RATIOS[cropType];
            const crop = cropData[cropType];
            
            if (!crop) {
                throw new Error(`Missing crop data for ${cropType}`);
            }
            
            // Generate resized image
            const blob = await resizeImageWithCrop(
                originalImage,
                config.width,
                config.height,
                crop
            );
            
            // Format ratio for filename (e.g., "16x9", "4x5", "9x16")
            const ratioString = cropType === 'landscape' ? '16x9' : 
                                cropType === 'portrait' ? '4x5' : '9x16';
            
            // Add to ZIP with ratio in filename
            const fileName = `${originalFileName}-${cropType}-${ratioString}-${config.width}x${config.height}.jpg`;
            folder.file(fileName, blob);
            imageCount++;
            
            showStatus(`Creating ${imageCount}/${cropSteps.length}...`, 'processing');
        }
        
        // Generate ZIP file
        showStatus('Preparing download...', 'processing');
        const zipBlob = await zip.generateAsync({type: 'blob'});
        
        // Trigger download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = `${originalFileName}-social-media.zip`;
        link.click();
        
        // Show success screen
        showSuccessScreen(imageCount);
        
    } catch (error) {
        console.error('Error processing images:', error);
        alert('Something went wrong: ' + error.message + '\n\nPlease try again.');
        resizeBtn.disabled = false;
        resizeBtn.textContent = 'Start Cropping →';
        hideStatus();
    }
}

// ============================================
// IMAGE RESIZING: Core Canvas Logic with Rotation
// ============================================

function resizeImageWithCrop(image, targetWidth, targetHeight, crop) {
    return new Promise((resolve, reject) => {
        try {
            console.log(`Resizing to ${targetWidth}x${targetHeight} with crop:`, crop);
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                throw new Error('Could not get canvas context');
            }
            
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            
            // Fill white background
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, targetWidth, targetHeight);
            
            // Apply rotation if needed
            const rotation = crop.rotation || 0;
            
            // Calculate source dimensions (accounting for rotation)
            let sourceImageWidth = image.width;
            let sourceImageHeight = image.height;
            
            // When rotated 90 or 270 degrees, dimensions are swapped
            if (rotation === 90 || rotation === 270) {
                [sourceImageWidth, sourceImageHeight] = [sourceImageHeight, sourceImageWidth];
            }
            
            // Calculate source crop area from percentages (after rotation)
            const sourceX = sourceImageWidth * crop.left;
            const sourceY = sourceImageHeight * crop.top;
            const sourceWidth = sourceImageWidth * crop.width;
            const sourceHeight = sourceImageHeight * crop.height;
            
            console.log(`Rotation: ${rotation}°, Crop area: x=${sourceX.toFixed(0)}, y=${sourceY.toFixed(0)}, w=${sourceWidth.toFixed(0)}, h=${sourceHeight.toFixed(0)}`);
            
            if (rotation === 0) {
                // No rotation - simple draw
                ctx.drawImage(
                    image,
                    sourceX, sourceY, sourceWidth, sourceHeight,
                    0, 0, targetWidth, targetHeight
                );
            } else {
                // Create a temporary canvas for rotation
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                
                // Set temp canvas size based on rotation
                if (rotation === 90 || rotation === 270) {
                    tempCanvas.width = image.height;
                    tempCanvas.height = image.width;
                } else {
                    tempCanvas.width = image.width;
                    tempCanvas.height = image.height;
                }
                
                // Apply rotation
                tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
                tempCtx.rotate((rotation * Math.PI) / 180);
                tempCtx.drawImage(image, -image.width / 2, -image.height / 2);
                
                // Now crop from the rotated image
                ctx.drawImage(
                    tempCanvas,
                    sourceX, sourceY, sourceWidth, sourceHeight,
                    0, 0, targetWidth, targetHeight
                );
            }
            
            console.log('Drawing complete, converting to blob...');
            
            // Convert to blob
            canvas.toBlob((blob) => {
                if (blob) {
                    console.log(`Blob created: ${blob.size} bytes`);
                    resolve(blob);
                } else {
                    reject(new Error('Canvas toBlob returned null'));
                }
            }, 'image/jpeg', 0.92);
            
        } catch (error) {
            console.error('Exception in resizeImageWithCrop:', error);
            reject(error);
        }
    });
}

// ============================================
// UI: Status Messages
// ============================================

function showStatus(message, type) {
    const statusDiv = document.getElementById('status-message');
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.classList.remove('hidden');
}

function hideStatus() {
    document.getElementById('status-message').classList.add('hidden');
}

// ============================================
// UI: Success Screen
// ============================================

function showSuccessScreen(imageCount) {
    // Hide preview section
    document.getElementById('preview-section').classList.add('hidden');
    
    // Show success section
    const successSection = document.getElementById('success-section');
    successSection.classList.remove('hidden');
    
    // Update download info
    const info = `${imageCount} images • Ready to use`;
    document.getElementById('download-info').textContent = info;
}

// ============================================
// RESET: Start Over
// ============================================

function resetApp() {
    // Hide all sections except upload
    document.getElementById('preview-section').classList.add('hidden');
    document.getElementById('success-section').classList.add('hidden');
    document.getElementById('upload-section').classList.remove('hidden');
    
    // Reset variables
    originalImage = null;
    originalFileName = '';
    cropData = {
        landscape: null,
        portrait: null,
        stories: null
    };
    cropSteps = [];
    currentStepIndex = 0;
    rotationState = {
        landscape: 0,
        portrait: 0,
        stories: 0
    };
    zoomState = {
        landscape: 1,
        portrait: 1,
        stories: 1
    };
    
    // Reset file input
    document.getElementById('file-input').value = '';
    
    // Reset button
    const resizeBtn = document.getElementById('start-crop-btn');
    resizeBtn.disabled = false;
    resizeBtn.textContent = 'Start Cropping →';
    
    // Hide status
    hideStatus();
    
    // Re-check checkboxes
    document.getElementById('portrait-checkbox').checked = true;
    document.getElementById('stories-checkbox').checked = true;
}

// ============================================
// INITIALIZATION COMPLETE
// ============================================

console.log('Image Resizer - 3-Crop Sequential Workflow with Rotation & Zoom loaded! 🎉');
