/**
 * Loudness Adaption Demo Main App
 * 
 * author: Pat Fénis
 */

'use strict';

// Start off by initializing a new context
// The one and only global variable
let context = new AudioContext();

// Ranges and default values of various parameters
const ParaCtrl = (function () {

    let _interval = [0.2, 0.3, 0.4, 0.5];
    let _interval_idx = 2;

    let _overlap = [0.25, 0.50, 0.75];
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
            maxT: _maxT[_maxT_idx]
        }
        return prop;
    }

    function getInterval() {
        let prop = {
            interval: _interval,
            interval_idx: _interval_idx
        }
        return prop;
    }

    function getOverlap() {
        let prop = {
            overlap: _overlap,
            overlap_idx: _overlap_idx
        }
        return prop;
    }

    function getmaxT() {
        let prop = {
            maxT: _maxT,
            maxT_idx: _maxT_idx
        }
        return prop;
    }

    function setLoudnessProperties_idx(interval_idx, overlap_idx, maxT_idx) {
        _interval_idx = interval_idx;
        _overlap_idx = overlap_idx;
        _maxT_idx = maxT_idx
    }

    function getGainProperties() {
        let prop = {
            decay_increase: _decay_increase[_decay_increase_idx],
            decay_decrease: _decay_decrease[_decay_decrease_idx],
        }
        return prop;
    }

    function getDecayIncrease() {
        let prop = {
            decay_increase: _decay_increase,
            decay_increase_idx: _decay_increase_idx
        }
        return prop;
    }

    function getDecayDecrease() {
        let prop = {
            decay_decrease: _decay_decrease,
            decay_decrease_idx: _decay_decrease_idx
        }
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
        getApplyGainCorrection: getApplyGainCorrection
    }

})();

// Graph Controller ----------------------------------------------------------------------------
// http://dygraphs.com/
const GraphCtrl = (function () {

    let graph = undefined;
    let fistcall = true;
    let dataseries = [[0, 0, 0, 0, 0, 0]];
    let data = [];
    let MAXDATAPOINTS = 6;
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
            labels: ["x", "Live Loudness", "Loudness after gain control", "Target Loudness", "Target Gain", "Mean Loudness"],
            //labelsDivWidth: 100,
            labelsSeparateLines: true,
            series: {
                "Target Loudness": {
                    drawPoints: false,
                    strokeWidth: 1,
                },
                "Target Gain": {
                    axis: 'y2',
                    independentTicks: true
                }
            },
            axes: {
                y2: {
                    // set axis-related properties here
                }
            }
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
            dataseries = [[0, 0, 0, 0, 0, 0]];
            fistcall = true;
            resetData();
            updateGraph();
            graph.resize();
        }
    }

    function updateGraph() {
        if (graph != undefined) {
            graph.updateOptions({
                'file': dataseries
                //dateWindow: [0, dataseries[dataseries.length - 1][0]] //to plot from zero
            });
        }
    }

    return {
        createGraph: createGraph,
        setDataPoint: setDataPoint,
        resetGraph: resetGraph,
        updateGraph: updateGraph
    }

})();

