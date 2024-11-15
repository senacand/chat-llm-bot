import { expect, test, describe } from "bun:test";
import { getKhodam } from "../../src/tools/get-khodam";

describe("getKhodam", () => {
    test("should return consistent khodam for same user in same week", async () => {
        const userId = "123456789";
        const result1 = await getKhodam.function({ userId });
        const result2 = await getKhodam.function({ userId });

        expect(result1.userId).toBe(userId);
        expect(result1.khodam).toBe(result2.khodam);
        expect(result1.khodamWeek).toBe(result2.khodamWeek);
    });

    test("should return different khodam for different users in same week", async () => {
        const result1 = await getKhodam.function({ userId: "123456789" });
        const result2 = await getKhodam.function({ userId: "987654321" });

        expect(result1.khodam).not.toBe(result2.khodam);
        expect(result1.khodamWeek).toBe(result2.khodamWeek);
    });

    test("should have valid khodam format", async () => {
        const result = await getKhodam.function({ userId: "123456789" });
        
        expect(result.khodam.split(" ").length).toBe(2);
        expect(typeof result.khodam).toBe("string");
        expect(typeof result.khodamWeek).toBe("string");
        expect(result.khodamWeek).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test("should validate required userId parameter", async () => {
        expect(getKhodam.parameters.required).toContain("userId");
        expect(getKhodam.parameters.properties.userId.type).toBe("string");
    });

    test("should return correct functionInfo", () => {
        const userId = "123456789";
        const info = getKhodam.functionInfo({ userId });
        expect(info).toBe(`Membaca khodam <@${userId}>`);
    });
});