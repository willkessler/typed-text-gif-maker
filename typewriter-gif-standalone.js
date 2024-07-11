const typewriterElement = document.getElementById('typewriter');
const textElement = document.getElementById('text');
const captureBtn = document.getElementById('captureBtn');
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


function updateTypewriterStyle() {
  textElement.style.fontSize = `${fontSizeInput.value}px`;
  textElement.style.fontFamily = fontFamilySelect.value;
  typewriterElement.style.backgroundColor = backgroundColorInput.value;
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
      textElement.textContent = prefix + currentSuffix;
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
    log('Capture already in progress');
    return;
  }

  isCapturing = true;
  captureBtn.disabled = true;
  captureBtn.textContent = 'Capturing...';
  //statusElement.textContent = 'Preparing to capture...';
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

      // Type out the suffix
      for (let i = 0; i <= currentSuffixText.length; i++) {
        if (!isCapturing) break;
        textElement.textContent = prefix + currentSuffixText.slice(0, i);
        //updateTypewriterStyle();
        const canvas = await html2canvas(typewriterElement);
        if (i === currentSuffixText.length) {
          gif.addFrame(canvas, {delay: suffixDelay, copy: true});
        } else {
          gif.addFrame(canvas, {delay: typingSpeed, copy: true});
        }
        log(`Captured frame: ${textElement.textContent}`);
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
        log('GIF rendering finished');
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
}

captureBtn.addEventListener('click', captureGIF);
prefixInput.addEventListener('input', updateText);
suffixesTextarea.addEventListener('input', updateText);
fontSizeInput.addEventListener('input', updateTypewriterStyle);
fontFamilySelect.addEventListener('change', updateTypewriterStyle);
backgroundColorInput.addEventListener('input', updateTypewriterStyle);
typingSpeedInput.addEventListener('input', updateText);
suffixDelayInput.addEventListener('input', updateText);

// Initial setup
updateTypewriterStyle();
animatePreview();