// UI Controller ----------------------------------------------------------------------------
const UICtrl = (function () {
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
        gainCheckBox: 'cb_gain'
    }

    function disableLoudnessControl() {
        document.getElementById("Interval").disabled = true;
        document.getElementById("Overlap").disabled = true;
        document.getElementById("maxT").disabled = true;
    }

    function enableLoudnessControl() {
        document.getElementById("Interval").disabled = false;
        document.getElementById("Overlap").disabled = false;
        document.getElementById("maxT").disabled = false;

    }

    function showFileProps(props) {
        let ul = document.getElementById("fileprops");
        ul.innerHTML = "";
        for (let key in props) {
            let li = document.createElement("li");
            li.appendChild(document.createTextNode(key + ": " + props[key]));
            ul.appendChild(li);
        }
    }

    function showLoudnessProps() {
        let prop = ParaCtrl.getInterval();
        let select = document.getElementById("Interval");
        select.innerHTML = "";
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
        select = document.getElementById("Overlap");
        select.innerHTML = "";
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
        select = document.getElementById("maxT");
        select.innerHTML = "";
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
        select = document.getElementById("Decrease");
        select.innerHTML = "";
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
        select = document.getElementById("Increase");
        select.innerHTML = "";
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
        let select = document.getElementById("Interval");
        let interval_idx = select.selectedIndex;

        select = document.getElementById("Overlap");
        let overlap_idx = select.selectedIndex;

        select = document.getElementById("maxT");
        let maxT_idx = select.selectedIndex;

        ParaCtrl.setLoudnessProperties_idx(interval_idx, overlap_idx, maxT_idx);
    }

    function applyGainProps() {
        let select = document.getElementById("Decrease");
        let decay_decrease_idx = select.selectedIndex;

        select = document.getElementById("Increase");
        let decay_increase_idx = select.selectedIndex;

        ParaCtrl.setGainProperties_idx(decay_increase_idx, decay_decrease_idx);
    }

    function getSelectors() {
        return UISelectors;
    }

    // Public methods
    return {
        showFileProps: showFileProps,
        showLoudnessProps: showLoudnessProps,
        applyLoudnessProps: applyLoudnessProps,
        applyGainProps: applyGainProps,
        getSelectors: getSelectors,
        disableLoudnessControl: disableLoudnessControl,
        enableLoudnessControl: enableLoudnessControl
    }

})()

