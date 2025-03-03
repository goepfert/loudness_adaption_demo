/**
 * Audio Context Controller
 *
 * author: Thomas Goepfert
 */

import GraphCtrl from './graphController.js';
import ParaCtrl from './parameterController.js';
import UICtrl from './userInterfaceController.js';
import { Config } from './config.js';

('use strict');

function createAudioCtxCtrl(audioContext, buffer) {
  let targetLKFS = ParaCtrl.getTargetLoudness();
  const startGain = 1.0;
  let targetGain = 1.0;

  let decay_decrease = undefined;
  let decay_increase = undefined;
  let source = undefined;
  let gain = undefined;
  let audioMeter = undefined;
  let loudnessProcessor = undefined;
  let loudnessProcessor_control = undefined;

  let startedAt = 0;
  let pausedAt = 0;
  let isPlaying = false;

  // Callback called at the end of onProcess
  function callback_loudness(gatedLoudness) {
    if (isNaN(gatedLoudness)) {
      gatedLoudness = ParaCtrl.getDefaultTargetLoudness();
    }
    gatedLoudness = Number(gatedLoudness.toFixed(2));

    const currentPlayTime = getCurrentPlayTime();
    GraphCtrl.setDataPoint(currentPlayTime, 0);
    GraphCtrl.setDataPoint(gatedLoudness, 1);
    if (!isNaN(gatedLoudness)) {
      applyGain(gatedLoudness);
    }

    if (Config.debug) {
      console.log('measured loudness:', gatedLoudness);
    }
  }

  // Callback called at the end of onProcess
  function callback_loudness_control(gatedLoudness) {
    // plot something even if retrieved values are unreasonable
    if (isNaN(gatedLoudness)) {
      gatedLoudness = ParaCtrl.getDefaultTargetLoudness();
    }
    gatedLoudness = Number(gatedLoudness.toFixed(2));
    GraphCtrl.setDataPoint(gatedLoudness, 2);
    GraphCtrl.setDataPoint(targetLKFS, 3);
    GraphCtrl.setDataPoint(targetGain, 4); // last call

    if (Config.debug) {
      console.log('measured loudness after gain control:', gatedLoudness);
    }
  }

  function createAudioMeterProcessor() {
    audioMeter = new AudioWorkletNode(audioContext, 'audioMeter-processor');
    // attach to object
    audioMeter.volume = [];
    audioMeter.clipping = 0;

    audioMeter.port.onmessage = (e) => {
      switch (e.data.name) {
        case 'volume':
          audioMeter.volume = e.data.value;
          break;
        case 'clipping':
          audioMeter.clipping = e.data.value;
        default:
          break;
      }
    };

    return audioMeter;
  }

  function createLoudnessProcessor() {
    loudnessProcessor = new AudioWorkletNode(audioContext, 'loudness-processor', {
      processorOptions: { loudnessprops: ParaCtrl.getLoudnessProperties(), id: 'loudness-processor' },
    });
    // attach to object
    loudnessProcessor.gatedLoudness = NaN;

    loudnessProcessor.port.onmessage = (e) => {
      switch (e.data.name) {
        case 'loudness':
          const gatedLoudness = e.data.value;
          callback_loudness(gatedLoudness);
          break;
        default:
          break;
      }
    };
    return loudnessProcessor;
  }

  function createLoudnessProcessor_control() {
    loudnessProcessor_control = new AudioWorkletNode(audioContext, 'loudness-processor', {
      processorOptions: {
        loudnessprops: {
          interval: 0.4,
          overlap: 0.75,
          maxT: 4.0,
        },
        id: 'loudness-processor-control',
      },
    });
    // attach to object
    loudnessProcessor_control.gatedLoudness = NaN;

    loudnessProcessor_control.port.onmessage = (e) => {
      switch (e.data.name) {
        case 'loudness':
          const gatedLoudness = e.data.value;
          callback_loudness_control(gatedLoudness);
          break;
        default:
          break;
      }
    };
    return loudnessProcessor_control;
  }

  function play() {
    console.log('- PLAY --------------------------------');

    UICtrl.disableLoudnessControl();
    if (audioMeter == undefined) {
      console.log('creating audioMeter');
      audioMeter = createAudioMeterProcessor();
    }
    if (loudnessProcessor == undefined) {
      console.log('creating loudnessProcessor');
      loudnessProcessor = createLoudnessProcessor();
    }
    if (loudnessProcessor_control == undefined) {
      console.log('creating loudnessProcessor after gain control');
      loudnessProcessor_control = createLoudnessProcessor_control();
    }

    gain = audioContext.createGain();

    source = audioContext.createBufferSource();
    source.buffer = buffer;

    // frequency response tested with https://developer.mozilla.org/de/docs/Web/API/Web_Audio_API/Using_IIR_filters
    const feedForward_shelving = Config.shelving.feedforward;
    const feedBack_shelving = Config.shelving.feedback;
    const iirfilter_shelving = audioContext.createIIRFilter(feedForward_shelving, feedBack_shelving);

    const feedForward_highpass = Config.highpass.feedforward;
    const feedBack_highpass = Config.highpass.feedback;
    const iirfilter_highpass = audioContext.createIIRFilter(feedForward_highpass, feedBack_highpass);

    source.connect(iirfilter_shelving).connect(iirfilter_highpass).connect(loudnessProcessor);

    const iirfilter_shelving_2 = audioContext.createIIRFilter(feedForward_shelving, feedBack_shelving);
    const iirfilter_highpass_2 = audioContext.createIIRFilter(feedForward_highpass, feedBack_highpass);

    source
      .connect(gain)
      .connect(audioMeter)
      .connect(iirfilter_shelving_2)
      .connect(iirfilter_highpass_2)
      .connect(loudnessProcessor_control);

    gain.connect(audioContext.destination);

    gain.gain.setValueAtTime(targetGain, audioContext.currentTime); //?

    source.start(0, pausedAt);
    source.loop = ParaCtrl.getLoop();

    startedAt = audioContext.currentTime - pausedAt;
    pausedAt = 0;
    isPlaying = true;
  }

  function pause() {
    console.log('- PAUSE --------------------------------');

    const elapsed = audioContext.currentTime - startedAt;
    commonStop();
    pausedAt = elapsed;
  }

  function stop() {
    console.log('- STOP --------------------------------');

    commonStop();
    if (loudnessProcessor != undefined) {
      loudnessProcessor.port.postMessage('resetBuffer');
      loudnessProcessor.disconnect();
      loudnessProcessor = undefined;
    }
    if (loudnessProcessor_control != undefined) {
      loudnessProcessor_control.port.postMessage('resetBuffer');
      loudnessProcessor_control.disconnect();
      loudnessProcessor_control = undefined;
    }
    if (audioMeter != undefined) {
      audioMeter.disconnect();
      audioMeter = undefined;
    }
    targetGain = startGain;
    UICtrl.enableLoudnessControl();
  }

  function commonStop() {
    if (loudnessProcessor != undefined) {
      loudnessProcessor.disconnect();
    }
    if (loudnessProcessor_control != undefined) {
      loudnessProcessor_control.disconnect();
    }
    if (audioMeter != undefined) {
      audioMeter.disconnect();
    }
    if (source != undefined) {
      console.log('disconnecting source and all connected nodes');
      source.disconnect();
      source.stop(0);
      source = undefined;
    }

    pausedAt = 0;
    startedAt = 0;
    isPlaying = false;
  }

  function getPlaying() {
    return isPlaying;
  }

  function getCurrentPlayTime() {
    // mainly for displaying of current playtime
    if (pausedAt != 0) {
      return pausedAt;
    }
    if (startedAt != 0) {
      return audioContext.currentTime - startedAt;
    }
    return 0;
  }

  function getDuration() {
    return buffer.duration;
  }

  function applyGain(loudness) {
    if (!ParaCtrl.getApplyGainCorrection()) {
      targetGain = startGain;
      gain.gain.setValueAtTime(targetGain, audioContext.currentTime);
      return;
    }

    // well well ... this looks ugly
    decay_decrease = ParaCtrl.getDecayDecrease().decay_decrease[ParaCtrl.getDecayDecrease().decay_decrease_idx];
    decay_increase = ParaCtrl.getDecayIncrease().decay_increase[ParaCtrl.getDecayIncrease().decay_increase_idx];
    targetLKFS = ParaCtrl.getTargetLoudness();

    let dB = loudness - targetLKFS;
    let endTime = Math.abs(dB / decay_increase);
    if (dB > 0) {
      endTime = dB / decay_decrease;
    }

    //95%, see https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime
    endTime /= 3;
    targetGain = startGain / Math.pow(10, dB / 20);
    gain.gain.setTargetAtTime(targetGain, audioContext.currentTime, endTime);

    if (Config.debug) {
      console.log(
        '(measured - target) loudness / target gain / endTime: ',
        dB.toFixed(2),
        ' / ',
        targetGain.toFixed(2),
        ' / ',
        endTime.toFixed(2)
      );
    }
  }

  function setTargetLoudness(loudness) {
    targetLKFS = loudness;
  }

  function reset() {
    // no need for play pause, fixes also reset loudness in file loop if playtime>duration
    if (loudnessProcessor != undefined) {
      loudnessProcessor.port.postMessage('resetBuffer');
    }
    if (loudnessProcessor_control != undefined) {
      loudnessProcessor_control.port.postMessage('resetBuffer');
    }
    if (gain != undefined) {
      gain.gain.setValueAtTime(startGain, audioContext.currentTime);
    }
  }

  function setLoop() {
    if (source != undefined) {
      source.loop = ParaCtrl.getLoop();
    }
  }

  function getMeter() {
    return audioMeter;
  }

  // Public methods
  return {
    getCurrentPlayTime,
    getDuration,
    getPlaying,
    play,
    pause,
    stop,
    setTargetLoudness,
    reset,
    setLoop,
    getMeter,
  };
}

export { createAudioCtxCtrl };
