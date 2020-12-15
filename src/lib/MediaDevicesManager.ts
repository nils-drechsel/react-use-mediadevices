import { MutableRefObject } from "react";
import { DataListeners, Listeners } from "react-use-listeners";
import { UnsubscribeCallback } from "react-use-listeners";

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
    videoOutput: string | null;
    label: string | null;
}

export interface MediaStreamObject extends MediaObject {
    subType: StreamSubType;
    stream: MediaStream;
    trackIds: Set<string>;
    width: number | null;
    height: number | null;
}

interface UnresolvedLabel {
    trackIds: Array<string>,
    label: string,
}

export interface MediaBundle {
    bundleId: string,
    objs: Map<string, MediaObject>;
    unresolvedLabels: Array<UnresolvedLabel>;
    onAddedListeners: Listeners<(bundleId: string, objId: string, obj: MediaObject) => void>;
    onChangedListeners: Listeners<(bundleId: string, objId: string, obj: MediaObject) => void>;
    onRemovedListeners: Listeners<(bundleId: string, objId: string, obj: MediaObject) => void>;
}


export interface MediaObjectProvider {
    addMediaStream(bundleId: string, objId: string, stream: MediaStream, trackId: string): void;
    removeMediaObject(bundleId: string, objId: string): void;
    setTrackLabels(bundleId:string, trackIds: Array<string>, label: string): void;
}


export const makeMediaId = (bundleId: string, streamId: string): string => {
        return bundleId + '/' + streamId;
}


export interface Devices {
    video: Map<string, MediaDevice>;
    audioInput: Map<string, MediaDevice>;
    audioOutput: Map<string, MediaDevice>;
}

export class MediaDevicesManager implements MediaObjectProvider {

    devices: Devices | null = null;
    videoOutputs: Map<string, MutableRefObject<HTMLVideoElement>> = new Map();

    bundles: Map<string, MediaBundle> = new Map();

    videoStreamConnections: Map<string, string> = new Map();
    audioConnections: Map<string, string> = new Map();

    deviceListeners: DataListeners<Devices> = new DataListeners();
    
    logging: boolean;

    constructor(logging = true) {
        this.logging = logging;
        navigator.mediaDevices.ondevicechange = (_event: Event) => this.refreshDevices();
        this.refreshDevices();
        this.initBundleIfNecessary(MediaIdent.LOCAL);
    }

    registerVideoOutput(id: string, ref: MutableRefObject<HTMLVideoElement>, bundleId?: string, objId?: string) {
        if (this.logging) console.log('register video output', id, bundleId, objId);
        this.videoOutputs.set(id, ref);
        if (bundleId && objId) {
            this.connectStreamToOutput(bundleId, objId, id);
        }
    }

    deregisterVideoOutput(id: string) {
        if (this.logging) console.log('deregister video output', id);
        //this.stopOutput(id);
        this.videoOutputs.delete(id);
    }

    private initBundleIfNecessary(bundleId: string) {
        if (!this.bundles.has(bundleId)) {
            this.bundles.set(bundleId, {bundleId, objs: new Map(), unresolvedLabels: [], onAddedListeners: new Listeners(), onChangedListeners: new Listeners(), onRemovedListeners: new Listeners()});
        }
    }

    setTrackLabels(bundleId: string, trackIds: Array<string>, label: string) {
        if (this.logging) console.log("setting track labels", bundleId, trackIds, label)
        this.initBundleIfNecessary(bundleId);
        const bundle = this.bundles.get(bundleId)!;
        bundle.unresolvedLabels.push({ trackIds, label });
        this.resolveUnresolvedLabels(bundleId, true);
    }

