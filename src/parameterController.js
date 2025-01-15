/**
 * Ranges and default values of various parameters
 * Setters and Getters
 *
 * author: Thomas Goepfert
 */

('use strict');

const ParaCtrl = (() => {
  let _interval = [0.2, 0.3, 0.4, 0.5];
  let _interval_idx = 2;

  let _overlap = [0.25, 0.5, 0.75];
  let _overlap_idx = 2;

  let _maxT = [2, 5, 10, 30, 60];
  let _maxT_idx = 3;

  let _defaultTargetLoudness = -13;
  let _targetLoudness = undefined;

  let _decay_increase = [0.2, 0.5, 1.0, 1.5, 2.0, 3.0, 5.0, 10.0];
  let _decay_increase_idx = 2;

  let _decay_decrease = [0.2, 0.5, 1.0, 1.5, 2.0, 3.0, 5.0, 10.0];
  let _decay_decrease_idx = 6;

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
    if (_targetLoudness != undefined) {
      return _targetLoudness;
    } else {
      return _defaultTargetLoudness;
    }
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
    getLoudnessProperties: getLoudnessProperties,
    setLoudnessProperties_idx: setLoudnessProperties_idx,
    getInterval: getInterval,
    getOverlap: getOverlap,
    getmaxT: getmaxT,
    getDefaultTargetLoudness: getDefaultTargetLoudness,
    setTargetLoudness: setTargetLoudness,
    getTargetLoudness: getTargetLoudness,
    getGainProperties: getGainProperties,
    getDecayIncrease: getDecayIncrease,
    getDecayDecrease: getDecayDecrease,
    setGainProperties_idx: setGainProperties_idx,
    setLoop: setLoop,
    getLoop: getLoop,
    setApplyGainCorrection: setApplyGainCorrection,
    getApplyGainCorrection: getApplyGainCorrection,
  };
})();

export default ParaCtrl;
