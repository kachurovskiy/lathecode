declare module 'occt-import-js' {
  export interface OcctImporter {
    ReadStepFile(content: Uint8Array, params: {
      linearUnit: 'millimeter';
      linearDeflectionType: 'absolute_value';
      linearDeflection: number;
      angularDeflection: number;
    }): {
      success: boolean;
      meshes?: {
        attributes: {position: {array: number[]}};
        index: {array: number[]};
      }[];
    };
  }

  export default function createOcct(options: {wasmBinary: Uint8Array}): Promise<OcctImporter>;
}
