import { MutableRefObject } from "react";
import { Listeners } from "react-use-listeners";
import { UnsubscribeCallback } from "react-use-listeners";
export declare enum MediaIdent {
    LOCAL = "LOCAL",
    CAMERA = "CAMERA",
    SCREEN = "SCREEN"
}
export declare type MediaDevice = {
    label: string;
    info: MediaDeviceInfo;
};
export declare enum MediaType {
    STREAM = 0,
    DATA = 1
}
export declare enum StreamSubType {
    LOCAL_CAMERA = 0,
    LOCAL_SCREEN = 1,
    REMOTE = 2
}
export interface MediaObject {
    type: MediaType;
    id: string;
    bundleId: string;
    objId: string;
}
export interface MediaStreamObject extends MediaObject {
    subType: StreamSubType;
    stream: MediaStream;
}
export interface MediaBundle {
    bundleId: string;
    objs: Map<string, MediaObject>;
    onAddedListeners: Listeners<(bundleId: string, objId: string, obj: MediaObject) => void>;
    onRemovedListeners: Listeners<(bundleId: string, objId: string) => void>;
}
export interface MediaObjectProvider {
    addMediaStream(bundleId: string, objId: string, stream: MediaStream): void;
    removeMediaStream(bundleId: string, objId: string): void;
    removeMediaStreams(bundleId: string): void;
}
export declare const makeMediaId: (bundleId: string, streamId: string) => string;
export declare class MediaDevicesManager implements MediaObjectProvider {
    videoDevices: Map<string, MediaDevice>;
    audioInputDevices: Map<string, MediaDevice>;
    audioOutputDevices: Map<string, MediaDevice>;
    videoOutputs: Map<string, MutableRefObject<HTMLVideoElement>>;
    bundles: Map<string, MediaBundle>;
    videoStreamConnections: Map<string, string>;
    audioConnections: Map<string, string>;
    constructor();
    registerVideoOutput(id: string, ref: MutableRefObject<HTMLVideoElement>, bundleId?: string, objId?: string): void;
    deregisterVideoOutput(id: string): void;
    private initBundleIfNecessary;
    addMediaStream(bundleId: string, objId: string, stream: MediaStream): void;
    addLocalCameraStream(bundleId: string, objId: string, stream: MediaStream): void;
    addLocalScreenStream(bundleId: string, objId: string, stream: MediaStream): void;
    private addMediaStreamObject;
    private trackRemoved;
    removeMediaStream(bundleId: string, objId: string): void;
    destroyBundle(bundleId: string): void;
    stopBundle(bundleId: string): void;
    connectStreamToOutput(bundleId: string, objId: string, outputId: string): void;
    connectAudioOutputToVideoOutput(audioId: string, outputId: string): void;
    listenToBundle(bundleId: string, onAddedListener: (bundleId: string, objId: string, mediaObject: MediaObject) => void, onRemovedListener: (bundleId: string, objId: string) => void): UnsubscribeCallback;
    loadCameraStream(videoId: string, audioId: string): void;
    loadScreenStream(): void;
    private getVideoFeed;
    private getScreenFeed;
    private loadStream;
    getLocalBundle(): MediaBundle;
    private createDeviceLabel;
    refreshDevices(): void;
    releaseDevices(): void;
    getVideoDevices(): Map<string, MediaDevice>;
    getAudioInputDevices(): Map<string, MediaDevice>;
    getAudioOutputDevices(): Map<string, MediaDevice>;
    getMediaConstraints(): MediaTrackSupportedConstraints;
    removeMediaStreams(bundleId: string): void;
}
