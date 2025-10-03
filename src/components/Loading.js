import React, { useRef, useEffect, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Stars } from "@react-three/drei";
import Globe from "react-globe.gl";
import { MapContainer, TileLayer } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as THREE from "three";

// Fix default Marker icon
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// 3D Spaceship Component
function Spaceship3D({ transitionProgress, isVisible }) {
  const { scene } = useGLTF("/spaceship.glb");
  const meshRef = useRef();
  const groupRef = useRef();
  
  // Clone the scene to avoid conflicts
  const clonedScene = scene.clone();
  
  // Keep original materials from GLB model
  useEffect(() => {
    if (clonedScene) {
      console.log("Spaceship model loaded:", clonedScene);
      clonedScene.traverse((child) => {
        if (child.isMesh) {
          console.log("Mesh found:", child.name, "Original material:", child.material);
          
          // Keep original material, just ensure it's properly configured
          if (child.material) {
            child.material.needsUpdate = true;
            child.castShadow = true;
            child.receiveShadow = true;
            console.log("Using original material for", child.name);
          }
        }
      });
    }
  }, [clonedScene]);
  
  useFrame((state, delta) => {
    if (meshRef.current && isVisible) {
      // Rotate the spaceship
      meshRef.current.rotation.y += delta * 2;
      meshRef.current.rotation.x += delta * 0.5;
      
      // Scale based on transition progress
      const scale = 1 + transitionProgress * 0.5;
      meshRef.current.scale.setScalar(scale);
      
      // Add floating animation
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
      
      // Add dynamic glow effect
      const glowIntensity = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
      meshRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          // Enhance existing emissive color
          const baseEmissive = child.material.emissive || new THREE.Color(0x000000);
          child.material.emissive = baseEmissive.clone().multiplyScalar(glowIntensity);
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      <primitive
        ref={meshRef}
        object={clonedScene}
        position={[0, 0, 2]}
        scale={[0.8, 0.8, 0.8]}
      />
    </group>
  );
}

// Particle System for Engine Effects
function EngineParticles({ transitionProgress, isVisible }) {
  const pointsRef = useRef();
  const particleCount = 1000;
  
  useFrame((state, delta) => {
    if (pointsRef.current && isVisible) {
      pointsRef.current.rotation.y += delta * 0.5;
      
      const positions = pointsRef.current.geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        positions[i3 + 1] -= delta * 2; // Move particles down
        if (positions[i3 + 1] < -5) {
          positions[i3 + 1] = 5; // Reset to top
        }
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  if (!isVisible) return null;

  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 1] = Math.random() * 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
  }

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#00bfff"
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}

// 3D Scene Component
function Scene3D({ transitionProgress, isVisible }) {
  return (
    <>
      {/* Enhanced lighting for spaceship visibility */}
      <ambientLight intensity={1.2} color="#ffffff" />
      
      {/* Main spaceship lighting - positioned around the spaceship */}
      <pointLight 
        position={[0, 0, 5]} 
        intensity={4} 
        color="#ffffff" 
        distance={10}
        decay={1}
      />
      <pointLight 
        position={[2, 2, 3]} 
        intensity={3} 
        color="#00bfff" 
        distance={8}
        decay={1}
      />
      <pointLight 
        position={[-2, -2, 3]} 
        intensity={3} 
        color="#ff6b35" 
        distance={8}
        decay={1}
      />
      <pointLight 
        position={[0, 3, 2]} 
        intensity={2.5} 
        color="#ffffff" 
        distance={6}
        decay={1}
      />
      
      {/* Directional lights for overall illumination */}
      <directionalLight 
        position={[5, 5, 5]} 
        intensity={2} 
        color="#ffffff"
        castShadow={false}
      />
      <directionalLight 
        position={[-5, -5, 5]} 
        intensity={1.5} 
        color="#00bfff"
        castShadow={false}
      />
      <directionalLight 
        position={[0, 10, 0]} 
        intensity={1.8} 
        color="#ffffff"
        castShadow={false}
      />
      
      {/* Additional rim lighting */}
      <pointLight 
        position={[0, 0, -2]} 
        intensity={2} 
        color="#ffffff" 
        distance={5}
        decay={1}
      />
      
      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />
      
      <Spaceship3D transitionProgress={transitionProgress} isVisible={isVisible} />
      <EngineParticles transitionProgress={transitionProgress} isVisible={isVisible} />
    </>
  );
}

const Loading = ({ 
  features, 
  selectedName, 
  transitionTarget, 
  onTransitionComplete 
}) => {
  const globeRef = useRef();
  const mapRef = useRef();
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [showGlobe, setShowGlobe] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [show3DScene, setShow3DScene] = useState(true);
  const animationRef = useRef();

  useEffect(() => {
    if (!transitionTarget) return;

    const startTransition = () => {
      let progress = 0;
      const duration = 2000; // 2 seconds for impressive 3D animation
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        progress = Math.min(elapsed / duration, 1);
        
        setTransitionProgress(progress);

        // Start showing map when we're 85% through
        if (progress > 0.85 && !showMap) {
          setShowMap(true);
        }

        // Start fading 3D scene and globe when we're 90% through
        if (progress > 0.9) {
          setShowGlobe(false);
          setShow3DScene(false);
        }

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          // Transition complete
          setTimeout(() => {
            onTransitionComplete?.();
          }, 200);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    };

    startTransition();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [transitionTarget, onTransitionComplete, showMap]);

  // Calculate camera position for smooth zoom
  const getCameraPosition = () => {
    if (!transitionTarget) return { lat: 0, lng: 0, altitude: 2 };

    const { lat, lng } = transitionTarget;
    
    // Start from far away (space view)
    const startAltitude = 3;
    // End at map view
    const endAltitude = 0.1;
    
    // Smooth interpolation with easing
    const easedProgress = 1 - Math.pow(1 - transitionProgress, 3);
    const altitude = startAltitude + (endAltitude - startAltitude) * easedProgress;
    
    return { lat, lng, altitude };
  };

  const cameraPosition = getCameraPosition();

  // Enhanced target reticle with dynamic animations
  const TargetReticle = () => {
    const reticleOpacity = Math.max(0, (transitionProgress - 0.5) * 2);
    const reticleScale = 1 + Math.sin(Date.now() * 0.01) * 0.1;
    
    return (
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${reticleScale})`,
          width: '100px',
          height: '100px',
          opacity: reticleOpacity,
          zIndex: 8,
          animation: 'pulse 0.5s infinite alternate',
        }}
      >
        <svg width="100" height="100" viewBox="0 0 100 100">
          {/* Outer rings */}
          <circle cx="50" cy="50" r="45" fill="none" stroke="#00bfff" strokeWidth="1" opacity="0.4" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="#00bfff" strokeWidth="2" opacity="0.6" />
          <circle cx="50" cy="50" r="35" fill="none" stroke="#00bfff" strokeWidth="3" opacity="0.8" />
          
          {/* Inner crosshair */}
          <line x1="50" y1="20" x2="50" y2="80" stroke="#ffffff" strokeWidth="4" />
          <line x1="20" y1="50" x2="80" y2="50" stroke="#ffffff" strokeWidth="4" />
          
          {/* Corner brackets */}
          <line x1="25" y1="25" x2="35" y2="25" stroke="#ff6b35" strokeWidth="3" />
          <line x1="25" y1="25" x2="25" y2="35" stroke="#ff6b35" strokeWidth="3" />
          <line x1="65" y1="25" x2="75" y2="25" stroke="#ff6b35" strokeWidth="3" />
          <line x1="75" y1="25" x2="75" y2="35" stroke="#ff6b35" strokeWidth="3" />
          <line x1="25" y1="65" x2="25" y2="75" stroke="#ff6b35" strokeWidth="3" />
          <line x1="25" y1="75" x2="35" y2="75" stroke="#ff6b35" strokeWidth="3" />
          <line x1="65" y1="75" x2="75" y2="75" stroke="#ff6b35" strokeWidth="3" />
          <line x1="75" y1="65" x2="75" y2="75" stroke="#ff6b35" strokeWidth="3" />
          
          {/* Center dot */}
          <circle cx="50" cy="50" r="6" fill="#ff6b35">
            <animate attributeName="r" values="6;12;6" dur="0.5s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>
    );
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", background: "#000" }}>
      {/* Globe View */}
      {showGlobe && (
        <div 
          style={{ 
            position: "absolute", 
            width: "100%", 
            height: "100%",
            opacity: Math.max(0, 1 - (transitionProgress - 0.9) * 10),
            zIndex: 2
          }}
        >
          <Globe
            ref={globeRef}
            backgroundColor="#000"
            waitForGlobeReady={false}
            showGlobe={false}
            polygonsData={features}
            polygonLabel={(d) => d.properties.name}
            polygonAltitude={(d) =>
              d?.properties?.name === selectedName ? 0.07 : 0.01
            }
            polygonCapColor={(d) =>
              d?.properties?.name === selectedName
                ? "rgba(255,80,120,0.9)"
                : "rgba(40,150,220,0.85)"
            }
            polygonSideColor={() => "rgba(255,255,255,0.2)"}
            polygonStrokeColor={() => "rgba(255,255,255,0.4)"}
            polygonsTransitionDuration={250}
            pointOfView={cameraPosition}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      )}

      {/* 3D Scene - Render on top of globe */}
      {show3DScene && (
        <div 
          style={{ 
            position: "absolute", 
            width: "100%", 
            height: "100%",
            opacity: Math.max(0, 1 - (transitionProgress - 0.9) * 10),
            zIndex: 4
          }}
        >
          <Canvas
            camera={{ position: [0, 0, 5], fov: 75 }}
            style={{ background: 'transparent' }}
          >
            <Suspense fallback={null}>
              <Scene3D transitionProgress={transitionProgress} isVisible={show3DScene} />
            </Suspense>
          </Canvas>
        </div>
      )}

      {/* Map View */}
      {showMap && (
        <div 
          style={{ 
            position: "absolute", 
            width: "100%", 
            height: "100%",
            opacity: Math.max(0, (transitionProgress - 0.85) * 6.67),
            zIndex: 1
          }}
        >
          <MapContainer
            center={[transitionTarget?.lat || 0, transitionTarget?.lng || 0]}
            zoom={Math.max(3, 8 - (1 - transitionProgress) * 5)}
            style={{ width: "100%", height: "100%", zIndex: 1 }}
            worldCopyJump
            whenCreated={(m) => (mapRef.current = m)}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              noWrap
            />
          </MapContainer>
        </div>
      )}

      {/* Target Reticle */}
      <TargetReticle />

      {/* Enhanced Loading Text */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#fff',
          fontSize: '24px',
          fontFamily: 'system-ui',
          fontWeight: 'bold',
          zIndex: 15,
          opacity: 0.9,
          textShadow: '0 0 20px #00bfff, 0 0 40px #ff6b35',
          animation: 'textGlow 1s infinite alternate',
          textAlign: 'center',
          padding: '0 20px',
          // Mobile responsive
          [`@media (max-width: 768px)`]: {
            fontSize: '20px',
            bottom: '15px',
            padding: '0 15px'
          },
          [`@media (max-width: 480px)`]: {
            fontSize: '16px',
            bottom: '10px',
            padding: '0 10px'
          }
        }}
      >
        {transitionProgress < 0.2 ? '🚀 INITIATING 3D WARP DRIVE...' : 
         transitionProgress < 0.4 ? '⚡ ACCELERATING TO LIGHTSPEED...' : 
         transitionProgress < 0.6 ? '🌟 TRAVELING THROUGH SPACE...' : 
         transitionProgress < 0.8 ? '🎯 APPROACHING DESTINATION...' : 
         '🌍 LANDING AND SWITCHING TO MAP...'}
      </div>

      {/* Enhanced Progress Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: '70px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '400px',
          height: '6px',
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '3px',
          overflow: 'hidden',
          zIndex: 15,
          border: '2px solid #00bfff',
          // Mobile responsive
          [`@media (max-width: 768px)`]: {
            width: '300px',
            bottom: '60px',
            height: '5px'
          },
          [`@media (max-width: 480px)`]: {
            width: '250px',
            bottom: '50px',
            height: '4px'
          }
        }}
      >
        <div
          style={{
            width: `${transitionProgress * 100}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #00bfff, #ff6b35, #ffffff)',
            borderRadius: '3px',
            transition: 'width 0.1s ease-out',
            boxShadow: '0 0 20px #00bfff',
            animation: 'progressGlow 0.5s infinite alternate',
          }}
        />
      </div>

      {/* Enhanced CSS animations */}
      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          100% { transform: scale(1.1); }
        }
        
        @keyframes textGlow {
          0% { text-shadow: 0 0 20px #00bfff, 0 0 40px #ff6b35; }
          100% { text-shadow: 0 0 30px #00bfff, 0 0 60px #ff6b35, 0 0 90px #ffffff; }
        }
        
        @keyframes progressGlow {
          0% { box-shadow: 0 0 20px #00bfff; }
          100% { box-shadow: 0 0 30px #00bfff, 0 0 50px #ff6b35; }
        }
      `}</style>
    </div>
  );
};

export default Loading;