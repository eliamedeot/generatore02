/*
Copyright 2025 Elia Medeot
This file is part of GENERATORE DI TEXTURE 01 and is released under the MIT License.
*/
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.20/+esm';
import { Context, Element } from 'https://cdn.jsdelivr.net/npm/svgcanvas@2.6.0/+esm';
const gui = new GUI({ container: document.getElementById('ui') });

// Math.random() returns a random number between 0 (inclusive), and 1 (exclusive)
// https://www.w3schools.com/js/js_random.asp
const randomWidth = Math.floor(Math.random() * 1000 + 1000);
const randomHeight = Math.floor(Math.random() * 1000 + 1000);
let image = new Image();
image.crossOrigin = 'https://picsum.photos/';
image.src = 'https://picsum.photos/' + randomWidth + '/' + randomHeight;

// Onscreen canvas
const mainCanvas = document.getElementById('myCanvas');
const mainContext = mainCanvas.getContext('2d');

// Image canvas
const imageCanvas = document.createElement('canvas');
imageCanvas.id = 'imageCanvas';
const imageContext = imageCanvas.getContext('2d', { willReadFrequently: true });

// Raster filter canvas
const filterCanvas = document.createElement('canvas');
filterCanvas.id = 'filterCanvas';
const filterContext = filterCanvas.getContext('2d', { willReadFrequently: true });

// SVG filter canvas
// https://www.jsdelivr.com/package/npm/svgcanvas
const vectorCanvas = document.createElement('canvas');
const vectorContext = vectorCanvas.getContext('2d');

