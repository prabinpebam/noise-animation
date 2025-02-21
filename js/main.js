document.addEventListener('DOMContentLoaded', function() {
  const canvas = document.getElementById('noise-canvas');
  const ctx = canvas.getContext('2d');

  // ---------------------------
  // Global Noise Parameters
  let speed            = parseFloat(document.getElementById('speed').value);
  let resolutionFactor = parseFloat(document.getElementById('resolution').value);
  let animationEnabled = document.getElementById('animationToggle').checked;
  let invertNoise      = document.getElementById('invertNoise').checked;

  // ---------------------------
  // Perlin 1 Noise Parameters
  let enablePerlin     = document.getElementById('enablePerlin').checked;
  let perlinScale      = parseFloat(document.getElementById('perlinScale').value);
  let perlinBrightness = parseFloat(document.getElementById('perlinBrightness').value);
  let perlinContrast   = parseFloat(document.getElementById('perlinContrast').value);

  // ---------------------------
  // Perlin 2 Noise Parameters
  let enablePerlin2     = document.getElementById('enablePerlin2').checked;
  let perlin2Scale      = parseFloat(document.getElementById('perlin2Scale').value);
  let perlin2Brightness = parseFloat(document.getElementById('perlin2Brightness').value);
  let perlin2Contrast   = parseFloat(document.getElementById('perlin2Contrast').value);

  // ---------------------------
  // Stipple Art Parameters
  let minDistance         = parseInt(document.getElementById('minDistance').value);
  let minDotSize          = parseFloat(document.getElementById('minDotSize').value);
  let maxDotSize          = parseFloat(document.getElementById('maxDotSize').value);
  let brightnessThreshold = parseInt(document.getElementById('brightnessThreshold').value);
  let stippleEnabled      = document.getElementById('stippleToggle').checked;

  // ---------------------------
  // Displacement Parameters
  let displacementAmount  = parseFloat(document.getElementById('displacementAmount').value);
  let displacementEnabled = document.getElementById('displacementToggle').checked;

  // ---------------------------
  // Ripple Effect Parameters
  let enableRipple    = document.getElementById('rippleToggle').checked;
  let rippleAmplitude = parseFloat(document.getElementById('rippleAmplitude').value);
  let rippleRadius    = parseFloat(document.getElementById('rippleRadius').value);
  let rippleSpeed     = parseFloat(document.getElementById('rippleSpeed').value);
  // Set default ripple center to the middle of the composite canvas
  let rippleCenter    = { x: 300, y: 300 };

  // Update ripple center on mouse move (mapped to composite canvas coordinates)
  canvas.addEventListener('mousemove', function(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    // Use composite canvas dimensions for both x and y
    rippleCenter.x = mouseX * (compositeCanvas.width / canvas.width);
    rippleCenter.y = mouseY * (compositeCanvas.height / canvas.height);
  });

  // ---------------------------
  // Setup Offscreen & Composite Canvases
  let baseOffWidth = canvas.width * resolutionFactor;
  let baseOffHeight = canvas.height * resolutionFactor;
  // Extra vertical margin equal to displacementAmount (scaled)
  function extraMargin() {
    return displacementEnabled ? displacementAmount * resolutionFactor : 0;
  }
  
  // Offscreen canvas: used for noise generation (extended vertically)
  const offCanvas = document.createElement('canvas');
  const offCtx = offCanvas.getContext('2d');
  
  // Composite canvas: holds the final noise/stipple output (base region only)
  const compositeCanvas = document.createElement('canvas');
  compositeCanvas.width = canvas.width;
  compositeCanvas.height = canvas.height;
  const compositeCtx = compositeCanvas.getContext('2d');
  
  // Create an fx canvas using glfx.js (for ripple filtering)
  let fxCanvas;
  if (typeof fx !== 'undefined') {
    fxCanvas = fx.canvas();
  } else {
    console.warn("glfx.js not loaded; Ripple effect will be disabled.");
    enableRipple = false;
  }
  
  // ---------------------------
  // Stipple Points Generation & Offscreen Setup
  let stipplePoints = [];
  function updateOffCanvasSize() {
    baseOffWidth = canvas.width * resolutionFactor;
    baseOffHeight = canvas.height * resolutionFactor;
    const extMargin = extraMargin();
    offCanvas.width = baseOffWidth;
    offCanvas.height = baseOffHeight + extMargin;
    stipplePoints = generatePoissonPoints(offCanvas.width, offCanvas.height, minDistance);
  }
  updateOffCanvasSize();
  
  // Utility: Update display spans
  function updateDisplay(id, value) {
    document.getElementById(id).innerText = value;
  }
  
  // ---------------------------
  // Event Listeners for Controls
  document.getElementById('speed').addEventListener('input', (e) => { speed = parseFloat(e.target.value); updateDisplay('speedVal', speed); });
  document.getElementById('resolution').addEventListener('input', (e) => { resolutionFactor = parseFloat(e.target.value); updateDisplay('resolutionVal', resolutionFactor); updateOffCanvasSize(); });
  document.getElementById('animationToggle').addEventListener('change', (e) => { animationEnabled = e.target.checked; });
  document.getElementById('invertNoise').addEventListener('change', (e) => { invertNoise = e.target.checked; });
  
  document.getElementById('enablePerlin').addEventListener('change', (e) => { enablePerlin = e.target.checked; });
  document.getElementById('perlinScale').addEventListener('input', (e) => { perlinScale = parseFloat(e.target.value); updateDisplay('perlinScaleVal', perlinScale); });
  document.getElementById('perlinBrightness').addEventListener('input', (e) => { perlinBrightness = parseFloat(e.target.value); updateDisplay('perlinBrightnessVal', perlinBrightness); });
  document.getElementById('perlinContrast').addEventListener('input', (e) => { perlinContrast = parseFloat(e.target.value); updateDisplay('perlinContrastVal', perlinContrast); });
  
  document.getElementById('enablePerlin2').addEventListener('change', (e) => { enablePerlin2 = e.target.checked; });
  document.getElementById('perlin2Scale').addEventListener('input', (e) => { perlin2Scale = parseFloat(e.target.value); updateDisplay('perlin2ScaleVal', perlin2Scale); });
  document.getElementById('perlin2Brightness').addEventListener('input', (e) => { perlin2Brightness = parseFloat(e.target.value); updateDisplay('perlin2BrightnessVal', perlin2Brightness); });
  document.getElementById('perlin2Contrast').addEventListener('input', (e) => { perlin2Contrast = parseFloat(e.target.value); updateDisplay('perlin2ContrastVal', perlin2Contrast); });
  
  document.getElementById('minDistance').addEventListener('input', (e) => { minDistance = parseInt(e.target.value); updateDisplay('minDistanceVal', minDistance); stipplePoints = generatePoissonPoints(offCanvas.width, offCanvas.height, minDistance); });
  document.getElementById('minDotSize').addEventListener('input', (e) => { minDotSize = parseFloat(e.target.value); updateDisplay('minDotSizeVal', minDotSize); });
  document.getElementById('maxDotSize').addEventListener('input', (e) => { maxDotSize = parseFloat(e.target.value); updateDisplay('maxDotSizeVal', maxDotSize); });
  document.getElementById('brightnessThreshold').addEventListener('input', (e) => { brightnessThreshold = parseInt(e.target.value); updateDisplay('brightnessThresholdVal', brightnessThreshold); });
  document.getElementById('stippleToggle').addEventListener('change', (e) => { stippleEnabled = e.target.checked; });
  
  document.getElementById('displacementAmount').addEventListener('input', (e) => { displacementAmount = parseFloat(e.target.value); updateDisplay('displacementAmountVal', displacementAmount); updateOffCanvasSize(); });
  document.getElementById('displacementToggle').addEventListener('change', (e) => { displacementEnabled = e.target.checked; updateOffCanvasSize(); });
  
  document.getElementById('rippleToggle').addEventListener('change', (e) => { enableRipple = e.target.checked; });
  document.getElementById('rippleAmplitude').addEventListener('input', (e) => { rippleAmplitude = parseFloat(e.target.value); updateDisplay('rippleAmplitudeVal', rippleAmplitude); });
  document.getElementById('rippleRadius').addEventListener('input', (e) => { rippleRadius = parseFloat(e.target.value); updateDisplay('rippleRadiusVal', rippleRadius); });
  document.getElementById('rippleSpeed').addEventListener('input', (e) => { rippleSpeed = parseFloat(e.target.value); updateDisplay('rippleSpeedVal', rippleSpeed); });
  
  // ---------------------------
  // Poisson Disk Sampling Implementation
  function generatePoissonPoints(width, height, minDist, k = 30) {
    const cellSize = minDist / Math.SQRT2;
    const gridWidth = Math.ceil(width / cellSize);
    const gridHeight = Math.ceil(height / cellSize);
    const grid = new Array(gridWidth * gridHeight).fill(null);
    function gridIndex(x, y) { return x + y * gridWidth; }
    const points = [];
    const active = [];
    function addPoint(pt) {
      points.push(pt);
      active.push(pt);
      const gx = Math.floor(pt.x / cellSize);
      const gy = Math.floor(pt.y / cellSize);
      grid[gridIndex(gx, gy)] = pt;
    }
    addPoint({ x: Math.random() * width, y: Math.random() * height });
    while (active.length) {
      const randIndex = Math.floor(Math.random() * active.length);
      const point = active[randIndex];
      let found = false;
      for (let i = 0; i < k; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const mag = minDist * (1 + Math.random());
        const newX = point.x + Math.cos(angle) * mag;
        const newY = point.y + Math.sin(angle) * mag;
        const newPt = { x: newX, y: newY };
        if (newX < 0 || newX >= width || newY < 0 || newY >= height) continue;
        const gx = Math.floor(newX / cellSize);
        const gy = Math.floor(newY / cellSize);
        let ok = true;
        for (let ix = Math.max(0, gx - 2); ix <= Math.min(gx + 2, gridWidth - 1); ix++) {
          for (let iy = Math.max(0, gy - 2); iy <= Math.min(gy + 2, gridHeight - 1); iy++) {
            const neighbor = grid[gridIndex(ix, iy)];
            if (neighbor) {
              const dx = neighbor.x - newX;
              const dy = neighbor.y - newY;
              if (dx * dx + dy * dy < minDist * minDist) { ok = false; }
            }
          }
        }
        if (ok) { addPoint(newPt); found = true; break; }
      }
      if (!found) { active.splice(randIndex, 1); }
    }
    return points;
  }
  
  // ---------------------------
  // Generate Noise Image on offCanvas (extended region)
  function generateNoiseImage() {
    const width = offCanvas.width;
    const extHeight = offCanvas.height; // baseOffHeight + extra margin
    const imageData = offCtx.createImageData(width, extHeight);
    const data = imageData.data;
    const cx = width / 2;
    const cy = baseOffHeight / 2; // center of base region
    for (let y = 0; y < extHeight; y++) {
      for (let x = 0; x < width; x++) {
        const nx = (x - cx) * perlinScale;
        const ny = (y - cy) * perlinScale;
        const n2x = (x - cx) * perlin2Scale;
        const n2y = (y - cy) * perlin2Scale;
        let perlinVal, perlin2Val;
        if (enablePerlin) {
          let val1 = noise.perlin2(nx + time, ny + time);
          perlinVal = (val1 + 1) * 127.5;
          perlinVal = (perlinVal - 128) * perlinContrast + 128 + perlinBrightness;
        } else { 
          perlinVal = 127.5; 
        }
        if (enablePerlin2) {
          let val2 = noise.perlin2(n2x - time, n2y - time);
          perlin2Val = (val2 + 1) * 127.5;
          perlin2Val = (perlin2Val - 128) * perlin2Contrast + 128 + perlin2Brightness;
        } else { 
          perlin2Val = 127.5; 
        }
        if (invertNoise) {
          perlinVal = 255 - perlinVal;
          perlin2Val = 255 - perlin2Val;
        }
        // Combine the two noise values by averaging them
        let combined = (perlinVal + perlin2Val) / 2;
        combined = Math.max(0, Math.min(255, Math.floor(combined)));
        const idx = (y * width + x) * 4;
        data[idx] = combined;
        data[idx+1] = combined;
        data[idx+2] = combined;
        data[idx+3] = 255;
      }
    }
    return imageData;
  }
  
  // ---------------------------
  // Helper: Sample brightness from imageData at (x, y)
  function sampleBrightness(imageData, x, y) {
    const ix = Math.floor(Math.max(0, Math.min(x, imageData.width - 1)));
    const iy = Math.floor(Math.max(0, Math.min(y, imageData.height - 1)));
    return imageData.data[(iy * imageData.width + ix) * 4];
  }
  
  // ---------------------------
  // Draw Stipple Art onto compositeCanvas (mapping only the base region)
  function drawStipple(imageData) {
    compositeCtx.fillStyle = 'black';
    compositeCtx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);
    const scaleX = compositeCanvas.width / offCanvas.width;
    const scaleY = compositeCanvas.height / baseOffHeight;
    compositeCtx.fillStyle = 'white';
    for (let pt of stipplePoints) {
      const brightnessVal = sampleBrightness(imageData, pt.x, pt.y);
      if (brightnessVal > brightnessThreshold) continue;
      const radius = minDotSize + (1 - brightnessVal / 255) * (maxDotSize - minDotSize);
      let drawX = pt.x * scaleX;
      let drawY = pt.y * scaleY;
      if (displacementEnabled) {
        const disp = (brightnessVal / 255) * displacementAmount;
        drawY -= disp;
      }
      compositeCtx.beginPath();
      compositeCtx.arc(drawX, drawY, radius, 0, Math.PI * 2);
      compositeCtx.fill();
    }
  }
  
  // Draw Original Noise (without stipple) onto compositeCanvas (only base region)
  function drawNoise(imageData) {
    // Update offCanvas with the latest noise image
    offCtx.putImageData(imageData, 0, 0);
    compositeCtx.clearRect(0, 0, compositeCanvas.width, compositeCanvas.height);
    compositeCtx.drawImage(offCanvas, 0, 0, offCanvas.width, baseOffHeight, 0, 0, compositeCanvas.width, compositeCanvas.height);
  }
  
  // ---------------------------
  // Main Animation Loop
  let time = 0;
  function animate() {
    requestAnimationFrame(animate);
    if (animationEnabled) { time += speed; }
    const noiseImageData = generateNoiseImage();
    if (stippleEnabled) {
      drawStipple(noiseImageData);
    } else {
      drawNoise(noiseImageData);
    }
    
    // If ripple effect is enabled, apply the bulgePinch filter using fxCanvas
    if (enableRipple && fxCanvas) {
      try {
        // Ensure fxCanvas matches composite canvas dimensions
        fxCanvas.width = compositeCanvas.width;
        fxCanvas.height = compositeCanvas.height;
        
        const texture = fxCanvas.texture(compositeCanvas);
        const normCenter = [
          rippleCenter.x / compositeCanvas.width, 
          rippleCenter.y / compositeCanvas.height
        ];
        // Compute ripple strength scaled down (assumes rippleAmplitude is in a larger range)
        const rippleStrength = (rippleAmplitude * Math.sin(time * rippleSpeed)) / 100;
        const normRadius = rippleRadius / compositeCanvas.width;
        
        // Log parameters for debugging
        console.log("Ripple Params:", {
          normCenter,
          normRadius,
          rippleStrength
        });
        
        fxCanvas.draw(texture)
                .bulgePinch(normCenter[0], normCenter[1], normRadius, rippleStrength)
                .update();
                
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(fxCanvas, 0, 0, canvas.width, canvas.height);
      } catch (e) {
        console.error("Ripple effect error:", e);
        ctx.drawImage(compositeCanvas, 0, 0, canvas.width, canvas.height);
      }
    } else {
      ctx.drawImage(compositeCanvas, 0, 0, canvas.width, canvas.height);
    }
  }
  
  animate();
});
