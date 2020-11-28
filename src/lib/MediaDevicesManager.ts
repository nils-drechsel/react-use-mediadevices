import { MutableRefObject } from "react";
import { Listeners } from "react-use-listeners";
import { UnsubscribeCallback } from "react-use-listeners/lib/lib/Listeners";

export enum MediaIdent {
    LOCAL = 'LOCAL',
    CAMERA = 'CAMERA',
    SCREEN = 'SCREEN',
}

export type MediaDevice = {
    label: string;
    info: MediaDeviceInfo;
}

export enum MediaType {
    STREAM,
    DATA
}

export enum StreamSubType {
    LOCAL_CAMERA,
    LOCAL_SCREEN,
    REMOTE
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
    bundleId: string,
    objs: Map<string, MediaObject>;
    onAddedListeners: Listeners<(bundleId: string, objId: string, obj: MediaObject) => void>;
    onRemovedListeners: Listeners<(bundleId: string, objId: string) => void>;
}


export interface MediaObjectProvider {
    addMediaStream(bundleId: string, objId: string, stream: MediaStream): void;
    removeMediaStream(bundleId: string, objId: string): void;
    removeMediaStreams(bundleId: string): void;
}

export class MediaDevicesManager implements MediaObjectProvider {

    videoDevices: Map<string, MediaDevice> = new Map();
    audioInputDevices: Map<string, MediaDevice> = new Map();
    audioOutputDevices: Map<string, MediaDevice> = new Map();
    videoOutputs: Map<string, MutableRefObject<HTMLVideoElement>> = new Map();

    bundles: Map<string, MediaBundle> = new Map();

    videoStreamConnections: Map<string, string> = new Map();
    audioConnections: Map<string, string> = new Map();
    

    constructor() {
        this.initBundleIfNecessary(MediaIdent.LOCAL);
        this.refreshDevices();
        navigator.mediaDevices.ondevicechange = (_event: Event) => this.refreshDevices();
    }

    registerVideoOutput(id: string, ref: MutableRefObject<HTMLVideoElement>, bundleId?: string, objId?: string) {
        this.videoOutputs.set(id, ref);
        if (bundleId && objId) {
            this.connectStreamToOutput(bundleId, objId, id);
        }
    }

    deregisterVideoOutput(id: string) {
        //this.stopOutput(id);
        this.videoOutputs.delete(id);
    }

    private initBundleIfNecessary(bundleId: string) {
        if (!this.bundles.has(bundleId)) {
            this.bundles.set(bundleId, {bundleId, objs: new Map(), onAddedListeners: new Listeners(), onRemovedListeners: new Listeners()});
        }
    }

    private makeMediaId(bundleId: string, streamId: string) {
        return bundleId + '/' + streamId;
    }

    addMediaStream(bundleId: string, objId: string, stream: MediaStream) {
        this.addMediaStreamObject(bundleId, objId, { id: this.makeMediaId(bundleId, objId), bundleId, objId, type: MediaType.STREAM, subType: StreamSubType.REMOTE, stream });
    }

    addLocalCameraStream(bundleId: string, objId: string, stream: MediaStream) {
        this.addMediaStreamObject(bundleId, objId, { id: this.makeMediaId(bundleId, objId), bundleId, objId, type: MediaType.STREAM, subType: StreamSubType.LOCAL_CAMERA, stream });
    }

    addLocalScreenStream(bundleId: string, objId: string, stream: MediaStream) {
        this.addMediaStreamObject(bundleId, objId, { id: this.makeMediaId(bundleId, objId), bundleId, objId, type: MediaType.STREAM, subType: StreamSubType.LOCAL_SCREEN, stream });
    }

    private addMediaStreamObject(bundleId: string, objId: string, mediaObject: MediaStreamObject) {
        this.initBundleIfNecessary(bundleId);
        const bundle = this.bundles.get(bundleId)!;

        bundle.objs.set(objId, mediaObject);
        const stream = mediaObject.stream;
        
        stream.onremovetrack = ((_e : MediaStreamTrackEvent) => this.trackRemoved(bundleId, objId));
        bundle.onAddedListeners.getCallbacks().forEach(listener => listener(bundleId, objId, mediaObject));
    }

    private trackRemoved(bundleId: string, objId: string) {
        if (!this.bundles.has(bundleId)) return;
        const bundle = this.bundles.get(bundleId)!;
        if (!bundle.objs.has(objId)) return;
        const mediaObject = bundle.objs.get(objId)!;
        if (mediaObject.type !== MediaType.STREAM) throw new Error("media object " + bundleId + " " + objId + " is not a stream");
        const stream = (mediaObject as MediaStreamObject).stream;
        if (stream.getTracks().length == 0) this.removeMediaStream(bundleId, objId);
        
}

