import { Dispatch, MutableRefObject } from "react";


export type MediaDevice = {
    label: string;
    info: MediaDeviceInfo;
}

export const enum StreamState  {
    ERROR,
    FETCHING,
    READY,
}

export type VideoStream = {
    state: StreamState;
    stream: MediaStream | undefined;
    onloadListeners: Array<(stream: MediaStream | undefined) => void> | null;
    streamIdent: string | null;
}

export class MediaDevicesManager {

    videoDevices: Map<string, MediaDevice> = new Map();
    audioInputDevices: Map<string, MediaDevice> = new Map();
    audioOutputDevices: Map<string, MediaDevice> = new Map();
    videoOutputs: Map<string, MutableRefObject<HTMLVideoElement>> = new Map();

    mediaStreams: Map<string, VideoStream> = new Map();

    videoStreamConnections: Map<string, string> = new Map();
    audioConnections: Map<string, string> = new Map();
    

    constructor() {
        this.refreshDevices();
    }

    registerVideoOutput(id: string, ref: MutableRefObject<HTMLVideoElement>) {
        this.videoOutputs.set(id, ref);
    }

    deregisterVideoOutput(id: string) {
        this.stopOutput(id);
        this.videoOutputs.delete(id);
    }

    registerMediaStream(id: string, stream: MediaStream | undefined, streamIdent?: string | null, state?: StreamState, onloadListeners?: Array<(stream: MediaStream | undefined) => void> | null) {
        this.mediaStreams.set(id, { streamIdent: streamIdent || null, state: state || StreamState.READY, stream, onloadListeners: onloadListeners || null });
    }

    deregisterMediaStream(id: string) {
        this.stopStream(id);
        this.mediaStreams.delete(id);
    }

    stopStream(streamId: string) {
            const stream = this.mediaStreams.get(streamId);
            stream?.stream?.getTracks().forEach(track => track.stop());
            stream?.stream?.stop();
    }

    stopOutput(outputId: string) {
        if (!this.videoOutputs.has(outputId)) throw new Error("output with id: " + outputId + " is not available");
            const output: MutableRefObject<HTMLVideoElement> = this.videoOutputs.get(outputId)!;

        if (this.videoStreamConnections.has(outputId)) {
            const oldStreamId = this.videoStreamConnections.get(outputId)!;
            this.stopStream(oldStreamId);
        }
    }

    connectStreamToOutput(streamId: string, outputId: string) {
        if (!this.mediaStreams.has(streamId)) throw new Error("stream with id: " + streamId + " is not available");
        if (!this.videoOutputs.has(outputId)) throw new Error("output with id: " + outputId + " is not available");

        const videoStream: VideoStream = this.mediaStreams.get(streamId)!;

        if (!this.mediaStreams.get(streamId)!.stream) throw new Error("stream " + streamId + " is invalid");

        const stream: MediaStream = this.mediaStreams.get(streamId)!.stream!;
        const output: MutableRefObject<HTMLVideoElement> = this.videoOutputs.get(outputId)!;

        this.stopOutput(outputId);

        output.current.srcObject = stream;
        output.current.play();
    }

    connectAudioOutputToVideoOutput(audioId: string, outputId: string) {
        if (!this.audioOutputDevices.has(audioId)) throw new Error("audio output with id: " + audioId + " is not available");
        if (!this.videoOutputs.has(outputId)) throw new Error("output with id: " + outputId + " is not available");

        const audio: MediaDeviceInfo = this.audioOutputDevices.get(audioId)!.info;
        const output: MutableRefObject<HTMLVideoElement> = this.videoOutputs.get(outputId)!;
        const videoElement: any = output.current;

        this.audioConnections.set(outputId, audioId);

        videoElement.setSinkId(audio.deviceId);

    }
    
    private notifyOnLoad(streamId: string) {
        if (!this.mediaStreams.has(streamId)) throw new Error("stream with id: " + streamId + " is not available");
        const stream: VideoStream = this.mediaStreams.get(streamId)!;
        stream.onloadListeners?.forEach(onload => onload(stream.stream));
    }


