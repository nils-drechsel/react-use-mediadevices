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
var MediaIdent;
(function (MediaIdent) {
    MediaIdent["LOCAL"] = "LOCAL";
    MediaIdent["CAMERA"] = "CAMERA";
    MediaIdent["SCREEN"] = "SCREEN";
})(MediaIdent = exports.MediaIdent || (exports.MediaIdent = {}));
class MediaDevicesManager {
    constructor() {
        this.videoDevices = new Map();
        this.audioInputDevices = new Map();
        this.audioOutputDevices = new Map();
        this.videoOutputs = new Map();
        this.bundles = new Map();
        this.videoStreamConnections = new Map();
        this.audioConnections = new Map();
        this.initBundleIfNecessary(MediaIdent.LOCAL);
        this.refreshDevices();
        navigator.mediaDevices.ondevicechange = (_event) => this.refreshDevices();
    }
    registerVideoOutput(id, ref, bundleId, streamId) {
        this.videoOutputs.set(id, ref);
        if (bundleId && streamId) {
            this.connectStreamToOutput(bundleId, streamId, id);
        }
    }
    deregisterVideoOutput(id) {
        //this.stopOutput(id);
        this.videoOutputs.delete(id);
    }
    initBundleIfNecessary(bundleId) {
        if (!this.bundles.has(bundleId)) {
            this.bundles.set(bundleId, { bundleId, streams: new Map(), onStreamAddedListeners: new react_use_listeners_1.Listeners(), onStreamRemovedListeners: new react_use_listeners_1.Listeners() });
        }
    }
    addMediaStream(bundleId, streamId, stream) {
        this.initBundleIfNecessary(bundleId);
        const bundle = this.bundles.get(bundleId);
        bundle.streams.set(streamId, stream);
        stream.onremovetrack = ((_e) => this.trackRemoved(bundleId, streamId));
        bundle.onStreamAddedListeners.getCallbacks().forEach(listener => listener(bundleId, streamId, stream));
    }
    trackRemoved(bundleId, streamId) {
        if (!this.bundles.has(bundleId))
            return;
        const bundle = this.bundles.get(bundleId);
        if (!bundle.streams.has(streamId))
            return;
        const stream = bundle.streams.get(streamId);
        if (stream.getTracks().length == 0)
            this.removeMediaStream(bundleId, streamId);
    }
    removeMediaStream(bundleId, streamId) {
        if (!this.bundles.has(bundleId))
            return;
        const bundle = this.bundles.get(bundleId);
        bundle.streams.delete(streamId);
        bundle.onStreamRemovedListeners.getCallbacks().forEach(listener => listener(bundleId, streamId));
    }
    destroyBundle(bundleId) {
        this.stopBundle(bundleId);
        const bundle = this.bundles.get(bundleId);
        bundle.streams.forEach((_stream, streamId) => {
            bundle.onStreamRemovedListeners.getCallbacks().forEach(listener => listener(bundleId, streamId));
        });
        this.bundles.delete(bundleId);
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
    listenToBundle(bundleId, onStreamAddedListener, onStreamRemovedListener) {
        this.initBundleIfNecessary(bundleId);
        const bundle = this.bundles.get(bundleId);
        // immediately transmit all streams we already have
        bundle.streams.forEach((stream, streamId) => onStreamAddedListener(bundleId, streamId, stream));
        const unsubscribeAdded = bundle.onStreamAddedListeners.addListener(onStreamAddedListener);
        const unsubscribeRemoved = bundle.onStreamRemovedListeners.addListener(onStreamRemovedListener);
        return () => {
            unsubscribeAdded();
            unsubscribeRemoved();
        };
    }
    loadCameraStream(videoId, audioId, outputId) {
        const constraints = {
            audio: { deviceId: audioId ? { exact: audioId } : undefined },
            video: { deviceId: videoId ? { exact: videoId } : undefined }
        };
        this.loadStream(MediaIdent.LOCAL, MediaIdent.CAMERA, videoId, audioId, outputId, false, constraints);
    }
    loadScreenStream(bundleId, streamId, outputId) {
        const mediaDevices = navigator.mediaDevices;
        this.loadStream(MediaIdent.LOCAL, MediaIdent.SCREEN, null, null, outputId, true, undefined);
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
    loadStream(bundleId, streamId, videoId, audioId, outputId, screenshare, constraints) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.bundles.has(bundleId))
                this.stopBundle(bundleId);
            this.initBundleIfNecessary(bundleId);
            const bundle = this.bundles.get(bundleId);
            let stream = screenshare ? yield this.getScreenFeed() : yield this.getVideoFeed(constraints);
            this.addMediaStream(bundleId, streamId, stream);
            this.connectStreamToOutput(bundleId, streamId, outputId);
        });
    }
    getLocalBundle() {
        return this.bundles.get(MediaIdent.LOCAL);
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
