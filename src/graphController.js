/**
 * Graph Controller for http://dygraphs.com/
 * load dygraph in index.html
 *
 * author: Thomas Goepfert
 */

import { Config } from './config.js';
import ParaCtrl from './parameterController.js';

('use strict');

const GraphCtrl = (() => {
  let graph = undefined;
  let fistcall = true;
  let dataseries = [[0, 0, 0, 0, 0]];
  let data = [];
  const MAXDATAPOINTS = 5; // 1 x and 4 y-values
  const MAXGRAPHENTRIES = 200;

  // If some parameters has been changed, the label needs to be adjusted accordingly
  function createLabel() {
    return [
      'x',
      `Live Loudness T=${ParaCtrl.getmaxT().maxT[ParaCtrl.getmaxT().maxT_idx]}s`, // würg, aber geht
      `Loudness after gain control T=${Config.maxT_recalc_loudness}s`,
      'Target Loudness',
      'Target Gain',
    ];
  }

  resetData();

  function createGraph(graphdiv) {
    graph = new Dygraph(graphdiv, dataseries, {
      drawPoints: true,
      ylabel: 'Loudness [LKFS]',
      y2label: 'Gain',
      xlabel: 'Playtime [s]',
      labelsKMB: true,
      highlightSeriesOpts: { strokeWidth: 2 },
      legend: 'always',
      labels: createLabel(),
      //labelsDivWidth: 100,
      labelsSeparateLines: true,
      series: {
        'Target Loudness': {
          drawPoints: false,
          strokeWidth: 1,
        },
        'Target Gain': {
          axis: 'y2',
          independentTicks: true,
        },
      },
      axes: {
        y2: {
          // set axis-related properties here
        },
      },
    });
  }

  // pushes new data to the graph
  function appendData(data) {
    if (graph != undefined) {
      if (fistcall) {
        dataseries = []; // 'slice' the first zeros ...
        fistcall = false;
      }
      dataseries.push(data);
      resetData();
    }
    if (dataseries.length > MAXGRAPHENTRIES) {
      dataseries.splice(0, 1); // don't like that ... can we use a ringbuffer instead (puh, at least not that obvious in first place)
    }
  }

  // appends data if last entry has been set (not so cool)
  function setDataPoint(value, idx) {
    if (data[idx] != undefined) {
      // console.log('WARNING: double fill?!!', idx);
    }
    data[idx] = value;
    if (idx == MAXDATAPOINTS - 1) {
      if (validData()) {
        appendData(data);
      }
      resetData();
    }
  }

  function validData() {
    //console.log('validating data:', data);
    for (let idx = 0; idx < data.length; idx++) {
      if (data[idx] == undefined || isNaN(data[idx])) {
        // console.log('some invalid data for plotting .. skip:', data);
        return false;
      }
    }
    return true;
  }

  // seems a bit over-engineered
  function resetData() {
    data = [];
    for (let idx = 0; idx < MAXDATAPOINTS; idx++) {
      data.push(undefined);
    }
  }

  // empty data (label, value)
  function resetGraph() {
    if (graph != undefined) {
      dataseries = [[0, 0, 0, 0, 0]];
      fistcall = true;
      resetData();
      updateGraph();
      graph.resize();
    }
  }

  function updateGraph() {
    if (graph != undefined) {
      graph.updateOptions({
        file: dataseries,
        //dateWindow: [0, dataseries[dataseries.length - 1][0]] //to plot from zero
        labels: createLabel(),
      });
    }
  }

  return {
    createGraph,
    setDataPoint,
    resetGraph,
    updateGraph,
  };
})();

export default GraphCtrl;