    resolveUnresolvedLabels(bundleId: string, notify: boolean) {
        if (!this.bundles.has(bundleId)) return;
        const bundle = this.bundles.get(bundleId)!;

        const stillUnresolvedLables: Array<UnresolvedLabel> = [];

        let someLabelsWereResoved = false;

        bundle.unresolvedLabels.forEach((unresolvedLabel: UnresolvedLabel) => {
            const trackIds = unresolvedLabel.trackIds;
            const label = unresolvedLabel.label;
            let resolved = false;
            if (this.logging) console.log("trying to resolve label", trackIds, label);
            bundle.objs.forEach((obj: MediaObject) => {
                if (obj.type === MediaType.STREAM) {
                    const mediaStreamObject = obj as MediaStreamObject;
                    if (this.logging) console.log("checking obj", obj);
                    if (trackIds.some(trackId => mediaStreamObject.trackIds.has(trackId))) {
                        if (this.logging) console.log("successfully resolved label", bundleId, obj.id, label);
                        obj.label = label;
                        resolved = true;
                        someLabelsWereResoved = true;
                        if (notify) this.notifyBundleOnChange(bundleId, obj.id, obj);
                    }
                }
            });
            if (!resolved) stillUnresolvedLables.push(unresolvedLabel);
        });

        if (someLabelsWereResoved) {
            bundle.unresolvedLabels = stillUnresolvedLables;
        }

    }

    addMediaStream(bundleId: string, objId: string, stream: MediaStream, trackId: string) {
        if (this.logging) console.log('adding media stream', bundleId, objId, stream, trackId);

        const trackIds: Set<string> = new Set();
        trackIds.add(trackId);

        this.addMediaStreamObject(bundleId, objId, makeMediaId(bundleId, objId), MediaType.STREAM, StreamSubType.REMOTE, stream, null, trackIds);
    }

    addLocalCameraStream(bundleId: string, objId: string, stream: MediaStream) {

        const trackIds = new Set(stream.getTracks().map(track => track.id));

        if (this.logging) console.log('adding local camera stream', bundleId, objId, stream, trackIds);


        this.addMediaStreamObject(bundleId, objId, makeMediaId(bundleId, objId), MediaType.STREAM, StreamSubType.LOCAL_CAMERA, stream, null, trackIds);
    }

    addLocalScreenStream(bundleId: string, objId: string, stream: MediaStream) {
        const trackIds = new Set(stream.getTracks().map(track => track.id));

        if (this.logging) console.log('adding local screen stream', bundleId, objId, stream, trackIds);

        this.addMediaStreamObject(bundleId, objId, makeMediaId(bundleId, objId), MediaType.STREAM, StreamSubType.LOCAL_SCREEN, stream, null, trackIds);
    }

    updateStreamDimensions(bundleId: string, objId: string, width: number, height: number) {
        if (!this.bundles.has(bundleId)) return;
        const bundle = this.bundles.get(bundleId)!;
        if (!bundle.objs.has(objId)) return;
        const obj = bundle.objs.get(objId)!;
        if (!(obj.type === MediaType.STREAM)) return;
        const mediaStreamObject = obj as MediaStreamObject;
        mediaStreamObject.width = width;
        mediaStreamObject.height = height;

        this.notifyBundleOnChange(bundleId, objId, mediaStreamObject);
    }

    private getStreamDimensions(stream: MediaStream): [number | null, number | null] {
        const videoTracks = stream.getVideoTracks();

        const width = videoTracks.length > 0 ? videoTracks[0].getSettings().width || null: null;
        const height = videoTracks.length > 0 ? videoTracks[0].getSettings().height || null : null;
        
        return [width, height];
    }

