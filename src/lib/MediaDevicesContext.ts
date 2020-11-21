import { createContext } from 'react';
import { MediaDevicesManager } from "./MediaDevicesManager";

export const MediaDevicesContext = createContext<MediaDevicesManager | null>(null);

export default MediaDevicesContext;

