/**
 * Circular Ringbuffer for AudioBuffers
 *
 * Custom made, not a general purpose ringbuffer
 * Construct with given length, concat buffer with a length that is an integer fraction of that length
 * Use getLength, getMyChannelData and getIndex to work with elements of that ringbuffer
 * Since it it used for loudness calculation, it saves the squares and not only the values
 *
 * author: Thomas Goepfert
 */

class CircularAudioBuffer {
  /**
   * Create a circular audio buffer.
   * @param {AudioContext} context - The audio context.
   * @param {number} nChannels - The number of channels.
   * @param {number} length - The length of the buffer.
   * @param {number} sampleRate - The sample rate.
   */
  constructor(context, nChannels, length, sampleRate) {
    this.myAudioBuffer = context.createBuffer(nChannels, length, sampleRate);
    this.nChannels = nChannels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.head = 0;
    this.isFull = false;
  }

  /**
   * Validate if the buffer is a valid AudioBuffer instance.
   * @param {AudioBuffer} buffer - The buffer to validate.
   * @throws Will throw an error if the buffer is not valid.
   */
  validate(buffer) {
    if (!this.isAudioBuffer(buffer)) {
      console.log(buffer);
      throw new Error('Argument should be an AudioBuffer instance and comply with some assumptions');
    }
  }

  /**
   * Check if the buffer is a valid AudioBuffer instance.
   * @param {AudioBuffer} buffer - The buffer to check.
   * @returns {boolean} True if the buffer is valid, false otherwise.
   */
  isAudioBuffer(buffer) {
    return (
      buffer != null &&
      typeof buffer.length === 'number' &&
      typeof buffer.sampleRate === 'number' &&
      typeof buffer.getChannelData === 'function' &&
      typeof buffer.duration === 'number' &&
      buffer.numberOfChannels === this.nChannels &&
      buffer.sampleRate === this.sampleRate &&
      buffer.length <= this.length - this.head // buffer length should fit in the remaining space
    );
  }

  /**
   * Copy data from fromBuffer to myAudioBuffer at head position.
   * @param {AudioBuffer} fromBuffer - The buffer to copy data from.
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
