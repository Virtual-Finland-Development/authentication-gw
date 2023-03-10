import { StackConfig } from "./types";

export function createStackConfig(info: { name: string; stage: string; project: string }): StackConfig {
  return {
    name: info.name,
    stage: info.stage,
    project: info.project,
    getTags() {
      return {
        Name: this.name,
        Environment: this.stage,
        Project: this.project,
      };
    },
    generateResourceName(resourceName: string) {
      return `${this.name}-${resourceName}-${this.stage}`;
    },
  };
}
