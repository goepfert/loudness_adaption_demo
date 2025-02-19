/**
 * WebAudio JS implementation of Loudness Calculation based on ITU-R BS.1770
 *
 * Possible performance optimizations:
 *  - don't copy the whole audiobuffer but just save save meansqares (or further calculations) of the intervals
 *
 * author: Thomas Goepfert
 */

import CircularBuffer from './CircularBuffer.js';
import { Config } from './config.js';
import Utils from './utils.js';

/**
 * LoudnessProcessor class extends AudioWorkletProcessor to calculate loudness based on ITU-R BS.1770.
 */
class LoudnessProcessor extends AudioWorkletProcessor {
  /**
   * Creates an instance of LoudnessProcessor.
   * @param {Object} options - Options for the processor.
   */
  constructor(options) {
    super();

    this.blocked = false; // can I reset the buffers?
    this.loudnessprops = Object.assign({}, options.processorOptions.loudnessprops); // not sure if I really need a 'deep' copy
    this.gamma_a = -70; // LKFS
    this.once = true; // some logging
    this.sampleRate = 48000; // can we obtain it somwhere else?
    this.nSamplesPerInterval = 0;
    this.nStepsize = 0;
    this.nChannels = 0;
    this.channelWeight = []; // Gi
    this.firstCall = true;

    this.initLoudnessProps();

    this.timeAccumulated = 0;
    this.buffer = [];
    this.meanSquares = undefined;

    // If we get a message from the main thread, we'll post a message back
    this.port.onmessage = (e) => {
      switch (e.data) {
        case 'resetBuffer':
          console.log('resetting loudness buffer');
          this.resetBuffer();
          break;
        default:
          console.log('hä?');
          break;
      }
    };

    // Initialize meanSquares buffer
    const length =
      Math.floor((this.sampleRate * this.loudnessprops.maxT) / this.nSamplesPerInterval + 1) * this.nSamplesPerInterval;
    const maxMeansquares = Math.floor((length - this.nSamplesPerInterval) / this.nStepsize + 1);
    this.meanSquares = new CircularBuffer(maxMeansquares);
  }

  /**
   * Initializes loudness properties.
   */
  initLoudnessProps() {
    this.nSamplesPerInterval = this.loudnessprops.interval * this.sampleRate;
    this.nStepsize = (1.0 - this.loudnessprops.overlap) * this.nSamplesPerInterval;
  }

  /**
   * Initializes channel weights.
   * @param {number} nChannels - Number of channels.
   */
  initWeights(nChannels) {
    for (let chIdx = 0; chIdx < nChannels; chIdx++) {
      // channel weight (no surround!)
      // TODO: Is there a way to determine which channel is surround? Defaults to 1.0 for the time being
      this.channelWeight.push(1.0);
    }
  }

  /**
   * Clears the buffer.
   * Can be used to mimic a fresh start of the loudness calculation (e.g. a track change).
   */
  resetBuffer() {
    if (this.blocked) {
      console.warn('Buffer reset attempted while blocked');
      return;
    }
    this.buffer.length = 0;
    this.buffer = [];
    this.meanSquares.clear();
    this.timeAccumulated = 0;
  }

  /**
   * Processes the audio data.
   * @param {Array} inputList - List of input audio buffers.
   * @param {Array} outputList - List of output audio buffers.
   * @returns {boolean} - Returns true to keep the processor alive.
   */
  process(inputList, outputList) {
    this.blocked = true;

    if (!inputList.length || !outputList.length) {
      console.error('Input or output list is empty');
      this.blocked = false;
      return true;
    }

    const sourceLimit = Math.min(inputList.length, outputList.length);
    Utils.assert(sourceLimit == 1, 'No input sources or more than one input source is not supported');

    const input = inputList[0];
    const output = outputList[0];
    this.nChannels = input.length;

    if (this.nChannels != output.length || this.nChannels == 0) {
      console.error('Number of input and output channels must match and be greater than 0');
      this.blocked = false;
      return true;
    }

    if (this.firstCall == true) {
      this.firstCall = false;
      this.initWeights(this.nChannels);
    }

    // Accumulate audio data
    for (let channel = 0; channel < input.length; channel++) {
      if (!this.buffer[channel]) {
        this.buffer[channel] = [];
      }
      this.buffer[channel].push(...input[channel]);
    }

    // Process accumulated data when buffer reaches desired size
    if (this.buffer[0].length >= this.nSamplesPerInterval) {
      let meansquare = [];
      for (let channel = 0; channel < input.length; channel++) {
        meansquare[channel] = 0;
        for (let bufIdx = 0; bufIdx < this.nSamplesPerInterval; bufIdx++) {
          meansquare[channel] += this.buffer[channel][bufIdx] * this.buffer[channel][bufIdx];
        }
        meansquare[channel] /= this.nSamplesPerInterval;
      }
      this.meanSquares.add(meansquare);
      this.buffer = Utils.cutOutFirstNItems(this.buffer, this.nStepsize);
    }

    this.timeAccumulated += input[0].length / this.sampleRate;
    if (this.timeAccumulated >= Config.timeIntervalForLoundessCalculation && this.meanSquares.buffer.length > 0) {
      const gatedLoudness = this.calculateLoudness();
      // Post the loudness value to the main thread
      this.port.postMessage({ name: 'loudness', value: gatedLoudness });
      this.timeAccumulated = 0;
    }

    // Pass through audio data
    for (let channel = 0; channel < output.length; channel++) {
      output[channel].set(input[channel]);
    }

    this.blocked = false;
    return true;
  }

  /**
   * Calculates the loudness of the accumulated audio buffers.
   * @returns {number} - The calculated loudness.
   */
  calculateLoudness() {
    // get mean squares of overlapping intervals
    let meanSquares = Utils.deepCopyArray(this.meanSquares.getBuffer());
    meanSquares = Utils.transposeArray(meanSquares); // to match the 'old style' of meanSquares

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
   * Removes entries (block loudness) from the mean squares object.
   * @param {Object} meanSquares - The mean squares object.
   * @param {number} value - The threshold value for filtering.
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

registerProcessor('loudness-processor', LoudnessProcessor);
