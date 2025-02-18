/**
 * CircularBuffer class to manage a fixed-size buffer that overwrites old data when new data is added.
 */

class CircularBuffer {
  /**
   * Creates an instance of CircularBuffer.
   * @param {number} maxSize - The maximum size of the buffer.
   */
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.buffer = [];
    this.currentIndex = 0;
  }

  /**
   * Adds a new element to the buffer. If the buffer is full, it overwrites the oldest element.
   * @param {*} element - The element to add to the buffer.
   */
  add(element) {
    if (this.buffer.length < this.maxSize) {
      this.buffer.push(element);
    } else {
      this.buffer[this.currentIndex] = element;
      this.currentIndex = (this.currentIndex + 1) % this.maxSize;
    }
  }

  /**
   * Retrieves the current buffer.
   * @returns {Array} The current buffer.
   */
  getBuffer() {
    return this.buffer;
  }
}

export default CircularBuffer;
