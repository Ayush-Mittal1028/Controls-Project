import React, { useState, useEffect, useCallback, useRef } from "react";
import SensorCard from "./SensorCard";
import PathVisualizer from "./PathVisualizer";
import { formatSensorData, format2DData } from "../utils/formatters";

/**
 * DRModule - Dead Reckoning Module
 * Uses IMU sensors (accelerometer, gyroscope, compass) for position tracking
 */
export default function DRModule() {
    // Raw sensor data
    const [accelerometerData, setAccelerometerData] = useState(null);
    const [gyroscopeData, setGyroscopeData] = useState(null);

    // Dead Reckoning state
    const [velocity, setVelocity] = useState({ x: 0, y: 0 });
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [path, setPath] = useState([{ x: 0, y: 0 }]);
    const [heading, setHeading] = useState(0);

    // GPS state
    const [gpsLocation, setGpsLocation] = useState(null);
    const [gpsError, setGpsError] = useState(null);
    const watchIdRef = useRef(null);

    // System state
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [error, setError] = useState(null);
    const [isCalibrating, setIsCalibrating] = useState(false);

    // Refs for DR state
    const velRef = useRef(velocity);
    const posRef = useRef(position);
    const pathRef = useRef(path);
    const headingRef = useRef(heading);
    const lastTimestampRef = useRef(null);
    const stationaryCountRef = useRef(0);
    const accelBiasRef = useRef({ x: 0, y: 0 });
    const compassFilterRef = useRef({ lastValue: null, alpha: 0.2 });

    // Update refs whenever state changes
    useEffect(() => {
        velRef.current = velocity;
    }, [velocity]);
    useEffect(() => {
        posRef.current = position;
    }, [position]);
    useEffect(() => {
        pathRef.current = path;
    }, [path]);
    useEffect(() => {
        headingRef.current = heading;
    }, [heading]);

    // Handle device orientation (compass)
    const handleDeviceOrientation = useCallback((event) => {
        const alpha = event.alpha ?? event.webkitCompassHeading;
        const beta = event.beta;
        const gamma = event.gamma;

        if (
            typeof alpha === "number" &&
            !Number.isNaN(alpha) &&
            typeof beta === "number" &&
            !Number.isNaN(beta) &&
            typeof gamma === "number" &&
            !Number.isNaN(gamma)
        ) {
            let compensatedHeading = alpha;

            // Tilt compensation
            if (Math.abs(beta) > 5 || Math.abs(gamma) > 5) {
                const betaRad = beta * (Math.PI / 180);
                const gammaRad = gamma * (Math.PI / 180);
                const cosB = Math.cos(betaRad);
                const sinB = Math.sin(betaRad);
                const cosG = Math.cos(gammaRad);
                const sinG = Math.sin(gammaRad);

                compensatedHeading =
                    Math.atan2(
                        sinG * cosB * Math.cos((alpha * Math.PI) / 180) +
                        sinB * Math.sin((alpha * Math.PI) / 180),
                        cosG * Math.cos((alpha * Math.PI) / 180)
                    ) *
                    (180 / Math.PI);

                compensatedHeading = (compensatedHeading + 360) % 360;
            }

            // Low-pass filter
            if (compassFilterRef.current.lastValue === null) {
                compassFilterRef.current.lastValue = compensatedHeading;
            } else {
                const alpha = compassFilterRef.current.alpha;
                const filtered =
                    alpha * compensatedHeading +
                    (1 - alpha) * compassFilterRef.current.lastValue;
                compassFilterRef.current.lastValue = filtered;
                compensatedHeading = filtered;
            }

            // Handle iOS vs Android
            if (event.webkitCompassHeading !== undefined) {
                compensatedHeading = 360 - compensatedHeading;
            } else if (window.screen && window.screen.orientation) {
                const screenOrientation = window.screen.orientation.angle || 0;
                compensatedHeading = (compensatedHeading + screenOrientation) % 360;
            }

            // Detect interference
            const variationThreshold = 20;
            const previousHeading = headingRef.current;
            if (Math.abs(compensatedHeading - previousHeading) > variationThreshold) {
                setIsCalibrating(true);
                setTimeout(() => setIsCalibrating(false), 2000);
            }

            setHeading(compensatedHeading);
        }
    }, []);

    // Handle device motion (acceleration & rotation)
    const handleDeviceMotion = useCallback((event) => {
        // Raw acceleration for display
        if (event.accelerationIncludingGravity) {
            const { x, y, z } = event.accelerationIncludingGravity;
            setAccelerometerData({ x, y, z });
        }

        // Rotation rate for display
        if (event.rotationRate) {
            const { alpha, beta, gamma } = event.rotationRate;
            setGyroscopeData({
                alpha: (alpha || 0) * (180 / Math.PI),
                beta: (beta || 0) * (180 / Math.PI),
                gamma: (gamma || 0) * (180 / Math.PI),
            });
        }

        // Linear acceleration for DR
        const acc = event.acceleration;
        if (!acc) return;

        const now =
            typeof event.timeStamp === "number" ? event.timeStamp : performance.now();
        if (lastTimestampRef.current === null) {
            lastTimestampRef.current = now;
            return;
        }

        const deltaTime = (now - lastTimestampRef.current) / 1000.0;
        if (deltaTime <= 0 || deltaTime < 0.001) return;
        lastTimestampRef.current = now;

        const axRaw = acc.x || 0;
        const ayRaw = acc.y || 0;

        // Stationary detection
        const accMag2D = Math.hypot(axRaw, ayRaw);
        const stationaryThreshold = 0.12;
        const stationarySamplesRequired = 6;

        if (accMag2D < stationaryThreshold) {
            stationaryCountRef.current += 1;
        } else {
            stationaryCountRef.current = 0;
        }

        if (stationaryCountRef.current >= stationarySamplesRequired) {
            accelBiasRef.current.x = accelBiasRef.current.x * 0.8 + axRaw * 0.2;
            accelBiasRef.current.y = accelBiasRef.current.y * 0.8 + ayRaw * 0.2;
            velRef.current = { x: 0, y: 0 };
            setVelocity(velRef.current);
            return;
        }

        // Bias correction
        const axUnbiased = axRaw - accelBiasRef.current.x;
        const ayUnbiased = ayRaw - accelBiasRef.current.y;

        // Deadzone
        const deadzone = 0.05;
        const ax = Math.abs(axUnbiased) > deadzone ? axUnbiased : 0;
        const ay = Math.abs(ayUnbiased) > deadzone ? ayUnbiased : 0;

        // Rotate to world frame
        const headingRad = (headingRef.current || 0) * (Math.PI / 180);
        const worldAx = ax * Math.cos(headingRad) + ay * Math.sin(headingRad);
        const worldAy = -ax * Math.sin(headingRad) + ay * Math.cos(headingRad);

        // Integrate velocity with damping
        const damping = 1.0;
        const newVelX =
            (velRef.current.x + worldAx * deltaTime) * Math.exp(-damping * deltaTime);
        const newVelY =
            (velRef.current.y + worldAy * deltaTime) * Math.exp(-damping * deltaTime);

        // Integrate position
        const newPosX = posRef.current.x + newVelX * deltaTime;
        const newPosY = posRef.current.y + newVelY * deltaTime;

        velRef.current = { x: newVelX, y: newVelY };
        posRef.current = { x: newPosX, y: newPosY };

        setVelocity(velRef.current);
        setPosition(posRef.current);

        const newPath = [...pathRef.current, { x: newPosX, y: newPosY }];
        pathRef.current = newPath;
        setPath(newPath);
    }, []);

    // Start monitoring
    const startMonitoring = async () => {
        setError(null);
        lastTimestampRef.current = null;
        try {
            let motionGranted = false;
            let orientationGranted = false;

            if (typeof DeviceMotionEvent.requestPermission === "function") {
                const motionPermission = await DeviceMotionEvent.requestPermission();
                if (motionPermission === "granted") {
                    motionGranted = true;
                }
            } else {
                motionGranted = true;
            }

            if (typeof DeviceOrientationEvent.requestPermission === "function") {
                const orientationPermission =
                    await DeviceOrientationEvent.requestPermission();
                if (orientationPermission === "granted") {
                    orientationGranted = true;
                }
            } else {
                orientationGranted = true;
            }

            if (motionGranted && orientationGranted) {
                window.addEventListener("devicemotion", handleDeviceMotion);
                window.addEventListener("deviceorientation", handleDeviceOrientation);
                setIsMonitoring(true);
            } else {
                setError("Permission to access one or more sensors was denied.");
            }
        } catch (err) {
            setError(`Error starting sensor monitoring: ${err.message}`);
            console.error(err);
        }
    };

    // Stop monitoring
    const stopMonitoring = () => {
        window.removeEventListener("devicemotion", handleDeviceMotion);
        window.removeEventListener("deviceorientation", handleDeviceOrientation);
        setIsMonitoring(false);
        lastTimestampRef.current = null;
    };

    // Clear path
    const clearPath = () => {
        setVelocity({ x: 0, y: 0 });
        setPosition({ x: 0, y: 0 });
        setPath([{ x: 0, y: 0 }]);
        lastTimestampRef.current = null;
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            window.removeEventListener("devicemotion", handleDeviceMotion);
            window.removeEventListener("deviceorientation", handleDeviceOrientation);
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, [handleDeviceMotion, handleDeviceOrientation]);

    // GPS tracking
    useEffect(() => {
        if (isMonitoring && "geolocation" in navigator) {
            const options = {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0,
            };

            const successCallback = (position) => {
                setGpsLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp,
                });
                setGpsError(null);
            };

            const errorCallback = (error) => {
                let errorMessage = "GPS error: ";
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += "User denied GPS access";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += "Location unavailable";
                        break;
                    case error.TIMEOUT:
                        errorMessage += "Request timeout";
                        break;
                    default:
                        errorMessage += "Unknown error";
                }
                setGpsError(errorMessage);
            };

            watchIdRef.current = navigator.geolocation.watchPosition(
                successCallback,
                errorCallback,
                options
            );
        } else if (!isMonitoring && watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, [isMonitoring]);

    return (
        <div className="bg-linear-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white overflow-y-auto flex flex-col h-full rounded-2xl border border-white/10 shadow-2xl shadow-violet-900/30">
            {/* Header & Controls - Glassy */}
            <div className="p-6 md:p-7 border-b border-white/10 bg-white/5 backdrop-blur-md">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.28em] text-violet-300/80 mb-2">
                            Dead Reckoning
                        </p>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-white drop-shadow">
                            Inertial Navigation Dashboard
                        </h2>
                        <p className="text-xs text-zinc-300 mt-2 max-w-2xl">
                            Sensor-based positioning with accelerometer + gyroscope, heading
                            compensation, and GPS assist.
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3 text-[11px] text-white/85">
                            <span className="px-3 py-1 rounded-full bg-violet-600/30 border border-violet-400/50">
                                IMU Fusion
                            </span>
                            <span className="px-3 py-1 rounded-full bg-indigo-600/30 border border-indigo-400/50">
                                Heading Compensated
                            </span>
                            <span className="px-3 py-1 rounded-full bg-fuchsia-600/30 border border-fuchsia-400/50">
                                GPS Assist
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 items-start md:items-end">
                        <div className="flex gap-2 flex-wrap justify-end">
                            <button
                                onClick={isMonitoring ? stopMonitoring : startMonitoring}
                                className={`px-4 py-2 rounded-lg font-semibold text-sm shadow-lg transition ${isMonitoring
                                        ? "bg-linear-to-r from-fuchsia-500 to-red-500 text-zinc-950 shadow-fuchsia-500/30"
                                        : "bg-linear-to-r from-violet-500 to-indigo-500 text-zinc-950 shadow-violet-500/30"
                                    } hover:brightness-110`}
                            >
                                {isMonitoring ? "Stop Sensors" : "Start Sensors"}
                            </button>
                            <button
                                onClick={clearPath}
                                className="px-4 py-2 rounded-lg font-semibold text-sm bg-zinc-800 border border-white/10 text-white hover:border-white/30"
                            >
                                Reset Path
                            </button>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end text-[11px] text-white/80">
                            <span
                                className={`px-2.5 py-1 rounded-full border ${isMonitoring
                                        ? "border-violet-400/60 bg-violet-500/15 text-violet-100"
                                        : "border-zinc-500/60 bg-zinc-700/40 text-zinc-200"
                                    }`}
                            >
                                {isMonitoring ? "Live" : "Idle"}
                            </span>
                            {gpsLocation && (
                                <span className="px-2.5 py-1 rounded-full border border-fuchsia-300/60 bg-fuchsia-500/10 text-fuchsia-100">
                                    GPS Locked
                                </span>
                            )}
                            {isCalibrating && (
                                <span className="px-2.5 py-1 rounded-full border border-indigo-300/60 bg-indigo-500/10 text-indigo-100">
                                    Calibrating
                                </span>
                            )}
                        </div>
                        {error && (
                            <p className="text-fuchsia-300 text-sm bg-fuchsia-900/40 border border-fuchsia-500/50 rounded px-3 py-2 mt-1 max-w-md text-right">
                                {error}
                            </p>
                        )}
                        {!isMonitoring && !error && (
                            <p className="text-zinc-300 text-xs text-right max-w-xs">
                                Click "Start Sensors" to begin tracking.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Stat Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 md:px-8 py-4 bg-white/5 backdrop-blur border-b border-white/5">
                <div className="rounded-xl bg-zinc-900/70 border border-white/10 p-3 shadow-inner">
                    <div className="text-[11px] uppercase tracking-wide text-zinc-400">
                        Vel (m/s)
                    </div>
                    <div className="text-sm font-semibold text-violet-200">
                        {format2DData(velocity)}
                    </div>
                </div>
                <div className="rounded-xl bg-zinc-900/70 border border-white/10 p-3 shadow-inner">
                    <div className="text-[11px] uppercase tracking-wide text-zinc-400">
                        Position
                    </div>
                    <div className="text-sm font-semibold text-zinc-200">
                        {format2DData(position)}
                    </div>
                </div>
                <div className="rounded-xl bg-zinc-900/70 border border-white/10 p-3 shadow-inner">
                    <div className="text-[11px] uppercase tracking-wide text-zinc-400">
                        Heading
                    </div>
                    <div className="text-sm font-semibold text-violet-200">
                        {(heading ?? 0).toFixed(1)}°
                    </div>
                </div>
                <div className="rounded-xl bg-zinc-900/70 border border-white/10 p-3 shadow-inner">
                    <div className="text-[11px] uppercase tracking-wide text-zinc-400">
                        GPS
                    </div>
                    <div className="text-sm font-semibold text-indigo-200">
                        {gpsLocation ? "Active" : "Pending"}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-col xl:grid xl:grid-cols-[1.05fr_0.95fr] gap-6 flex-1 p-6 md:p-8 min-h-0">
                {/* LEFT: Path & GPS */}
                <div className="flex flex-col gap-4 min-h-0 lg:border-r lg:border-white/10 lg:pr-6">
                    <div className="bg-zinc-900/70 border border-white/10 rounded-2xl shadow-xl overflow-hidden flex-1 min-h-0">
                        <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.2em] text-violet-300/80">
                                    Path
                                </p>
                                <h3 className="text-lg font-semibold">DR Trajectory</h3>
                            </div>
                            <span className="px-3 py-1 rounded-full text-[11px] bg-violet-500/15 border border-violet-400/40 text-violet-100">
                                IMU
                            </span>
                        </div>
                        <div className="p-3">
                            <div className="rounded-xl overflow-hidden border border-white/10 bg-zinc-950">
                                <PathVisualizer path={path} gpsLocation={gpsLocation} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-900/70 border border-white/10 rounded-2xl shadow-lg p-4">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-fuchsia-300/80">
                            GPS Data
                        </p>
                        <h3 className="text-lg font-semibold mb-2">GPS Position</h3>
                        {gpsError ? (
                            <div className="bg-fuchsia-900/40 border border-fuchsia-500/40 p-3 rounded-lg">
                                <p className="text-xs text-fuchsia-200">{gpsError}</p>
                            </div>
                        ) : gpsLocation ? (
                            <div className="space-y-2">
                                <SensorCard
                                    title="GPS Coordinates"
                                    dataString={`Lat: ${gpsLocation.latitude.toFixed(
                                        6
                                    )}°, Lon: ${gpsLocation.longitude.toFixed(6)}°`}
                                    unit={`±${gpsLocation.accuracy.toFixed(1)}m`}
                                />
                            </div>
                        ) : (
                            <div className="bg-white/5 border border-white/10 p-3 rounded-lg">
                                <p className="text-xs text-fuchsia-200">
                                    {isMonitoring
                                        ? "Acquiring GPS signal..."
                                        : "Start sensors to enable GPS"}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Position, Velocity, Sensors */}
                <div className="overflow-y-auto flex flex-col gap-4 lg:pl-6 min-h-0">
                    <div className="bg-zinc-900/70 border border-white/10 rounded-2xl shadow-lg p-4">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-indigo-300/80">
                            Pose
                        </p>
                        <h3 className="text-lg font-semibold mb-2">Measured Position</h3>
                        <SensorCard
                            title="DR Position (2D)"
                            dataString={format2DData(position)}
                            unit="meters"
                        />
                        <SensorCard
                            title="Estimated Velocity"
                            dataString={format2DData(velocity)}
                            unit="m/s"
                        />
                    </div>

                    <div className="bg-zinc-900/70 border border-white/10 rounded-2xl shadow-lg p-4">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-fuchsia-300/80">
                            Sensor Data
                        </p>
                        <h3 className="text-lg font-semibold mb-2">Raw Sensor Data</h3>
                        <SensorCard
                            title="Accelerometer (with Gravity)"
                            dataString={formatSensorData(accelerometerData)}
                            unit="m/s²"
                        />
                        <SensorCard
                            title="Gyroscope (Rotation Rate)"
                            dataString={formatSensorData(gyroscopeData)}
                            unit="°/s"
                        />
                        <SensorCard
                            title="Orientation (Compass)"
                            dataString={`alpha: ${(heading ?? 0).toFixed(2)}°`}
                            unit="0° = North"
                        />
                    </div>

                    <div className="p-4 text-xs text-zinc-200 text-center mt-auto bg-white/5 border border-white/10 rounded-xl">
                        <p>Inertial Navigation | IMU-based Dead Reckoning</p>
                        <p className="mt-1 text-violet-200">
                            <span className="text-violet-300">●</span> Sensor Fusion Active
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
