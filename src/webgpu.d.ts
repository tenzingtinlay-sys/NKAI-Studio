interface GPUAdapter {
  requestDevice(): Promise<GPUDevice>;
}
interface GPUShaderModule {
  getCompilationInfo(): Promise<{ messages: { type: string }[] }>;
}
interface GPUDevice {
  createShaderModule(desc: { code: string }): GPUShaderModule;
  createTexture(desc: {
    size: [number, number];
    format: string;
    usage: number;
  }): { createView(): unknown };
  createBuffer(desc: { size: number; usage: number }): {
    mapAsync(mode: number): Promise<void>;
    getMappedRange(): ArrayBuffer;
    unmap(): void;
  };
  createBindGroupLayout(desc: unknown): unknown;
  createBindGroup(desc: unknown): unknown;
  createPipelineLayout(desc: unknown): unknown;
  createRenderPipeline(desc: unknown): {
    getBindGroupLayout?(index: number): unknown;
  };
  createCommandEncoder(): {
    beginRenderPass(desc: unknown): {
      setPipeline(p: unknown): void;
      setBindGroup(index: number, bind: unknown): void;
      draw(count: number): void;
      end(): void;
    };
    copyTextureToBuffer(src: unknown, dst: unknown, size: [number, number]): void;
    finish(): unknown;
  };
  queue: {
    writeBuffer(buffer: unknown, offset: number, data: BufferSource): void;
    submit(commands: unknown[]): void;
  };
  destroy(): void;
}

interface Navigator {
  gpu?: {
    requestAdapter(): Promise<GPUAdapter | null>;
  };
}

declare const GPUTextureUsage: { RENDER_ATTACHMENT: number; COPY_SRC: number };
declare const GPUBufferUsage: { UNIFORM: number; COPY_DST: number; MAP_READ: number };
declare const GPUShaderStage: { FRAGMENT: number };
declare const GPUMapMode: { READ: number };
type GPUTextureFormat = string;