// Audio Context Controller ------------------------------------------------------------------
function createAudioCtxCtrl(buffer, callback) {

    let targetLKFS = undefined;
    let startGain = 1.0;
    let targetGain = 1.0;

    let decay_decrease = undefined;
    let decay_increase = undefined;

    let bufferSize = 4096;
    let sp_loudness = undefined;
    let sp_loudness_control = undefined;
    let source = undefined;
    let gain = undefined;

    let startedAt = 0;
    let pausedAt = 0;
    let isPlaying = false;

    let meter = undefined;

    let loudnessSample = undefined;
    let loudnessSample_control = undefined;

    let nHistoryLoudness = 0;
    let loudnessHistory = [];

    let MINDB = 2;

    // nice one ... can be used as 'constructor' function
    (function construct() {
        targetLKFS = ParaCtrl.getTargetLoudness();
    })();

    function callback_control(time, loudness) {
        if (App.debug) {
            time = getCurrentTime();
            console.log('control: playtime / measured gated loudness: ', time, ' / ', loudness);
        }

        // plot something even if retrieved values are unreasonable
        if (isNaN(loudness)) {
            loudness = ParaCtrl.getDefaultTargetLoudness();
        }
        loudness = Number(loudness.toFixed(2));
        GraphCtrl.setDataPoint(loudness, 2);
        GraphCtrl.setDataPoint(targetLKFS, 3);
        GraphCtrl.setDataPoint(targetGain, 4);
    }

    function play() {
        console.log('- PLAY PAUSE --------------------------------');

        UICtrl.disableLoudnessControl();
        if (loudnessSample == undefined) {
            loudnessSample = new LoudnessSample(buffer, callback, ParaCtrl.getLoudnessProperties(), 1);
        }
        if (loudnessSample_control == undefined) {
            loudnessSample_control = new LoudnessSample(buffer, callback_control, {
                interval: 0.4,
                overlap: 0.75,
                maxT: 1
            }, 2);
        }

        nHistoryLoudness = ParaCtrl.getmaxT().maxT[ParaCtrl.getmaxT().maxT_idx] * buffer.sampleRate / bufferSize;

        let offset = pausedAt;
        source = context.createBufferSource();
        source.buffer = buffer;
        sp_loudness = context.createScriptProcessor(bufferSize, buffer.numberOfChannels, buffer.numberOfChannels);
        sp_loudness.onaudioprocess = loudnessSample.onProcess;
        source.connect(sp_loudness);

        // output unfiltered data
        gain = context.createGain();

        gain.gain.setValueAtTime(targetGain, context.currentTime); //?

        // measure again after gain control
        sp_loudness_control = context.createScriptProcessor(bufferSize, buffer.numberOfChannels, buffer.numberOfChannels);
        sp_loudness_control.onaudioprocess = loudnessSample_control.onProcess;

        source.connect(gain);
        gain.connect(sp_loudness_control);
        gain.connect(context.destination);
        //source.connect(context.destination);

        meter = createAudioMeter(context, buffer.numberOfChannels, 0.98, 0.95, 250);
        gain.connect(meter);

        source.start(0, pausedAt);
        source.loop = ParaCtrl.getLoop();

        startedAt = context.currentTime - offset;
        pausedAt = 0;
        isPlaying = true;

        App.updateAnimationFrame();
    }

    function pause() {
        var elapsed = context.currentTime - startedAt;
        commonStop();
        pausedAt = elapsed;
    }

    function stop() {
        commonStop();
        // saw sometimes inconsistent data when not rebuilding loudness ... never found out why :(
        //loudnessSample.resetMemory();
        //loudnessSample_control.resetMemory();
        loudnessSample = undefined;
        loudnessSample_control = undefined;
        targetGain = startGain;

        loudnessHistory = [];

        UICtrl.enableLoudnessControl();
    }

    function commonStop() {
        if (source != undefined) {
            source.disconnect();
            sp_loudness.onaudioprocess = null;
            sp_loudness_control.onaudioprocess = null;
            meter.shutdown();
            source.stop(0);
            source = undefined;
        }
        pausedAt = 0;
        startedAt = 0;
        isPlaying = false;
    }

    function getPlaying() {
        return isPlaying;
    };

    function getCurrentTime() {
        if (pausedAt) {
            return pausedAt;
        }
        if (startedAt) {
            return context.currentTime - startedAt;
        }
        return 0;
    };

    function getDuration() {
        return buffer.duration;
    }

    function applyGain(loudness) {

        if (!ParaCtrl.getApplyGainCorrection()) {
            targetGain = startGain;
            gain.gain.setValueAtTime(targetGain, context.currentTime);
            return;
        }

        loudnessHistory.push(loudness);
        if (loudnessHistory.length > nHistoryLoudness) {
            loudnessHistory.splice(0, 1);
        }

        let meanLoudness = 0;
        for (let idx = 0; idx < loudnessHistory.length; idx++) {
            meanLoudness += loudnessHistory[idx];
        }
        meanLoudness /= loudnessHistory.length;
        GraphCtrl.setDataPoint(meanLoudness, 5);

        //console.log('max / length / loudness / mean', nHistoryLoudness, loudnessHistory.length, loudness, meanLoudness);

        // TODO: well, this looks ugly
        decay_decrease = ParaCtrl.getDecayDecrease().decay_decrease[ParaCtrl.getDecayDecrease().decay_decrease_idx];
        decay_increase = ParaCtrl.getDecayIncrease().decay_increase[ParaCtrl.getDecayIncrease().decay_increase_idx];
        targetLKFS = ParaCtrl.getTargetLoudness();

        //let dB = loudness - targetLKFS;
        let dB = meanLoudness - targetLKFS;

        let endTime = Math.abs(dB / decay_increase);
        if (dB > 0) {
            endTime = dB / decay_decrease;
        }

        //95%, see https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime
        endTime /= 3.;
        targetGain = startGain / Math.pow(10, dB / 20.);
        gain.gain.setTargetAtTime(targetGain, context.currentTime, endTime);

        if (App.debug) {
            console.log('diff in db1 / dB2 / target gain / endTime: ', (loudness - targetLKFS), '/', dB, ' / ', targetGain, ' / ', endTime);
        }
    }

    function setTargetLoudness(loudness) {
        targetLKFS = loudness;
    }

    function reset() {

        // no need for play pause, fixes also reset loudness in file loop if playtime>duration
        if (loudnessSample != undefined) {
            loudnessSample.resetBuffer();
        }
        if (gain != undefined) {
            gain.gain.setValueAtTime(startGain, context.currentTime);
        }

        loudnessHistory = [];
    }

    function setLoop() {
        if (source != undefined) {
            source.loop = ParaCtrl.getLoop();
        }
    }

    function getMeter() {
        return meter;
    }

    // Public methods
    return {
        getCurrentTime: getCurrentTime,
        getDuration: getDuration,
        getPlaying: getPlaying,
        applyGain: applyGain,
        play: play,
        pause: pause,
        stop: stop,
        setTargetLoudness: setTargetLoudness,
        reset: reset,
        setLoop: setLoop,
        getMeter: getMeter
    }

}

