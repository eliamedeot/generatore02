/*
Copyright 2025 Elia Medeot
This file is part of GENERATORE DI TEXTURE 02 and is released under the MIT License.
*/
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.20/+esm';
import { Context, Element } from 'https://cdn.jsdelivr.net/npm/svgcanvas@2.6.0/+esm';
const gui = new GUI({ container: document.getElementById('ui') });

import OpenSimplexNoiseModule from 'https://cdn.jsdelivr.net/npm/@minttu/open-simplex-noise@1.3.0/+esm';
const OpenSimplexNoise = OpenSimplexNoiseModule.default;

// Noise texture dimensions
const [width, height] = [1000, 1000];
const noiseCanvas = document.createElement('canvas');
noiseCanvas.width = width;
noiseCanvas.height = height;
const noiseContext = noiseCanvas.getContext('2d');

// Generate noise texture
const noiseImage = noiseContext.createImageData(width, height);

// Onscreen canvas
const mainCanvas = document.getElementById('myCanvas');
const mainContext = mainCanvas.getContext('2d');

// Raster filter canvas
const filterCanvas = document.createElement('canvas');
filterCanvas.width = width;
filterCanvas.height = height;
const filterContext = filterCanvas.getContext('2d', { willReadFrequently: true });

// SVG filter canvas
const vectorCanvas = document.createElement('canvas');
vectorCanvas.width = width;
vectorCanvas.height = height;
const vectorContext = vectorCanvas.getContext('2d');
let svgContext;

// UI parameters
const params = {
  tilesX: 10,
  tilesY: 10,
  minH: 0,
  maxH: 100,
  noiseSeed: 1,
  noiseSize: 128,
  noiseConstrast: 1,
  offsetX: 0,
  offsetY: 0,
  direction: 'Horizontal',
  color: '#282828',
  colorBG: '#FFFFFF',
  filterBG: false,
  invertFilter: false,
  showReferenceImage: false,
  imageDownloader: function () {
    svgContext.width = width;
    svgContext.height = height;
    const svgContent = svgContext.getSerializedSvg();
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'canvas_image.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};


// Initialize SVG context
function initializeSVGContext() {
  const options = {
    width: width,
    height: height,
    svgContext: vectorContext,
    enableMirroring: false,
    document: undefined,
  };
  svgContext = new Context(options);
}

// Add UI controls
gui.open();
gui.add(params, 'tilesX', 1, 400).step(1).name('Tiles X').onChange(updateMosaic);
gui.add(params, 'tilesY', 1, 400).step(1).name('Tiles Y').onChange(updateMosaic);
const minHController = gui.add(params, 'minH', 0, params.maxH).step(1).name('Minimum Height').onChange(updateMosaic);
const maxHController = gui.add(params, 'maxH', 0, 1000).step(1).name('Maximum Height').onChange(updateMosaic);
gui.add(params, 'offsetX', -10, 10).step(1).name('Offset X').onChange(generateNoise);
gui.add(params, 'offsetY', -10, 10).step(1).name('Offset Y').onChange(generateNoise);
gui.add(params, 'noiseSeed', 1, 128).step(1).name('Noise Seed').onChange(generateNoise);
gui.add(params, 'noiseSize', 1, 512).step(1).name('Noise Size').onChange(generateNoise);
gui.add(params, 'noiseConstrast', 1, 2).step(0.1).name('Noise Constrast').onChange(generateNoise);

gui.add(params, 'direction', ['Horizontal', 'Vertical']).onChange(updateMosaic);
maxHController.onChange(function (value) {
  minHController.max(value);
  if (params.minH > value) minHController.setValue(value);
  minHController.updateDisplay();
  updateMosaic();
});
gui.addColor(params, 'color').name('Tiles Color').onChange(updateMosaic);
gui.addColor(params, 'colorBG').name('Background').onChange(updateMosaic);
gui.add(params, 'filterBG').name('Transparent BG').onChange(updateMosaic);
gui.add(params, 'invertFilter').name('Invert').onChange(updateMosaic);
gui.add(params, 'showReferenceImage').name('Show Reference Noise').onChange(updateMosaic);
gui.add(params, 'imageDownloader').name('Download SVG');

// Initialize and update
initializeSVGContext();
generateNoise();
updateMosaic();

window.addEventListener('resize', onWindowResize);


function generateNoise() {
  const openSimplex = new OpenSimplexNoise(params.noiseSeed);

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const i = (x + y * width) * 4;
      // Use offsets here
      const noiseX = x / params.noiseSize + params.offsetX;
      const noiseY = y / params.noiseSize + params.offsetY;
      const value = (openSimplex.noise2D(noiseX, noiseY) + 1) * 128;
      noiseImage.data[i] = value * params.noiseConstrast;
      noiseImage.data[i + 1] = value * params.noiseConstrast;
      noiseImage.data[i + 2] = value * params.noiseConstrast;
      noiseImage.data[i + 3] = 255;
    }
  }
  noiseContext.putImageData(noiseImage, 0, 0);
  updateMosaic(); // Update mosaic after noise generation
} // generateNoise


