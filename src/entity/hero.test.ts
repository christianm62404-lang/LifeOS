import { describe, it, expect } from "vitest";
import { World } from "../sim/world.ts";
import { ID } from "../sim/materials.ts";
import { Hero } from "./hero.ts";

describe("hero movement & collision", () => {
  it("falls/flies downward with momentum when pushed down", () => {
    const world = new World(32, 32, 32, 1);
    const hero = new Hero(world, 16, 8);
    const start = hero.cy;
    for (let i = 0; i < 20; i++) hero.update(0, 1, 16);
    expect(hero.cy).toBeGreaterThan(start);
  });

  it("cannot pass through a solid floor", () => {
    const world = new World(32, 32, 32, 1);
    // Solid floor across the bottom 4 rows.
    for (let y = world.h - 4; y < world.h; y++)
      for (let x = 0; x < world.w; x++) world.paint(x, y, ID.ROCK);
    const hero = new Hero(world, 16, 10);
    for (let i = 0; i < 80; i++) hero.update(0, 1, 16);
    // The hero's bottom edge must stay above the floor top (y = h-4).
    expect(Math.ceil(hero.cy + hero.hh)).toBeLessThanOrEqual(world.h - 4);
  });

  it("is blocked by a wall when flying sideways", () => {
    const world = new World(48, 32, 32, 1);
    for (let y = 0; y < world.h; y++)
      for (let x = 30; x < 33; x++) world.paint(x, y, ID.ROCK); // vertical wall
    const hero = new Hero(world, 20, 16);
    for (let i = 0; i < 80; i++) hero.update(1, 0, 48);
    // Hero's right edge cannot cross into the wall at x=30.
    expect(Math.ceil(hero.cx + hero.hw)).toBeLessThanOrEqual(30);
  });
});

describe("hero health", () => {
  it("takes damage when sitting in lava", () => {
    const world = new World(32, 32, 32, 1);
    for (let y = 0; y < world.h; y++)
      for (let x = 0; x < world.w; x++) world.paint(x, y, ID.LAVA);
    const hero = new Hero(world, 16, 16);
    const before = hero.health;
    hero.update(0, 0, 16);
    expect(hero.health).toBeLessThan(before);
  });

  it("regenerates slowly when safe for long enough", () => {
    const world = new World(32, 32, 32, 1);
    const hero = new Hero(world, 16, 16);
    hero.hurt(50);
    expect(hero.health).toBeCloseTo(50, 0);
    for (let i = 0; i < 200; i++) hero.update(0, 0, 16);
    expect(hero.health).toBeGreaterThan(50);
  });

  it("respawns at full health when killed", () => {
    const world = new World(32, 32, 32, 1);
    const hero = new Hero(world, 16, 16);
    const spawnX = hero.cx;
    hero.cx = 5; // move away from spawn
    hero.hurt(999);
    expect(hero.health).toBe(100);
    expect(hero.cx).toBe(spawnX);
  });
});
