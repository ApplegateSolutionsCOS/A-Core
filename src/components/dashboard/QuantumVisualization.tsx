import React, { useState, useEffect, useRef } from 'react';

interface QuantumVisualizationProps {
  className?: string;
}

const QuantumVisualization: React.FC<QuantumVisualizationProps> = ({ className = '' }) => {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [waveData, setWaveData] = useState<number[]>([]);
  const [probabilityData, setProbabilityData] = useState<number[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // Generate wave data for the "Pond" analysis
  useEffect(() => {
    const generateWaveData = () => {
      const data: number[] = [];
      const time = Date.now() / 1000;
      for (let i = 0; i < 50; i++) {
        const value = Math.sin(i * 0.2 + time) * 0.5 + 
                      Math.sin(i * 0.1 + time * 1.5) * 0.3 +
                      Math.random() * 0.1;
        data.push(value);
      }
      setWaveData(data);

      // Generate probability distribution
      const probs: number[] = [];
      for (let i = 0; i < 8; i++) {
        probs.push(Math.random() * 0.5 + 0.1);
      }
      const sum = probs.reduce((a, b) => a + b, 0);
      setProbabilityData(probs.map(p => p / sum));
    };

    const interval = setInterval(generateWaveData, 100);
    generateWaveData();
    return () => clearInterval(interval);
  }, []);

  // Animate the 3D qubit sphere
  useEffect(() => {
    const animate = () => {
      setRotation(prev => ({
        x: prev.x + 0.5,
        y: prev.y + 0.3,
      }));
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Draw the Bloch sphere
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;

    ctx.clearRect(0, 0, width, height);

    // Draw outer glow
    const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.8, centerX, centerY, radius * 1.2);
    gradient.addColorStop(0, 'rgba(0, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Draw sphere outline
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw equator (horizontal ellipse)
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radius, radius * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Draw vertical meridian
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radius * 0.3, radius, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Draw axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    
    // Z axis
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius - 10);
    ctx.lineTo(centerX, centerY + radius + 10);
    ctx.stroke();

    // X axis (perspective)
    ctx.beginPath();
    ctx.moveTo(centerX - radius - 10, centerY);
    ctx.lineTo(centerX + radius + 10, centerY);
    ctx.stroke();

    // Draw |0⟩ and |1⟩ labels
    ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
    ctx.font = '12px monospace';
    ctx.fillText('|0⟩', centerX + 5, centerY - radius - 15);
    ctx.fillText('|1⟩', centerX + 5, centerY + radius + 20);

    // Calculate qubit state position (animated)
    const theta = (rotation.x * Math.PI / 180) % (Math.PI * 2);
    const phi = (rotation.y * Math.PI / 180) % (Math.PI * 2);
    
    const stateX = centerX + radius * Math.sin(theta) * Math.cos(phi) * 0.8;
    const stateY = centerY - radius * Math.cos(theta) * 0.8;

    // Draw state vector
    ctx.strokeStyle = 'rgba(255, 0, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(stateX, stateY);
    ctx.stroke();

    // Draw state point
    ctx.fillStyle = '#ff00ff';
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(stateX, stateY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw center point
    ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    ctx.fill();

  }, [rotation]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-white font-mono font-medium">Quantum State Visualization</h4>
          <p className="text-xs text-gray-500 font-mono">Qiskit Runtime - Bloch Sphere</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(0,255,0,0.8)] animate-pulse" />
          <span className="text-xs text-green-400 font-mono">LIVE</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* 3D Qubit Bloch Sphere */}
        <div className="relative rounded-xl border border-purple-500/30 bg-black/80 p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-950/20 to-transparent rounded-xl" />
          <div className="relative z-10">
            <p className="text-xs text-purple-400 font-mono mb-2 uppercase">Qubit State (Bloch Sphere)</p>
            <canvas
              ref={canvasRef}
              width={200}
              height={200}
              className="mx-auto"
            />
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-gray-900/50 rounded p-2">
                <span className="text-gray-500">θ:</span>
                <span className="text-cyan-400 ml-1">{(rotation.x % 360).toFixed(1)}°</span>
              </div>
              <div className="bg-gray-900/50 rounded p-2">
                <span className="text-gray-500">φ:</span>
                <span className="text-fuchsia-400 ml-1">{(rotation.y % 360).toFixed(1)}°</span>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Analysis (Pond) */}
        <div className="relative rounded-xl border border-cyan-500/30 bg-black/80 p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/20 to-transparent rounded-xl" />
          <div className="relative z-10">
            <p className="text-xs text-cyan-400 font-mono mb-2 uppercase">Wave Analysis (Pond)</p>
            <div className="h-[120px] flex items-end gap-0.5">
              {waveData.map((value, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-cyan-500/80 to-cyan-400/40 rounded-t transition-all duration-100"
                  style={{ height: `${(value + 1) * 50}%` }}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs font-mono text-gray-500">
              <span>t-50</span>
              <span>Amplitude</span>
              <span>t</span>
            </div>
          </div>
        </div>
      </div>

      {/* Probability Distribution */}
      <div className="relative rounded-xl border border-fuchsia-500/30 bg-black/80 p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-950/20 to-transparent rounded-xl" />
        <div className="relative z-10">
          <p className="text-xs text-fuchsia-400 font-mono mb-3 uppercase">Measurement Probability Distribution</p>
          <div className="flex items-end gap-2 h-24">
            {probabilityData.map((prob, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-gradient-to-t from-fuchsia-500/80 to-fuchsia-400/40 rounded-t transition-all duration-300"
                  style={{ height: `${prob * 100}%` }}
                />
                <span className="text-[10px] font-mono text-gray-500">|{i.toString(2).padStart(3, '0')}⟩</span>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-xs font-mono">
            <div className="bg-gray-900/50 rounded p-2 text-center">
              <span className="text-gray-500 block">Fidelity</span>
              <span className="text-green-400">98.7%</span>
            </div>
            <div className="bg-gray-900/50 rounded p-2 text-center">
              <span className="text-gray-500 block">Shots</span>
              <span className="text-cyan-400">8192</span>
            </div>
            <div className="bg-gray-900/50 rounded p-2 text-center">
              <span className="text-gray-500 block">Qubits</span>
              <span className="text-fuchsia-400">3</span>
            </div>
            <div className="bg-gray-900/50 rounded p-2 text-center">
              <span className="text-gray-500 block">Depth</span>
              <span className="text-orange-400">12</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuantumVisualization;