    private addMediaStreamObject(bundleId: string, objId: string, id: string, type: MediaType, subType: StreamSubType, stream: MediaStream, videoOutput: string | null, trackIds: Set<string>) {
        this.initBundleIfNecessary(bundleId);
        const bundle = this.bundles.get(bundleId)!;

        if (bundle.objs.has(objId)) {

            const [width, height] = this.getStreamDimensions(stream);

            const streamObject = (bundle.objs.get(objId) as MediaStreamObject);
            if (width) streamObject.width = width;
            if (height) streamObject.height = height;

            if (trackIds.size > 0) {
                const streamTrackIds = streamObject.trackIds;
                trackIds.forEach(trackId => streamTrackIds.add(trackId));
            }
            return;
        }

        const [width, height] = this.getStreamDimensions(stream);

        const mediaObject: MediaStreamObject = {
            id, bundleId, objId, type, subType, stream, videoOutput, trackIds, width, height, label: null
        }

        bundle.objs.set(objId, mediaObject);

        // remove stream when one of the tracks has ended
        stream.getTracks().forEach(track => {
            track.onended = () => {
                if (this.logging) console.log("track has ended", bundleId, objId)
                this.removeMediaObject(bundleId, objId);
            }
        });

        stream.onaddtrack = ((_e: MediaStreamTrackEvent) => {
            if (this.logging) console.log('track was added', bundleId, objId, stream);
            const [newWidth, newHeight] = this.getStreamDimensions(stream);
            if (newWidth && newHeight) {
                mediaObject.width = newWidth;
                mediaObject.height = newHeight;
            }

            this.resolveUnresolvedLabels(bundleId, false /*notify*/);
            this.notifyBundleOnChange(bundleId, objId, mediaObject);
        });
        
        stream.onremovetrack = ((_e: MediaStreamTrackEvent) => {
            if (this.logging) console.log('track was removed', bundleId, objId, stream);

            if (stream.getTracks().length == 0) this.removeMediaObject(bundleId, objId);

            const [newWidth, newHeight] = this.getStreamDimensions(stream);
            if (newWidth && newHeight) {
                mediaObject.width = newWidth;
                mediaObject.height = newHeight;
            }

            this.notifyBundleOnChange(bundleId, objId, mediaObject);
            
        });
        this.resolveUnresolvedLabels(bundleId, false /*notify*/);
        this.notifyBundleOnAdd(bundleId, objId, mediaObject);
    }


    private notifyBundleOnAdd(bundleId: string, objId: string, mediaObject: MediaObject) {
        if (!this.bundles.has(bundleId)) return;
        const bundle = this.bundles.get(bundleId)!;
        bundle.onAddedListeners.getCallbacks().forEach(listener => listener(bundleId, objId, mediaObject));
    }
    private notifyBundleOnChange(bundleId: string, objId: string, mediaObject: MediaObject) {
        if (!this.bundles.has(bundleId)) return;
        const bundle = this.bundles.get(bundleId)!;
        bundle.onChangedListeners.getCallbacks().forEach(listener => listener(bundleId, objId, mediaObject));
    }
    
    private notifyBundleOnRemove(bundleId: string, objId: string, mediaObject: MediaObject) {
        if (!this.bundles.has(bundleId)) return;
        const bundle = this.bundles.get(bundleId)!;
        bundle.onRemovedListeners.getCallbacks().forEach(listener => listener(bundleId, objId, mediaObject));
    }    


    removeMediaObject(bundleId: string, objId: string) {
        if (this.logging) console.log('remove media object', bundleId, objId);
        if (!this.bundles.has(bundleId)) return;
        const bundle = this.bundles.get(bundleId)!;

        if (!bundle.objs.has(objId)) return;

        const obj = bundle.objs.get(objId)!;

        this.stopStream(bundleId, objId);

        bundle.objs.delete(objId);
        this.notifyBundleOnRemove(bundleId, objId, obj);
    }

    stopStream(bundleId: string, objId: string) {
        if (this.logging) console.log('stopping stream', bundleId, objId);
        if (!this.bundles.has(bundleId)) return;
        const bundle = this.bundles.get(bundleId)!;
        if (!bundle.objs.has(objId)) return;
        const obj = bundle.objs.get(objId)!;

        // stop stream in case it's of type STREAM
        if (obj.type !== MediaType.STREAM) return;
        const mediaObject: MediaStreamObject = obj as MediaStreamObject;
        mediaObject.stream.getTracks().forEach(track => track.stop());
    }