// More options to pass into constructor
let svgContext;
// UI parameters
const params = {
  tilesX: 10,
  tilesY: 10,
  minH: 0,
  maxH: 100,
  direction: 'Horizontal',
  color: '#282828',
  showImageColor: false,
  colorBG: '#FFFFFF',
  filterBG: false,
  invertFilter: false,
  showReferenceImage: false,
  imageLoader: function () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          image.onload = () => {
            initializeSVGContext(); // Initialize svgContext with new image dimensions
            updateMosaic();
          };
          image.src = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  },
  imageDownloader: function () {
    // Get the serialized SVG content
    svgContext.width = image.width;
    svgContext.height = image.height;
    const svgContent = svgContext.getSerializedSvg();
    // Create a Blob with the SVG content
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    // Create a download link for the Blob
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'canvas_image.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Function to initialize svgContext
function initializeSVGContext() {
  const options = {
    width: image.width,
    height: image.height,
    svgContext: vectorContext,
    enableMirroring: false,
    document: undefined,
  };
  svgContext = new Context(options); // Initialize svgContext after image is loaded
}

// Adding parameters to UI
gui.open();
gui.add(params, 'tilesX', 1, 400).step(1).name('Tiles X').onChange(updateMosaic);
gui.add(params, 'tilesY', 1, 400).step(1).name('Tiles Y').onChange(updateMosaic);
// gui.add(params, 'minH', 0, 100).step(1).name('Minimum Height').onChange(updateMosaic);
// gui.add(params, 'maxH', 0, 100).step(1).name('Maximum Height').onChange(updateMosaic);
const minHController = gui.add(params, 'minH', 0, params.maxH).step(1).name('Minimum Height').onChange(updateMosaic);
const maxHController = gui.add(params, 'maxH', 0, 1000).step(1).name('Maximum Height').onChange(updateMosaic);
gui.add(params, 'direction', ['Horizontal', 'Vertical']).onChange(updateMosaic);
maxHController.onChange(function (value) {
  minHController.max(value);
  if (params.minH > value) minHController.setValue(value);
  minHController.updateDisplay();
  updateMosaic();
});
gui.addColor(params, 'color').name('Tiles Color').onChange(updateMosaic);
gui.add(params, 'showImageColor').name('Use Image Colors').onChange(updateMosaic);
gui.addColor(params, 'colorBG').name('Background').onChange(updateMosaic);
gui.add(params, 'filterBG').name('Transparent BG').onChange(updateMosaic);
gui.add(params, 'invertFilter').name('Invert').onChange(updateMosaic);
gui.add(params, 'showReferenceImage').name('Show Reference Image').onChange(updateMosaic);
gui.add(params, 'imageLoader').name('Load Image');
gui.add(params, 'imageDownloader').name('Download SVG');
image.onload = function () {
  initializeSVGContext(); // Initialize svgContext with initial image dimensions
  updateMosaic();
};
window.addEventListener('resize', onWindowResize);
function updateMosaic() {
  let mainCanvasWidth = window.innerWidth * 0.8;
  let mainCanvasHeight = window.innerHeight * 0.8;
  let imageAspectRatio = image.width / image.height;
  if (mainCanvasWidth / mainCanvasHeight > imageAspectRatio) {
    mainCanvasWidth = mainCanvasHeight * imageAspectRatio;
  } else {
    mainCanvasHeight = mainCanvasWidth / imageAspectRatio;
  }
  // Onscreen canvas
  mainCanvas.width = mainCanvasWidth;
  mainCanvas.height = mainCanvasHeight;

  // Image canvas
  imageCanvas.width = image.width;
  imageCanvas.height = image.height;

  // Raster filter canvas
  filterCanvas.width = image.width;
  filterCanvas.height = image.height;

  // SVG filter canvas
  vectorCanvas.width = image.width;
  vectorCanvas.height = image.height;

  imageContext.drawImage(image, 0, 0, imageCanvas.width, imageCanvas.height);
  let tileW = filterCanvas.width / params.tilesX;
  let tileH = filterCanvas.height / params.tilesY;

  // Reset translation to ensure it's only applied once
  filterContext.setTransform(1, 0, 0, 1, 0, 0);
  svgContext.setTransform(1, 0, 0, 1, 0, 0);
  filterContext.clearRect(0, 0, filterCanvas.width, filterCanvas.height);
  svgContext.__clearCanvas(0, 0, vectorCanvas.width, vectorCanvas.height);

  // Showing/hiding the background
  if (params.filterBG == false) {
    filterContext.fillStyle = params.colorBG;
    filterContext.fillRect(0, 0, filterCanvas.width, filterCanvas.height);
    svgContext.fillStyle = params.colorBG;
    svgContext.fillRect(0, 0, vectorCanvas.width, vectorCanvas.height);
  }
  // Centering the artwork
  filterContext.translate(tileW / 2, tileH / 2);
  svgContext.translate(tileW / 2, tileH / 2);
  for (let x = 0; x < params.tilesX; x++) {
    for (let y = 0; y < params.tilesY; y++) {

      // Mapping the tile coordinates to the filter's canvas coordinates
      let imgX = map(x, 0, params.tilesX, 0, filterCanvas.width);
      let imgY = map(y, 0, params.tilesY, 0, filterCanvas.height);
      // Get the pixel data from the image
      const pixelData = imageContext.getImageData(imgX, imgY, 1, 1).data;
      // Get the color components
      let r = pixelData[0];
      let g = pixelData[1];
      let b = pixelData[2];
      // Calculating the pixel's brightness
      let bValue = brightness(r, g, b);
      let radius;
      if (params.invertFilter == true) {
        radius = map(bValue, 0, 255, params.minH, params.maxH) / 2;
      } else {
        radius = map(bValue, 0, 255, params.maxH, params.minH) / 2;
      }
      if (params.showImageColor == true) {
        filterContext.fillStyle = 'rgb(' + r + ', ' + g + ', ' + b + ')';
        svgContext.fillStyle = 'rgb(' + r + ', ' + g + ', ' + b + ')';
      } else {
        filterContext.fillStyle = params.color;
        svgContext.fillStyle = params.color;
      }
      if (params.direction == 'Vertical') {
        filterContext.beginPath();
        filterContext.rect(x * tileW - radius / 2, y * tileH - tileH / 2, radius, tileH);
        filterContext.fill();
        svgContext.beginPath();
        svgContext.rect(x * tileW - radius / 2, y * tileH - tileH / 2, radius, tileH);
        svgContext.fill();
      } else {
        filterContext.beginPath();
        filterContext.rect(x * tileW - tileW / 2, y * tileH - radius / 2, tileW, radius);
        filterContext.fill();
        svgContext.beginPath();
        svgContext.rect(x * tileW - tileW / 2, y * tileH - radius / 2, tileW, radius);
        svgContext.fill();
      }
    }
  }
  // Show/hide reference image
  if (params.showReferenceImage == true) {
    mainContext.drawImage(imageCanvas, 0, 0, mainCanvas.width, mainCanvas.height);
  } else {
    mainContext.drawImage(filterCanvas, 0, 0, mainCanvas.width, mainCanvas.height);
  }
} //updateMosaic
function onWindowResize() {
  updateMosaic();
}
// https://p5js.org/reference/p5/map
// https://github.com/processing/p5.js/blob/v1.11.8/src/math/calculation.js#L534
function map(value, start1, stop1, start2, stop2) {
  return (value - start1) / (stop1 - start1) * (stop2 - start2) + start2;
}
function brightness(r, g, b) {
  return (r + g + b) / 3;
}

// Debounce function for resize events
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this, args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

// Replace the original resize event listener with the debounced version
window.removeEventListener('resize', onWindowResize);
window.addEventListener('resize', debounce(onWindowResize, 250));
