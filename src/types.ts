
export type IFlow<TStart, TOut, TCtx> = IContinuedBy<TStart, TOut, TCtx> & {
  startWith<T = any>(start: TStart, ctx?: TCtx): Promise<T | null>
  evaluate(start: TStart, ctx?: TCtx): Promise<ProcessResult<TOut>>
  stopped(): IWhen<TStart, TOut, TCtx>
  continued(): IWhen<TStart, TOut, TCtx>
  alteredTo(flow: IFlow<TOut, TOut, TCtx>): IWhen<TStart, TOut, TCtx>
  alteredToAnyOf(flows: Record<string, IFlow<TOut, TOut, TCtx>>): IOptions<TStart, TOut, TCtx>
  steppingInto(flow: IFlow<TOut, TOut, TCtx>): IWhen<TStart, TOut, TCtx>
  steppingIntoAnyOf(flows: Record<string, IFlow<TOut, TOut, TCtx>>): IOptions<TStart, TOut, TCtx>
  splittedInto(flows: Record<string, IFlow<TOut, TOut, TCtx>>): IMergeable<TStart, TCtx>
}

export interface IMergeable<TStart, TCtx> {
  onMerge<TOutNext>(func: (dict: Record<string, Promise<any>>, ctx?: TCtx) => Promise<TOutNext>): IFlow<TStart, TOutNext, TCtx>
}

export interface IContinuedBy<TStart, TOut, TCtx> {
  continuedBy<TOutNext>(func: (input: TOut, ctx?: TCtx) => Promise<TOutNext>): IFlow<TStart, TOutNext, TCtx>
}
export interface IWhen<TStart, TOut, TCtx> {
  when(func: (output: TOut, ctx?: TCtx) => Promise<boolean>): IFlow<TStart, TOut, TCtx>
}
export interface IOptions<TStart, TOut, TCtx> {
  basedOn(func: (output: TOut, ctx?: TCtx) => Promise<string>): IFlow<TStart, TOut, TCtx>
}

export type SuccessfulProcessResult<TOut> = {
  result: TOut,
  action: "CONTINUED"
}
export type ProcessResult<TOut> = SuccessfulProcessResult<TOut>
  | { action: "STOPPED" }
  | {
    action: "ALTERED",
    result: any
  }
  | {
    action: "ERROR",
    error: Error
  }

export type HasKeyOf<T extends Record<string | number, any>, TNew> = {
  [P in keyof T]: TNew
}


