/**
 * WebAudio JS implementation of Loudness Calculation based on
 * https://www.itu.int/dms_pubrec/itu-r/rec/bs/R-REC-BS.1770-4-201510-I%21%21PDF-E.pdf
 * https://www.itu.int/dms_pub/itu-r/opb/rep/R-REP-BS.2217-2-2016-PDF-E.pdf
 *
 * Possible performance optimizations:
 *  - don't copy the whole audiobuffer but just save save meansqares (or further calculations) of the intervals
 *
 * author: Thomas Goepfert
 */

import BiquadFilter_DF2 from './biquadfilter_df2.js';
import CircularAudioBuffer from './circularAudioBuffer.js';
import Utils from './utils.js';

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
    this.nCall = 0; // how many chunks processed so far

    this.nChannels = buffer.numberOfChannels;
    this.sampleRate = buffer.sampleRate;
    this.nSamplesPerInterval = 0;
    this.nStepsize = 0;

    this.PreStageFilter = []; // array of filters (one for each channel) applied before loundness calculation
    this.channelWeight = []; // Gi
    this.bypass = false; // bypass PrestageFilters, testing purpose

    // Pre Stage Filter Coefficient for Direct2 Norm
    // parameters given in https://www.itu.int/dms_pubrec/itu-r/rec/bs/R-REC-BS.1770-4-201510-I%21%21PDF-E.pdf
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
    this.nCall = 0;
  }

  /**
   * clear copybuffer and memory of the prestage filters
   * can be used to mimic a fresh start of the loudness calculation (e.g. a track change)
   */
  resetBuffer() {
    while (this.blocked == true) {} // muchos dangerous ...
    if (this.copybuffer != undefined) {
      this.copybuffer.length = 0;
      this.copybuffer = undefined;

      for (let idx = 0; idx > this.PreStageFilter.length; idx++) {
        this.PreStageFilter.resetMemories();
      }
    }
  }

  /**
   * Called by the ScriptProcessor Node with chunks of the AudioBuffer
   */
  onProcess(audioProcessingEvent) {
    this.blocked = true;
    this.nCall++;
    let inputBuffer = audioProcessingEvent.inputBuffer;
    let outputBuffer = audioProcessingEvent.outputBuffer;

    for (let chIdx = 0; chIdx < outputBuffer.numberOfChannels; chIdx++) {
      let inputData = inputBuffer.getChannelData(chIdx);
      let outputData = outputBuffer.getChannelData(chIdx);

      if (!this.bypass) {
        this.PreStageFilter[chIdx].process(inputData, outputData);
      } else {
        // just copy
        for (let sample = 0; sample < inputBuffer.length; sample++) {
          outputData[sample] = inputData[sample];
        }
      }
    } // next channel

    let time = (this.nCall * inputBuffer.length) / this.sampleRate;
    let gl = this.calculateLoudness(outputBuffer);

    // Utils.sleep_ms(10);

    // if (this.copybuffer.getHead() % (4 * 4096) == 0 && this.id == 1) {
    //   console.log('🚀 ~ LoudnessSample ~ calculateLoudness ~ this.copybuffer.getHead():', this.copybuffer.getHead());
    //   console.log(this.id, '- gatedLoudness:', time, gl);
    //   // this.copybuffer.dump();
    // }

    this.callback(time, gl);

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
      // console.log('🚀 ~ LoudnessSample ~ calculateLoudness ~ length:', length);
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

    //console.log(this.id, '- gatedLoudness:', gatedLoudness);
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
