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
const useMediaDevices_1 = require("./useMediaDevices");
exports.VideoElement = ({ name, className }) => {
    const ref = react_1.useRef();
    const manager = useMediaDevices_1.useMediaDevicesManager();
    react_1.useEffect(() => {
        manager.registerVideoOutput(name, ref);
        return () => {
            manager.deregisterVideoOutput(name);
        };
    }, []);
    return react_1.default.createElement("video", { className: className, ref: ref, muted: true, autoPlay: true });
};
