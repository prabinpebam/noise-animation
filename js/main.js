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
  // Ripple Effect Parameters (NEW)
  let rippleEnabled = document.getElementById('rippleToggle').checked;
  let rippleAmount  = parseFloat(document.getElementById('rippleAmount').value);
  // We'll maintain an array of ripple objects.
  let ripples = []; // Each ripple: { x, y, startTime }

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
  // Setup Offscreen & Composite Canvases
  let baseOffWidth = canvas.width * resolutionFactor;
  let baseOffHeight = canvas.height * resolutionFactor;
  function extraMargin() {
    return displacementEnabled ? displacementAmount * resolutionFactor : 0;
  }
  
  // Offscreen canvas for noise generation (extended vertically)
  const offCanvas = document.createElement('canvas');
  const offCtx = offCanvas.getContext('2d');
  
  // Composite canvas: holds the final noise/stipple output (base region only)
  const compositeCanvas = document.createElement('canvas');
  compositeCanvas.width = canvas.width;
  compositeCanvas.height = canvas.height;
  const compositeCtx = compositeCanvas.getContext('2d');
  
  // ---------------------------
  // Update Offscreen Canvas Size & Poisson Points for stipple
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
  
  document.getElementById('rippleToggle').addEventListener('change', (e) => { rippleEnabled = e.target.checked; });
  document.getElementById('rippleAmount').addEventListener('input', (e) => { rippleAmount = parseFloat(e.target.value); updateDisplay('rippleAmountVal', rippleAmount); });
  
  document.getElementById('minDistance').addEventListener('input', (e) => { minDistance = parseInt(e.target.value); updateDisplay('minDistanceVal', minDistance); stipplePoints = generatePoissonPoints(offCanvas.width, offCanvas.height, minDistance); });
  document.getElementById('minDotSize').addEventListener('input', (e) => { minDotSize = parseFloat(e.target.value); updateDisplay('minDotSizeVal', minDotSize); });
  document.getElementById('maxDotSize').addEventListener('input', (e) => { maxDotSize = parseFloat(e.target.value); updateDisplay('maxDotSizeVal', maxDotSize); });
  document.getElementById('brightnessThreshold').addEventListener('input', (e) => { brightnessThreshold = parseInt(e.target.value); updateDisplay('brightnessThresholdVal', brightnessThreshold); });
  document.getElementById('stippleToggle').addEventListener('change', (e) => { stippleEnabled = e.target.checked; });
  
  document.getElementById('displacementAmount').addEventListener('input', (e) => { displacementAmount = parseFloat(e.target.value); updateDisplay('displacementAmountVal', displacementAmount); updateOffCanvasSize(); });
  document.getElementById('displacementToggle').addEventListener('change', (e) => { displacementEnabled = e.target.checked; updateOffCanvasSize(); });
  
  // ---------------------------
  // Trigger a new ripple on mousemove (NEW)
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    // Coordinates relative to the canvas
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Add a new ripple with its origin fixed at the mouse location.
    ripples.push({ x, y, startTime: performance.now() });
  });
  
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
    const extHeight = offCanvas.height;
    const imageData = offCtx.createImageData(width, extHeight);
    const data = imageData.data;
    const cx = width / 2;
    const cy = baseOffHeight / 2;
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
  // Displacement Texture for Ripple Effect (NEW)
  // Create an offscreen canvas to serve as the displacement texture.
  const displacementCanvas = document.createElement('canvas');
  displacementCanvas.width = compositeCanvas.width;
  displacementCanvas.height = compositeCanvas.height;
  const dispCtx = displacementCanvas.getContext('2d');
  // This function updates the displacement texture by drawing all active ripples.
  function updateDisplacementTexture() {
    // Clear to black
    dispCtx.clearRect(0, 0, displacementCanvas.width, displacementCanvas.height);
    // Use additive blending to sum ripple effects
    dispCtx.globalCompositeOperation = 'lighter';
    const currentTime = performance.now();
    // Ripple settings (in seconds and pixels)
    const rippleDuration = 1.5; // ripple lasts 1.5 seconds
    const rippleSpeed = 150;    // expands at 150 pixels per second
    // Draw each ripple
    for (let i = ripples.length - 1; i >= 0; i--) {
      const ripple = ripples[i];
      const age = (currentTime - ripple.startTime) / 1000;
      if (age > rippleDuration) {
        ripples.splice(i, 1);
        continue;
      }
      const radius = rippleSpeed * age;
      // Amplitude decays linearly from the initial rippleAmount to 0.
      const amplitude = rippleAmount * (1 - age / rippleDuration);
      const a = Math.min(amplitude, 1.0);
      // Create a radial gradient: white (scaled by amplitude) at the center to black at the edge.
      let grad = dispCtx.createRadialGradient(ripple.x, ripple.y, 0, ripple.x, ripple.y, radius);
      grad.addColorStop(0, `rgba(${Math.floor(a * 255)}, ${Math.floor(a * 255)}, ${Math.floor(a * 255)}, 1)`);
      grad.addColorStop(1, 'rgba(0,0,0,1)');
      dispCtx.fillStyle = grad;
      dispCtx.beginPath();
      dispCtx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
      dispCtx.fill();
    }
    dispCtx.globalCompositeOperation = 'source-over';
  }
  
  // ---------------------------
  // Setup WebGL for Ripple Effect (NEW)
  const rippleCanvas = document.createElement('canvas');
  rippleCanvas.width = compositeCanvas.width;
  rippleCanvas.height = compositeCanvas.height;
  const gl = rippleCanvas.getContext('webgl');
  
  // Define shader sources (updated to remove uMouse)
  const vertexShaderSource = `
    attribute vec2 aPosition;
    attribute vec2 aTexCoord;
    varying vec2 vUv;
    void main() {
      vUv = aTexCoord;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;
  
  const fragmentShaderSource = `
    precision mediump float;
    uniform sampler2D uTexture;
    uniform sampler2D uDisplacement;
    uniform vec4 winResolution;
    uniform float rippleAmount;
    varying vec2 vUv;
    float PI = 3.141592653589793238;
    
    void main() {
      vec2 vUvScreen = gl_FragCoord.xy / winResolution.xy;
      vec4 displacement = texture2D(uDisplacement, vUvScreen);
      float theta = displacement.r * 2.0 * PI;
      vec2 dir = vec2(sin(theta), cos(theta));
      vec2 uv = vUvScreen + dir * displacement.r * rippleAmount;
      vec4 color = texture2D(uTexture, uv);
      gl_FragColor = color;
    }
  `;
  
  // Helper functions to compile shaders and create program
  function compileShader(source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile failed with: ' + gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }
  
  function createProgram(vertexSource, fragmentSource) {
    const vertexShader = compileShader(vertexSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fragmentSource, gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program failed to link: ' + gl.getProgramInfoLog(program));
      return null;
    }
    return program;
  }
  
  const rippleProgram = createProgram(vertexShaderSource, fragmentShaderSource);
  gl.useProgram(rippleProgram);
  
  // Set up a full-screen quad
  const quadVertices = new Float32Array([
    -1, -1,  0, 0,
     1, -1,  1, 0,
    -1,  1,  0, 1,
    -1,  1,  0, 1,
     1, -1,  1, 0,
     1,  1,  1, 1,
  ]);
  const quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
  
  const aPosition = gl.getAttribLocation(rippleProgram, 'aPosition');
  const aTexCoord = gl.getAttribLocation(rippleProgram, 'aTexCoord');
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(aTexCoord);
  gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 16, 8);
  
  // Get uniform locations
  const uTextureLoc = gl.getUniformLocation(rippleProgram, 'uTexture');
  const uDisplacementLoc = gl.getUniformLocation(rippleProgram, 'uDisplacement');
  const winResolutionLoc = gl.getUniformLocation(rippleProgram, 'winResolution');
  const rippleAmountLoc = gl.getUniformLocation(rippleProgram, 'rippleAmount');
  
  gl.uniform4f(winResolutionLoc, rippleCanvas.width, rippleCanvas.height, 0, 0);
  
  // Create textures for the noise image and the displacement map
  const noiseTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, noiseTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  
  const displacementTextureGL = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, displacementTextureGL);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  
  // Function to apply the ripple effect using WebGL (NEW)
  function applyRippleEffect(noiseImageData) {
    // Upload noise image as texture to unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, noiseTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, noiseImageData.width, noiseImageData.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, noiseImageData.data);
    gl.uniform1i(uTextureLoc, 0);
    
    // Upload updated displacement canvas as texture to unit 1 using the HTMLCanvasElement overload.
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, displacementTextureGL);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, displacementCanvas);
    gl.uniform1i(uDisplacementLoc, 1);
    
    // Set ripple amplitude uniform
    gl.uniform1f(rippleAmountLoc, rippleAmount);
    
    // Draw the quad
    gl.viewport(0, 0, rippleCanvas.width, rippleCanvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    // Read the pixels from the WebGL canvas into an ImageData object
    const pixels = new Uint8Array(rippleCanvas.width * rippleCanvas.height * 4);
    gl.readPixels(0, 0, rippleCanvas.width, rippleCanvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return new ImageData(new Uint8ClampedArray(pixels), rippleCanvas.width, rippleCanvas.height);
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
    offCtx.putImageData(imageData, 0, 0);
    compositeCtx.clearRect(0, 0, compositeCanvas.width, compositeCanvas.height);
    compositeCtx.drawImage(offCanvas, 0, 0, offCanvas.width, baseOffHeight, 0, 0, compositeCanvas.width, compositeCanvas.height);
  }
  
  // ---------------------------
  // Helper: Sample brightness from imageData at (x, y)
  function sampleBrightness(imageData, x, y) {
    const ix = Math.floor(Math.max(0, Math.min(x, imageData.width - 1)));
    const iy = Math.floor(Math.max(0, Math.min(y, imageData.height - 1)));
    return imageData.data[(iy * imageData.width + ix) * 4];
  }
  
  // ---------------------------
  // Main Animation Loop
  let time = 0;
  function animate() {
    requestAnimationFrame(animate);
    if (animationEnabled) { time += speed; }
    // Update noise image
    let noiseImageData = generateNoiseImage();
    
    // If ripple effect is enabled, update the displacement texture from all active ripples.
    if (rippleEnabled) {
      updateDisplacementTexture();
      noiseImageData = applyRippleEffect(noiseImageData);
      compositeCtx.putImageData(noiseImageData, 0, 0);
    } else {
      drawNoise(noiseImageData);
    }
       
    // If stipple is enabled, draw stipple art on top of the current composite background.
    if (stippleEnabled) {
      drawStipple(noiseImageData);
    }
    ctx.drawImage(compositeCanvas, 0, 0, canvas.width, canvas.height);
  }
  
  animate();
});
