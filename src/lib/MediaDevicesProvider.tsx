import React, { FunctionComponent, useRef, useEffect } from "react";
import MediaDevicesContext from "./MediaDevicesContext";
import { MediaDevicesManager } from "./MediaDevicesManager";

type Props = {
    logging?: boolean
}


export const MediaDevicesProvider: FunctionComponent<Props> = ({ children, logging }) => {

    const managerRef = useRef<MediaDevicesManager>();

    if (!managerRef.current) {
        managerRef.current = new MediaDevicesManager(logging);
    }

    useEffect(() => {

        return () => {
            if (managerRef.current) {
                managerRef.current.releaseDevices();
                managerRef.current = undefined;
            }
        }

    }, []);


    return (
        <MediaDevicesContext.Provider value={managerRef.current}>
            {children}
        </MediaDevicesContext.Provider>
    )
}