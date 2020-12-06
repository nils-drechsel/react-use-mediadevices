import { FunctionComponent } from 'react';
interface Props {
    cssClassName?: string;
    deviceId: string;
    bundleId: string;
    streamId: string;
    width?: number | null;
    height?: number | null;
}
export declare const VideoElement: FunctionComponent<Props>;
export {};