    destroyBundle(bundleId: string) {
        if (this.logging) console.log('destroying bundle', bundleId);
        const bundle = this.bundles.get(bundleId)!;
        bundle.objs.forEach((_obj, objId) => {
            this.removeMediaObject(bundleId, objId);
        });
        this.bundles.delete(bundleId);
    }    

    async connectStreamToOutput(bundleId: string, objId: string, outputId: string) {
        if (this.logging) console.log('connecting stream to output', bundleId, objId, outputId);

        if (!this.bundles.has(bundleId)) throw new Error("bundle with id: " + bundleId + " is not available");
        if (!this.videoOutputs.has(outputId)) throw new Error("output with id: " + outputId + " is not available");

        const bundle: MediaBundle = this.bundles.get(bundleId)!; 

        if (!bundle.objs.has(objId)) throw new Error("stream with id: " + objId + " is not available");

        const mediaObject = bundle.objs.get(objId)!;

        mediaObject.videoOutput = outputId;

        if (mediaObject.type !== MediaType.STREAM) throw new Error("media object " + bundleId + " " + objId + " is not a stream");
        const stream = (mediaObject as MediaStreamObject).stream;        

        const output: MutableRefObject<HTMLVideoElement> = this.videoOutputs.get(outputId)!;

        //this.stopOutput(outputId);

        output.current.srcObject = stream;
    }

    connectAudioOutputToVideoOutput(audioId: string, outputId: string) {
        if (this.logging) console.log('connecting audio output to video output', audioId, outputId);

        if (!this.devices!.audioOutput.has(audioId)) throw new Error("audio output with id: " + audioId + " is not available");
        if (!this.videoOutputs.has(outputId)) throw new Error("output with id: " + outputId + " is not available");

        const audio: MediaDeviceInfo = this.devices!.audioOutput.get(audioId)!.info;
        const output: MutableRefObject<HTMLVideoElement> = this.videoOutputs.get(outputId)!;
        const videoElement: any = output.current;

        this.audioConnections.set(outputId, audioId);

        videoElement.setSinkId(audio.deviceId);

    }
    


    listenToBundle(bundleId: string, onAddedListener: (bundleId: string, objId: string, mediaObject: MediaObject) => void, onChangedListener: (bundleId: string, objId: string, mediaObject: MediaObject) => void,
        onRemovedListener: (bundleId: string, objId: string, mediaObject: MediaObject) => void): UnsubscribeCallback {
        
        this.initBundleIfNecessary(bundleId);
        const bundle: MediaBundle = this.bundles.get(bundleId)!;
        // immediately transmit all streams we already have
        bundle.objs.forEach((mediaObject, objId) => onAddedListener(bundleId, objId, mediaObject));
        const unsubscribeAdded = bundle.onAddedListeners.addListener(onAddedListener);
        const unsubscribeChanged = bundle.onChangedListeners.addListener(onChangedListener);
        const unsubscribeRemoved = bundle.onRemovedListeners.addListener(onRemovedListener);

        return () => {
            unsubscribeAdded();
            unsubscribeChanged();
            unsubscribeRemoved();
        }

    }

    loadCameraStream(videoId: string | null, audioId: string | null, outputDeviceId?: string) {
        if (this.logging) console.log('local camera stream', videoId, audioId);
        
        const constraints = {video: true, audio: true};
        if (videoId) Object.assign(constraints, { video: { deviceId: { exact: videoId } } });
        if (audioId) Object.assign(constraints, { audio: { deviceId: { exact: audioId } } });

        
        this.loadStream(MediaIdent.LOCAL, MediaIdent.CAMERA, false, constraints, outputDeviceId);
    }

    loadScreenStream(outputDeviceId?: string) {
        this.loadStream(MediaIdent.LOCAL, MediaIdent.SCREEN, true, undefined, outputDeviceId);
    }    

