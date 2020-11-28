"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const MediaDevicesContext_1 = __importDefault(require("./MediaDevicesContext"));
exports.useMediaDevicesManager = () => {
    return react_1.useContext(MediaDevicesContext_1.default);
};
