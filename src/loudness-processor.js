/**
 * WebAudio JS implementation of Loudness Calculation based on ITU-R BS.1770
 *
 * Possible performance optimizations:
 *  - don't copy the whole audiobuffer but just save save meansqares (or further calculations) of the intervals
 *
 * author: Thomas Goepfert
 */

import CircularBuffer_nD from './circularBuffer_nD.js';
import { Config } from './config.js';
import Utils from './utils.js';

('use strict');

/**
 *
 */
class LoudnessProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();

    this.blocked = false; // can I reset the buffers?
    this.loudnessprops = Object.assign({}, options.processorOptions.loudnessprops); // not sure if I really need a 'deep' copy
    this.gamma_a = -70; // LKFS
    this.copybuffer = undefined; // 'history' circular buffer
    this.once = true; // some logging
    this.sampleRate = 48000; // can we obtain it somwhere else?
    this.nSamplesPerInterval = 0;
    this.nStepsize = 0;
    this.nChannels = 0;
    this.channelWeight = []; // Gi
    this.firstCall = true;

    this.initLoudnessProps();

    this.timeAccumulated = 0;
    this.timeIntervallForLoundess = 0.5;
    this.gatedLoudness = NaN;

    this.port.onmessage = (e) => {
      switch (e.data) {
        case 'resetBuffer':
          console.log('resetting loudness buffer');
          this.resetBuffer();
          break;
        case 'getLoudness':
          // console.log('getLoudness', this.gatedLoudness);
          this.port.postMessage({ name: 'loudness', value: this.gatedLoudness });
          break;
        default:
          console.log('hä?');
          break;
      }
    };
  }

  initLoudnessProps() {
    this.nSamplesPerInterval = this.loudnessprops.interval * this.sampleRate;
    this.nStepsize = (1.0 - this.loudnessprops.overlap) * this.nSamplesPerInterval;
  }

  initWeights(nChannels) {
    for (let chIdx = 0; chIdx < nChannels; chIdx++) {
      // channel weight (no surround!)
      // TODO: Is there a way to determine which channel is surround? Defaults to 1.0 for the time being
      this.channelWeight.push(1.0);
    }
  }

  /**
   * clear copybuffer
   * can be used to mimic a fresh start of the loudness calculation (e.g. a track change)
   */
  resetBuffer() {
    while (this.blocked == true) {} // muchos dangerous ... (not really sure if this is still needed)
    if (this.copybuffer != undefined) {
      this.copybuffer.length = 0;
      this.copybuffer = undefined;
    }
  }

  process(inputList, outputList) {
    this.blocked = true;
    const sourceLimit = Math.min(inputList.length, outputList.length);
    Utils.assert(sourceLimit == 1, 'No input sources or more than one input source is not supported');

    for (let inputNum = 0; inputNum < sourceLimit; inputNum++) {
      let input = inputList[inputNum];
      let output = outputList[inputNum];
      // let channelCount = Math.min(input.length, output.length);
      this.nChannels = input.length;
      Utils.assert(this.nChannels == output.length, 'Number of input and output channels must match');

      if (this.firstCall == true) {
        this.firstCall = false;
        this.initWeights(this.nChannels);
      }

      this.concat(input);

      this.timeAccumulated += input[0].length / this.sampleRate;
      if (this.timeAccumulated >= Config.timeIntervalForLoundessCalculation) {
        this.gatedLoudness = this.calculateLoudness();
        this.timeAccumulated = 0;
      }

      for (let chIdx = 0; chIdx < this.nChannels; chIdx++) {
        let bufferLength = input[chIdx].length;
        for (let sampleIdx = 0; sampleIdx < bufferLength; sampleIdx++) {
          let sample = input[chIdx][sampleIdx];

          // simple 1:1 copy
          output[chIdx][sampleIdx] = sample;
        } // end loop samples
      } // end loop input channels
    } // end loop input sources

    this.blocked = false;
    return true;
  }

  /**
   * calculates gated loudness of the accumulated Audiobuffers since time T
   */
  concat(buffer) {
    // first call or after resetMemory
    if (this.copybuffer == undefined) {
      // how long should the copybuffer be at least?
      // --> at least maxT should fit in and length shall be an integer fraction of buffer length
      const length = Math.floor((this.sampleRate * this.loudnessprops.maxT) / buffer[0].length + 1) * buffer[0].length;
      this.copybuffer = new CircularBuffer_nD(this.nChannels, length);
    }

    // accumulate buffer to previous calls
    this.copybuffer.concat(buffer);
  }

  calculateLoudness() {
    // must be gt nSamplesPerInterval
    // or: wait at least one interval time T to be able to calculate loudness
    if (this.copybuffer.getLength() < this.nSamplesPerInterval) {
      console.log('buffer too small ... have to eat more data for at least one interval');
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

    for (let chIdx = 0; chIdx < buffer.getnChannels(); chIdx++) {
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
      meansquare += data; // * data; //the squares are already saved
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

registerProcessor('loudness-processor', LoudnessProcessor);
