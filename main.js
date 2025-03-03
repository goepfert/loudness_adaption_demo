/**
 * Dynamic Loudness Demo Main App
 *
 * Check readme for further documentation
 *
 * author: Thomas Goepfert
 */

import ParaCtrl from './src/parameterController.js';
import GraphCtrl from './src/graphController.js';
import UICtrl from './src/userInterfaceController.js';
import { createAudioCtxCtrl } from './src/audioContextController.js';
import LoudnessSample from './src/backup/loudness.js';

('use strict');

// App Controller ----------------------------------------------------------------------------
const MainApp = (() => {
  let audioContext = undefined;
  let audioCtxCtrl = undefined;
  let info = undefined;
  let somebool = true;

  // volume meter
  let canvasContext = undefined;
  let WIDTH = 20;
  let HEIGHT = undefined;

  function init() {
    console.log('initializing app ...');

    // Get UI selectors
    const UISelectors = UICtrl.getSelectors();

    info = document.getElementById(UISelectors.info);

    // Load event listeners
    let playbtn = document.getElementById(UISelectors.playPauseButton);
    playbtn.addEventListener('click', () => {
      playPauseButton(playbtn);
    });
    document.getElementById(UISelectors.stopButton).addEventListener('click', () => stopButton(playbtn));
    document.getElementById(UISelectors.fileselector).addEventListener('change', handleFileSelect, false);
    document.getElementById('loudness_form').addEventListener('change', (e) => {
      UICtrl.applyLoudnessProps();
      console.log(ParaCtrl.getLoudnessProperties());
      GraphCtrl.updateGraph();
      e.preventDefault();
    });

    document.getElementById('gain_form').addEventListener('change', (e) => {
      UICtrl.applyGainProps();
      console.log(ParaCtrl.getGainProperties());
      e.preventDefault();
    });

    // Slider Target Loudness
    let slider = document.getElementById(UISelectors.targetLoudness_slider);
    let value = document.getElementById(UISelectors.targetLoudness_value);
    slider.value = ParaCtrl.getDefaultTargetLoudness();
    value.innerHTML = slider.value;
    slider.oninput = function () {
      value.innerHTML = this.value;
      ParaCtrl.setTargetLoudness(Number(this.value));
      audioCtxCtrl.setTargetLoudness(ParaCtrl.getTargetLoudness());
    };

    // create graph
    GraphCtrl.createGraph(UISelectors.graphdiv);

    // reset button
    document.getElementById(UISelectors.resetButton).addEventListener('click', () => audioCtxCtrl.reset());

    // file loop
    let cb_loop = document.getElementById(UISelectors.loopCheckBox);
    cb_loop.checked = ParaCtrl.getLoop();
    cb_loop.addEventListener('click', () => checkLoop(cb_loop));

    // apply gain correction or bypass
    let cb_gain = document.getElementById(UISelectors.gainCheckBox);
    cb_gain.checked = ParaCtrl.getApplyGainCorrection();
    cb_gain.addEventListener('click', () => checkGainCorrection(cb_gain));

    //audio meter
    canvasContext = document.getElementById('meter').getContext('2d');
  }

  function checkLoop(checkbox) {
    if (checkbox.checked) {
      ParaCtrl.setLoop(true);
    } else {
      ParaCtrl.setLoop(false);
    }
    audioCtxCtrl.setLoop();
  }

  function checkGainCorrection(checkbox) {
    if (checkbox.checked) {
      ParaCtrl.setApplyGainCorrection(true);
    } else {
      ParaCtrl.setApplyGainCorrection(false);
    }
  }

  function playPauseButton(btn) {
    if (audioCtxCtrl.getPlaying()) {
      audioCtxCtrl.pause();
      btn.firstChild.nodeValue = 'play';
    } else {
      audioCtxCtrl.play();
      btn.firstChild.nodeValue = 'pause';
      somebool = true;
      updateAnimationFrame();
    }
  }

  function stopButton(btn) {
    audioCtxCtrl.stop();
    GraphCtrl.resetGraph();
    btn.firstChild.nodeValue = 'play';
    somebool = true;
  }

  // loads and decodes file asynchronically and starts off a lot of other stuff
  function handleFileSelect(evt) {
    audioContext = new AudioContext();

    let file = evt.target.files[0];
    console.log(file);
    let reader = new FileReader();
    reader.onload = function () {
      let arrayBuffer = reader.result;
      audioContext.decodeAudioData(arrayBuffer).then(function (decodedData) {
        if (audioCtxCtrl != undefined) {
          audioCtxCtrl.stop();
        }
        audioCtxCtrl = createAudioCtxCtrl(audioContext, decodedData);

        //unblock control and graph
        document.getElementById('controlbuttons').style.display = 'block';
        HEIGHT = document.getElementById(UICtrl.getSelectors().graphdiv).clientHeight; // I know it only after previous line ...

        GraphCtrl.resetGraph();

        let fileprops = {
          filename: file.name,
          duration: decodedData.duration.toFixed(1),
          samplerate: decodedData.sampleRate,
          numberOfChannels: decodedData.numberOfChannels,
        };
        UICtrl.showFileProps(fileprops);
        UICtrl.showLoudnessProps();
        UICtrl.enableLoudnessControl();

        updateAnimationFrame();

        // Time for do some offline file-loudness calculation with the decoded AudioBuffer
        // Finally I can use to old implementation of the LoudnessSample class ;) ...
        // Who can read this, is a hero!
        const loudnessSample = new LoudnessSample(
          audioContext,
          decodedData,
          (loudness) => {
            const gatedLoudness = Number(loudness.toFixed(2));
            UICtrl.addFileProps({ file_loudness: gatedLoudness });
          },
          ParaCtrl.getLoudnessProperties()
        );
        loudnessSample.onProcess(decodedData);
      });
    };
    reader.readAsArrayBuffer(file);

    loadProcessors();
  }

  /**
   * let the browser update in its capability
   * if playing, called recursively
   */
  function updateAnimationFrame() {
    // playtime / duration
    if (info != undefined) {
      info.innerHTML = audioCtxCtrl.getCurrentPlayTime().toFixed(1) + '/' + audioCtxCtrl.getDuration().toFixed(1);
    }

    // if not in loop, pause at the end, avoid toggling
    if (!ParaCtrl.getLoop() && somebool && audioCtxCtrl.getCurrentPlayTime() >= audioCtxCtrl.getDuration()) {
      let playbtn = document.getElementById(UICtrl.getSelectors().playPauseButton);
      playPauseButton(playbtn);
      somebool = false;
    }

    // volume audio meter
    if (canvasContext != undefined) {
      canvasContext.clearRect(0, 0, WIDTH, HEIGHT);
      const meter = audioCtxCtrl.getMeter();

      if (meter != undefined) {
        meter.port.postMessage('getClipping');
        meter.port.postMessage('getVolume');

        // check if we're currently clipping
        if (meter.clipping != undefined && meter.clipping) {
          canvasContext.fillStyle = 'red';
        } else {
          canvasContext.fillStyle = 'green';
        }
        // draw a bar based on the current volume
        if (meter.volume != undefined) {
          let volume = meter.volume;
          const nChannels = volume.length;
          for (let chIdx = 0; chIdx < nChannels; chIdx++) {
            canvasContext.fillRect((WIDTH / nChannels) * chIdx, HEIGHT, WIDTH / nChannels, -2 * HEIGHT * volume[chIdx]);
          }
        }
      }
    }

    // if playing update graph and call recursively
    // remember to update again when resume playing
    if (audioCtxCtrl.getPlaying()) {
      GraphCtrl.updateGraph();
      window.requestAnimationFrame(updateAnimationFrame);
    }
  }

  async function loadProcessors() {
    await audioContext.audioWorklet.addModule('./src/audioMeter-processor.js');
    await audioContext.audioWorklet.addModule('./src/loudness-processor.js');
  }

  // Public methods
  return {
    init,
  };
})();

// let's go
MainApp.init();
