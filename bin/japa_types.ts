import '@japa/runner'
import type { Docker } from 'node-docker-api'
declare module '@japa/runner' {
  interface TestContext {
    docker: Docker
  }

  interface Test<TestData> {
    // notify TypeScript about custom test properties
  }
}
