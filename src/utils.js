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

  return {
    assert,
    getTime,
    sleep_ms,
  };
})();

export default Utils;
