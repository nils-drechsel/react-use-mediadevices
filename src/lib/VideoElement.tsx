import React, { FunctionComponent, useRef, MutableRefObject, useEffect } from 'react';
import { useMediaDevicesManager } from './useMediaDevicesManager';

interface Props {
    className?: string;
    deviceId: string;
    bundleId?: string;
    streamId?: string;
}


export const VideoElement: FunctionComponent<Props> = ({ deviceId, bundleId, streamId, className}) => {

    const ref = useRef() as MutableRefObject<HTMLVideoElement>;

    const manager = useMediaDevicesManager();

    useEffect(() => {

        manager.registerVideoOutput(deviceId, ref, bundleId, streamId);

        return () => {
            manager.deregisterVideoOutput(deviceId);
        }

    }, [])

    return <video className={className} ref={ref} muted autoPlay /> 

}