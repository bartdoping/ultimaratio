import { hashPassword, verifyPassword } from "../lib/password"

describe("password hashing", () => {
  it("hashes & verifies", async () => {
    const hash = await hashPassword("ChangeMe123!")
    expect(hash).toMatch(/^\$2[aby]\$/)
    expect(await verifyPassword("ChangeMe123!", hash)).toBe(true)
    expect(await verifyPassword("wrong", hash)).toBe(false)
  })
})
