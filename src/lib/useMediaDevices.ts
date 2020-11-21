import { useEffect, useState, useRef, MutableRefObject, SetStateAction, Dispatch, useContext } from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';
import MediaDevicesContext from './MediaDevicesContext';
import { MediaDevicesManager } from './MediaDevicesManager';



export const useMediaDevicesManager = () => {
    const manager: MediaDevicesManager = useContext(MediaDevicesContext) as MediaDevicesManager;
    return manager;
}


