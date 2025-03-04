import { describe, vi, it, expect } from "vitest";
import { isProxyStore } from "../main";

import { Store } from "@reduxjs/toolkit";
import { SYNC_KEY } from "../constants";

describe("isProxyStore", () => {
    it("should return true if object has proxyStore keys", () => {
        const storeMock = {
            getState: vi.fn().mockReturnValue({
                [SYNC_KEY]: false,
            })
        }
        const result = isProxyStore(storeMock as unknown as Store);
        expect(result).toBe(true);
    });

    it("should return false if object has no proxyStore keys", () => {
        const storeMock = {
            getState: vi.fn().mockReturnValue({
                "some_key": false,
            })
        }
        const result = isProxyStore(storeMock as unknown as Store);
        expect(result).toBe(false);
    });

});