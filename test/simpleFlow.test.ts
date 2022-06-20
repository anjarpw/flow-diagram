import { generateGraph } from "../src/flow"
import { generateAddedBy, generateMultiplyBy, MyContext } from "./tool"

const addedBy1 = generateAddedBy(1)
const multiplyBy2 = generateMultiplyBy(2)
const addedBy2 = generateAddedBy(2)
const multiplyBy3 = generateMultiplyBy(3)
const graph = generateGraph<MyContext>()
  .register("STEP1", multiplyBy2)
  .continuedBy("STEP2", addedBy1)
  .continuedBy("STEP3", addedBy2)
  .continuedBy("STEP4", multiplyBy3)


describe('Simple Flow', () => {
  test('Simple Flow 1', async () => {
    const ctx = { log: [] }
    // given
    const flow = graph.generateStream("STEP1", "STEP2")

    // when
    const result = await flow.run(3, ctx)

    // then
    expect(result).toEqual(7)
    expect(ctx.log).toEqual([
      "MULTIPLiED BY 2, 3 becomes 6",
      "ADDED BY 1, 6 becomes 7"
    ])
  })
  test('Simple Flow 2', async () => {
    const ctx = { log: [] }
    // given
    const flow = graph.generateStream("STEP2", "STEP4")

    // when
    const result = await flow.run(5, ctx)

    // then
    expect(result).toEqual(24)
    expect(ctx.log).toEqual([
      "ADDED BY 1, 5 becomes 6",
      "ADDED BY 2, 6 becomes 8",
      "MULTIPLiED BY 3, 8 becomes 24",
    ])
  })

})