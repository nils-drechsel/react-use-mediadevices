import React, { FunctionComponent, useRef, MutableRefObject, useEffect } from 'react';
import { useMediaDevicesManager } from './useMediaDevicesManager';

interface Props {
    cssClassName?: string;
    deviceId: string;
    bundleId: string;
    streamId: string;
    width?: number | null;
    height?: number | null;
    fullscreen?: boolean;
    muted?: boolean;
}


export const VideoElement: FunctionComponent<Props> = ({ deviceId, bundleId, streamId, cssClassName, width, height, fullscreen, muted}) => {

    const ref = useRef() as MutableRefObject<HTMLVideoElement>;

    const manager = useMediaDevicesManager();

    useEffect(() => {

        manager.registerVideoOutput(deviceId, ref, bundleId, streamId);

        if (ref.current) {
            ref.current.onloadedmetadata = () => {
                if (ref.current) manager.updateStreamDimensions(bundleId, streamId, ref.current.videoWidth, ref.current.videoHeight);
            };

            ref.current.onloadeddata = () => {
                if (ref.current) manager.updateStreamDimensions(bundleId, streamId, ref.current.videoWidth, ref.current.videoHeight);
            };            
        }


        return () => {
            manager.deregisterVideoOutput(deviceId);
        }

    }, [ref.current, bundleId, streamId])

    let pxWidth = width ? width + 'px' : undefined;
    let pxHeight = height ? height + 'px' : undefined;

    if (fullscreen) {
        pxWidth = "100%";
        pxHeight = "100%";
    }

    return <video width={pxWidth} height={pxHeight} className={cssClassName} ref={ref} muted={muted} autoPlay />;    

}