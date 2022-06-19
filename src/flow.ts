import { IFlow, IOptions, IWhen, ProcessResult, SuccessfulProcessResult } from "./types"


export class Flow<TStart, TIn, TCtx> implements IFlow<TStart, TIn, TCtx>{

  triggeringFunc: (start: TStart, ctx?: TCtx) => Promise<ProcessResult<TIn>>

  constructor(triggeringFunc: (start: TStart, ctx?: TCtx) => Promise<ProcessResult<TIn>>) {
      this.triggeringFunc = triggeringFunc
  }

  continuedBy<TOutNext>(func: (input: TIn, ctx?: TCtx) => Promise<TOutNext>): IFlow<TStart, TOutNext, TCtx> {
      return new Flow(async (start: TStart, ctx?: TCtx) => {
          try {
              const x = await this.triggeringFunc(start, ctx)
              if (x.action !== "CONTINUED") {
                  return x
              }
              const nextResult = await func(x.result, ctx)
              return {
                  result: nextResult,
                  action: "CONTINUED"
              }
          } catch (e: any) {
              return {
                  error: new Error(e),
                  action: "ERROR"
              }
          }
      })
  }
  continued(): IWhen<TStart, TIn, TCtx> {
      return new When(this.triggeringFunc, async (isCriteriaMet: boolean, prev: SuccessfulProcessResult<TIn>) => {
          if (isCriteriaMet) {
              return prev
          }
          return {
              action: "STOPPED",
          }
      })
  }
  stopped(): IWhen<TStart, TIn, TCtx> {
      return new When(this.triggeringFunc, async (isCriteriaMet: boolean, prev: SuccessfulProcessResult<TIn>) => {
          if (isCriteriaMet) {
              return {
                  action: "STOPPED",
              }
          }
          return prev
      })
  }
  alteredTo(flow: IFlow<TIn, TIn, TCtx>): IWhen<TStart, TIn, TCtx> {
      return new When(this.triggeringFunc, async (isCriteriaMet: boolean, prev: SuccessfulProcessResult<TIn>, ctx?: TCtx) => {
          if (isCriteriaMet) {
              const result = await flow.startWith(prev.result, ctx)
              return {
                  action: "ALTERED",
                  result
              }
          }
          return prev
      })
  }
  alteredToAnyOf(flows: Record<string, IFlow<TIn, TIn, TCtx>>): IOptions<TStart, TIn, TCtx> {
      return new PostEvaluationCriteria<TStart, TIn, string, TCtx>(this.triggeringFunc, async (criteria: string, prev: SuccessfulProcessResult<TIn>, ctx?: TCtx) => {
          if (criteria && flows[criteria]) {
              const result = await flows[criteria].startWith(prev.result, ctx)
              return {
                  action: "ALTERED",
                  result
              }
          }
          return prev
      })
  }

  steppingInto(flow: IFlow<TIn, TIn, TCtx>): IWhen<TStart, TIn, TCtx> {
      return new When(this.triggeringFunc, async (isCriteriaMet: boolean, prev: SuccessfulProcessResult<TIn>, ctx?: TCtx) => {
          if (isCriteriaMet) {
              return await flow.evaluate(prev.result, ctx)
          }
          return prev
      })
  }
  steppingIntoAnyOf(flows: Record<string, IFlow<TIn, TIn, TCtx>>): IOptions<TStart, TIn, TCtx> {
      return new PostEvaluationCriteria<TStart, TIn, string, TCtx>(this.triggeringFunc, async (criteria: string, prev: SuccessfulProcessResult<TIn>, ctx?: TCtx) => {
          if (criteria && flows[criteria]) {
              return await flows[criteria].evaluate(prev.result, ctx)
          }
          return prev
      })
  }

  async evaluate(start: TStart, ctx?: TCtx): Promise<ProcessResult<TIn>> {
      return await this.triggeringFunc(start, ctx)
  }

