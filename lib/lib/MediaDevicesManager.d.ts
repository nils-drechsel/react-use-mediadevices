import { MutableRefObject } from "react";
import { Listeners } from "react-use-listeners";
export declare enum SpecialMediaStream {
    LOCAL_CAMERA = 0,
    LOCAL_SCREEN = 1
}
export declare type MediaDevice = {
    label: string;
    info: MediaDeviceInfo;
};
export declare type VideoStreamBundle = {
    bundleId: string;
    streams: Map<string, MediaStream>;
    onloadListeners: Listeners<(bundle: VideoStreamBundle) => void>;
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
    localBundles: Set<string>;
    videoStreamConnections: Map<string, string>;
    audioConnections: Map<string, string>;
    constructor();
    registerVideoOutput(id: string, ref: MutableRefObject<HTMLVideoElement>): void;
    deregisterVideoOutput(id: string): void;
    private initBundleIfNecessary;
    addMediaStream(bundleId: string, streamId: string, stream: MediaStream): void;
    removeMediaStream(bundleId: string, streamId: string): void;
    destroyBundle(bundleId: string): void;
    stopBundle(bundleId: string): void;
    connectStreamToOutput(bundleId: string, streamId: string, outputId: string): void;
    connectAudioOutputToVideoOutput(audioId: string, outputId: string): void;
    private notifyOnLoad;
    listenToBundle(bundleId: string, callback: (bundle: VideoStreamBundle) => void): () => void;
    loadCameraStream(bundleId: string, streamId: string, videoId: string, audioId: string, outputId: string, onload: (bundle: VideoStreamBundle) => void): void;
    loadScreenStream(bundleId: string, streamId: string, outputId: string, onload: (bundle: VideoStreamBundle) => void): void;
    private getVideoFeed;
    private getScreenFeed;
    private loadStream;
    getLocalBundles(): Array<VideoStreamBundle>;
    private createDeviceLabel;
    refreshDevices(): void;
    releaseDevices(): void;
    getVideoDevices(): Map<string, MediaDevice>;
    getAudioInputDevices(): Map<string, MediaDevice>;
    getAudioOutputDevices(): Map<string, MediaDevice>;
    getMediaConstraints(): MediaTrackSupportedConstraints;
    removeMediaStreams(bundleId: string): void;
}
