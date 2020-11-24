import { Dispatch, MutableRefObject } from "react";
import { Listeners } from "react-use-listeners";

export enum SpecialMediaStream {
    LOCAL_CAMERA,
    LOCAL_SCREEN

} 

export type MediaDevice = {
    label: string;
    info: MediaDeviceInfo;
}

export type VideoStreamBundle = {
    bundleId: string,
    streams: Map<string, MediaStream>;
    onloadListeners: Listeners<(bundle: VideoStreamBundle) => void>;
}


export interface MediaStreamProvider {
    addMediaStream(bundleId: string, streamId: string, stream: MediaStream): void;
    removeMediaStream(bundleId: string, streamId: string): void;
    removeMediaStreams(bundleId: string): void;
}

export class MediaDevicesManager implements MediaStreamProvider {

    videoDevices: Map<string, MediaDevice> = new Map();
    audioInputDevices: Map<string, MediaDevice> = new Map();
    audioOutputDevices: Map<string, MediaDevice> = new Map();
    videoOutputs: Map<string, MutableRefObject<HTMLVideoElement>> = new Map();

    bundles: Map<string, VideoStreamBundle> = new Map();

    localBundles: Set<string> = new Set();

    videoStreamConnections: Map<string, string> = new Map();
    audioConnections: Map<string, string> = new Map();
    

    constructor() {
        this.refreshDevices();
    }

    registerVideoOutput(id: string, ref: MutableRefObject<HTMLVideoElement>) {
        this.videoOutputs.set(id, ref);
    }

    deregisterVideoOutput(id: string) {
        //this.stopOutput(id);
        this.videoOutputs.delete(id);
    }

    private initBundleIfNecessary(bundleId: string) {
        if (!this.bundles.has(bundleId)) {
            this.bundles.set(bundleId, {bundleId, streams: new Map(), onloadListeners: new Listeners()});
        }
    }

    addMediaStream(bundleId: string, streamId: string, stream: MediaStream) {
        this.initBundleIfNecessary(bundleId);
        const bundle = this.bundles.get(bundleId)!;

        bundle.streams.set(streamId, stream);
        this.notifyOnLoad(bundleId);
    }

    removeMediaStream(bundleId: string, streamId: string) {
        if (!this.bundles.has(bundleId)) return;
        const bundle = this.bundles.get(bundleId)!;
        bundle.streams.delete(streamId);
    }

    destroyBundle(bundleId: string) {
        this.stopBundle(bundleId);
        this.bundles.delete(bundleId);
        this.localBundles.delete(bundleId);
    }

    stopBundle(bundleId: string) {
        if (!this.bundles.has(bundleId)) return;
        const bundle = this.bundles.get(bundleId)!;
        bundle.streams.forEach(stream => {
            stream.getTracks().forEach(track => track.stop());
        });
        bundle.streams.clear();
    }

    // stopOutput(outputId: string) {
    //     if (!this.videoOutputs.has(outputId)) throw new Error("output with id: " + outputId + " is not available");
    //         const output: MutableRefObject<HTMLVideoElement> = this.videoOutputs.get(outputId)!;

    //     if (this.videoStreamConnections.has(outputId)) {
    //         const oldStreamId = this.videoStreamConnections.get(outputId)!;
    //         this.stopStream(oldStreamId);
    //     }
    // }

    connectStreamToOutput(bundleId: string, streamId: string, outputId: string) {
        if (!this.bundles.has(bundleId)) throw new Error("bundle with id: " + bundleId + " is not available");
        if (!this.videoOutputs.has(outputId)) throw new Error("output with id: " + outputId + " is not available");

        const bundle: VideoStreamBundle = this.bundles.get(bundleId)!; 

        if (!bundle.streams.has(streamId)) throw new Error("stream with id: " + streamId + " is not available");
        const stream: MediaStream = bundle.streams.get(streamId)!;

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
    
    private notifyOnLoad(bundleId: string) {
        if (!this.bundles.has(bundleId)) throw new Error("bundle with id: " + bundleId + " is not available");
        const bundle: VideoStreamBundle = this.bundles.get(bundleId)!;
        bundle.onloadListeners.getCallbacks().forEach(listener => listener(bundle));
    }


    listenToBundle(bundleId: string, callback: (bundle: VideoStreamBundle) => void): () => void {
        this.initBundleIfNecessary(bundleId);
        const bundle: VideoStreamBundle = this.bundles.get(bundleId)!; 
        return bundle.onloadListeners.addListener(callback);
    }

    loadCameraStream(bundleId: string, streamId: string, videoId: string, audioId: string, outputId: string, onload: (bundle: VideoStreamBundle) => void) {
        const constraints = {
            audio: {deviceId: audioId ? {exact: audioId} : undefined},
            video: {deviceId: videoId ? {exact: videoId} : undefined}
        };
        this.loadStream(bundleId, streamId, videoId, audioId, outputId, onload, constraints, false);
    }

    loadScreenStream(bundleId: string, streamId: string, outputId: string, onload: (bundle: VideoStreamBundle) => void) {
        const mediaDevices = navigator.mediaDevices as any;
        this.loadStream(bundleId, streamId, null, null, outputId, onload, undefined, true);
    }    

    private async getVideoFeed(constraints?: MediaStreamConstraints): Promise<MediaStream> {
        return navigator.mediaDevices.getUserMedia(constraints);
    }

    private async getScreenFeed(): Promise<MediaStream> {
        return (navigator.mediaDevices as any).mediaDevices.getDisplayMedia();
    }


    private async loadStream(bundleId: string, streamId: string, videoId: string | null, audioId: string | null, outputId: string, onload: (bundle: VideoStreamBundle) => void, constraints: MediaStreamConstraints | undefined, screenshare: boolean) {
        if (this.bundles.has(bundleId)) this.stopBundle(bundleId);
        this.initBundleIfNecessary(bundleId);

        const bundle: VideoStreamBundle = this.bundles.get(bundleId)!;        

        this.listenToBundle(bundleId, onload);
        
        let stream: MediaStream = screenshare ? await this.getScreenFeed() : await this.getVideoFeed();
        this.addMediaStream(bundleId, streamId, stream);
        this.localBundles.add(bundleId);
        this.connectStreamToOutput(bundleId, streamId, outputId);
        this.notifyOnLoad(bundleId);

    }


    getLocalBundles(): Array<VideoStreamBundle> {
        return Array.from(this.localBundles.values()).filter(bundleId => this.bundles.has(bundleId)).map(bundleId => this.bundles.get(bundleId)!);
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