import React, { FunctionComponent, useRef, MutableRefObject, useEffect } from 'react';
import { useMediaDevicesManager } from './useMediaDevices';

interface Props {
    className?: string;
    name: string;
}


export const VideoElement: FunctionComponent<Props> = ({ name, className}) => {

    const ref = useRef() as MutableRefObject<HTMLVideoElement>;

    const manager = useMediaDevicesManager();

    useEffect(() => {

        manager.registerVideoOutput(name, ref);

        return () => {
            manager.deregisterVideoOutput(name);
        }

    }, [])

    return <video className={className} ref={ref} muted autoPlay /> 

}