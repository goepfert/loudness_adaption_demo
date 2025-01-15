/**
 * Graph Controller for http://dygraphs.com/
 * load dygraph in index.html
 *
 * author: Thomas Goepfert
 */

('use strict');

const GraphCtrl = (() => {
  let graph = undefined;
  let fistcall = true;
  // let dataseries = [[0, 0, 0, 0, 0, 0]];
  let dataseries = [[0, 0, 0, 0, 0]];
  let data = [];
  let MAXDATAPOINTS = 5;
  let MAXGRAPHENTRIES = 400;
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
      labels: [
        'x',
        'Live Loudness',
        'Loudness after gain control',
        'Target Loudness',
        'Target Gain',
        // 'Mean Live Loudness',
      ],
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

  // pushes new data to graph
  function appendData(data) {
    if (graph != undefined) {
      if (fistcall) {
        dataseries = []; // 'slice' the first zeros ...
        fistcall = false;
      }
      dataseries.push(data);
    }
    if (dataseries.length > MAXGRAPHENTRIES) {
      dataseries.splice(0, 1);
    }
  }

  function setDataPoint(value, idx) {
    if (data[idx] != undefined) {
      console.log('WARNING: double fill?!!', idx);
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
        console.log('some invalid data for plotting .. skip:', data);
        return false;
      }
    }
    return true;
  }

  function resetData() {
    data = [];
    for (let idx = 0; idx < MAXDATAPOINTS; idx++) {
      data.push(undefined);
    }
  }

  // empty data (label, value)
  function resetGraph() {
    if (graph != undefined) {
      // dataseries = [[0, 0, 0, 0, 0, 0]];
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
      });
    }
  }

  return {
    createGraph: createGraph,
    setDataPoint: setDataPoint,
    resetGraph: resetGraph,
    updateGraph: updateGraph,
  };
})();

export default GraphCtrl;