function updateMosaic() {
  // Calculate canvas dimensions
  let mainCanvasWidth = window.innerWidth * 0.8;
  let mainCanvasHeight = window.innerHeight * 0.8;
  let imageAspectRatio = width / height;
  if (mainCanvasWidth / mainCanvasHeight > imageAspectRatio) {
    mainCanvasWidth = mainCanvasHeight * imageAspectRatio;
  } else {
    mainCanvasHeight = mainCanvasWidth / imageAspectRatio;
  }

  // Set canvas sizes
  mainCanvas.width = mainCanvasWidth;
  mainCanvas.height = mainCanvasHeight;
  filterCanvas.width = width;
  filterCanvas.height = height;
  vectorCanvas.width = width;
  vectorCanvas.height = height;

  // Clear canvases
  filterContext.clearRect(0, 0, filterCanvas.width, filterCanvas.height);
  svgContext.__clearCanvas(0, 0, vectorCanvas.width, vectorCanvas.height);

  // Draw background if not transparent
  if (!params.filterBG) {
    filterContext.fillStyle = params.colorBG;
    filterContext.fillRect(0, 0, filterCanvas.width, filterCanvas.height);
    svgContext.fillStyle = params.colorBG;
    svgContext.fillRect(0, 0, vectorCanvas.width, vectorCanvas.height);
  }

  // Calculate tile size
  const tileW = filterCanvas.width / params.tilesX;
  const tileH = filterCanvas.height / params.tilesY;

  // Center the tiles
  filterContext.translate(tileW / 2, tileH / 2);
  svgContext.translate(tileW / 2, tileH / 2);

  // Generate mosaic
  for (let x = 0; x < params.tilesX; x++) {
    for (let y = 0; y < params.tilesY; y++) {
      // Map tile coordinates to noise canvas
      const imgX = Math.floor((x / params.tilesX) * width);
      const imgY = Math.floor((y / params.tilesY) * height);

      // Get pixel data from noise texture
      const pixelData = noiseContext.getImageData(imgX, imgY, 1, 1).data;
      const r = pixelData[0];
      const g = pixelData[1];
      const b = pixelData[2];
      const bValue = brightness(r, g, b);

      // Calculate radius based on brightness
      let radius;
      if (params.invertFilter) {
        radius = map(bValue, 0, 255, params.minH, params.maxH) / 2;
      } else {
        radius = map(bValue, 0, 255, params.maxH, params.minH) / 2;
      }

      filterContext.fillStyle = params.color;
      svgContext.fillStyle = params.color;

      // Draw tiles
      if (params.direction === 'Vertical') {
        filterContext.fillRect(x * tileW - radius / 2, y * tileH - tileH / 2, radius, tileH);
        svgContext.fillRect(x * tileW - radius / 2, y * tileH - tileH / 2, radius, tileH);
      } else {
        filterContext.fillRect(x * tileW - tileW / 2, y * tileH - radius / 2, tileW, radius);
        svgContext.fillRect(x * tileW - tileW / 2, y * tileH - radius / 2, tileW, radius);
      }
    }
  }

  // Draw to main canvas
  if (params.showReferenceImage) {
    mainContext.drawImage(noiseCanvas, 0, 0, mainCanvas.width, mainCanvas.height);
  } else {
    mainContext.drawImage(filterCanvas, 0, 0, mainCanvas.width, mainCanvas.height);
  }
}

function onWindowResize() {
  updateMosaic();
}

function map(value, start1, stop1, start2, stop2) {
  return (value - start1) / (stop1 - start1) * (stop2 - start2) + start2;
}

function brightness(r, g, b) {
  return (r + g + b) / 3;
}

function debounce(func, wait) {
  let timeout;
  return function () {
    const context = this, args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

window.removeEventListener('resize', onWindowResize);
window.addEventListener('resize', debounce(onWindowResize, 250));
