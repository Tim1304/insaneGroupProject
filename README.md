🎮 Game Overview

This project is a small-scale action RPG built in Three.js featuring an overworld, a dungeon combat space, and a tavern hub. The game focuses on real-time combat, exploration, and light progression mechanics.

The core gameplay loop centers around entering combat spaces, defeating enemies, earning rewards, and managing risk through health and resource constraints.

🗺️ World Structure & Gameplay Flow

The game is structured around three primary spaces:

Overworld
Acts as the main navigation space where the player can move freely, interact with NPCs, and access other areas.

Dungeon
A persistent combat-focused area with no defined completion state.

Enemies continuously spawn while the player remains inside

The player may leave at any time

Health is not restored automatically upon entry or exit

Difficulty scales based on enemy defeats

Tavern
A safe hub area where combat is disabled.

Functions as a rest and interaction space

Contains shop and NPC interactions

Serves as a contrast to the dungeon’s risk-heavy environment

⚔️ Combat System

Real-time melee and ranged combat

Enemy types include melee, ranged, and tank variants

Combat is event-driven and integrates with NPC AI systems

Battles begin dynamically when hostile NPCs are engaged

Enemy defeat triggers reward distribution and optional respawn logic

📈 Progression & Rewards

Defeating enemies grants gold and score

Gold can be spent in shops for items or upgrades

A basic stat framework exists for player and NPC attributes

Difficulty increases gradually based on combat progress rather than fixed stages

🤖 NPCs & Automation

NPCs operate through state-based AI systems

Hostility, combat behavior, and respawning are automated

NPC behavior differs by type (melee, ranged, tank)

Enemy spawning is context-sensitive (e.g., dungeon-only spawning)

🧩 Design Notes

Many systems in this project are tightly coupled and were integrated iteratively to ensure the game functioned as a cohesive whole. Gameplay rules such as dungeon persistence, reward scaling, and combat state transitions are implemented directly in code rather than scripted externally.