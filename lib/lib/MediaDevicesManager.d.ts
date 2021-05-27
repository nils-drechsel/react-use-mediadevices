import { MutableRefObject } from "react";
import { DataListeners, ListenerEvent, IdListeners } from "react-use-listeners";
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
    bundleId: string;
    objId: string;
    videoOutput: string | null;
}
export interface MediaStreamObject extends MediaObject {
    subType: StreamSubType;
    stream: MediaStream;
    width: number | null;
    height: number | null;
}
export interface MediaBundle {
    bundleId: string;
    objs: Map<string, MediaObject>;
}
export declare const makeMediaId: (bundleId: string, streamId: string) => string;
export interface Devices {
    video: Map<string, MediaDevice>;
    audioInput: Map<string, MediaDevice>;
    audioOutput: Map<string, MediaDevice>;
}
export declare class MediaDevicesManager {
    devices: Devices | null;
    videoOutputs: Map<string, MutableRefObject<HTMLVideoElement>>;
    bundles: Map<string, MediaBundle>;
    videoStreamConnections: Map<string, string>;
    audioConnections: Map<string, string>;
    deviceListeners: DataListeners<Devices>;
    anyBundleListeners: IdListeners;
    bundleListeners: IdListeners;
    logging: boolean;
    constructor(logging?: boolean);
    registerVideoOutput(id: string, ref: MutableRefObject<HTMLVideoElement>, bundleId?: string, objId?: string): void;
    deregisterVideoOutput(id: string): void;
    private initBundleIfNecessary;
    addMediaStream(bundleId: string, objId: string, stream: MediaStream): void;
    addLocalCameraStream(bundleId: string, objId: string, stream: MediaStream): void;
    addLocalScreenStream(bundleId: string, objId: string, stream: MediaStream): void;
    updateStreamDimensions(bundleId: string, objId: string, width: number, height: number): void;
    private getStreamDimensions;
    private addMediaStreamObject;
    removeMediaObject(bundleId: string, objId: string): void;
    stopStream(bundleId: string, objId: string): void;
    destroyBundle(bundleId: string): void;
    connectStreamToOutput(bundleId: string, objId: string, outputId: string): Promise<void>;
    connectAudioOutputToVideoOutput(audioId: string, outputId: string): void;
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
    listenForAnyBundle(listener: (bundleId: string, event: ListenerEvent) => void): UnsubscribeCallback;
    listenForBundle(bundleId: string, listener: (objId: string, event: ListenerEvent) => void): () => void;
    listenForObject(bundleId: string, objectId: string, listener: (event: ListenerEvent) => void): UnsubscribeCallback;
    refreshDevices(): Promise<void>;
    destroy(): void;
    getMediaConstraints(): MediaTrackSupportedConstraints;
    removeMediaStreams(bundleId: string): void;
    getVideoOutputs(): Map<string, MutableRefObject<HTMLVideoElement>>;
}
