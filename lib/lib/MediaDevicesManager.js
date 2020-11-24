"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_use_listeners_1 = require("react-use-listeners");
var SpecialMediaStream;
(function (SpecialMediaStream) {
    SpecialMediaStream[SpecialMediaStream["LOCAL_CAMERA"] = 0] = "LOCAL_CAMERA";
    SpecialMediaStream[SpecialMediaStream["LOCAL_SCREEN"] = 1] = "LOCAL_SCREEN";
})(SpecialMediaStream = exports.SpecialMediaStream || (exports.SpecialMediaStream = {}));
class MediaDevicesManager {
    constructor() {
        this.videoDevices = new Map();
        this.audioInputDevices = new Map();
        this.audioOutputDevices = new Map();
        this.videoOutputs = new Map();
        this.bundles = new Map();
        this.localBundles = new Set();
        this.videoStreamConnections = new Map();
        this.audioConnections = new Map();
        this.refreshDevices();
    }
    registerVideoOutput(id, ref) {
        this.videoOutputs.set(id, ref);
    }
    deregisterVideoOutput(id) {
        //this.stopOutput(id);
        this.videoOutputs.delete(id);
    }
    initBundleIfNecessary(bundleId) {
        if (!this.bundles.has(bundleId)) {
            this.bundles.set(bundleId, { bundleId, streams: new Map(), onloadListeners: new react_use_listeners_1.Listeners() });
        }
    }
    addMediaStream(bundleId, streamId, stream) {
        this.initBundleIfNecessary(bundleId);
        const bundle = this.bundles.get(bundleId);
        bundle.streams.set(streamId, stream);
        this.notifyOnLoad(bundleId);
    }
    removeMediaStream(bundleId, streamId) {
        if (!this.bundles.has(bundleId))
            return;
        const bundle = this.bundles.get(bundleId);
        bundle.streams.delete(streamId);
    }
    destroyBundle(bundleId) {
        this.stopBundle(bundleId);
        this.bundles.delete(bundleId);
        this.localBundles.delete(bundleId);
    }
    stopBundle(bundleId) {
        if (!this.bundles.has(bundleId))
            return;
        const bundle = this.bundles.get(bundleId);
        bundle.streams.forEach(stream => {
            stream.getTracks().forEach(track => track.stop());
        });
        bundle.streams.clear();
    }
    // stopOutput(outputId: string) {
    //     if (!this.videoOutputs.has(outputId)) throw new Error("output with id: " + outputId + " is not available");
    //         const output: MutableRefObject<HTMLVideoElement> = this.videoOutputs.get(outputId)!;
    //     if (this.videoStreamConnections.has(outputId)) {
    //         const oldStreamId = this.videoStreamConnections.get(outputId)!;
    //         this.stopStream(oldStreamId);
    //     }
    // }
    connectStreamToOutput(bundleId, streamId, outputId) {
        if (!this.bundles.has(bundleId))
            throw new Error("bundle with id: " + bundleId + " is not available");
        if (!this.videoOutputs.has(outputId))
            throw new Error("output with id: " + outputId + " is not available");
        const bundle = this.bundles.get(bundleId);
        if (!bundle.streams.has(streamId))
            throw new Error("stream with id: " + streamId + " is not available");
        const stream = bundle.streams.get(streamId);
        const output = this.videoOutputs.get(outputId);
        //this.stopOutput(outputId);
        output.current.srcObject = stream;
        output.current.play();
    }
    connectAudioOutputToVideoOutput(audioId, outputId) {
        if (!this.audioOutputDevices.has(audioId))
            throw new Error("audio output with id: " + audioId + " is not available");
        if (!this.videoOutputs.has(outputId))
            throw new Error("output with id: " + outputId + " is not available");
        const audio = this.audioOutputDevices.get(audioId).info;
        const output = this.videoOutputs.get(outputId);
        const videoElement = output.current;
        this.audioConnections.set(outputId, audioId);
        videoElement.setSinkId(audio.deviceId);
    }
    notifyOnLoad(bundleId) {
        if (!this.bundles.has(bundleId))
            throw new Error("bundle with id: " + bundleId + " is not available");
        const bundle = this.bundles.get(bundleId);
        bundle.onloadListeners.getCallbacks().forEach(listener => listener(bundle));
    }
    listenToBundle(bundleId, callback) {
        this.initBundleIfNecessary(bundleId);
        const bundle = this.bundles.get(bundleId);
        return bundle.onloadListeners.addListener(callback);
    }
    loadCameraStream(bundleId, streamId, videoId, audioId, outputId, onload) {
        const constraints = {
            audio: { deviceId: audioId ? { exact: audioId } : undefined },
            video: { deviceId: videoId ? { exact: videoId } : undefined }
        };
        this.loadStream(bundleId, streamId, videoId, audioId, outputId, onload, constraints, false);
    }
    loadScreenStream(bundleId, streamId, outputId, onload) {
        const mediaDevices = navigator.mediaDevices;
        this.loadStream(bundleId, streamId, null, null, outputId, onload, undefined, true);
    }
    getVideoFeed(constraints) {
        return __awaiter(this, void 0, void 0, function* () {
            return navigator.mediaDevices.getUserMedia(constraints);
        });
    }
    getScreenFeed() {
        return __awaiter(this, void 0, void 0, function* () {
            return navigator.mediaDevices.mediaDevices.getDisplayMedia();
        });
    }
    loadStream(bundleId, streamId, videoId, audioId, outputId, onload, constraints, screenshare) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.bundles.has(bundleId))
                this.stopBundle(bundleId);
            this.initBundleIfNecessary(bundleId);
            const bundle = this.bundles.get(bundleId);
            this.listenToBundle(bundleId, onload);
            let stream = screenshare ? yield this.getScreenFeed() : yield this.getVideoFeed();
            this.addMediaStream(bundleId, streamId, stream);
            this.localBundles.add(bundleId);
            this.connectStreamToOutput(bundleId, streamId, outputId);
            this.notifyOnLoad(bundleId);
        });
    }
    getLocalBundles() {
        return Array.from(this.localBundles.values()).filter(bundleId => this.bundles.has(bundleId)).map(bundleId => this.bundles.get(bundleId));
    }
    createDeviceLabel(map, info) {
        if (info.label)
            return info.label;
        if (info.kind === "videoinput")
            return "Camera " + (map.size + 1);
        if (info.kind === "audioinput")
            return "Microphone " + (map.size + 1);
        if (info.kind === "audiooutput")
            return "Speaker " + (map.size + 1);
        throw new Error("unknown device " + info);
    }
    refreshDevices() {
        navigator.mediaDevices.enumerateDevices().then(devices => {
            this.videoDevices.clear();
            this.audioInputDevices.clear();
            this.audioOutputDevices.clear();
            devices.forEach(device => {
                if (device.kind === "videoinput")
                    this.videoDevices.set(device.deviceId, { label: this.createDeviceLabel(this.videoDevices, device), info: device });
                if (device.kind === "audioinput")
                    this.audioInputDevices.set(device.deviceId, { label: this.createDeviceLabel(this.videoDevices, device), info: device });
                if (device.kind === "audiooutput")
                    this.audioOutputDevices.set(device.deviceId, { label: this.createDeviceLabel(this.videoDevices, device), info: device });
            });
        });
    }
    releaseDevices() {
        // FIXME
    }
    getVideoDevices() {
        return this.videoDevices;
    }
    getAudioInputDevices() {
        return this.audioInputDevices;
    }
    getAudioOutputDevices() {
        return this.audioOutputDevices;
    }
    getMediaConstraints() {
        return navigator.mediaDevices.getSupportedConstraints();
    }
    removeMediaStreams(bundleId) {
        this.destroyBundle(bundleId);
    }
}
exports.MediaDevicesManager = MediaDevicesManager;
