const typewriterElement = document.getElementById('typewriter');
const textElement = document.getElementById('text');
const captureBtn = document.getElementById('captureBtn');
const restartBtn = document.getElementById('restartBtn');
const gifResult = document.getElementById('gifResult');
const statusElement = document.getElementById('status');
const logElement = document.getElementById('log');
const errorElement = document.getElementById('error');
const downloadLink = document.getElementById('downloadLink');

const prefixInput = document.getElementById('prefix');
const suffixesTextarea = document.getElementById('suffixes');
const fontSizeInput = document.getElementById('fontSize');
const fontFamilySelect = document.getElementById('fontFamily');
const backgroundColorInput = document.getElementById('backgroundColor');
const prefixColorInput = document.getElementById('prefixColor');
const suffixColorInput = document.getElementById('suffixColor');
const typingSpeedInput = document.getElementById('typingSpeed');
const suffixDelayInput = document.getElementById('suffixDelay');

let typingSpeed = typingSpeedInput.value;
let suffixDelay = suffixDelayInput.value;

let prefix = prefixInput.value;
let suffixes = suffixesTextarea.value.split('\n').filter(s => s.trim() !== '');
let currentSuffixIndex = 0;
let currentSuffix = '';
let isCapturing = false;
let animationTimeout;

const googleFonts = [
    "Open Sans", "Lato", "Montserrat", "Raleway", "Poppins", "Oswald", "Merriweather", 
    "Playfair Display", "Ubuntu", "Roboto Condensed", "Roboto Slab", "Noto Sans", "PT Sans", 
    "Source Sans Pro", "Slabo 27px", "Quicksand", "Nunito", "Titillium Web", "Rubik"
];

function reloadPage() {
  window.location = '/';
}

function loadAndApplyFont(fontFamily) {
  WebFont.load({
    google: {
      families: [fontFamily]
    },
    active: function() {
      // Font has finished loading
      document.getElementById('text').style.fontFamily = `"${fontFamily}", sans-serif`;
    },
    inactive: function() {
      console.log(`Failed to load font: ${fontFamily}`);
    }
  });
}

// Function to populate the font family dropdown
function populateFontDropdown() {
    const fontFamilySelect = document.getElementById('fontFamily');
    googleFonts.forEach(font => {
        const option = document.createElement('option');
        option.value = font;
        option.textContent = font;
        fontFamilySelect.appendChild(option);
    });
}

function updateTypewriterStyle() {
  const fontFamily = document.getElementById('fontFamily').value;
  textElement.style.fontSize = `${fontSizeInput.value}px`;
  textElement.style.fontFamily = `"${fontFamily}", sans-serif`;
  typewriterElement.style.backgroundColor = backgroundColorInput.value;

  // Apply prefix and suffix colors
  applyColors();
}

function applyColors() {
  const prefixSpan = document.createElement('span');
  prefixSpan.style.color = prefixColorInput.value;
  prefixSpan.textContent = prefix;

  const suffixSpan = document.createElement('span');
  suffixSpan.style.color = suffixColorInput.value;
  suffixSpan.textContent = currentSuffix;

  textElement.innerHTML = '';
  textElement.appendChild(prefixSpan);
  textElement.appendChild(suffixSpan);
}

function updateText() {
  typingSpeed = typingSpeedInput.value;
  suffixDelay = suffixDelayInput.value;

  clearTimeout(animationTimeout);
  prefix = prefixInput.value;
  suffixes = suffixesTextarea.value.split('\n').filter(s => s.trim() !== '');
  currentSuffixIndex = 0;
  currentSuffix = '';
  animatePreview();
}

function animatePreview() {
  if (isCapturing) {
    return;
  }
  updateTypewriterStyle();
  const animateNextCharacter = () => {
    if (isCapturing) {
      return;
    }
    if (currentSuffix.length < suffixes[currentSuffixIndex].length) {
      currentSuffix += suffixes[currentSuffixIndex][currentSuffix.length];
      applyColors();
      //textElement.textContent = prefix + currentSuffix;
      animationTimeout = setTimeout(animateNextCharacter, typingSpeed);
    } else {
      animationTimeout = setTimeout(() => {
        currentSuffix = '';
        currentSuffixIndex = (currentSuffixIndex + 1) % suffixes.length;
        animateNextCharacter();
      }, suffixDelay);
    }
  };
  animateNextCharacter();
}

