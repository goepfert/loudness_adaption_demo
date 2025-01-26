/**
 * WebAudio JS implementation of Loudness Calculation based on ITU-R BS.1770
 *
 * Possible performance optimizations:
 *  - don't copy the whole audiobuffer but just save save meansqares (or further calculations) of the intervals
 *
 * author: Thomas Goepfert
 */

import BiquadFilter_DF2 from './biquadfilter_df2.js';
import CircularAudioBuffer from './circularAudioBuffer.js';

('use strict');

/**
 * buffer: the AudioBuffer, only needed for getting samplerate and number of channels, may also be obtained elsewhere
 * callback: callback function called after processing a chunk of the audiobuffer
 */
class LoudnessSample {
  constructor(context, buffer, callback, props, id) {
    this.context = context;

    this.id = id || -1; // debugging purpose
    this.blocked = false; // can I reset the buffers?

    this.loudnessprops = Object.assign({}, props); // not sure if I really need a 'deep' copy

    this.gamma_a = -70; // LKFS
    this.copybuffer = undefined; // 'history' circular audiobuffer
    this.once = true; // some logging

    this.nChannels = buffer.numberOfChannels;
    this.sampleRate = buffer.sampleRate;
    this.nSamplesPerInterval = 0;
    this.nStepsize = 0;

    this.PreStageFilter = []; // array of filters (one for each channel) applied before loundness calculation
    this.channelWeight = []; // Gi
    this.bypass = false; // bypass PrestageFilters, testing purpose

    // Pre Stage Filter Coefficient for Direct2 Norm
    // parameters given in ITU-R BS.1770
    // gain, high shelving, high-pass
    let coef = [
      1.0, 1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585, 1.0, -2.0, 1.0,
      -1.99004745483398, 0.99007225036621,
    ];

    for (let chIdx = 0; chIdx < this.nChannels; chIdx++) {
      this.PreStageFilter.push(new BiquadFilter_DF2(coef));
      this.PreStageFilter.push(new BiquadFilter_DF2(coef));
      // channel weight (no surround!)
      // TODO: Is there a way to determine which channel is surround? Defaults to 1.0 for the time being
      this.channelWeight.push(1.0);
    }

    this.onProcess = this.onProcess.bind(this);
    this.callback = callback;

    this.initLoudnessProps();
    console.log('🚀 ~ LoudnessSample ~ constructor ~ buffer:', buffer);
  }

  initLoudnessProps() {
    this.nSamplesPerInterval = this.loudnessprops.interval * this.sampleRate;
    this.nStepsize = (1.0 - this.loudnessprops.overlap) * this.nSamplesPerInterval;
    this.printSomeInfo();
  }

  getLoudnessProps() {
    return this.loudnessprops;
  }

  setLoudnessProps(props) {
    this.loudnessprops = Object.assign({}, props);
    this.initLoudnessProps();
  }

  printSomeInfo() {
    console.log(
      'Interval [s]:',
      this.loudnessprops.interval,
      '\nsamples / intervall',
      this.nSamplesPerInterval,
      '\noverlap [fraction]:',
      this.loudnessprops.overlap,
      '\nStepSize:',
      this.nStepsize,
      '\nmaxT [s]:',
      this.loudnessprops.maxT
    ); //, '\nmaxSamples:', this.maxSamples);
  }

  resetMemory() {
    this.resetBuffer();
  }

  /**
   * clear copybuffer and memory of the prestage filters
   * can be used to mimic a fresh start of the loudness calculation (e.g. a track change)
   */
  resetBuffer() {
    while (this.blocked == true) {} // muchos dangerous ... (not really sure if this is still needed)
    if (this.copybuffer != undefined) {
      this.copybuffer.length = 0;
      this.copybuffer = undefined;

      for (let idx = 0; idx < this.PreStageFilter.length; idx++) {
        this.PreStageFilter[idx].resetMemories();
      }
    }
  }

  /**
   * Called by the ScriptProcessor Node with chunks of the AudioBuffer
   */
  onProcess(audioProcessingEvent) {
    this.blocked = true;
    let inputBuffer = audioProcessingEvent.inputBuffer;
    let outputBuffer = audioProcessingEvent.outputBuffer;

    for (let chIdx = 0; chIdx < outputBuffer.numberOfChannels; chIdx++) {
      let inputData = inputBuffer.getChannelData(chIdx);
      let outputData = outputBuffer.getChannelData(chIdx);

      if (!this.bypass) {
        this.PreStageFilter[chIdx].process(inputData, outputData);
      } else {
        // or just copy
        outputData.set(inputData);
      }
    } // next channel

    const gatedLoudness = this.calculateLoudness(outputBuffer);
    this.callback(gatedLoudness);
    this.blocked = false;
  }

