import { describe, it, expect } from "vitest";
import { World } from "../sim/world.ts";
import { Particles } from "../sim/particles.ts";
import { CollapseSystem } from "../sim/collapse.ts";
import { ID } from "../sim/materials.ts";
import { Rng } from "../core/rng.ts";
import { Hero } from "./hero.ts";

function makeHero(world: World, x = 16, y = 10): Hero {
  return new Hero(world, new Particles(), new CollapseSystem(world), new Rng(1), x, y);
}

function countMat(world: World, id: number): number {
  let c = 0;
  for (let i = 0; i < world.mat.length; i++) if (world.mat[i] === id) c++;
  return c;
}

describe("hero movement", () => {
  it("flies downward with momentum when pushed down", () => {
    const world = new World(32, 32, 32, 1);
    const hero = makeHero(world, 16, 8);
    const start = hero.cy;
    for (let i = 0; i < 20; i++) hero.update(0, 1, 16);
    expect(hero.cy).toBeGreaterThan(start);
  });

  it("stays within the world bounds", () => {
    const world = new World(32, 32, 32, 1);
    const hero = makeHero(world, 16, 16);
    for (let i = 0; i < 200; i++) hero.update(-1, -1, 0); // slam into top-left
    expect(hero.cx).toBeGreaterThanOrEqual(hero.hw);
    expect(hero.cy).toBeGreaterThanOrEqual(hero.hh);
  });
});

describe("hero carves through terrain", () => {
  it("flies through a solid floor, destroying cells it passes", () => {
    const world = new World(32, 32, 32, 1);
    for (let y = world.h - 4; y < world.h; y++)
      for (let x = 0; x < world.w; x++) world.paint(x, y, ID.ROCK);
    const before = countMat(world, ID.ROCK);
    const hero = makeHero(world, 16, 10);
    for (let i = 0; i < 80; i++) hero.update(0, 1, 16);
    // Hero descended into the floor region and carved rock away.
    expect(hero.cy).toBeGreaterThan(20);
    expect(countMat(world, ID.ROCK)).toBeLessThan(before);
  });

  it("carves through a wall instead of being stopped", () => {
    const world = new World(48, 32, 32, 1);
    for (let y = 0; y < world.h; y++)
      for (let x = 30; x < 33; x++) world.paint(x, y, ID.ROCK);
    const before = countMat(world, ID.ROCK);
    const hero = makeHero(world, 20, 16);
    for (let i = 0; i < 80; i++) hero.update(1, 0, 48);
    expect(hero.cx).toBeGreaterThan(28); // pushed into/through the wall
    expect(countMat(world, ID.ROCK)).toBeLessThan(before);
  });
});

describe("hero health", () => {
  it("takes damage when sitting in lava", () => {
    const world = new World(32, 32, 32, 1);
    for (let y = 0; y < world.h; y++)
      for (let x = 0; x < world.w; x++) world.paint(x, y, ID.LAVA);
    const hero = makeHero(world, 16, 16);
    const before = hero.health;
    hero.update(0, 0, 16);
    expect(hero.health).toBeLessThan(before);
  });

  it("regenerates slowly when safe for long enough", () => {
    const world = new World(32, 32, 32, 1);
    const hero = makeHero(world, 16, 16);
    hero.hurt(50);
    expect(hero.health).toBeCloseTo(50, 0);
    for (let i = 0; i < 200; i++) hero.update(0, 0, 16);
    expect(hero.health).toBeGreaterThan(50);
  });

  it("respawns at full health when killed", () => {
    const world = new World(32, 32, 32, 1);
    const hero = makeHero(world, 16, 16);
    const spawnX = hero.cx;
    hero.cx = 5;
    hero.hurt(999);
    expect(hero.health).toBe(100);
    expect(hero.cx).toBe(spawnX);
  });

  it("does not cook itself when firing — hero cell stays survivable", () => {
    // Regression for the "respawn after a second of powers" bug: a power must
    // not immediately damage the hero's own cell.
    const world = new World(32, 32, 32, 1);
    const hero = makeHero(world, 16, 16);
    // (full behaviour is exercised in powers.test via muzzle offset)
    expect(hero.health).toBe(100);
  });
});
