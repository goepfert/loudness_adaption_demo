/**
 * Some helper functions used in this project
 */

'use strict';

/**
 * Revealing Module Pattern with IIFE: https://www.geeksforgeeks.org/describe-the-revealing-module-pattern-in-javascript/
 */
const Utils = (() => {
  /**
   * Throw error with given message if condition is not met
   * @param {boolean} condition - The condition to check.
   * @param {string} [message] - The error message to throw if the condition is not met.
   * @throws Will throw an error if the condition is not met.
   */
  function assert(condition, message) {
    if (!condition) {
      message = message || 'Assertion failed';
      if (typeof Error !== 'undefined') {
        throw new Error(message);
      }
      throw message; // Fallback
    }
  }

  /**
   * Check if a number is less than 10 and prepend a '0' if true.
   * @param {number} i - The number to check.
   * @returns {string} The formatted number.
   */
  function checkTime(i) {
    return i < 10 ? '0' + i : i.toString();
  }

  /**
   * Get the current time formatted as HH:MM:SS:MS.
   * @returns {string} The formatted current time.
   */
  function getTime() {
    const today = new Date();
    const h = checkTime(today.getHours());
    const m = checkTime(today.getMinutes());
    const s = checkTime(today.getSeconds());
    const ms = checkTime(today.getMilliseconds());
    return `${h}:${m}:${s}:${ms}`;
  }

  /**
   * Sleep for a specified number of milliseconds.
   * @param {number} milliseconds - The number of milliseconds to sleep.
   * @returns {Promise} A promise that resolves after the specified time.
   */
  function sleep_ms(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  /**
   * Cut out the first n items from an n-dimensional array.
   * @param {Array<any>} arrayND - The n-dimensional array to process.
   * @param {number} n - The number of items to remove from each sub-array.
   * @returns {Array<any>} The new n-dimensional array with the first n items removed from each sub-array.
   */
  function cutOutFirstNItems(arrayND, n) {
    if (!Array.isArray(arrayND)) {
      throw new Error('Input must be an array');
    }

    return arrayND
      .map((subArray) => {
        if (Array.isArray(subArray)) {
          return cutOutFirstNItems(subArray, n);
        }
        return subArray;
      })
      .slice(n);
  }

  /**
   * Make a deep copy of an n-dimensional array.
   * @param {Array<any>} arrayND - The n-dimensional array to copy.
   * @returns {Array<any>} The deep copied n-dimensional array.
   */
  function deepCopyArray(arrayND) {
    if (!Array.isArray(arrayND)) {
      throw new Error('Input must be an array');
    }

    return arrayND.map((item) => {
      if (Array.isArray(item)) {
        return deepCopyArray(item);
      }
      return item;
    });
  }

  /**
   * Transpose a 2D array.
   * @param {Array<Array<any>>} array2D - The 2D array to transpose.
   * @returns {Array<Array<any>>} The transposed 2D array.
   */
  function transposeArray(array2D) {
    if (!Array.isArray(array2D) || !Array.isArray(array2D[0])) {
      throw new Error('Input must be a 2D array');
    }

    const rows = array2D.length;
    const cols = array2D[0].length;
    const transposedArray = [];

    for (let col = 0; col < cols; col++) {
      transposedArray[col] = [];
      for (let row = 0; row < rows; row++) {
        transposedArray[col][row] = array2D[row][col];
      }
    }

    return transposedArray;
  }

  return {
    assert,
    getTime,
    sleep_ms,
    cutOutFirstNItems,
    deepCopyArray,
    transposeArray,
  };
})();

export default Utils;