function log(message) {
  // console.log(message);
  logElement.innerHTML = message + '<br>';
}

async function captureGIF() {
  if (isCapturing) {
    log('Capture already in progress, cancelling');
    resetCaptureState();
    return;
  }

  updateTypewriterStyle(); // make sure to call this before we start capturing
  isCapturing = true;
  captureBtn.textContent = 'Capturing, please wait... (click to cancel)';
  errorElement.textContent = '';
  logElement.innerHTML = '';
  gifResult.style.display = 'none';
  downloadLink.style.display = 'none';

  try {
    log('Initializing GIF encoder');
    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: typewriterElement.width,
      height: typewriterElement.height,
      workerScript: './gif.worker.js'
    });

    const delayFrames = Math.round(suffixDelay / typingSpeed);

    for (let cycle = 0; cycle < suffixes.length; cycle++) {
      const currentSuffixText = suffixes[cycle % suffixes.length];
      currentSuffix = '';

      // Type out the suffix
      for (let i = 0; i <= currentSuffixText.length; i++) {
        if (!isCapturing) break;
        currentSuffix = currentSuffixText.slice(0, i);
        applyColors();
        const canvas = await html2canvas(typewriterElement);
        if (i === currentSuffixText.length) {
          gif.addFrame(canvas, {delay: suffixDelay, copy: true});
        } else {
          gif.addFrame(canvas, {delay: typingSpeed, copy: true});
        }
        log(`Capturing frame: ${prefix}${currentSuffix}`);
      }
    }

    if (isCapturing) {
      //statusElement.textContent = 'Rendering GIF...';
      log('Starting GIF rendering');
      gif.on('progress', progress => {
        //statusElement.textContent = `Rendering GIF: ${Math.round(progress * 100)}%`;
        log(`Render progress: ${Math.round(progress * 100)}%`);
      });

      gif.on('finished', function(blob) {
        log('Your GIF is ready. Click "Download GIF", below, to use this GIF in your project.');
        const url = URL.createObjectURL(blob);
        gifResult.onload = function() {
          //statusElement.textContent = 'GIF captured successfully!';
          gifResult.style.display = 'block';
          downloadLink.href = url;
          downloadLink.download = 'typewriter.gif';
          downloadLink.style.display = 'block';
          //log('GIF displayed and download link created');
          animatePreview();
        };
        gifResult.onerror = function() {
          handleError('Error loading GIF');
        };
        gifResult.src = url;
      });

      log('Calling gif.render()');
      gif.render();
    }
  } catch (error) {
    handleError('Error during GIF capture: ' + error.message);
  } finally {
    resetCaptureState();
  }
}

function handleError(message) {
  console.error(message);
  errorElement.textContent = message;
  statusElement.textContent = 'GIF capture failed';
  log('Error: ' + message);
}

function resetCaptureState() {
  isCapturing = false;
  captureBtn.disabled = false;
  captureBtn.textContent = 'Capture as GIF';
  log('');
}

document.addEventListener('DOMContentLoaded', populateFontDropdown);

captureBtn.addEventListener('click', captureGIF);
restartBtn.addEventListener('click', reloadPage);
prefixInput.addEventListener('input', updateText);
suffixesTextarea.addEventListener('input', updateText);
fontSizeInput.addEventListener('input', updateTypewriterStyle);
fontFamilySelect.addEventListener('change', updateTypewriterStyle);
backgroundColorInput.addEventListener('input', updateTypewriterStyle);
prefixColorInput.addEventListener('input', updateTypewriterStyle);
suffixColorInput.addEventListener('input', updateTypewriterStyle);
typingSpeedInput.addEventListener('input', updateText);
suffixDelayInput.addEventListener('input', updateText);


// Use this function when the font dropdown changes
document.getElementById('fontFamily').addEventListener('change', function() {
  loadAndApplyFont(this.value);
});

// Initial font load
loadAndApplyFont(document.getElementById('fontFamily').value);

// Initial setup
updateTypewriterStyle();
animatePreview();