// App Controller ----------------------------------------------------------------------------
const App = (function () {

    let audioCtxCtrl = undefined;
    let info = undefined;

    let debug = false;
    let somebool = true;

    // volume meter
    let canvasContext = undefined;
    let WIDTH = 20;
    let HEIGHT = undefined;

    function init() {
        console.log('initializing app ...');

        // Get UI selectors
        const UISelectors = UICtrl.getSelectors();

        info = document.getElementById(UISelectors.info);

        // Load event listeners
        let playbtn = document.getElementById(UISelectors.playPauseButton);
        playbtn.addEventListener('click', () => { playPauseButton(playbtn) });
        document.getElementById(UISelectors.stopButton).addEventListener('click', () => stopButton(playbtn));
        document.getElementById(UISelectors.fileselector).addEventListener('change', handleFileSelect, false);
        document.getElementById("loudness_form").addEventListener('change', (e) => {
            UICtrl.applyLoudnessProps();
            console.log(ParaCtrl.getLoudnessProperties());
            e.preventDefault();
        });

        document.getElementById("gain_form").addEventListener('change', (e) => {
            UICtrl.applyGainProps();
            console.log(ParaCtrl.getGainProperties());
            e.preventDefault();
        });

        // Slider Target Loudness
        let slider = document.getElementById(UISelectors.targetLoudness_slider);
        let value = document.getElementById(UISelectors.targetLoudness_value);
        slider.value = ParaCtrl.getDefaultTargetLoudness();
        value.innerHTML = slider.value;
        slider.oninput = function () {
            value.innerHTML = this.value;
            ParaCtrl.setTargetLoudness(Number(this.value));
            audioCtxCtrl.setTargetLoudness(ParaCtrl.getTargetLoudness());
        }

        // create graph
        GraphCtrl.createGraph(UISelectors.graphdiv);

        // reset button
        document.getElementById(UISelectors.resetButton).addEventListener('click', () => audioCtxCtrl.reset());

        // file loop
        let cb_loop = document.getElementById(UISelectors.loopCheckBox);
        cb_loop.checked = ParaCtrl.getLoop();
        cb_loop.addEventListener('click', () => checkLoop(cb_loop));

        // apply gain correction or bypass
        let cb_gain = document.getElementById(UISelectors.gainCheckBox);
        cb_gain.checked = ParaCtrl.getApplyGainCorrection();
        cb_gain.addEventListener('click', () => checkGainCorrection(cb_gain));

        //audio meter
        canvasContext = document.getElementById("meter").getContext("2d");
    }

    function checkLoop(checkbox) {
        if (checkbox.checked) {
            ParaCtrl.setLoop(true);
        } else {
            ParaCtrl.setLoop(false);
        }
        audioCtxCtrl.setLoop();
    }

    function checkGainCorrection(checkbox) {
        if (checkbox.checked) {
            ParaCtrl.setApplyGainCorrection(true);
        } else {
            ParaCtrl.setApplyGainCorrection(false);
        }
    }

    function playPauseButton(btn) {
        if (audioCtxCtrl.getPlaying()) {
            audioCtxCtrl.pause();
            btn.firstChild.nodeValue = 'play';
        } else {
            audioCtxCtrl.play();
            btn.firstChild.nodeValue = 'pause';
            somebool = true;
        }
    }

    function stopButton(btn) {
        audioCtxCtrl.stop();
        GraphCtrl.resetGraph();
        btn.firstChild.nodeValue = 'play';
        somebool = true;
    }

    // loads and decodes file asynchronically and starts off a lot of other stuff
    function handleFileSelect(evt) {
        let file = evt.target.files[0];
        console.log(file);
        let reader = new FileReader();
        reader.onload = function () {
            let arrayBuffer = reader.result;
            context.decodeAudioData(arrayBuffer)
                .then(function (decodedData) {
                    //console.log(decodedData);

                    if (audioCtxCtrl != undefined) {
                        audioCtxCtrl.stop();
                    }
                    audioCtxCtrl = createAudioCtxCtrl(decodedData, getLoudness);

                    //unblock control and graph
                    document.getElementById("controlbuttons").style.display = "block";
                    HEIGHT = document.getElementById(UICtrl.getSelectors().graphdiv).clientHeight; // I know it only after previous line ...

                    GraphCtrl.resetGraph();

                    let fileprops = {
                        filename: file.name,
                        duration: decodedData.duration.toFixed(1),
                        samplerate: decodedData.sampleRate,
                        numberOfChannels: decodedData.numberOfChannels,
                    }
                    UICtrl.showFileProps(fileprops);
                    UICtrl.showLoudnessProps();
                    UICtrl.enableLoudnessControl();

                    updateAnimationFrame();
                });
        };
        reader.readAsArrayBuffer(file);
    }

    /**
     * Callback called at the end of onProcess
     */
    function getLoudness(time, loudness) {
        if (App.debug) {
            time = Number(audioCtxCtrl.getCurrentTime().toFixed(2));
            console.log('playtime / measured gated loudness: ', time, ' / ', loudness);
        }

        time = Number(audioCtxCtrl.getCurrentTime().toFixed(2));
        //time = Number(time.toFixed(2));   
        loudness = Number(loudness.toFixed(2));

        if (isNaN(loudness)) {
            //loudness = ParaCtrl.getDefaultTargetLoudness();
        }

        GraphCtrl.setDataPoint(time, 0);
        GraphCtrl.setDataPoint(loudness, 1);
        if (!isNaN(loudness)) {
            audioCtxCtrl.applyGain(loudness);
        }
    }

    /**
     * let the browser update in its capability
     * if playing, called recursively
     */
    function updateAnimationFrame() {

        // playtime / duration
        if (info != undefined) {
            info.innerHTML = audioCtxCtrl.getCurrentTime().toFixed(1) + '/' + audioCtxCtrl.getDuration().toFixed(1);
        }

        // if not in loop, pause at the end, avoid toggling
        if (!ParaCtrl.getLoop() && somebool && audioCtxCtrl.getCurrentTime() >= audioCtxCtrl.getDuration()) {
            let playbtn = document.getElementById(UICtrl.getSelectors().playPauseButton);
            playPauseButton(playbtn);
            somebool = false;
        }

        // volume audio meter
        if (canvasContext != undefined) {
            canvasContext.clearRect(0, 0, WIDTH, HEIGHT);
            let meter = audioCtxCtrl.getMeter();
            if (meter != undefined) {
                // check if we're currently clipping
                if (meter.checkClipping()) {
                    canvasContext.fillStyle = "red";
                } else {
                    canvasContext.fillStyle = "green";
                }
                // draw a bar based on the current volume
                let nChannels = meter.volume.length;
                for (let chIdx = 0; chIdx < nChannels; chIdx++) {
                    canvasContext.fillRect(WIDTH / nChannels * chIdx, HEIGHT, WIDTH / nChannels, -2 * HEIGHT * meter.volume[chIdx]);
                }
            }
        }

        // if playing update graph and call recurslively
        // remember to update again when resume playing
        if (audioCtxCtrl.getPlaying()) {
            GraphCtrl.updateGraph();
            window.requestAnimationFrame(updateAnimationFrame);
        }
    }

    // Public methods
    return {
        init: init,
        updateAnimationFrame: updateAnimationFrame,
        debug: debug
    }

})();

// let's go
App.init();