/**
 * inspired by https://github.com/cwilso/volume-meter/blob/master/volume-meter.js
 * extended for more than one channel
 *
 * clipLevel: the level (0 to 1) that you would consider "clipping". Defaults to 0.98.
 * averaging: how "smoothed" you would like the meter to be over time. Should be between 0 and less than 1. Defaults to 0.95.
 * clipLag: how long you would like the "clipping" indicator to show after clipping has occured, in milliseconds. Defaults to 750ms.
 *
 * (co)author: Thomas Goepfert
 */

import { Config } from './config.js';

class AudioMeter extends AudioWorkletProcessor {
  constructor() {
    super();

    this.clipping = [];
    this.lastClip = [];
    this.volume = [];
    this.clipLevel = 0.98;
    this.averaging = 0.95;
    this.clipLag = Config.audioMeter_cliLag;

    // If we get a message from the main thread, we'll post a message back with the volume and clipping status.
    this.port.onmessage = (e) => {
      // console.log(e.data);
      switch (e.data) {
        case 'getVolume':
          this.port.postMessage({ name: 'volume', value: this.volume });
          break;
        case 'getClipping':
          this.port.postMessage({ name: 'clipping', value: this.checkClipping() });
          break;
        default:
          console.log('hä?');
          break;
      }
    };
  }

  /**
   * Check if a specific channel is clipping.
   * @param {number} channel - The channel index.
   * @returns {boolean} - True if the channel is clipping, false otherwise.
   */
  checkClippingChannel(channel) {
    if (!this.clipping[channel]) {
      return false;
    }
    if (this.lastClip[channel] + this.clipLag < Date.now()) {
      this.clipping[channel] = false;
    }
    return this.clipping[channel];
  }

  /**
   * Check if any channel is clipping.
   * @returns {boolean} - True if any channel is clipping, false otherwise.
   */
  checkClipping() {
    for (let chIdx = 0; chIdx < this.clipping.length; chIdx++) {
      if (this.checkClippingChannel(chIdx)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Process audio input and output.
   * @param {Float32Array[][]} inputList - The input audio buffers.
   * @param {Float32Array[][]} outputList - The output audio buffers.
   * @param {object} parameters - The audio parameters.
   * @returns {boolean} - True to keep the processor alive, false otherwise.
   */
  process(inputList, outputList, parameters) {
    const sourceLimit = Math.min(inputList.length, outputList.length);

    for (let inputNum = 0; inputNum < sourceLimit; inputNum++) {
      let input = inputList[inputNum];
      let output = outputList[inputNum];
      let channelCount = Math.min(input.length, output.length);

      for (let chIdx = 0; chIdx < channelCount; chIdx++) {
        let bufferLength = input[chIdx].length;
        let sum = 0;

        // Do a root-mean-square on the samples: sum up the squares...
        for (let sampleIdx = 0; sampleIdx < bufferLength; sampleIdx++) {
          let sample = input[chIdx][sampleIdx];

          if (Math.abs(sample) >= this.clipLevel) {
            this.clipping[chIdx] = true;
            this.lastClip[chIdx] = Date.now();
          }
          sum += sample * sample;

          // simple 1:1 copy
          output[chIdx][sampleIdx] = sample;
        } // end loop samples

        // ... then take the square root of the sum.
        let rms = Math.sqrt(sum / bufferLength);

        // Now smooth this out with the averaging factor applied to the previous sample,
        // take the max here because we want "fast attack, slow release."
        if (this.volume[chIdx] == NaN || this.volume[chIdx] == undefined) {
          this.volume[chIdx] = 0;
        }
        this.volume[chIdx] = Math.max(rms, this.volume[chIdx] * this.averaging);
      } // end loop input channels
    } // end loop input sources

    return true;
  }
}

registerProcessor('audioMeter-processor', AudioMeter);