  /**
   * calculates gated loudness of the accumulated Audiobuffers since time T
   */
  calculateLoudness(buffer) {
    // first call or after resetMemory
    if (this.copybuffer == undefined) {
      // how long should the copybuffer be at least?
      // --> at least maxT should fit in and length shall be an integer fraction of buffer length
      const length = Math.floor((this.sampleRate * this.loudnessprops.maxT) / buffer.length + 1) * buffer.length;
      this.copybuffer = new CircularAudioBuffer(this.context, this.nChannels, length, this.sampleRate);
    }

    // accumulate buffer to previous calls
    this.copybuffer.concat(buffer);

    // must be gt nSamplesPerInterval
    // or: wait at least one interval time T to be able to calculate loudness
    if (this.copybuffer.getLength() < this.nSamplesPerInterval) {
      console.log('buffer too small ... have to eat more data');
      return NaN;
    }

    // get array of meansquares from buffer of overlapping intervals
    let meanSquares = this.getBufferMeanSquares(this.copybuffer, this.nSamplesPerInterval, this.nStepsize);

    // first stage filter
    this.filterBlocks(meanSquares, this.gamma_a);

    // second stage filter
    let gamma_r = 0;
    for (let chIdx = 0; chIdx < this.nChannels; chIdx++) {
      let mean = 0;
      for (let idx = 0; idx < meanSquares[chIdx].length; idx++) {
        mean += meanSquares[chIdx][idx];
      }
      mean /= meanSquares[chIdx].length;
      gamma_r += this.channelWeight[chIdx] * mean;
    }
    gamma_r = -0.691 + 10.0 * Math.log10(gamma_r) - 10;

    this.filterBlocks(meanSquares, gamma_r);

    // gated loudness from filtered blocks
    let gatedLoudness = 0;
    for (let chIdx = 0; chIdx < this.nChannels; chIdx++) {
      let mean = 0;
      for (let idx = 0; idx < meanSquares[chIdx].length; idx++) {
        mean += meanSquares[chIdx][idx];
      }
      mean /= meanSquares[chIdx].length;
      gatedLoudness += this.channelWeight[chIdx] * mean;
    }
    gatedLoudness = -0.691 + 10.0 * Math.log10(gatedLoudness);

    return gatedLoudness;
  }

  /**
   * calculate meansquares of overlapping intervals in given buffer
   */
  getBufferMeanSquares(buffer, nSamplesPerInterval, nStepsize) {
    let meanSquares = {};
    const length = buffer.getLength();

    for (let chIdx = 0; chIdx < this.nChannels; chIdx++) {
      const arraybuffer = buffer.getMyChannelData(chIdx);
      let idx1 = 0;
      let idx2 = nSamplesPerInterval;
      meanSquares[chIdx] = [];
      while (idx2 < length) {
        meanSquares[chIdx].push(this.getMeanSquare(arraybuffer, buffer, idx1, idx2));
        idx1 += nStepsize;
        idx2 += nStepsize;
      }
    }

    return meanSquares;
  }

  /**
   * calculate meansquare of given buffer and range
   */
  getMeanSquare(arraybuffer, buffer, idx1, idx2) {
    let meansquare = 0;
    let data = 0;

    for (let bufIdx = idx1; bufIdx < idx2; bufIdx++) {
      data = arraybuffer[buffer.getIndex(bufIdx)];
      meansquare += data; //*data; //the squares are already saved
    }

    return meansquare / (idx2 - idx1);
  }

  /**
   * remove entries (block loudness) from from meansquares object
   */
  filterBlocks(meanSquares, value) {
    //assuming that all other meansquares (other channels) have same length
    for (let idx = meanSquares[0].length - 1; idx >= 0; idx--) {
      let blockmeansquare = 0;
      for (let chIdx = 0; chIdx < this.nChannels; chIdx++) {
        blockmeansquare += this.channelWeight[chIdx] * meanSquares[chIdx][idx];
      }
      let blockloudness = -0.691 + 10.0 * Math.log10(blockmeansquare);

      //remove from arrays
      if (blockloudness <= value) {
        for (let chIdx = 0; chIdx < this.nChannels; chIdx++) {
          meanSquares[chIdx].splice(idx, 1);
        }
      }
    }
  }
}

export default LoudnessSample;
