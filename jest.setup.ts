import "@testing-library/jest-dom";

// JSDOM 环境下没有实现 createObjectURL，这里提供一个 stub 以避免测试报错。
// eslint-disable-next-line no-empty-function
if (!global.URL.createObjectURL) {
  global.URL.createObjectURL = () => "" as unknown as string;
}
