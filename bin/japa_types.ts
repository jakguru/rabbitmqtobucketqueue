import '@japa/runner'
declare module '@japa/runner' {
  interface TestContext {
    // notify TypeScript about custom test context properties
  }

  interface Test<TestData> {
    // notify TypeScript about custom test properties
  }
}
