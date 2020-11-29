"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const useMediaDevicesManager_1 = require("./useMediaDevicesManager");
exports.VideoElement = ({ deviceId, bundleId, streamId, className }) => {
    const ref = react_1.useRef();
    const manager = useMediaDevicesManager_1.useMediaDevicesManager();
    react_1.useEffect(() => {
        manager.registerVideoOutput(deviceId, ref, bundleId, streamId);
        return () => {
            manager.deregisterVideoOutput(deviceId);
        };
    }, []);
    return react_1.default.createElement("video", { className: className, ref: ref, muted: true, autoPlay: true });
};
//# sourceMappingURL=VideoElement.js.map