    private async getVideoFeed(constraints?: MediaStreamConstraints): Promise<MediaStream> {
        return navigator.mediaDevices.getUserMedia(constraints);
    }

    private async getScreenFeed(): Promise<MediaStream> {
        return (navigator.mediaDevices as any).getDisplayMedia();
    }


    private async loadStream(bundleId: string, objId: string, screenshare: boolean, constraints?: MediaStreamConstraints | undefined, outputDeviceId?: string) {
        if (this.logging) console.log('loading stream', bundleId, objId);

        this.initBundleIfNecessary(bundleId);

        let stream: MediaStream;

        try {

            if (screenshare) {
                stream = await this.getScreenFeed();
                this.addLocalScreenStream(bundleId, objId, stream);
                if (outputDeviceId) this.connectStreamToOutput(bundleId, objId, outputDeviceId);
            } else {
                stream = await this.getVideoFeed(constraints);
                this.addLocalCameraStream(bundleId, objId, stream);
                if (outputDeviceId) this.connectStreamToOutput(bundleId, objId, outputDeviceId);
                // if we are here, we were able to get a stream and as such devices are available
                this.refreshDevices();
            }
        } catch (e) {
            console.log("error loading stream", e);
        }

    }


    getMediaObject(bundleId: string, objId: string): MediaObject | null {
        if (!this.bundles.has(bundleId)) return null;
        const bundle = this.bundles.get(bundleId)!;
        if (!bundle.objs.has(objId)) return null;
        return bundle.objs.get(objId)!;
    }

    getMediaBundle(bundleId: string): MediaBundle | null {
        if (!this.bundles.has(bundleId)) return null;
        const bundle = this.bundles.get(bundleId)!;
        return bundle;
    }



    private createDeviceLabel(map: Map<string, MediaDevice>, info: MediaDeviceInfo): string {
        if (info.label) return info.label.replace(/ *\([^)]*\) */g, "");
        if (info.kind === "videoinput") return "Camera " + (map.size + 1);
        if (info.kind === "audioinput") return "Microphone " + (map.size + 1);
        if (info.kind === "audiooutput") return "Speaker " + (map.size + 1);
        throw new Error("unknown device " + info);
    }

    listenForDevices(listener: (devices: Devices) => void): UnsubscribeCallback {
        const unsubscribe = this.deviceListeners.addListener(listener);
        if (this.devices) listener(this.devices);
        return unsubscribe;

    }

    notifyDeviceListeners() {
        this.deviceListeners.forEach(listener => listener(this.devices!));
    }

    async refreshDevices() {
        if (this.logging) console.log("refreshing devices");

        const devices = await navigator.mediaDevices.enumerateDevices();

        const videoDevices: Map<string, MediaDevice> = new Map();
        const audioInputDevices: Map<string, MediaDevice> = new Map();
        const audioOutputDevices: Map<string, MediaDevice> = new Map();

        

        devices.forEach(device => {
            if (device.kind === "videoinput") videoDevices.set(device.deviceId, { label: this.createDeviceLabel(videoDevices, device), info: device });
            if (device.kind === "audioinput") audioInputDevices.set(device.deviceId, { label: this.createDeviceLabel(videoDevices, device), info: device });
            if (device.kind === "audiooutput") audioOutputDevices.set(device.deviceId, { label: this.createDeviceLabel(videoDevices, device), info: device });
        });

        this.devices = {
            video: videoDevices,
            audioOutput: audioOutputDevices,
            audioInput: audioInputDevices,
        }

        this.notifyDeviceListeners();

    }

    releaseDevices() {
        // FIXME
    }

    getMediaConstraints() : MediaTrackSupportedConstraints {
        return navigator.mediaDevices.getSupportedConstraints();
    }

    removeMediaStreams(bundleId: string): void {
        this.destroyBundle(bundleId);
    }

    getVideoOutputs(): Map<string, MutableRefObject<HTMLVideoElement>> {
        return this.videoOutputs;
    }


}