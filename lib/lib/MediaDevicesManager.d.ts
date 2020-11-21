import { MutableRefObject } from "react";
export declare type MediaDevice = {
    label: string;
    info: MediaDeviceInfo;
};
export declare const enum StreamState {
    ERROR = 0,
    FETCHING = 1,
    READY = 2
}
export declare type VideoStream = {
    state: StreamState;
    stream: MediaStream | undefined;
    onloadListeners: Array<(stream: MediaStream | undefined) => void> | null;
    streamIdent: string | null;
};
export declare class MediaDevicesManager {
    videoDevices: Map<string, MediaDevice>;
    audioInputDevices: Map<string, MediaDevice>;
    audioOutputDevices: Map<string, MediaDevice>;
    videoOutputs: Map<string, MutableRefObject<HTMLVideoElement>>;
    mediaStreams: Map<string, VideoStream>;
    videoStreamConnections: Map<string, string>;
    audioConnections: Map<string, string>;
    constructor();
    registerVideoOutput(id: string, ref: MutableRefObject<HTMLVideoElement>): void;
    deregisterVideoOutput(id: string): void;
    registerMediaStream(id: string, stream: MediaStream | undefined, streamIdent?: string | null, state?: StreamState, onloadListeners?: Array<(stream: MediaStream | undefined) => void> | null): void;
    deregisterMediaStream(id: string): void;
    stopStream(streamId: string): void;
    stopOutput(outputId: string): void;
    connectStreamToOutput(streamId: string, outputId: string): void;
    connectAudioOutputToVideoOutput(audioId: string, outputId: string): void;
    private notifyOnLoad;
    getStream(id: string, onload: (stream: MediaStream | undefined) => void): void;
    loadCameraStream(id: string, videoId: string, audioId: string, outputId: string, onload: (stream: MediaStream | undefined) => void): void;
    loadScreenStream(id: string, outputId: string, onload: (stream: MediaStream | undefined) => void): void;
    private loadStream;
    private createDeviceLabel;
    refreshDevices(): void;
    releaseDevices(): void;
    getVideoDevices(): Map<string, MediaDevice>;
    getAudioInputDevices(): Map<string, MediaDevice>;
    getAudioOutputDevices(): Map<string, MediaDevice>;
    getMediaConstraints(): MediaTrackSupportedConstraints;
}
