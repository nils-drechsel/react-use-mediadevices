import { useContext } from 'react';
import MediaDevicesContext from './MediaDevicesContext';
import { MediaDevicesManager } from './MediaDevicesManager';



export const useMediaDevicesManager = () => {
    return useContext(MediaDevicesContext) as MediaDevicesManager;
}


