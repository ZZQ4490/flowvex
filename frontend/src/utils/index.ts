// src/utils/index.ts
// Utils 导出

export { 
  isTypeCompatible, 
  formatType, 
  canConvert, 
  getConversionPath 
} from './type-checker';
export type { TypeCheckResult } from './type-checker';

export { 
  convertData, 
  safeConvertData, 
  supportsConversion, 
  getSupportedConversions,
  CONVERSION_MAP 
} from './type-converter';
