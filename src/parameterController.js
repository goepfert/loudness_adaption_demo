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
  const _interval = [0.2, 0.3, 0.4, 0.5];
  let _interval_idx = 2;

  const _overlap = [0.25, 0.5, 0.75];
  let _overlap_idx = 2;

  const _maxT = [2, 4, 8, 16, 32, 64, 84];
  let _maxT_idx = Config.maxT_loudness_idx;
  Utils.assert(_maxT_idx < _maxT.length, `Index out of range for _maxT: ${_maxT_idx}, ${_maxT.length}`);

  const _defaultTargetLoudness = Config.defaultTargetLoudness;
  let _targetLoudness;

  const _decay_increase = [0.2, 0.5, 1.0, 1.5, 2.0, 3.0, 5.0, 10.0];
  let _decay_increase_idx = 2;

  const _decay_decrease = [0.2, 0.5, 1.0, 1.5, 2.0, 3.0, 5.0, 10.0];
  let _decay_decrease_idx = 4;

  let loop = true;
  let applyGainCorrection = true;

  function setLoop(doloop) {
    loop = doloop;
  }

  function getLoop() {
    return loop;
  }

  function setApplyGainCorrection(doit) {
    applyGainCorrection = doit;
  }

  function getApplyGainCorrection() {
    return applyGainCorrection;
  }

  function getDefaultTargetLoudness() {
    return _defaultTargetLoudness;
  }

  function setTargetLoudness(loudness) {
    _targetLoudness = loudness;
  }

  function getTargetLoudness() {
    return _targetLoudness ?? _defaultTargetLoudness; // Simplified using nullish coalescing operator
  }

  function getLoudnessProperties() {
    let prop = {
      interval: _interval[_interval_idx],
      overlap: _overlap[_overlap_idx],
      maxT: _maxT[_maxT_idx],
    };
    return prop;
  }

  function getInterval() {
    let prop = {
      interval: _interval,
      interval_idx: _interval_idx,
    };
    return prop;
  }

  function getOverlap() {
    let prop = {
      overlap: _overlap,
      overlap_idx: _overlap_idx,
    };
    return prop;
  }

  function getmaxT() {
    let prop = {
      maxT: _maxT,
      maxT_idx: _maxT_idx,
    };
    return prop;
  }

  function setLoudnessProperties_idx(interval_idx, overlap_idx, maxT_idx) {
    _interval_idx = interval_idx;
    _overlap_idx = overlap_idx;
    _maxT_idx = maxT_idx;
  }

  function getGainProperties() {
    let prop = {
      decay_increase: _decay_increase[_decay_increase_idx],
      decay_decrease: _decay_decrease[_decay_decrease_idx],
    };
    return prop;
  }

  function getDecayIncrease() {
    let prop = {
      decay_increase: _decay_increase,
      decay_increase_idx: _decay_increase_idx,
    };
    return prop;
  }

  function getDecayDecrease() {
    let prop = {
      decay_decrease: _decay_decrease,
      decay_decrease_idx: _decay_decrease_idx,
    };
    return prop;
  }

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
