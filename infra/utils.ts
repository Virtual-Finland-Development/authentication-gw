import { StackConfig } from "./types";

export function createStackConfig(info: { name: string; stage: string; project: string; pulumiOrganization: string }): StackConfig {
  return {
    name: info.name,
    stage: info.stage,
    project: info.project,
    pulumiOrganization: info.pulumiOrganization,
    getTags() {
      return {
        "vfd:stack": this.stage,
        "vfd:project": this.project,
      };
    },
    generateResourceName(resourceName: string) {
      return `${this.name}-${resourceName}-${this.stage}`;
    },
  };
}
