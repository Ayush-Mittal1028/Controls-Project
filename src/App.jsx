import React, { useState } from "react";
import DRModule from "./components/DRModule";
import SLAMModule from "./components/SLAMModule";

/**
 * Main App Component - SmartNav
 * Landing page with module selection
 */
export default function App() {
  const [activeModule, setActiveModule] = useState(null);

  // Landing page view
  if (!activeModule) {
    return (
      <div className="min-h-screen bg-linear-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white font-sans flex flex-col">
        {/* Header */}
        <header className="border-b border-white/10 bg-white/5 backdrop-blur-md shadow-lg">
          <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 text-center">
            <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-300/80 mb-2">
              SmartNav 🚀
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white drop-shadow">
              Advanced Robotics Navigation Platform
            </h1>
            <p className="text-sm text-zinc-300 mt-2 mx-auto max-w-2xl">
              Explore cutting-edge localization techniques: compare Dead Reckoning (IMU-based) 
              with Visual SLAM (camera-based) navigation in real-time.
            </p>
            <div className="flex flex-wrap gap-2 mt-4 text-[11px] text-white/80 justify-center">
              <span className="px-3 py-1 rounded-full bg-cyan-600/30 border border-cyan-400/50">
                Real-time Visualization
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-600/30 border border-blue-400/50">
                Sensor Integration
              </span>
              <span className="px-3 py-1 rounded-full bg-purple-600/30 border border-purple-400/50">
                Interactive Analysis
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-4xl w-full">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-4 text-zinc-200">
              Select Your Navigation Module
            </h2>
            <p className="text-center text-zinc-400 mb-12 max-w-2xl mx-auto">
              Discover how different localization algorithms perform in real-world scenarios. 
              Compare IMU-based dead reckoning with advanced camera-based Visual SLAM technology.
            </p>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Dead Reckoning Card */}
              <div className="group relative rounded-2xl bg-zinc-900/70 border border-white/10 shadow-2xl shadow-violet-900/30 overflow-hidden hover:border-violet-400/40 transition-all duration-300">
                <div className="absolute inset-0 bg-linear-to-br from-violet-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-8 flex flex-col h-full">
                  <div className="mb-6">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-violet-300/80 mb-3">
                      Module 1
                    </p>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      Dead Reckoning (IMU)
                    </h3>
                    <p className="text-sm text-zinc-300 mb-4">
                      Inertial Measurement Unit-based navigation that tracks position 
                      using accelerometer, gyroscope, and magnetometer sensor fusion.
                    </p>
                  </div>

                  <div className="mb-6">
                    <p className="text-xs font-semibold text-violet-200 mb-3 uppercase tracking-wide">
                      Key Features
                    </p>
                    <ul className="space-y-2 text-sm text-zinc-300">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                        Multi-sensor fusion algorithm
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                        Real-time heading compensation
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                        GPS ground truth validation
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                        Live trajectory visualization
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => setActiveModule("dr")}
                    className="mt-auto px-6 py-3 rounded-lg bg-linear-to-r from-violet-500 to-fuchsia-500 text-zinc-950 font-semibold shadow-lg shadow-violet-500/30 hover:brightness-110 transition-all duration-200"
                  >
                    Explore DR
                  </button>
                </div>
              </div>

              {/* Visual SLAM Card */}
              <div className="group relative rounded-2xl bg-zinc-900/70 border border-white/10 shadow-2xl shadow-indigo-900/30 overflow-hidden hover:border-indigo-400/40 transition-all duration-300">
                <div className="absolute inset-0 bg-linear-to-br from-indigo-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-8 flex flex-col h-full">
                  <div className="mb-6">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-indigo-300/80 mb-3">
                      Module 2
                    </p>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      Visual SLAM (Camera)
                    </h3>
                    <p className="text-sm text-zinc-300 mb-4">
                      Camera-first Simultaneous Localization and Mapping with 
                      real-time obstacle detection and depth-based feature tracking.
                    </p>
                  </div>

                  <div className="mb-6">
                    <p className="text-xs font-semibold text-indigo-200 mb-3 uppercase tracking-wide">
                      Key Features
                    </p>
                    <ul className="space-y-2 text-sm text-zinc-300">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        Live video stream processing
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        Real-time obstacle detection
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        Advanced feature tracking (FAST)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        Performance monitoring & metrics
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => setActiveModule("slam")}
                    className="mt-auto px-6 py-3 rounded-lg bg-linear-to-r from-indigo-500 to-fuchsia-500 text-zinc-950 font-semibold shadow-lg shadow-indigo-500/30 hover:brightness-110 transition-all duration-200"
                  >
                    Explore SLAM
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-white/5 backdrop-blur py-6 text-center text-sm text-zinc-400">
          <p>SmartNav © 2025 | Advanced Robotics Navigation Platform</p>
          <p className="text-xs mt-2 text-zinc-500">Built by: Ayush Mittal, Nisarg Divecha, Shrey Shah, Abhishek Kothari, Kathan Balar</p>
        </footer>
      </div>
    );
  }

  // Module view with back button
  return (
    <div className="flex-1 bg-linear-to-br from-zinc-950 via-zinc-900 to-zinc-950 min-h-screen font-sans flex flex-col">
      {/* Header with back button */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-md shadow-lg">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
          <button
            onClick={() => setActiveModule(null)}
            className="px-4 py-2 rounded-lg bg-zinc-800 border border-white/10 text-white hover:border-white/30 font-semibold text-sm transition-all"
          >
            ← Back to Home
          </button>
          <p className="text-sm text-zinc-300">
            {activeModule === "dr"
              ? "Dead Reckoning Module"
              : "Visual SLAM Module"}
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeModule === "dr" && <DRModule />}
        {activeModule === "slam" && <SLAMModule />}
      </div>
    </div>
  );
}
