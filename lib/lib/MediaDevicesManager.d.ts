import { MutableRefObject } from "react";
import { DataListeners, Listeners } from "react-use-listeners";
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
    videoOutput: string | null;
    label: string | null;
}
export interface MediaStreamObject extends MediaObject {
    subType: StreamSubType;
    stream: MediaStream;
    trackIds: Set<string>;
    width: number | null;
    height: number | null;
}
interface UnresolvedLabel {
    trackIds: Array<string>;
    label: string;
}
export interface MediaBundle {
    bundleId: string;
    objs: Map<string, MediaObject>;
    unresolvedLabels: Array<UnresolvedLabel>;
    onAddedListeners: Listeners<(bundleId: string, objId: string, obj: MediaObject) => void>;
    onChangedListeners: Listeners<(bundleId: string, objId: string, obj: MediaObject) => void>;
    onRemovedListeners: Listeners<(bundleId: string, objId: string, obj: MediaObject) => void>;
}
export interface MediaObjectProvider {
    addMediaStream(bundleId: string, objId: string, stream: MediaStream, trackId: string): void;
    removeMediaObject(bundleId: string, objId: string): void;
    setTrackLabels(bundleId: string, trackIds: Array<string>, label: string): void;
}
export declare const makeMediaId: (bundleId: string, streamId: string) => string;
export interface Devices {
    video: Map<string, MediaDevice>;
    audioInput: Map<string, MediaDevice>;
    audioOutput: Map<string, MediaDevice>;
}
export declare class MediaDevicesManager implements MediaObjectProvider {
    devices: Devices | null;
    videoOutputs: Map<string, MutableRefObject<HTMLVideoElement>>;
    bundles: Map<string, MediaBundle>;
    videoStreamConnections: Map<string, string>;
    audioConnections: Map<string, string>;
    deviceListeners: DataListeners<Devices>;
    logging: boolean;
    constructor(logging?: boolean);
    registerVideoOutput(id: string, ref: MutableRefObject<HTMLVideoElement>, bundleId?: string, objId?: string): void;
    deregisterVideoOutput(id: string): void;
    private initBundleIfNecessary;
    setTrackLabels(bundleId: string, trackIds: Array<string>, label: string): void;
    resolveUnresolvedLabels(bundleId: string, notify: boolean): void;
    addMediaStream(bundleId: string, objId: string, stream: MediaStream, trackId: string): void;
    addLocalCameraStream(bundleId: string, objId: string, stream: MediaStream): void;
    addLocalScreenStream(bundleId: string, objId: string, stream: MediaStream): void;
    updateStreamDimensions(bundleId: string, objId: string, width: number, height: number): void;
    private getStreamDimensions;
    private addMediaStreamObject;
    private notifyBundleOnAdd;
    private notifyBundleOnChange;
    private notifyBundleOnRemove;
    removeMediaObject(bundleId: string, objId: string): void;
    stopStream(bundleId: string, objId: string): void;
    destroyBundle(bundleId: string): void;
    connectStreamToOutput(bundleId: string, objId: string, outputId: string): Promise<void>;
    connectAudioOutputToVideoOutput(audioId: string, outputId: string): void;
    listenToBundle(bundleId: string, onAddedListener: (bundleId: string, objId: string, mediaObject: MediaObject) => void, onChangedListener: (bundleId: string, objId: string, mediaObject: MediaObject) => void, onRemovedListener: (bundleId: string, objId: string, mediaObject: MediaObject) => void): UnsubscribeCallback;
    loadCameraStream(videoId: string | null, audioId: string | null, outputDeviceId?: string): void;
    loadScreenStream(outputDeviceId?: string): void;
    private getVideoFeed;
    private getScreenFeed;
    private loadStream;
    getMediaObject(bundleId: string, objId: string): MediaObject | null;
    getMediaBundle(bundleId: string): MediaBundle | null;
    private createDeviceLabel;
    listenForDevices(listener: (devices: Devices) => void): UnsubscribeCallback;
    notifyDeviceListeners(): void;
    refreshDevices(): Promise<void>;
    releaseDevices(): void;
    getMediaConstraints(): MediaTrackSupportedConstraints;
    removeMediaStreams(bundleId: string): void;
    getVideoOutputs(): Map<string, MutableRefObject<HTMLVideoElement>>;
}
export {};
