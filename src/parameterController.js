/**
 * Ranges and default values of various parameters
 * Setters and Getters
 *
 * author: Thomas Goepfert
 */

import { Config } from './config.js';
import Utils from './utils.js';

('use strict'); // Add missing semicolon

const ParaCtrl = (() => {
  /**
   * Interval values
   * @type {number[]}
   */
  const _interval = [0.2, 0.3, 0.4, 0.5];
  let _interval_idx = 2;

  /**
   * Overlap values
   * @type {number[]}
   */
  const _overlap = [0.25, 0.5, 0.75];
  let _overlap_idx = 2;

  /**
   * Maximum time values
   * @type {number[]}
   */
  const _maxT = [2, 4, 8, 16, 32, 64, 84];
  let _maxT_idx = Config.maxT_loudness_idx;
  Utils.assert(_maxT_idx < _maxT.length, `Index out of range for _maxT: ${_maxT_idx}, ${_maxT.length}`);

  /**
   * Default target loudness
   * @type {number}
   */
  const _defaultTargetLoudness = Config.defaultTargetLoudness;
  let _targetLoudness;

  /**
   * Decay increase values
   * @type {number[]}
   */
  const _decay_increase = [0.2, 0.5, 1.0, 1.5, 2.0, 3.0, 5.0, 10.0];
  let _decay_increase_idx = 2;

  /**
   * Decay decrease values
   * @type {number[]}
   */
  const _decay_decrease = [0.2, 0.5, 1.0, 1.5, 2.0, 3.0, 5.0, 10.0];
  let _decay_decrease_idx = 4;

  let loop = true;
  let applyGainCorrection = true;

  /**
   * Set the loop flag
   * @param {boolean} doloop - Whether to loop or not
   */
  function setLoop(doloop) {
    loop = doloop;
  }

  /**
   * Get the loop flag
   * @returns {boolean} - The current loop flag
   */
  function getLoop() {
    return loop;
  }

  /**
   * Set the apply gain correction flag
   * @param {boolean} doit - Whether to apply gain correction or not
   */
  function setApplyGainCorrection(doit) {
    applyGainCorrection = doit;
  }

  /**
   * Get the apply gain correction flag
   * @returns {boolean} - The current apply gain correction flag
   */
  function getApplyGainCorrection() {
    return applyGainCorrection;
  }

  /**
   * Get the default target loudness
   * @returns {number} - The default target loudness
   */
  function getDefaultTargetLoudness() {
    return _defaultTargetLoudness;
  }

  /**
   * Set the target loudness
   * @param {number} loudness - The target loudness
   */
  function setTargetLoudness(loudness) {
    _targetLoudness = loudness;
  }

  /**
   * Get the target loudness
   * @returns {number} - The current target loudness
   */
  function getTargetLoudness() {
    return _targetLoudness ?? _defaultTargetLoudness; // Simplified using nullish coalescing operator
  }

  /**
   * Get the loudness properties
   * @returns {Object} - The loudness properties
   */
  function getLoudnessProperties() {
    let prop = {
      interval: _interval[_interval_idx],
      overlap: _overlap[_overlap_idx],
      maxT: _maxT[_maxT_idx],
    };
    return prop;
  }

  /**
   * Get the interval properties
   * @returns {Object} - The interval properties
   */
  function getInterval() {
    let prop = {
      interval: _interval,
      interval_idx: _interval_idx,
    };
    return prop;
  }

  /**
   * Get the overlap properties
   * @returns {Object} - The overlap properties
   */
  function getOverlap() {
    let prop = {
      overlap: _overlap,
      overlap_idx: _overlap_idx,
    };
    return prop;
  }

  /**
   * Get the maxT properties
   * @returns {Object} - The maxT properties
   */
  function getmaxT() {
    let prop = {
      maxT: _maxT,
      maxT_idx: _maxT_idx,
    };
    return prop;
  }

  /**
   * Set the loudness properties indices
   * @param {number} interval_idx - The interval index
   * @param {number} overlap_idx - The overlap index
   * @param {number} maxT_idx - The maxT index
   */
  function setLoudnessProperties_idx(interval_idx, overlap_idx, maxT_idx) {
    _interval_idx = interval_idx;
    _overlap_idx = overlap_idx;
    _maxT_idx = maxT_idx;
  }

  /**
   * Get the gain properties
   * @returns {Object} - The gain properties
   */
  function getGainProperties() {
    let prop = {
      decay_increase: _decay_increase[_decay_increase_idx],
      decay_decrease: _decay_decrease[_decay_decrease_idx],
    };
    return prop;
  }

  /**
   * Get the decay increase properties
   * @returns {Object} - The decay increase properties
   */
  function getDecayIncrease() {
    let prop = {
      decay_increase: _decay_increase,
      decay_increase_idx: _decay_increase_idx,
    };
    return prop;
  }

  /**
   * Get the decay decrease properties
   * @returns {Object} - The decay decrease properties
   */
  function getDecayDecrease() {
    let prop = {
      decay_decrease: _decay_decrease,
      decay_decrease_idx: _decay_decrease_idx,
    };
    return prop;
  }

  /**
   * Set the gain properties indices
   * @param {number} decay_increase_idx - The decay increase index
   * @param {number} decay_decrease_idx - The decay decrease index
   */
  function setGainProperties_idx(decay_increase_idx, decay_decrease_idx) {
    _decay_increase_idx = decay_increase_idx;
    _decay_decrease_idx = decay_decrease_idx;
  }

  return {
    getLoudnessProperties,
    setLoudnessProperties_idx,
    getInterval,
    getOverlap,
    getmaxT,
    getDefaultTargetLoudness,
    setTargetLoudness,
    getTargetLoudness,
    getGainProperties,
    getDecayIncrease,
    getDecayDecrease,
    setGainProperties_idx,
    setLoop,
    getLoop,
    setApplyGainCorrection,
    getApplyGainCorrection,
  };
})();

export default ParaCtrl;
