import { MutableRefObject } from "react";
import { Listeners } from "react-use-listeners";
import { UnsubscribeCallback } from "react-use-listeners/lib/lib/Listeners";
export declare enum MediaIdent {
    LOCAL = "LOCAL",
    CAMERA = "CAMERA",
    SCREEN = "SCREEN"
}
export declare type MediaDevice = {
    label: string;
    info: MediaDeviceInfo;
};
export declare type VideoStreamBundle = {
    bundleId: string;
    streams: Map<string, MediaStream>;
    onStreamAddedListeners: Listeners<(bundleId: string, streamId: string, stream: MediaStream) => void>;
    onStreamRemovedListeners: Listeners<(bundleId: string, streamId: string) => void>;
};
export interface MediaStreamProvider {
    addMediaStream(bundleId: string, streamId: string, stream: MediaStream): void;
    removeMediaStream(bundleId: string, streamId: string): void;
    removeMediaStreams(bundleId: string): void;
}
export declare class MediaDevicesManager implements MediaStreamProvider {
    videoDevices: Map<string, MediaDevice>;
    audioInputDevices: Map<string, MediaDevice>;
    audioOutputDevices: Map<string, MediaDevice>;
    videoOutputs: Map<string, MutableRefObject<HTMLVideoElement>>;
    bundles: Map<string, VideoStreamBundle>;
    videoStreamConnections: Map<string, string>;
    audioConnections: Map<string, string>;
    constructor();
    registerVideoOutput(id: string, ref: MutableRefObject<HTMLVideoElement>, bundleId?: string, streamId?: string): void;
    deregisterVideoOutput(id: string): void;
    private initBundleIfNecessary;
    addMediaStream(bundleId: string, streamId: string, stream: MediaStream): void;
    private trackRemoved;
    removeMediaStream(bundleId: string, streamId: string): void;
    destroyBundle(bundleId: string): void;
    stopBundle(bundleId: string): void;
    connectStreamToOutput(bundleId: string, streamId: string, outputId: string): void;
    connectAudioOutputToVideoOutput(audioId: string, outputId: string): void;
    listenToBundle(bundleId: string, onStreamAddedListener: (bundleId: string, streamId: string, stream: MediaStream) => void, onStreamRemovedListener: (bundleId: string, streamId: string) => void): UnsubscribeCallback;
    loadCameraStream(videoId: string, audioId: string, outputId: string): void;
    loadScreenStream(bundleId: string, streamId: string, outputId: string): void;
    private getVideoFeed;
    private getScreenFeed;
    private loadStream;
    getLocalBundle(): VideoStreamBundle;
    private createDeviceLabel;
    refreshDevices(): void;
    releaseDevices(): void;
    getVideoDevices(): Map<string, MediaDevice>;
    getAudioInputDevices(): Map<string, MediaDevice>;
    getAudioOutputDevices(): Map<string, MediaDevice>;
    getMediaConstraints(): MediaTrackSupportedConstraints;
    removeMediaStreams(bundleId: string): void;
}
