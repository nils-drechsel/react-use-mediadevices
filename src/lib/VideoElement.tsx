import React, { FunctionComponent, useRef, MutableRefObject, useEffect } from 'react';
import { useMediaDevicesManager } from './useMediaDevicesManager';

interface Props {
    cssClassName?: string;
    deviceId: string;
    bundleId: string;
    streamId: string;
    width?: number | null;
    height?: number | null;
}


export const VideoElement: FunctionComponent<Props> = ({ deviceId, bundleId, streamId, cssClassName, width, height}) => {

    const ref = useRef() as MutableRefObject<HTMLVideoElement>;

    const manager = useMediaDevicesManager();

    useEffect(() => {

        manager.registerVideoOutput(deviceId, ref, bundleId, streamId);

        ref.current.onloadedmetadata = () => {
            manager.updateStreamDimensions(bundleId, streamId, ref.current.videoWidth, ref.current.videoHeight);
        };


        return () => {
            manager.deregisterVideoOutput(deviceId);
        }

    }, [bundleId, streamId])

    const pxWidth = width ? width + 'px' : undefined;
    const pxHeight = height ? height + 'px' : undefined;

    return <video width={pxWidth} height={pxHeight} className={cssClassName} ref={ref} muted autoPlay />;    

}