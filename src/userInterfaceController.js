/**
 * UI Controller
 *
 * Abstracts UI elements from html/css
 *
 *
 * author: Thomas Goepfert
 */

import ParaCtrl from './parameterController.js';

('use strict');

const UICtrl = (() => {
  const UISelectors = {
    playPauseButton: 'btn_play_pause',
    stopButton: 'btn_stop',
    chartcanvas: 'myChart',
    graphdiv: 'dygraph',
    fileselector: 'files',
    filename: 'filename',
    info: 'playinfo',
    targetLoudness_value: 'targetLoudness_value',
    targetLoudness_slider: 'targetLoudness_slider',
    resetButton: 'btn_reset',
    loopCheckBox: 'cb_loop',
    gainCheckBox: 'cb_gain',
  };

  function disableLoudnessControl() {
    document.getElementById('Interval').disabled = true;
    document.getElementById('Overlap').disabled = true;
    document.getElementById('maxT').disabled = true;
  }

  function enableLoudnessControl() {
    document.getElementById('Interval').disabled = false;
    document.getElementById('Overlap').disabled = false;
    document.getElementById('maxT').disabled = false;
  }

  function showFileProps(props) {
    let ul = document.getElementById('fileprops');
    ul.innerHTML = '';
    for (let key in props) {
      let li = document.createElement('li');
      li.appendChild(document.createTextNode(key + ': ' + props[key]));
      ul.appendChild(li);
    }
  }

  function showLoudnessProps() {
    let prop = ParaCtrl.getInterval();
    let select = document.getElementById('Interval');
    select.innerHTML = '';
    for (let i = 0; i < prop.interval.length; i++) {
      let opt = document.createElement('option');
      opt.value = prop.interval[i];
      opt.innerHTML = prop.interval[i];
      if (i == prop.interval_idx) {
        opt.selected = true;
      }
      select.appendChild(opt);
    }

    prop = ParaCtrl.getOverlap();
    select = document.getElementById('Overlap');
    select.innerHTML = '';
    for (let i = 0; i < prop.overlap.length; i++) {
      let opt = document.createElement('option');
      opt.value = prop.overlap[i];
      opt.innerHTML = prop.overlap[i];
      if (i == prop.overlap_idx) {
        opt.selected = true;
      }
      select.appendChild(opt);
    }

    prop = ParaCtrl.getmaxT();
    select = document.getElementById('maxT');
    select.innerHTML = '';
    for (let i = 0; i < prop.maxT.length; i++) {
      let opt = document.createElement('option');
      opt.value = prop.maxT[i];
      opt.innerHTML = prop.maxT[i];
      if (i == prop.maxT_idx) {
        opt.selected = true;
      }
      select.appendChild(opt);
    }

    prop = ParaCtrl.getDecayDecrease();
    select = document.getElementById('Decrease');
    select.innerHTML = '';
    for (let i = 0; i < prop.decay_decrease.length; i++) {
      let opt = document.createElement('option');
      opt.value = prop.decay_decrease[i];
      opt.innerHTML = prop.decay_decrease[i];
      if (i == prop.decay_decrease_idx) {
        opt.selected = true;
      }
      select.appendChild(opt);
    }

    prop = ParaCtrl.getDecayIncrease();
    select = document.getElementById('Increase');
    select.innerHTML = '';
    for (let i = 0; i < prop.decay_increase.length; i++) {
      let opt = document.createElement('option');
      opt.value = prop.decay_increase[i];
      opt.innerHTML = prop.decay_increase[i];
      if (i == prop.decay_increase_idx) {
        opt.selected = true;
      }
      select.appendChild(opt);
    }
  }

  function applyLoudnessProps() {
    let select = document.getElementById('Interval');
    let interval_idx = select.selectedIndex;

    select = document.getElementById('Overlap');
    let overlap_idx = select.selectedIndex;

    select = document.getElementById('maxT');
    let maxT_idx = select.selectedIndex;

    ParaCtrl.setLoudnessProperties_idx(interval_idx, overlap_idx, maxT_idx);
  }

  function applyGainProps() {
    let select = document.getElementById('Decrease');
    let decay_decrease_idx = select.selectedIndex;

    select = document.getElementById('Increase');
    let decay_increase_idx = select.selectedIndex;

    ParaCtrl.setGainProperties_idx(decay_increase_idx, decay_decrease_idx);
  }

  function getSelectors() {
    return UISelectors;
  }

  // Public methods
  return {
    showFileProps,
    showLoudnessProps,
    applyLoudnessProps,
    applyGainProps,
    getSelectors,
    disableLoudnessControl,
    enableLoudnessControl,
  };
})();

export default UICtrl;
