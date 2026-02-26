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
        await loadFull(engine); // Revert to loadFull to fix build error
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
                    value: ["hsl(var(--verity-gold) / 0.1)", "hsl(var(--verity-gold-dim) / 0.05)", "hsl(var(--background) / 0.2)"], // Luxury subtle palette
                },
                links: {
                    color: "hsl(var(--foreground) / 0.1)", // Subtle links
                    distance: 150,
                    enable: true,
                    opacity: 0.05, // Very subtle links
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
                    speed: speed * 0.5, // Slower for floating dust
                    straight: false,
                },
                number: {
                    density: {
                        enable: true,
                        area: 800,
                    },
                    value: density * 0.3, // Reduced density
                },
                opacity: {
                    value: { min: 0.05, max: 0.15 }, // Very low opacity range
                },
                shape: {
                    type: "circle",
                },
                size: {
                    value: { min: 0.5, max: 1.5 }, // Smaller particles
                },
            },
            detectRetina: true,
        };

        switch (mode) {
            case "converging":
                baseOptions.particles.move.direction = "right";
                baseOptions.particles.move.speed = speed * 2;
                baseOptions.particles.color.value = ["hsl(var(--verity-gold) / 0.2)", "hsl(var(--verity-gold-dim) / 0.1)"]; // Converging luxury gold
                baseOptions.interactivity.modes.repulse.distance = 50;
                baseOptions.interactivity.modes.repulse.duration = 0.8;
                break;
            case "exploding":
                baseOptions.particles.move.direction = "random";
                baseOptions.particles.move.speed = speed * 3; // Slightly slower explosion
                baseOptions.particles.size.value = { min: 1.5, max: 4 }; // Smaller explosion particles
                baseOptions.particles.opacity.value = { min: 0.3, max: 0.6 }; // Reduced explosion opacity
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
