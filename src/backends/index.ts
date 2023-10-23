import * as ORT from '@aislamov/onnxruntime-web64'
import type { InferenceSession } from 'onnxruntime-common'
import { replaceTensors } from '../lib/Tensor'
import { Tensor } from '@xenova/transformers'

// @ts-ignore
const ONNX = ORT.default ?? ORT

const isNode = typeof process !== 'undefined' && process?.release?.name === 'node'

const onnxSessionOptions = isNode
  ? {
    executionProviders: ['dml', 'cuda', 'cpu'],
    executionMode: 'parallel',
  }
  : {
    executionProviders: ['webgpu'],
  }

export class Session {
  private session: InferenceSession
  constructor (session: InferenceSession) {
    this.session = session
  }

  static async create (modelOrPath: string|ArrayBuffer, weightsPathOrBuffer?: string|ArrayBuffer, weightsFilename?: string, options?: InferenceSession.SessionOptions) {
    const arg = typeof modelOrPath === 'string' ? modelOrPath : new Uint8Array(modelOrPath)

    const sessionOptions = {
      ...onnxSessionOptions,
      ...options,
    }

    const weightsParams = {
      externalWeights: weightsPathOrBuffer,
      externalWeightsFilename: 'model.onnx_data',
    }
    const executionProviders = sessionOptions.executionProviders.map((provider) => {
      if (typeof provider === 'string') {
        return {
          name: provider,
          ...weightsParams,
        }
      }

      return {
        ...provider,
        ...weightsParams,
      }
    })

    // @ts-ignore
    const session = ONNX.InferenceSession.create(arg, {
      ...sessionOptions,
      executionProviders,
    })

    // @ts-ignore
    return new Session(await session)
  }

  async run (inputs: Record<string, Tensor>) {
    // @ts-ignore
    const result = await this.session.run(inputs)
    return replaceTensors(result)
  }
}