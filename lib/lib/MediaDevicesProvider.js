"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const MediaDevicesContext_1 = __importDefault(require("./MediaDevicesContext"));
const MediaDevicesManager_1 = require("./MediaDevicesManager");
exports.MediaDevicesProvider = ({ children, logging }) => {
    const managerRef = react_1.useRef();
    if (!managerRef.current) {
        managerRef.current = new MediaDevicesManager_1.MediaDevicesManager(logging);
    }
    react_1.useEffect(() => {
        return () => {
            if (managerRef.current) {
                managerRef.current.releaseDevices();
                managerRef.current = undefined;
            }
        };
    }, []);
    return (react_1.default.createElement(MediaDevicesContext_1.default.Provider, { value: managerRef.current }, children));
};
//# sourceMappingURL=MediaDevicesProvider.js.map