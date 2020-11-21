import React, { FunctionComponent, useRef, useContext, useEffect } from "react";
import MediaDevicesContext from "./MediaDevicesContext";
import { MediaDevicesManager } from "./MediaDevicesManager";

type Props = {
}


export const MediaDevicesProvider: FunctionComponent<Props> = ({ children }) => {

    const managerRef = useRef<MediaDevicesManager>();

    if (!managerRef.current) {
        managerRef.current = new MediaDevicesManager();
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