    removeMediaStream(bundleId: string, objId: string) {
        if (!this.bundles.has(bundleId)) return;
        const bundle = this.bundles.get(bundleId)!;
        bundle.objs.delete(objId);
        bundle.onRemovedListeners.getCallbacks().forEach(listener => listener(bundleId, objId));
    }

    destroyBundle(bundleId: string) {
        this.stopBundle(bundleId);
        const bundle = this.bundles.get(bundleId)!;
        bundle.objs.forEach((_obj, objId) => {
            bundle.onRemovedListeners.getCallbacks().forEach(listener => listener(bundleId, objId));
        });
        this.bundles.delete(bundleId);
    }

    stopBundle(bundleId: string) {
        if (!this.bundles.has(bundleId)) return;
        const bundle = this.bundles.get(bundleId)!;
        bundle.objs.forEach(mediaObject => {

            if (mediaObject.type !== MediaType.STREAM) return;
            const stream = (mediaObject as MediaStreamObject).stream;

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

    connectStreamToOutput(bundleId: string, objId: string, outputId: string) {
        if (!this.bundles.has(bundleId)) throw new Error("bundle with id: " + bundleId + " is not available");
        if (!this.videoOutputs.has(outputId)) throw new Error("output with id: " + outputId + " is not available");

        const bundle: MediaBundle = this.bundles.get(bundleId)!; 

        if (!bundle.objs.has(objId)) throw new Error("stream with id: " + objId + " is not available");

        const mediaObject = bundle.objs.get(objId)!;

        if (mediaObject.type !== MediaType.STREAM) throw new Error("media object " + bundleId + " " + objId + " is not a stream");
        const stream = (mediaObject as MediaStreamObject).stream;        

        const output: MutableRefObject<HTMLVideoElement> = this.videoOutputs.get(outputId)!;

        //this.stopOutput(outputId);

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
    


    listenToBundle(bundleId: string, onAddedListener: (bundleId: string, objId: string, mediaObject: MediaObject) => void,
        onRemovedListener: (bundleId: string, objId: string) => void): UnsubscribeCallback {
        
        this.initBundleIfNecessary(bundleId);
        const bundle: MediaBundle = this.bundles.get(bundleId)!;
        // immediately transmit all streams we already have
        bundle.objs.forEach((mediaObject, objId) => onAddedListener(bundleId, objId, mediaObject));
        const unsubscribeAdded = bundle.onAddedListeners.addListener(onAddedListener);
        const unsubscribeRemoved = bundle.onRemovedListeners.addListener(onRemovedListener);

        return () => {
            unsubscribeAdded();
            unsubscribeRemoved();
        }

    }

    loadCameraStream(videoId: string, audioId: string) {
        const constraints = {
            audio: {deviceId: audioId ? {exact: audioId} : undefined},
            video: {deviceId: videoId ? {exact: videoId} : undefined}
        };
        this.loadStream(MediaIdent.LOCAL, MediaIdent.CAMERA, false, constraints);
    }

    loadScreenStream() {
        this.loadStream(MediaIdent.LOCAL, MediaIdent.SCREEN, true, undefined);
    }    

    private async getVideoFeed(constraints?: MediaStreamConstraints): Promise<MediaStream> {
        return navigator.mediaDevices.getUserMedia(constraints);
    }

    private async getScreenFeed(): Promise<MediaStream> {
        return (navigator.mediaDevices as any).mediaDevices.getDisplayMedia();
    }


    private async loadStream(bundleId: string, objId: string, screenshare: boolean, constraints?: MediaStreamConstraints | undefined) {
        if (this.bundles.has(bundleId)) this.stopBundle(bundleId);
        this.initBundleIfNecessary(bundleId);

        if (screenshare) {
            const stream: MediaStream = await this.getScreenFeed();
            this.addLocalScreenStream(bundleId, objId, stream);
        } else {
            const stream: MediaStream = await this.getVideoFeed(constraints);
            this.addLocalCameraStream(bundleId, objId, stream);
        }
    }


    getLocalBundle(): MediaBundle {
        return this.bundles.get(MediaIdent.LOCAL)!;
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

    removeMediaStreams(bundleId: string): void {
        this.destroyBundle(bundleId);
    }




}