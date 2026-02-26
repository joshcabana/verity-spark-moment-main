import React, { useCallback, useMemo } from "react";
import Particles from "react-tsparticles";
import type { Container, Engine, ISourceOptions } from "tsparticles-engine";
import { loadFull } from "tsparticles"; // loads tsparticles and all its plugins

interface SparkParticleSystemProps {
    mode?: "ambient" | "converging" | "exploding";
    density?: number;
    speed?: number;
    className?: string;
}

const SparkParticleSystem: React.FC<SparkParticleSystemProps> = ({ mode = "ambient", density = 100, speed = 0.4, className }) => {
    const particlesInit = useCallback(async (engine: Engine) => {
        await loadFull(engine);
    }, []);

    const particlesLoaded = useCallback(async (container?: Container) => {
        // console.log("Particles container loaded", container);
    }, []);

    const options = useMemo(() => {
        const baseOptions: ISourceOptions = {
            background: {
                color: { value: "transparent" },
            },
            fpsLimit: 60,
            interactivity: {
                events: {
                    onClick: {
                        enable: true,
                        mode: "push",
                    },
                    onHover: {
                        enable: true,
                        mode: "repulse",
                    },
                    resize: true,
                },
                modes: {
                    push: {
                        quantity: 4,
                    },
                    repulse: {
                        distance: 100,
                        duration: 0.4,
                    },
                },
            },
            particles: {
                color: {
                    value: ["#8A2BE2", "#39FF14", "#FF4500", "#E0E0E0"], // Electric Bloom palette
                },
                links: {
                    color: "#E0E0E0",
                    distance: 150,
                    enable: true,
                    opacity: 0.3,
                    width: 1,
                },
                collisions: {
                    enable: true,
                },
                move: {
                    direction: "none",
                    enable: true,
                    outModes: {
                        default: "bounce",
                    },
                    random: true,
                    speed: speed,
                    straight: false,
                },
                number: {
                    density: {
                        enable: true,
                        area: 800,
                    },
                    value: density,
                },
                opacity: {
                    value: 0.5,
                },
                shape: {
                    type: "circle",
                },
                size: {
                    value: { min: 1, max: 3 },
                },
            },
            detectRetina: true,
        };

        switch (mode) {
            case "converging":
                baseOptions.particles.move.direction = "right";
                baseOptions.particles.move.speed = speed * 2;
                baseOptions.particles.color.value = ["#8A2BE2", "#FF4500"]; // Focus on converging colors
                baseOptions.interactivity.modes.repulse.distance = 50;
                baseOptions.interactivity.modes.repulse.duration = 0.8;
                break;
            case "exploding":
                baseOptions.particles.move.direction = "random";
                baseOptions.particles.move.speed = speed * 5;
                baseOptions.particles.size.value = { min: 3, max: 7 };
                baseOptions.particles.opacity.value = 0.8;
                baseOptions.particles.links.opacity = 0;
                baseOptions.particles.life = { count: 1 }; // Particles disappear after a short life
                break;
            case "ambient":
            default:
                // Default ambient options already set
                break;
        }

        return baseOptions;
    }, [mode, density, speed]);

    return (
        <div className={`absolute inset-0 ${className || ''}`}>
            <Particles
                id="tsparticles"
                init={particlesInit}
                loaded={particlesLoaded}
                options={options}
            />
        </div>
    );
};

export default SparkParticleSystem;