  async startWith<T = TIn>(start: TStart, ctx?: TCtx): Promise<T | null> {
      const x = await this.triggeringFunc(start, ctx)
      if (x.action === "CONTINUED" || x.action == "ALTERED") {
          return x.result as any as T
      }
      if (x.action === "ERROR") {
          throw x.error
      }
      if (x.action === "STOPPED") {
          throw new Error("FLOW HAS BEEN STOPPED")
      }
      return null
  }

  splittedInto(flows: Record<string, IFlow<TIn, TIn, TCtx>>){
      return new Mergeable(this.triggeringFunc, flows)
  }
}


export class Mergeable<TStart, TOut, TCtx>{
  triggeringFunc: (start: TStart, ctx?: TCtx) => Promise<ProcessResult<TOut>>
  flows: Record<string, IFlow<TOut, TOut, TCtx>>

  constructor(
      triggeringFunc: (start: TStart, ctx?: TCtx) => Promise<ProcessResult<TOut>>,
      flows: Record<string, IFlow<TOut, TOut, TCtx>>) {
      this.triggeringFunc = triggeringFunc
      this.flows = flows
  }

  onMerge<TOutNext>(func: (dict: Record<string, Promise<any>>, ctx?: TCtx) => Promise<TOutNext>): IFlow<TStart, TOutNext, TCtx> {
      return new Flow(async (start: TStart, ctx?: TCtx) => {
          try {
              const x = await this.triggeringFunc(start, ctx)
              if (x.action !== "CONTINUED") {
                  return x
              }
              const promises: Record<string, Promise<any>> = {}
              Object.keys(this.flows).forEach(key => {
                  promises[key] = this.flows[key].startWith(x.result, ctx)
              })
              const result = await func(promises, ctx)
              return {
                  result,
                  action: "CONTINUED"
              }
          } catch (e: any) {
              return {
                  error: new Error(e),
                  action: "ERROR"
              }
          }
      })
  }
}

export class PostEvaluationCriteria<TStart, TOut, TCriteria, TCtx>{

  triggeringFunc: (start: TStart, ctx?: TCtx) => Promise<ProcessResult<TOut>>
  onCriteriaConcluded: (criteria: TCriteria, prev: SuccessfulProcessResult<TOut>, ctx?: TCtx) => Promise<ProcessResult<TOut>>

  constructor(triggeringFunc: (start: TStart, ctx?: TCtx) => Promise<ProcessResult<TOut>>, onCriteriaConcluded: (criteria: TCriteria, prev: SuccessfulProcessResult<TOut>, ctx?: TCtx) => Promise<ProcessResult<TOut>>) {
      this.triggeringFunc = triggeringFunc
      this.onCriteriaConcluded = onCriteriaConcluded
  }

  basedOn(func: (output: TOut, ctx?: TCtx) => Promise<TCriteria>): IFlow<TStart, TOut, TCtx> {
      return new Flow(async (start: TStart, ctx?: TCtx) => {
          try {
              const x = await this.triggeringFunc(start, ctx)
              if (x.action !== "CONTINUED") {
                  return x
              }
              const criteria = await func(x.result, ctx)
              return await this.onCriteriaConcluded(criteria, x, ctx)
          } catch (e: any) {
              return {
                  error: new Error(e),
                  action: "ERROR"
              }
          }
      })
  }
}

export class When<TStart, TOut, TCtx> extends PostEvaluationCriteria<TStart, TOut, boolean, TCtx> implements IWhen<TStart, TOut, TCtx> {
  when(func: (output: TOut, ctx?: TCtx) => Promise<boolean>): IFlow<TStart, TOut, TCtx> {
      return this.basedOn(func)
  }
}

export function generateFlow<TStart, TCtx = any>(): IFlow<TStart, TStart, TCtx> {
  return new Flow((result: TStart, ctx?: TCtx) => Promise.resolve({
      result,
      action: "CONTINUED"
  }))
}

