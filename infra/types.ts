export type StackConfig = {
  name: string;
  stage: string;
  project: string;
  getTags(): { [name: string]: string };
  generateResourceName(service: string): string;
};
