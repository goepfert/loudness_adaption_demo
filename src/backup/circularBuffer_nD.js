/**
 * Circular Ringbuffer for nD-Arrays
 *
 * Custom made, not a general purpose ringbuffer
 * Construct with given length, concat buffer with a length that is an integer fraction of that length
 * Use getLength, getMyChannelData and getIndex to work with elements of that ringbuffer
 * Since it it used for loudness calculation, it saves the squares and not only the values
 *
 * author: Thomas Goepfert
 */

class CircularBuffer_nD {
  constructor(nChannels, length, nSamplesPerInterval, nStepsize) {
    this.myBuffer = [];
    for (let chIdx = 0; chIdx < nChannels; chIdx++) {
      this.myBuffer.push(new Float32Array(length));
    }

    this.nChannels = nChannels;
    this.length = length;
    this.head = 0;
    this.isFull = false;

    this.nSamplesPerInterval = nSamplesPerInterval; // how many samples are used for loudness calculation
    this.nStepsize = nStepsize;

    // how many overlapping intervals are used for loudness calculation
    this.maxMeansquares = Math.floor((length - nSamplesPerInterval) / nStepsize + 1);
    console.log((length - nSamplesPerInterval) / nStepsize + 1, this.maxMeansquares);

    this.accumulatedSamples = 0;
  }

  validate(buffer) {
    if (!this.isBuffer(buffer)) {
      console.log(buffer);
      console.log('length', this.length);
      console.log('buffer.length', buffer.length);
      throw new Error('Argument should be an AudioBuffer instance and comply with some assumptions');
    }
  }

  /**
   *
   */
  isBuffer(buffer) {
    return (
      buffer != null &&
      this.length % buffer.length === 0 && // fromBuffer.length must be integer fraction of myAudioBuffer.length
      buffer.length <= this.length - this.head // buffer length should fit in the remaining space
    ); // still fits?
  }

  /**
   * Copy data from fromBuffer to myBuffer at head position.
   */
  concat(fromBuffer) {
    // maybe skipped for performance reasons
    for (let chIdx = 0; chIdx < this.nChannels; chIdx++) {
      this.validate(fromBuffer[chIdx]);
    }

    //copy data² from fromBuffer at head Position in myBuffer
    let headpos = this.head;
    for (let chIdx = 0; chIdx < this.nChannels; chIdx++) {
      for (let idx = 0; idx < fromBuffer[chIdx].length; idx++) {
        this.myBuffer[chIdx][headpos + idx] = fromBuffer[chIdx][idx] * fromBuffer[chIdx][idx]; // save the squares!
      }
    }
    this.head += fromBuffer[0].length;
    if (this.head >= this.length) {
      this.head = 0;
      this.isFull = true;
    }

    // this.accumulatedSamples += fromBuffer[0].length;
    // if(this.accumulatedSamples >= this.nStepsize && this.firstRound) {
    //   this.accumulatedSamples = 0;
    //   this.firstRound = false;
    // }
  }

  /**
   * Get the length of valid data.
   * @returns {number} The length of valid data.
   */
  getLength() {
    return this.isFull ? this.length : this.head;
  }

  getnChannels() {
    return this.nChannels;
  }

  /**
   * Get the channel data of the buffer.
   * @param {number} channel - The channel index.
   * @returns {Float32Array} The channel data.
   */
  getMyChannelData(channel) {
    if (channel < 0 || channel >= this.nChannels) {
      throw new Error('Invalid channel index');
    }
    return this.myBuffer[channel].slice(0, this.getLength());
  }

  /**
   * Get the internal index of the ring buffer.
   * @param {number} index - The external index to convert.
   * @returns {number} The internal index within the ring buffer.
   * @throws Will throw an error if the index is invalid.
   */
  getIndex(index) {
    let internalIndex;
    if (this.isFull) {
      // If the buffer is full, the length is fixed
      let hpi = this.head + index;
      if (hpi < this.length) {
        internalIndex = hpi;
      } else {
        // Modulo operation takes sometimes too many resources, never found out why but flame graph says that this function takes a significant time
        // internalIndex = hpi % this.length;
        // Just taking the difference is working in this case since index should be smaller than length
        internalIndex = hpi - this.length;
      }
    } else {
      internalIndex = index;
    }

    return internalIndex;
  }

  /**
   * Reset the buffer to its initial state.
   * (never used in the current implementation, but could be useful in the future)
   */
  reset() {
    this.head = 0;
    this.isFull = false;
    for (let chIdx = 0; chIdx < this.nChannels; chIdx++) {
      this.myAudioBuffer[chIdx].fill(0);
    }
  }
}

export default CircularBuffer_nD;
