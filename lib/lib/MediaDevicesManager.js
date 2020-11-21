"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class MediaDevicesManager {
    constructor() {
        this.videoDevices = new Map();
        this.audioInputDevices = new Map();
        this.audioOutputDevices = new Map();
        this.videoOutputs = new Map();
        this.mediaStreams = new Map();
        this.videoStreamConnections = new Map();
        this.audioConnections = new Map();
        this.refreshDevices();
    }
    registerVideoOutput(id, ref) {
        this.videoOutputs.set(id, ref);
    }
    deregisterVideoOutput(id) {
        this.stopOutput(id);
        this.videoOutputs.delete(id);
    }
    registerMediaStream(id, stream, streamIdent, state, onloadListeners) {
        this.mediaStreams.set(id, { streamIdent: streamIdent || null, state: state || 2 /* READY */, stream, onloadListeners: onloadListeners || null });
    }
    deregisterMediaStream(id) {
        this.stopStream(id);
        this.mediaStreams.delete(id);
    }
    stopStream(streamId) {
        var _a, _b;
        const stream = this.mediaStreams.get(streamId);
        (_a = stream === null || stream === void 0 ? void 0 : stream.stream) === null || _a === void 0 ? void 0 : _a.getTracks().forEach(track => track.stop());
        (_b = stream === null || stream === void 0 ? void 0 : stream.stream) === null || _b === void 0 ? void 0 : _b.stop();
    }
    stopOutput(outputId) {
        if (!this.videoOutputs.has(outputId))
            throw new Error("output with id: " + outputId + " is not available");
        const output = this.videoOutputs.get(outputId);
        if (this.videoStreamConnections.has(outputId)) {
            const oldStreamId = this.videoStreamConnections.get(outputId);
            this.stopStream(oldStreamId);
        }
    }
    connectStreamToOutput(streamId, outputId) {
        if (!this.mediaStreams.has(streamId))
            throw new Error("stream with id: " + streamId + " is not available");
        if (!this.videoOutputs.has(outputId))
            throw new Error("output with id: " + outputId + " is not available");
        const videoStream = this.mediaStreams.get(streamId);
        if (!this.mediaStreams.get(streamId).stream)
            throw new Error("stream " + streamId + " is invalid");
        const stream = this.mediaStreams.get(streamId).stream;
        const output = this.videoOutputs.get(outputId);
        this.stopOutput(outputId);
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
    notifyOnLoad(streamId) {
        var _a;
        if (!this.mediaStreams.has(streamId))
            throw new Error("stream with id: " + streamId + " is not available");
        const stream = this.mediaStreams.get(streamId);
        (_a = stream.onloadListeners) === null || _a === void 0 ? void 0 : _a.forEach(onload => onload(stream.stream));
    }
    getStream(id, onload) {
        const stream = this.mediaStreams.get(id);
        const state = stream.state;
        if (state === 0 /* ERROR */)
            onload(undefined);
        if (state === 2 /* READY */)
            onload(stream.stream);
        if (state === 1 /* FETCHING */) {
            if (!stream.onloadListeners)
                stream.onloadListeners = [onload];
            else
                stream.onloadListeners.push(onload);
        }
        ;
    }
    loadCameraStream(id, videoId, audioId, outputId, onload) {
        const constraints = {
            audio: { deviceId: audioId ? { exact: audioId } : undefined },
            video: { deviceId: videoId ? { exact: videoId } : undefined }
        };
        this.loadStream(id, videoId, audioId, outputId, onload, constraints, navigator.mediaDevices.getUserMedia);
    }
    loadScreenStream(id, outputId, onload) {
        const mediaDevices = navigator.mediaDevices;
        this.loadStream(id, null, null, outputId, onload, undefined, mediaDevices.getDisplayMedia);
    }
    loadStream(id, videoId, audioId, outputId, onload, constraints, streamFunction) {
        const streamIdent = videoId + "-" + audioId + "-" + outputId;
        if (this.mediaStreams.has(id)) {
            const stream = this.mediaStreams.get(id);
            if (stream.streamIdent === streamIdent) {
                this.getStream(id, onload);
                return;
            }
            else {
                if (stream.state !== 1 /* FETCHING */) {
                    this.registerMediaStream(id, undefined, streamIdent, 1 /* FETCHING */, [onload]);
                }
            }
        }
        else {
            this.registerMediaStream(id, undefined, streamIdent, 1 /* FETCHING */, [onload]);
        }
        streamFunction(constraints).then((stream) => {
            const videoStream = this.mediaStreams.get(id);
            if (videoStream.streamIdent !== streamIdent)
                return;
            this.registerMediaStream(id, stream, streamIdent, 2 /* READY */);
            this.connectStreamToOutput(id, outputId);
            this.notifyOnLoad(id);
        }).catch((e) => {
            const videoStream = this.mediaStreams.get(id);
            if (videoStream.streamIdent !== streamIdent)
                return;
            this.registerMediaStream(id, undefined, streamIdent, 0 /* ERROR */);
            this.notifyOnLoad(id);
        });
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
}
exports.MediaDevicesManager = MediaDevicesManager;
