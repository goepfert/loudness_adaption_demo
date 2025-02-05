/**
 * Audio Context Controller
 *
 * author: Thomas Goepfert
 */

import GraphCtrl from './graphController.js';
import ParaCtrl from './parameterController.js';
import UICtrl from './userInterfaceController.js';
import LoudnessSample from './loudness.js';
// import { createAudioMeter } from './audioMeter.js';
import { Config } from './config.js';

('use strict');

function createAudioCtxCtrl(audioContext, buffer) {
  let targetLKFS = ParaCtrl.getTargetLoudness();
  const startGain = 1.0;
  let targetGain = 1.0;

  let decay_decrease = undefined;
  let decay_increase = undefined;

  // Don't go too low with buffersize, saw some 'strange' or not expected things, like
  // - number of process samples * sample rate smaller than playtime
  // which accumulates over time.
  // I believe that onprocess is not called with the proper samplerate and there is some sample rate conversion
  // happening under the hood.
  const bufferSize = 2 * 4096; // about 1/2 seconds for 48 kHz sampling rate
  let sp_loudness = undefined;
  let sp_loudness_control = undefined;
  let source = undefined;
  let gain = undefined;

  let startedAt = 0;
  let pausedAt = 0;
  let isPlaying = false;

  let meter = undefined;
  let audioMeter = undefined;

  let loudnessSample = undefined;
  let loudnessSample_control = undefined;

  // Callback called at the end of onProcess
  function callback_loudness(gatedLoudness) {
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
    audioMeter.volume = [];
    audioMeter.clipping = 0;

    audioMeter.port.onmessage = (e) => {
      switch (e.data.name) {
        case 'volume':
          // console.log('volume:', e.data.value);
          audioMeter.volume = e.data.value;
          break;
        case 'clipping':
          // console.log('clipping:', e.data.value);
          audioMeter.clipping = e.data.value;
        default:
          break;
      }
    };

    return audioMeter;
  }

  async function play() {
    console.log('- PLAY --------------------------------');

    UICtrl.disableLoudnessControl();
    if (loudnessSample == undefined) {
      loudnessSample = new LoudnessSample(audioContext, buffer, callback_loudness, ParaCtrl.getLoudnessProperties(), 1);
    }
    if (loudnessSample_control == undefined) {
      loudnessSample_control = new LoudnessSample(
        audioContext,
        buffer,
        callback_loudness_control,
        {
          interval: 0.4,
          overlap: 0.75,
          maxT: Config.maxT_recalc_loudness,
        },
        2
      );
    }
    if (audioMeter == undefined) {
      audioMeter = createAudioMeterProcessor();
    }

    source = audioContext.createBufferSource();
    source.buffer = buffer;

    // frequency response tested with https://developer.mozilla.org/de/docs/Web/API/Web_Audio_API/Using_IIR_filters
    const feedForward_shelving = Config.shelving.feedforward;
    const feedBack_shelving = Config.shelving.feedback;
    const iirfilter_shelving = audioContext.createIIRFilter(feedForward_shelving, feedBack_shelving);

    const feedForward_highpass = Config.highpass.feedforward;
    const feedBack_highpass = Config.highpass.feedback;
    const iirfilter_highpass = audioContext.createIIRFilter(feedForward_highpass, feedBack_highpass);

    source.connect(iirfilter_shelving).connect(iirfilter_highpass);

    // audioMeter =
    // await createAudioMeterProcessor();
    console.log('🚀 ~ play ~ audioMeter:', audioMeter);

    gain = audioContext.createGain();

    iirfilter_highpass.connect(gain);

    gain.connect(audioMeter).connect(audioContext.destination);

    gain.gain.setValueAtTime(targetGain, audioContext.currentTime); //?

    // source.connect(audioContext.destination);

    // sp_loudness = audioContext.createScriptProcessor(bufferSize, buffer.numberOfChannels, buffer.numberOfChannels);
    // sp_loudness.onaudioprocess = loudnessSample.onProcess;
    // source.connect(sp_loudness);

    // // output unfiltered data
    // gain = audioContext.createGain();
    // gain.gain.setValueAtTime(targetGain, audioContext.currentTime); //?

    // // measure again after gain control
    // sp_loudness_control = audioContext.createScriptProcessor(
    //   bufferSize,
    //   buffer.numberOfChannels,
    //   buffer.numberOfChannels
    // );
    // sp_loudness_control.onaudioprocess = loudnessSample_control.onProcess;

    // source.connect(gain);
    // gain.connect(sp_loudness_control);
    // gain.connect(audioContext.destination);

    // meter = createAudioMeter(audioContext, buffer.numberOfChannels, 0.98, 0.95, Config.audioMeter_cliLag);
    // gain.connect(meter);

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
    // saw sometimes inconsistent data when not rebuilding loudness ... never found out why :(
    loudnessSample = undefined;
    loudnessSample_control = undefined;
    targetGain = startGain;
    UICtrl.enableLoudnessControl();
  }

  function commonStop() {
    if (source != undefined) {
      source.disconnect();
      sp_loudness.onaudioprocess = null;
      sp_loudness_control.onaudioprocess = null;
      meter.shutdown();
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
    if (loudnessSample != undefined) {
      loudnessSample.resetBuffer();
    }
    if (loudnessSample_control != undefined) {
      loudnessSample_control.resetBuffer();
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
    // return meter;
    // console.log('ameter:', audioMeter);
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