    getStream(id: string, onload: (stream: MediaStream | undefined) => void) {
        const stream: VideoStream = this.mediaStreams.get(id)!;
        const state: StreamState = stream.state;
        if (state === StreamState.ERROR) onload(undefined);
        if (state === StreamState.READY) onload(stream.stream);
        if (state === StreamState.FETCHING) {
            if (!stream.onloadListeners) stream.onloadListeners = [onload];
            else stream.onloadListeners.push(onload);
        };
    }

    loadCameraStream(id: string, videoId: string, audioId: string, outputId: string, onload: (stream: MediaStream | undefined) => void) {
        const constraints = {
            audio: {deviceId: audioId ? {exact: audioId} : undefined},
            video: {deviceId: videoId ? {exact: videoId} : undefined}
        };
        this.loadStream(id, videoId, audioId, outputId, onload, constraints, false);
    }

    loadScreenStream(id: string, outputId: string, onload: (stream: MediaStream | undefined) => void) {
        const mediaDevices = navigator.mediaDevices as any;
        this.loadStream(id, null, null, outputId, onload, undefined, true);
    }    

    private loadStream(id: string, videoId: string | null, audioId: string | null, outputId: string, onload: (stream: MediaStream | undefined) => void, constraints: MediaStreamConstraints | undefined, screenshare: boolean) {
        
        const streamIdent = videoId + "-" + audioId + "-" + outputId;

        if (this.mediaStreams.has(id)) {

            const stream: VideoStream = this.mediaStreams.get(id)!;

            if (stream.streamIdent === streamIdent) {
                this.getStream(id, onload);
                return;
            } else {
                if (stream.state !== StreamState.FETCHING) {
                    this.registerMediaStream(id, undefined, streamIdent, StreamState.FETCHING, [onload]);
                }
            }
            
        } else {
            this.registerMediaStream(id, undefined, streamIdent, StreamState.FETCHING, [onload]);
        }

        const promise: Promise<MediaStream> = screenshare ? (navigator.mediaDevices as any).getDisplayMedia() : navigator.mediaDevices.getUserMedia(constraints);

        promise.then((stream: MediaStream) => {
            const videoStream: VideoStream = this.mediaStreams.get(id)!;
            if (videoStream.streamIdent !== streamIdent) return;
            this.registerMediaStream(id, stream, streamIdent, StreamState.READY);
            this.connectStreamToOutput(id, outputId);
            this.notifyOnLoad(id);
        }).catch((e: Error) => {
            const videoStream: VideoStream = this.mediaStreams.get(id)!;
            if (videoStream.streamIdent !== streamIdent) return;
            this.registerMediaStream(id, undefined, streamIdent, StreamState.ERROR);
            this.notifyOnLoad(id);
        });
    }




    private createDeviceLabel(map: Map<string, MediaDevice>, info: MediaDeviceInfo): string {
        if (info.label) return info.label;
        if (info.kind === "videoinput") return "Camera " + (map.size + 1);
        if (info.kind === "audioinput") return "Microphone " + (map.size + 1);
        if (info.kind === "audiooutput") return "Speaker " + (map.size + 1);
        throw new Error("unknown device " + info);
    }

    refreshDevices() {
        navigator.mediaDevices.enumerateDevices().then(devices => {
            this.videoDevices.clear();
            this.audioInputDevices.clear();
            this.audioOutputDevices.clear();

            devices.forEach(device => {
                if (device.kind === "videoinput") this.videoDevices.set(device.deviceId, { label: this.createDeviceLabel(this.videoDevices, device), info: device });
                if (device.kind === "audioinput") this.audioInputDevices.set(device.deviceId, { label: this.createDeviceLabel(this.videoDevices, device), info: device });
                if (device.kind === "audiooutput") this.audioOutputDevices.set(device.deviceId, { label: this.createDeviceLabel(this.videoDevices, device), info: device });
            })
        });
    }

    releaseDevices() {
        // FIXME
    }


    getVideoDevices(): Map<string, MediaDevice> {
        return this.videoDevices;
    }

    getAudioInputDevices(): Map<string, MediaDevice> {
        return this.audioInputDevices;
    }

    getAudioOutputDevices(): Map<string, MediaDevice> {
        return this.audioOutputDevices;
    }

    getMediaConstraints() : MediaTrackSupportedConstraints {
        return navigator.mediaDevices.getSupportedConstraints();
    }












}