export type PipelineStep<I, O> = (input: I) => Promise<O>;

export async function runPipeline<I, O>(input: I, steps: PipelineStep<I, O>[]) {
  let current = input as unknown;
  for (const step of steps) {
    current = await step(current as I);
  }
  return current as O;
}
