import "@testing-library/jest-dom";

// JSDOM 环境下没有实现 createObjectURL，这里提供一个 stub 以避免测试报错。
// eslint-disable-next-line no-empty-function
if (!global.URL.createObjectURL) {
  global.URL.createObjectURL = () => "" as unknown as string;
}

// polyfill TextEncoder / TextDecoder for旧 Node 版本或某些 Jest 环境
import { TextEncoder as NodeTextEncoder, TextDecoder as NodeTextDecoder } from "util";

if (!global.TextEncoder) {
  global.TextEncoder = NodeTextEncoder as unknown as typeof global.TextEncoder;
}

if (!global.TextDecoder) {
  global.TextDecoder = NodeTextDecoder as unknown as typeof global.TextDecoder;
}
