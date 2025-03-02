import { describe, test, expect } from "vitest";
import { generatePatches } from "../masterStore/patchGenerator";


describe("generatePatches", () => {
    test("replaces a value when changed", () => {
        const prevState = { count: 1 };
        const nextState = { count: 2 };

        const patches = generatePatches(prevState, nextState);

        expect(patches).toEqual([
            { op: "replace", path: ["count"], value: 2 },
        ]);
    });

    test("adds a new key", () => {
        const prevState = { count: 1 };
        const nextState = { count: 1, newKey: "added" };

        const patches = generatePatches(prevState, nextState);

        expect(patches).toEqual([
            { op: "add", path: ["newKey"], value: "added" },
        ]);
    });

    test("removes a key", () => {
        const prevState = { count: 1, toBeRemoved: "delete me" };
        const nextState = { count: 1 };

        const patches = generatePatches(prevState, nextState);

        expect(patches).toEqual([
            { op: "remove", path: ["toBeRemoved"] },
        ]);
    });

    test("handles nested objects", () => {
        const prevState = { user: { name: "Alice", age: 25 } };
        const nextState = { user: { name: "Alice", age: 26 } };

        const patches = generatePatches(prevState, nextState);

        expect(patches).toEqual([
            { op: "replace", path: ["user", "age"], value: 26 },
        ]);
    });

    test("handles multiple changes in state", () => {
        const prevState = { user: { name: "Alice", age: 25 }, loggedIn: true };
        const nextState = { user: { name: "Bob", age: 26 }, loggedIn: false };

        const patches = generatePatches(prevState, nextState);

        expect(patches).toEqual([
            { op: "replace", path: ["user", "name"], value: "Bob" },
            { op: "replace", path: ["user", "age"], value: 26 },
            { op: "replace", path: ["loggedIn"], value: false },
        ]);
    });

    test("handles empty state changes correctly", () => {
        const prevState = {};
        const nextState = { newKey: "value" };

        const patches = generatePatches(prevState, nextState);

        expect(patches).toEqual([
            { op: "add", path: ["newKey"], value: "value" },
        ]);
    });

    // --- ARRAY TEST CASES ---
    test("replaces an array element", () => {
        const prevState = { items: ["apple", "banana", "cherry"] };
        const nextState = { items: ["apple", "grape", "cherry"] };

        const patches = generatePatches(prevState, nextState);

        expect(patches).toEqual([
            { op: "replace", path: ["items"], value: ["apple", "grape", "cherry"] },
        ]);
    });

    test("adds a new element to an array", () => {
        const prevState = { items: ["apple", "banana"] };
        const nextState = { items: ["apple", "banana", "cherry"] };

        const patches = generatePatches(prevState, nextState);

        expect(patches).toEqual([
            { op: "replace", path: ["items"], value: ["apple", "banana", "cherry"] },
        ]);
    });

    test("removes an element from an array", () => {
        const prevState = { items: ["apple", "banana", "cherry"] };
        const nextState = { items: ["apple", "cherry"] };

        const patches = generatePatches(prevState, nextState);

        expect(patches).toEqual([
            { op: "replace", path: ["items"], value: ["apple", "cherry"] },
        ]);
    });

    test("replaces the entire array", () => {
        const prevState = { items: ["apple", "banana"] };
        const nextState = { items: ["grape", "orange"] };

        const patches = generatePatches(prevState, nextState);

        expect(patches).toEqual([
            { op: "replace", path: ["items"], value: ["grape", "orange"] },
        ]);
    });

    test("handles nested arrays", () => {
        const prevState = { users: [{ name: "Alice" }, { name: "Bob" }] };
        const nextState = { users: [{ name: "Alice" }, { name: "Charlie" }] };

        const patches = generatePatches(prevState, nextState);

        expect(patches).toEqual([
            { op: "replace", path: ["users"], value: [{ name: "Alice" }, { name: "Charlie" }] },
        ]);
    });

    test("removes an array completely", () => {
        const prevState = { items: ["apple", "banana"] };
        const nextState = {}; // `items` is removed

        const patches = generatePatches(prevState, nextState);

        expect(patches).toEqual([
            { op: "remove", path: ["items"] }, // `items` key is removed
        ]);
    });
});
