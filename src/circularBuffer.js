/**
 * Circular Ringbuffer for AudioArrays
 *
 * Custom made, not a general purpose ringbuffer
 * Construct with given length, concat buffer with a length that is an integer fraction of that length
 * Use getLength, getMyChannelData and getIndex to work with elements of that ringbuffer
 * Since it it used for loudness calculation, it saves the squares and not only the values
 *
 * author: Thomas Goepfert
 */

class CircularBuffer {
  constructor(nChannels, length) {
    this.myAudioBuffer = [];
    for (chIdx = 0; chIdx < nChannels; chIdx++) {
      this.myAudioBuffer.push(new Float32Array(length));
    }

    this.nChannels = nChannels;
    this.length = length;
    this.head = 0;
    this.isFull = false;
  }

  // TODO: make it 2D?!
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
   * Copy data from fromBuffer to myAudioBuffer at head position.
   */
  concat(fromBuffer) {
    // de-activated for now to save some ressources
    // this.validate(fromBuffer);

    // Copy data from fromBuffer at head position in myAudioBuffer
    for (let chIdx = 0; chIdx < this.nChannels; chIdx++) {
      let channelData = fromBuffer.getChannelData(chIdx).map((value) => Math.pow(value, 2));
      this.myAudioBuffer.copyToChannel(channelData, chIdx, this.head);
    }

    this.head += fromBuffer.length;
    if (this.head >= this.length) {
      this.head = 0;
      this.isFull = true;
    }
  }

  /**
   * Get the length of valid data.
   * @returns {number} The length of valid data.
   */
  getLength() {
    return this.isFull ? this.length : this.head;
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
    return this.myAudioBuffer.getChannelData(channel).slice(0, this.getLength());
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
      this.myAudioBuffer.getChannelData(chIdx).fill(0);
    }
  }
}

export default CircularAudioBuffer;
