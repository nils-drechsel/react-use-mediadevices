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
    constructor(logging = true) {
        this.devices = null;
        this.videoOutputs = new Map();
        this.bundles = new Map();
        this.videoStreamConnections = new Map();
        this.audioConnections = new Map();
        this.deviceListeners = new react_use_listeners_1.DataListeners();
        this.logging = logging;
        navigator.mediaDevices.ondevicechange = (_event) => this.refreshDevices();
        this.refreshDevices();
        this.initBundleIfNecessary(MediaIdent.LOCAL);
    }
    registerVideoOutput(id, ref, bundleId, objId) {
        if (this.logging)
            console.log('register video output', id, bundleId, objId);
        this.videoOutputs.set(id, ref);
        if (bundleId && objId) {
            this.connectStreamToOutput(bundleId, objId, id);
        }
    }
    deregisterVideoOutput(id) {
        if (this.logging)
            console.log('deregister video output', id);
        //this.stopOutput(id);
        this.videoOutputs.delete(id);
    }
    initBundleIfNecessary(bundleId) {
        if (!this.bundles.has(bundleId)) {
            this.bundles.set(bundleId, { bundleId, objs: new Map(), onAddedListeners: new react_use_listeners_1.Listeners(), onChangedListeners: new react_use_listeners_1.Listeners(), onRemovedListeners: new react_use_listeners_1.Listeners() });
        }
    }
    addMediaStream(bundleId, objId, stream, trackId) {
        if (this.logging)
            console.log('adding media stream', bundleId, objId, stream, trackId);
        this.addMediaStreamObject(bundleId, objId, exports.makeMediaId(bundleId, objId), MediaType.STREAM, StreamSubType.REMOTE, stream, null, new Set(trackId));
    }
    addLocalCameraStream(bundleId, objId, stream) {
        if (this.logging)
            console.log('adding local camera stream', bundleId, objId, stream);
        const trackIds = new Set(stream.getTracks().map(track => track.id));
        this.addMediaStreamObject(bundleId, objId, exports.makeMediaId(bundleId, objId), MediaType.STREAM, StreamSubType.LOCAL_CAMERA, stream, null, trackIds);
    }
    addLocalScreenStream(bundleId, objId, stream) {
        if (this.logging)
            console.log('adding local screen stream', bundleId, objId, stream);
        const trackIds = new Set(stream.getTracks().map(track => track.id));
        this.addMediaStreamObject(bundleId, objId, exports.makeMediaId(bundleId, objId), MediaType.STREAM, StreamSubType.LOCAL_SCREEN, stream, null, trackIds);
    }
    addMediaStreamObject(bundleId, objId, id, type, subType, stream, videoOutput, trackIds) {
        this.initBundleIfNecessary(bundleId);
        const bundle = this.bundles.get(bundleId);
        if (bundle.objs.has(objId)) {
            if (trackIds.size > 0) {
                const streamTrackIds = bundle.objs.get(objId).trackIds;
                trackIds.forEach(trackId => streamTrackIds.add(trackId));
            }
            return;
        }
        const mediaObject = {
            id, bundleId, objId, type, subType, stream, videoOutput, trackIds
        };
        bundle.objs.set(objId, mediaObject);
        stream.onaddtrack = ((_e) => {
            if (this.logging)
                console.log('track was added', bundleId, objId, stream);
            this.notifyBundleOnChange(bundleId, objId, mediaObject);
        });
        stream.onremovetrack = ((_e) => {
            if (this.logging)
                console.log('track was removed', bundleId, objId, stream);
            if (stream.getTracks().length == 0)
                this.removeMediaObject(bundleId, objId);
            this.notifyBundleOnChange(bundleId, objId, mediaObject);
        });
        this.notifyBundleOnAdd(bundleId, objId, mediaObject);
    }
    notifyBundleOnAdd(bundleId, objId, mediaObject) {
        if (!this.bundles.has(bundleId))
            return;
        const bundle = this.bundles.get(bundleId);
        bundle.onAddedListeners.getCallbacks().forEach(listener => listener(bundleId, objId, mediaObject));
    }
    notifyBundleOnChange(bundleId, objId, mediaObject) {
        if (!this.bundles.has(bundleId))
            return;
        const bundle = this.bundles.get(bundleId);
        bundle.onChangedListeners.getCallbacks().forEach(listener => listener(bundleId, objId, mediaObject));
    }
    notifyBundleOnRemove(bundleId, objId, mediaObject) {
        if (!this.bundles.has(bundleId))
            return;
        const bundle = this.bundles.get(bundleId);
        bundle.onRemovedListeners.getCallbacks().forEach(listener => listener(bundleId, objId, mediaObject));
    }
    removeMediaObject(bundleId, objId) {
        if (this.logging)
            console.log('remove media object', bundleId, objId);
        if (!this.bundles.has(bundleId))
            return;
        const bundle = this.bundles.get(bundleId);
        if (!bundle.objs.has(objId))
            return;
        const obj = bundle.objs.get(objId);
        this.stopStream(bundleId, objId);
        bundle.objs.delete(objId);
        this.notifyBundleOnRemove(bundleId, objId, obj);
    }
    stopStream(bundleId, objId) {
        if (this.logging)
            console.log('stopping stream', bundleId, objId);
        if (!this.bundles.has(bundleId))
            return;
        const bundle = this.bundles.get(bundleId);
        if (!bundle.objs.has(objId))
            return;
        const obj = bundle.objs.get(objId);
        // stop stream in case it's of type STREAM
        if (obj.type !== MediaType.STREAM)
            return;
        const mediaObject = obj;
        mediaObject.stream.getTracks().forEach(track => track.stop());
    }
    destroyBundle(bundleId) {
        if (this.logging)
            console.log('destroying bundle', bundleId);
        const bundle = this.bundles.get(bundleId);
        bundle.objs.forEach((_obj, objId) => {
            this.removeMediaObject(bundleId, objId);
        });
        this.bundles.delete(bundleId);
    }
    connectStreamToOutput(bundleId, objId, outputId) {
        if (this.logging)
            console.log('connecting stream to output', bundleId, objId, outputId);
        if (!this.bundles.has(bundleId))
            throw new Error("bundle with id: " + bundleId + " is not available");
        if (!this.videoOutputs.has(outputId))
            throw new Error("output with id: " + outputId + " is not available");
        const bundle = this.bundles.get(bundleId);
        if (!bundle.objs.has(objId))
            throw new Error("stream with id: " + objId + " is not available");
        const mediaObject = bundle.objs.get(objId);
        mediaObject.videoOutput = outputId;
        if (mediaObject.type !== MediaType.STREAM)
            throw new Error("media object " + bundleId + " " + objId + " is not a stream");
        const stream = mediaObject.stream;
        const output = this.videoOutputs.get(outputId);
        //this.stopOutput(outputId);
        output.current.srcObject = stream;
        output.current.play();
    }
    connectAudioOutputToVideoOutput(audioId, outputId) {
        if (this.logging)
            console.log('connecting audio output to video output', audioId, outputId);
        if (!this.devices.audioOutput.has(audioId))
            throw new Error("audio output with id: " + audioId + " is not available");
        if (!this.videoOutputs.has(outputId))
            throw new Error("output with id: " + outputId + " is not available");
        const audio = this.devices.audioOutput.get(audioId).info;
        const output = this.videoOutputs.get(outputId);
        const videoElement = output.current;
        this.audioConnections.set(outputId, audioId);
        videoElement.setSinkId(audio.deviceId);
    }
    listenToBundle(bundleId, onAddedListener, onChangedListener, onRemovedListener) {
        this.initBundleIfNecessary(bundleId);
        const bundle = this.bundles.get(bundleId);
        // immediately transmit all streams we already have
        bundle.objs.forEach((mediaObject, objId) => onAddedListener(bundleId, objId, mediaObject));
        const unsubscribeAdded = bundle.onAddedListeners.addListener(onAddedListener);
        const unsubscribeChanged = bundle.onChangedListeners.addListener(onChangedListener);
        const unsubscribeRemoved = bundle.onRemovedListeners.addListener(onRemovedListener);
        return () => {
            unsubscribeAdded();
            unsubscribeChanged();
            unsubscribeRemoved();
        };
    }
    loadCameraStream(videoId, audioId, outputDeviceId) {
        if (this.logging)
            console.log('local camera stream', videoId, audioId);
        const constraints = { video: true, audio: true };
        if (videoId)
            Object.assign(constraints, { video: { deviceId: { exact: videoId } } });
        if (audioId)
            Object.assign(constraints, { audio: { deviceId: { exact: audioId } } });
        this.loadStream(MediaIdent.LOCAL, MediaIdent.CAMERA, false, constraints, outputDeviceId);
    }
    loadScreenStream(outputDeviceId) {
        this.loadStream(MediaIdent.LOCAL, MediaIdent.SCREEN, true, undefined, outputDeviceId);
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
    loadStream(bundleId, objId, screenshare, constraints, outputDeviceId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.logging)
                console.log('loading stream', bundleId, objId);
            this.initBundleIfNecessary(bundleId);
            let stream;
            try {
                if (screenshare) {
                    stream = yield this.getScreenFeed();
                    this.addLocalScreenStream(bundleId, objId, stream);
                    if (outputDeviceId)
                        this.connectStreamToOutput(bundleId, objId, outputDeviceId);
                }
                else {
                    stream = yield this.getVideoFeed(constraints);
                    this.addLocalCameraStream(bundleId, objId, stream);
                    if (outputDeviceId)
                        this.connectStreamToOutput(bundleId, objId, outputDeviceId);
                    // if we are here, we were able to get a stream and as such devices are available
                    this.refreshDevices();
                }
            }
            catch (e) {
                console.log("error loading stream", e);
            }
        });
    }
    getMediaObject(bundleId, objId) {
        if (!this.bundles.has(bundleId))
            return null;
        const bundle = this.bundles.get(bundleId);
        if (!bundle.objs.has(objId))
            return null;
        return bundle.objs.get(objId);
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
    listenForDevices(listener) {
        const unsubscribe = this.deviceListeners.addListener(listener);
        if (this.devices)
            listener(this.devices);
        return unsubscribe;
    }
    notifyDeviceListeners() {
        this.deviceListeners.forEach(listener => listener(this.devices));
    }
    refreshDevices() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.logging)
                console.log("refreshing devices");
            const devices = yield navigator.mediaDevices.enumerateDevices();
            console.log("received devices", devices);
            const videoDevices = new Map();
            const audioInputDevices = new Map();
            const audioOutputDevices = new Map();
            devices.forEach(device => {
                if (device.kind === "videoinput")
                    videoDevices.set(device.deviceId, { label: this.createDeviceLabel(videoDevices, device), info: device });
                if (device.kind === "audioinput")
                    audioInputDevices.set(device.deviceId, { label: this.createDeviceLabel(videoDevices, device), info: device });
                if (device.kind === "audiooutput")
                    audioOutputDevices.set(device.deviceId, { label: this.createDeviceLabel(videoDevices, device), info: device });
            });
            this.devices = {
                video: videoDevices,
                audioOutput: audioOutputDevices,
                audioInput: audioInputDevices,
            };
            this.notifyDeviceListeners();
        });
    }
    releaseDevices() {
        // FIXME
    }
    getMediaConstraints() {
        return navigator.mediaDevices.getSupportedConstraints();
    }
    removeMediaStreams(bundleId) {
        this.destroyBundle(bundleId);
    }
    getVideoOutputs() {
        return this.videoOutputs;
    }
}
exports.MediaDevicesManager = MediaDevicesManager;
//# sourceMappingURL=MediaDevicesManager.js.map