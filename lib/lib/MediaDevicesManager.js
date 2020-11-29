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
var MediaType;
(function (MediaType) {
    MediaType[MediaType["STREAM"] = 0] = "STREAM";
    MediaType[MediaType["DATA"] = 1] = "DATA";
})(MediaType = exports.MediaType || (exports.MediaType = {}));
var StreamSubType;
(function (StreamSubType) {
    StreamSubType[StreamSubType["LOCAL_CAMERA"] = 0] = "LOCAL_CAMERA";
    StreamSubType[StreamSubType["LOCAL_SCREEN"] = 1] = "LOCAL_SCREEN";
    StreamSubType[StreamSubType["REMOTE"] = 2] = "REMOTE";
})(StreamSubType = exports.StreamSubType || (exports.StreamSubType = {}));
exports.makeMediaId = (bundleId, streamId) => {
    return bundleId + '/' + streamId;
};
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
    registerVideoOutput(id, ref, bundleId, objId) {
        this.videoOutputs.set(id, ref);
        if (bundleId && objId) {
            this.connectStreamToOutput(bundleId, objId, id);
        }
    }
    deregisterVideoOutput(id) {
        //this.stopOutput(id);
        this.videoOutputs.delete(id);
    }
    initBundleIfNecessary(bundleId) {
        if (!this.bundles.has(bundleId)) {
            this.bundles.set(bundleId, { bundleId, objs: new Map(), onAddedListeners: new react_use_listeners_1.Listeners(), onRemovedListeners: new react_use_listeners_1.Listeners() });
        }
    }
    addMediaStream(bundleId, objId, stream) {
        this.addMediaStreamObject(bundleId, objId, { id: exports.makeMediaId(bundleId, objId), bundleId, objId, type: MediaType.STREAM, subType: StreamSubType.REMOTE, stream });
    }
    addLocalCameraStream(bundleId, objId, stream) {
        this.addMediaStreamObject(bundleId, objId, { id: exports.makeMediaId(bundleId, objId), bundleId, objId, type: MediaType.STREAM, subType: StreamSubType.LOCAL_CAMERA, stream });
    }
    addLocalScreenStream(bundleId, objId, stream) {
        this.addMediaStreamObject(bundleId, objId, { id: exports.makeMediaId(bundleId, objId), bundleId, objId, type: MediaType.STREAM, subType: StreamSubType.LOCAL_SCREEN, stream });
    }
    addMediaStreamObject(bundleId, objId, mediaObject) {
        this.initBundleIfNecessary(bundleId);
        const bundle = this.bundles.get(bundleId);
        bundle.objs.set(objId, mediaObject);
        const stream = mediaObject.stream;
        stream.onremovetrack = ((_e) => this.trackRemoved(bundleId, objId));
        bundle.onAddedListeners.getCallbacks().forEach(listener => listener(bundleId, objId, mediaObject));
    }
    trackRemoved(bundleId, objId) {
        if (!this.bundles.has(bundleId))
            return;
        const bundle = this.bundles.get(bundleId);
        if (!bundle.objs.has(objId))
            return;
        const mediaObject = bundle.objs.get(objId);
        if (mediaObject.type !== MediaType.STREAM)
            throw new Error("media object " + bundleId + " " + objId + " is not a stream");
        const stream = mediaObject.stream;
        if (stream.getTracks().length == 0)
            this.removeMediaStream(bundleId, objId);
    }
    removeMediaStream(bundleId, objId) {
        if (!this.bundles.has(bundleId))
            return;
        const bundle = this.bundles.get(bundleId);
        bundle.objs.delete(objId);
        bundle.onRemovedListeners.getCallbacks().forEach(listener => listener(bundleId, objId));
    }
    destroyBundle(bundleId) {
        this.stopBundle(bundleId);
        const bundle = this.bundles.get(bundleId);
        bundle.objs.forEach((_obj, objId) => {
            bundle.onRemovedListeners.getCallbacks().forEach(listener => listener(bundleId, objId));
        });
        this.bundles.delete(bundleId);
    }
    stopBundle(bundleId) {
        if (!this.bundles.has(bundleId))
            return;
        const bundle = this.bundles.get(bundleId);
        bundle.objs.forEach(mediaObject => {
            if (mediaObject.type !== MediaType.STREAM)
                return;
            const stream = mediaObject.stream;
            stream.getTracks().forEach(track => track.stop());
        });
        bundle.objs.clear();
    }
    // stopOutput(outputId: string) {
    //     if (!this.videoOutputs.has(outputId)) throw new Error("output with id: " + outputId + " is not available");
    //         const output: MutableRefObject<HTMLVideoElement> = this.videoOutputs.get(outputId)!;
    //     if (this.videoStreamConnections.has(outputId)) {
    //         const oldobjId = this.videoStreamConnections.get(outputId)!;
    //         this.stopStream(oldobjId);
    //     }
    // }
    connectStreamToOutput(bundleId, objId, outputId) {
        if (!this.bundles.has(bundleId))
            throw new Error("bundle with id: " + bundleId + " is not available");
        if (!this.videoOutputs.has(outputId))
            throw new Error("output with id: " + outputId + " is not available");
        const bundle = this.bundles.get(bundleId);
        if (!bundle.objs.has(objId))
            throw new Error("stream with id: " + objId + " is not available");
        const mediaObject = bundle.objs.get(objId);
        if (mediaObject.type !== MediaType.STREAM)
            throw new Error("media object " + bundleId + " " + objId + " is not a stream");
        const stream = mediaObject.stream;
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
    listenToBundle(bundleId, onAddedListener, onRemovedListener) {
        this.initBundleIfNecessary(bundleId);
        const bundle = this.bundles.get(bundleId);
        // immediately transmit all streams we already have
        bundle.objs.forEach((mediaObject, objId) => onAddedListener(bundleId, objId, mediaObject));
        const unsubscribeAdded = bundle.onAddedListeners.addListener(onAddedListener);
        const unsubscribeRemoved = bundle.onRemovedListeners.addListener(onRemovedListener);
        return () => {
            unsubscribeAdded();
            unsubscribeRemoved();
        };
    }
    loadCameraStream(videoId, audioId) {
        const constraints = {
            audio: { deviceId: audioId ? { exact: audioId } : undefined },
            video: { deviceId: videoId ? { exact: videoId } : undefined }
        };
        this.loadStream(MediaIdent.LOCAL, MediaIdent.CAMERA, false, constraints);
    }
    loadScreenStream() {
        this.loadStream(MediaIdent.LOCAL, MediaIdent.SCREEN, true, undefined);
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
    loadStream(bundleId, objId, screenshare, constraints) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.bundles.has(bundleId))
                this.stopBundle(bundleId);
            this.initBundleIfNecessary(bundleId);
            if (screenshare) {
                const stream = yield this.getScreenFeed();
                this.addLocalScreenStream(bundleId, objId, stream);
            }
            else {
                const stream = yield this.getVideoFeed(constraints);
                this.addLocalCameraStream(bundleId, objId, stream);
            }
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
//# sourceMappingURL=MediaDevicesManager.js.map