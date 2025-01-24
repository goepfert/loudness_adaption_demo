/**
 * Audio Context Controller
 *
 * author: Thomas Goepfert
 */

import GraphCtrl from './graphController.js';
import ParaCtrl from './parameterController.js';
import UICtrl from './userInterfaceController.js';
import LoudnessSample from './loudness.js';
import { createAudioMeter } from './audioMeter.js';
import { Config } from './config.js';

('use strict');

function createAudioCtxCtrl(audioContext, buffer) {
  let targetLKFS = ParaCtrl.getTargetLoudness();
  const startGain = 1.0;
  let targetGain = 1.0;

  let decay_decrease = undefined;
  let decay_increase = undefined;

  const bufferSize = 4096;
  let sp_loudness = undefined;
  let sp_loudness_control = undefined;
  let source = undefined;
  let gain = undefined;

  let startedAt = 0;
  let pausedAt = 0;
  let isPlaying = false;

  let meter = undefined;

  let loudnessSample = undefined;
  let loudnessSample_control = undefined;

  // Callback called at the end of onProcess
  function callback_loudness(time, loudness) {
    timer_time = time;
    loudness = Number(loudness.toFixed(2));

    const currentTime = Number(audioContext.currentTime.toFixed(2));
    console.log(
      'playtime / timer_time / measured gated loudness: ',
      currentTime,
      ' / ',
      Number(timer_time.toFixed(2)),
      ' / ',
      loudness
    );

    if (isNaN(loudness)) {
      //loudness = ParaCtrl.getDefaultTargetLoudness();
    }

    GraphCtrl.setDataPoint(Number(timer_time.toFixed(2)), 0);
    GraphCtrl.setDataPoint(loudness, 1);
    if (!isNaN(loudness)) {
      applyGain(loudness);
    }
  }

  // Callback called at the end of onProcess
  function callback_loudness_control(time, loudness) {
    // plot something even if retrieved values are unreasonable
    if (isNaN(loudness)) {
      loudness = ParaCtrl.getDefaultTargetLoudness();
    }
    loudness = Number(loudness.toFixed(2));
    GraphCtrl.setDataPoint(loudness, 2);
    GraphCtrl.setDataPoint(targetLKFS, 3);
    GraphCtrl.setDataPoint(targetGain, 4); // last call
  }

  function play() {
    console.log('- PLAY PAUSE --------------------------------');

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

    let offset = pausedAt;
    console.log('🚀 ~ play ~ offset:', offset);
    source = audioContext.createBufferSource();
    source.buffer = buffer;
    sp_loudness = audioContext.createScriptProcessor(bufferSize, buffer.numberOfChannels, buffer.numberOfChannels);
    sp_loudness.onaudioprocess = loudnessSample.onProcess;
    source.connect(sp_loudness);

    // output unfiltered data
    gain = audioContext.createGain();

    gain.gain.setValueAtTime(targetGain, audioContext.currentTime); //?

    // measure again after gain control
    sp_loudness_control = audioContext.createScriptProcessor(
      bufferSize,
      buffer.numberOfChannels,
      buffer.numberOfChannels
    );
    sp_loudness_control.onaudioprocess = loudnessSample_control.onProcess;

    source.connect(gain);
    gain.connect(sp_loudness_control);
    gain.connect(audioContext.destination);

    meter = createAudioMeter(audioContext, buffer.numberOfChannels, 0.98, 0.95, 250);
    gain.connect(meter);

    source.start(0, pausedAt);
    source.loop = ParaCtrl.getLoop();

    startedAt = audioContext.currentTime - offset;
    pausedAt = 0;
    isPlaying = true;

    // App.updateAnimationFrame();
  }

  function pause() {
    var elapsed = audioContext.currentTime - startedAt;
    commonStop();
    pausedAt = elapsed;
  }

  function stop() {
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

  function getCurrentTime() {
    if (pausedAt) {
      return pausedAt;
    }
    if (startedAt) {
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

    // TODO: well, this looks ugly
    decay_decrease = ParaCtrl.getDecayDecrease().decay_decrease[ParaCtrl.getDecayDecrease().decay_decrease_idx];
    decay_increase = ParaCtrl.getDecayIncrease().decay_increase[ParaCtrl.getDecayIncrease().decay_increase_idx];
    targetLKFS = ParaCtrl.getTargetLoudness();

    let dB = loudness - targetLKFS;
    //let dB = meanLoudness - targetLKFS;

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
        'diff in db1 / dB2 / target gain / endTime: ',
        loudness - targetLKFS,
        '/',
        dB,
        ' / ',
        targetGain,
        ' / ',
        endTime
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
    return meter;
  }

  // Public methods
  return {
    getCurrentTime: getCurrentTime,
    getDuration: getDuration,
    getPlaying: getPlaying,
    // applyGain: applyGain,
    play: play,
    pause: pause,
    stop: stop,
    setTargetLoudness: setTargetLoudness,
    reset: reset,
    setLoop: setLoop,
    getMeter: getMeter,
  };
}

export { createAudioCtxCtrl };
